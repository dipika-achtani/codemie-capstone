// --------------------------------------------------------------------------
// DOM References
// --------------------------------------------------------------------------
const taskList = document.getElementById('tasks');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskPriority = document.getElementById('task-priority');
const taskDueDate = document.getElementById('task-due-date');
const emptyMsg = document.getElementById('empty-msg');
const taskCount = document.getElementById('task-count');
const sortControl = document.getElementById('sort-control');

// --------------------------------------------------------------------------
// Module-level state
// --------------------------------------------------------------------------
let allTasks = [];
let currentFilter = 'all';
let currentSort = 'default';

/**
 * Tracks the <li> currently in inline-edit mode and the task object it
 * belongs to.  Keeping the task reference here lets cancelInlineEdit()
 * rebuild the span with the correct title without relying on a stale
 * closure from a different startInlineEdit() invocation.
 */
let currentEdit = null; // { li: HTMLElement, task: object } | null

// Priority weight for sorting (High=1, Medium=2, Low=3)
const PRIORITY_WEIGHT = { High: 1, Medium: 2, Low: 3 };

// --------------------------------------------------------------------------
// Data fetching
// --------------------------------------------------------------------------
async function fetchTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(applyFilterAndSort(allTasks));
}

// --------------------------------------------------------------------------
// Filter & Sort (CC-116)
// --------------------------------------------------------------------------
function applyFilterAndSort(tasks) {
  // 1. Filter by done state
  let result = tasks;
  if (currentFilter === 'active') {
    result = tasks.filter(t => !t.done);
  } else if (currentFilter === 'completed') {
    result = tasks.filter(t => t.done);
  }

  // 2. Sort
  if (currentSort === 'priority') {
    result = result.slice().sort((a, b) => {
      const wa = PRIORITY_WEIGHT[a.priority] || PRIORITY_WEIGHT.Medium;
      const wb = PRIORITY_WEIGHT[b.priority] || PRIORITY_WEIGHT.Medium;
      return wa - wb;
    });
  } else if (currentSort === 'due_date') {
    result = result.slice().sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;  // nulls last
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }

  return result;
}

// --------------------------------------------------------------------------
// Rendering
// --------------------------------------------------------------------------
function renderTasks(tasks) {
  taskList.innerHTML = '';
  currentEdit = null;

  if (tasks.length === 0) {
    emptyMsg.classList.remove('hidden');
    taskCount.textContent = '';
    return;
  }

  emptyMsg.classList.add('hidden');
  const pending = allTasks.filter(t => !t.done).length;
  taskCount.textContent = `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} \u2014 ${pending} remaining`;

  tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

    // Title span with double-click to edit (CC-115)
    const titleSpan = makeTitleSpan(task);

    // Priority badge -- defensive: treat missing priority as Medium (CC-116)
    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;

    // Due date label -- defensive: treat missing due_date as null (CC-116)
    const dueDate = task.due_date || null;
    let dueSpan = null;
    if (dueDate) {
      dueSpan = document.createElement('span');
      dueSpan.className = 'due-date';
      dueSpan.textContent = formatDate(dueDate);
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '\u00d7';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(titleSpan);
    li.appendChild(badge);
    if (dueSpan) li.appendChild(dueSpan);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

/**
 * Build a title <span> with a dblclick listener for inline editing.
 * Extracted so it can be reused by cancelInlineEdit().
 */
function makeTitleSpan(task) {
  const span = document.createElement('span');
  span.className = 'title';
  span.textContent = task.title;
  span.title = 'Double-click to edit';
  span.addEventListener('dblclick', () => {
    const li = span.closest('li');
    if (li) startInlineEdit(li, task);
  });
  return span;
}

// --------------------------------------------------------------------------
// Inline Editing (CC-115)
// --------------------------------------------------------------------------
function startInlineEdit(li, task) {
  // Cancel any other open edit without saving
  if (currentEdit && currentEdit.li !== li) {
    cancelInlineEdit(currentEdit.li, currentEdit.task);
  }

  const titleSpan = li.querySelector('.title');
  if (!titleSpan) return;

  const originalTitle = task.title;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-edit';
  input.value = originalTitle;
  input.maxLength = 200;

  li.replaceChild(input, titleSpan);
  input.focus();
  input.select();
  currentEdit = { li, task };

  // Single flag to prevent both keydown (Enter) and the subsequent blur
  // event from both calling commitEdit() for the same input.
  let editSettled = false;

  async function commitEdit() {
    if (editSettled) return;
    editSettled = true;

    const newTitle = input.value.trim();
    if (newTitle && newTitle !== originalTitle) {
      // Non-empty and changed: persist via API
      await updateTaskTitle(task.id, newTitle);
    } else {
      // Empty or unchanged: restore original span without API call
      li.replaceChild(makeTitleSpan(task), input);
      currentEdit = null;
    }
  }

  function cancelEdit() {
    if (editSettled) return;
    editSettled = true;
    li.replaceChild(makeTitleSpan(task), input);
    currentEdit = null;
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  });

  input.addEventListener('blur', async () => {
    // blur fires after keydown -- the editSettled flag ensures
    // commitEdit() is only executed once per edit session.
    await commitEdit();
  });
}

/**
 * Cancel an open inline edit on a given <li> without saving.
 * Rebuilds the title span from the provided task object so the correct
 * title is always displayed regardless of which closure created the input.
 */
function cancelInlineEdit(li, task) {
  const input = li.querySelector('input.title-edit');
  if (!input) return;
  li.replaceChild(makeTitleSpan(task), input);
  currentEdit = null;
}

// --------------------------------------------------------------------------
// API Calls
// --------------------------------------------------------------------------
async function addTask(title, priority, due_date) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority, due_date: due_date || null })
  });
  if (!res.ok) return;
  fetchTasks();
}

async function toggleTask(id, done) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done })
  });
  fetchTasks();
}

alsync function updateTaskTitle(id, title) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (res.ok) {
    await fetchTasks();
  }
}

async function deleteTask(id) {
  // CC-115: confirmation guard before issuing DELETE
  if (!window.confirm('Are you sure you want to delete this task?')) {
    return;
  }
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  fetchTasks();
}

// --------------------------------------------------------------------------
// Utilities
// --------------------------------------------------------------------------
function formatDate(dateStr) {
  // Parse YYYY-MM-DD without timezone shift
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// --------------------------------------------------------------------------
// Event Listeners
// --------------------------------------------------------------------------
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const priority = taskPriority.value;
  const dueDate = taskDueDate.value;
  // Clear form inputs after reading values
  taskInput.value = '';
  taskPriority.value = 'Medium';
  taskDueDate.value = '';
  addTask(title, priority, dueDate);
});

// Filter buttons (CC-116)
document.querySelectorAll('.filter-controls button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-controls button').forEach(b => b.classList.remove('active'));
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

// --------------------------------------------------------------------------
// Init
// --------------------------------------------------------------------------
fetchTasks();
