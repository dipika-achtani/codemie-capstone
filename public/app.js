// ----------------------------------------------------------------------------
// DOM references
// ----------------------------------------------------------------------------
const taskList    = document.getElementById('tasks');
const taskForm    = document.getElementById('task-form');
const taskInput   = document.getElementById('task-input');
const prioritySel = document.getElementById('task-priority');
const dueDateInput = document.getElementById('task-due-date');
const emptyMsg    = document.getElementById('empty-msg');
const taskCount   = document.getElementById('task-count');
const sortControl = document.getElementById('sort-control');

// ----------------------------------------------------------------------------
// Module-level state (CC-116)
// ----------------------------------------------------------------------------
let allTasks      = [];         // full unfiltered list from server
get currentFilter = 'all';     // 'all' | 'active' | 'completed'
let currentSort   = 'default';  // 'default' | 'priority' | 'due_date'

// Tracks the <li> currently in inline-edit mode (CC-115)
let currentEditLi = null;

// Priority weight for sorting: High = 1, Medium = 2, Low = 3
const PRIORITY_WEIGHT = { High: 1, Medium: 2, Low: 3 };

// ----------------------------------------------------------------------------
// Data fetching
// ----------------------------------------------------------------------------
async function fetchTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(applyFilterAndSort(allTasks));
}

// ----------------------------------------------------------------------------
// CC-116: Filter & Sort
// ----------------------------------------------------------------------------
function applyFilterAndSort(tasks) {
  // 1. Filter
  let result = tasks.slice();
  if (currentFilter === 'active') {
    result = result.filter(t => !t.done);
  } else if (currentFilter === 'completed') {
    result = result.filter(t => t.done);
  }

  // 2. Sort
  if (currentSort === 'priority') {
    result.sort((a, b) => {
      const wa = PRIORITY_WEIGHT[a.priority] ?? 2;
      const wb = PRIORITY_WEIGHT[b.priority] ?? 2;
      return wa - wb;
    });
  } else if (currentSort === 'due_date') {
    result.sort((a, b) => {
      // nulls/missing due dates sort to the end
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }

  return result;
}

// ----------------------------------------------------------------------------
// CC-116: Render tasks with priority badge + due-date label
// CC-115: Inline edit on dblclick
// ----------------------------------------------------------------------------
function renderTasks(tasks) {
  taskList.innerHTML = '';
  currentEditLi = null;

  if (tasks.length === 0) {
    emptyMsg.classList.remove('hidden');
    taskCount.textContent = '';
    return;
  }

  emptyMsg.classList.add('hidden');
  const pending = allTasks.filter(t => !t.done).length;
  taskCount.textContent = `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} — ${pending} remaining`;

  tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

    // Title span with dblclick inline-edit (CC-115)
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = task.title;
    titleSpan.title = 'Double-click to edit';
    titleSpan.addEventListener('dblclick', () => startInlineEdit(li, task));

    // Priority badge (CC-116)
    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;

    // Due date label (CC-116)
    let dueSpan = null;
    const dueDate = task.due_date || null;
    if (dueDate) {
      dueSpan = document.createElement('span');
      dueSpan.className = 'due-date';
      // Parse YYYY-MM-DD as UTC to avoid off-by-one day in negative UTC offsets
      const d = new Date(dueDate + 'T00:00:00Z');
      dueSpan.textContent = '\u1f4c5 ' + d.toUTCString().slice(5, 16);
    }

    // Delete button with confirmation guard (CC-115)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '\u2315';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id, task.title));

    li.appendChild(checkbox);
    li.appendChild(titleSpan);
    li.appendChild(badge);
    if (dueSpan) li.appendChild(dueSpan);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

// ----------------------------------------------------------------------------
// CC-115: Inline edit helpers
// ----------------------------------------------------------------------------

/**
 * Replace the title span in `li` with a focused input.
 * Cancels any other open edit first.
 */
function startInlineEdit(li, task) {
  // Cancel any other open edit without saving
  if (currentEditLi && currentEditLi !== li) {
    cancelInlineEdit(currentEditLi, task);
  }

  const titleSpan = li.querySelector('span.title');
  if (!titleSpan) return; // already in edit mode

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-edit';
  input.value = task.title;
  input.maxLength = 200;

  li.replaceChild(input, titleSpan);
  input.focus();
  input.select();
  currentEditLi = li;

  // Flag to prevent double-fire when Enter/Escape triggers blur
  let handled = false;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handled = true;
      commitInlineEdit(li, task, input);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handled = true;
      cancelInlineEdit(li, task);
    }
  });

  input.addEventListener('blur', () => {
    if (!handled) {
      handled = true;
      commitInlineEdit(li, task, input);
    }
  });
}

/**
 * Restore the original title span without saving.
 */
function cancelInlineEdit(li, task) {
  const input = li.querySelector('input.title-edit');
  if (!input) return;
  const span = document.createElement('span');
  span.className = 'title';
  span.textContent = task.title;
  span.title = 'Double-click to edit';
  span.addEventListener('dblclick', () => startInlineEdit(li, task));
  li.replaceChild(span, input);
  if (currentEditLi === li) currentEditLi = null;
}

/**
 * Commit the inline edit:
 * - if trimmed value is non-empty and different from original -> save
 * - otherwise -> restore original without API call
 */
function commitInlineEdit(li, task, input) {
  // Guard against blur firing after Enter/Escape already removed the input
  if (!li.contains(input)) return;

  const newTitle = input.value.trim();
  if (!newTitle || newTitle === task.title) {
    // Empty or unchanged -> restore without saving
    cancelInlineEdit(li, task);
    return;
  }

  // Replace input with a temporary span showing new title while saving
  const span = document.createElement('span');
  span.className = 'title';
  span.textContent = newTitle;
  li.replaceChild(span, input);
  currentEditLi = null;

  updateTaskTitle(task.id, newTitle);
}

// ----------------------------------------------------------------------------
// API calls
// ----------------------------------------------------------------------------

/** CC-115: Sends PUT /api/tasks/:id with { title } and re-renders on success. */
async function updateTaskTitle(id, title) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (res.ok) {
    await fetchTasks();
  }
}

/** Toggles the done state of a task. */
async function toggleTask(id, done) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done })
  });
  await fetchTasks();
}

/**
 * CC-115: Deletes a task after a confirmation guard.
 * If the user dismisses the prompt, no DELETE request is issued.
 */
async function deleteTask(id, title) {
  if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  await fetchTasks();
}

/**
 * CC-116: Adds a new task with priority and due_date.
 */
async function addTask(title, priority, due_date) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority, due_date: due_date || null })
  });
  if (!res.ok) return;
  await fetchTasks();
}

// ----------------------------------------------------------------------------
// Event listeners
// ----------------------------------------------------------------------------

// Add-task form submit
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const priority = prioritySel.value;
  const dueDate  = dueDateInput.value || null; // YYYY-MM-DD or null
  taskInput.value = '';
  prioritySel.value = 'Medium';
  dueDateInput.value = '';
  addTask(title, priority, dueDate);
});

// Filter buttons (CC-116)
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks(applyFilterAndSort(allTasks));
  });
});

// Sort dropdown (CC-116)
sortControl.addEventListener('change', () => {
  currentSort = sortControl.value;
  renderTasks(applyFilterAndSort(allTasks));
});

// Initial load
fetchTasks();
