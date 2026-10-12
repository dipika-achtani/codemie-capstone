const taskList = document.getElementById('tasks');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskPriority = document.getElementById('task-priority');
const taskDueDate = document.getElementById('task-due-date');
const emptyMsg = document.getElementById('empty-msg');
const taskCount = document.getElementById('task-count');
const sortControl = document.getElementById('sort-control');

// Module-level state
let allTasks = [];
let currentFilter = 'all';
let currentSort = 'default';
let currentEditLi = null;

// ----------------------------------------------------------------------
// Data fetching
// ----------------------------------------------------------------------
async function fetchTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(applyFilterAndSort(allTasks));
}

// ----------------------------------------------------------------------
// Filter & Sort
// ----------------------------------------------------------------------
const PRIORITY_WEIGHT = { High: 1, Medium: 2, Low: 3 };

function applyFilterAndSort(tasks) {
  // Filter
  let result = tasks.slice();
  if (currentFilter === 'active') {
    result = result.filter(t => !t.done);
  } else if (currentFilter === 'completed') {
    result = result.filter(t => t.done);
  }

  // Sort
  if (currentSort === 'priority') {
    result.sort((a, b) => {
      const wa = PRIORITY_WEIGHT[a.priority] || 2;
      const wb = PRIORITY_WEIGHT[b.priority] || 2;
      return wa - wb;
    });
  } else if (currentSort === 'due_date') {
    result.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }

  return result;
}

// ----------------------------------------------------------------------
// Render
// ----------------------------------------------------------------------
function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    emptyMsg.classList.remove('hidden');
    taskCount.textContent = '';
    return;
  }

  emptyMsg.classList.add('hidden');
  const pending = allTasks.filter(t => !t.done).length;
  taskCount.textContent = `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} – ${pending} remaining`;

  tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

    // Title span with dblclick for inline edit
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = task.title;
    titleSpan.addEventListener('dblclick', () => startInlineEdit(li, task));

    // Priority badge
    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;

    // Due date
    const dueDateVal = task.due_date || null;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '❕';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(titleSpan);
    li.appendChild(badge);

    if (dueDateVal) {
      const dueSpan = document.createElement('span');
      dueSpan.className = 'due-date';
      dueSpan.textContent = formatDate(dueDateVal);
      li.appendChild(dueSpan);
    }

    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ----------------------------------------------------------------------
// Inline editing
// ----------------------------------------------------------------------
function startInlineEdit(li, task) {
  // Cancel any other open edit first
  if (currentEditLi && currentEditLi !== li) {
    cancelEdit(currentEditLi);
  }

  currentEditLi = li;
  const titleSpan = li.querySelector('span.title');
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

  function commitEdit() {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== originalTitle) {
      updateTaskTitle(task.id, newTitle);
    } else {
      restoreSpan(li, input, originalTitle, task);
    }
    currentEditLi = null;
  }

  function cancelEditHandler() {
    restoreSpan(li, input, originalTitle, task);
    currentEditLi = null;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEditHandler(); }
  });

  input.addEventListener('blur', () => {
    // Small timeout to let keydown fire first
    setTimeout(() => {
      if (li.contains(input)) commitEdit();
    }, 100);
  });
}

function restoreSpan(li, input, originalTitle, task) {
  const span = document.createElement('span');
  span.className = 'title';
  span.textContent = originalTitle;
  span.addEventListener('dblclick', () => startInlineEdit(li, task));
  li.replaceChild(span, input);
}

function cancelEdit(li) {
  const input = li.querySelector('input.title-edit');
  if (!input) return;
  const originalTitle = input.defaultValue;
  restoreSpan(li, input, originalTitle, { title: originalTitle });
}

// ----------------------------------------------------------------------
// API actions
// ----------------------------------------------------------------------
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
  await fetch('/api/tasks/${id}', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done })
  });
  fetchTasks();
}

async function updateTaskTitle(id, title) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (res.ok) fetchTasks();
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  await fetch('/api/tasks/${id}', { method: 'DELETE' });
  fetchTasks();
}

// ----------------------------------------------------------------------
// Event listeners
// ----------------------------------------------------------------------
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const priority = taskPriority.value;
  const dueDate = taskDueDate.value;
  taskInput.value = '';
  taskPriority.value = 'Medium';
  taskDueDate.value = '';
  addTask(title, priority, dueDate);
});

// Filter buttons
document.querySelectorAll('.filter-controls button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-controls button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks(applyFilterAndSort(allTasks));
  });
});

// Sort control
sortControl.addEventListener('change', () => {
  currentSort = sortControl.value;
  renderTasks(applyFilterAndSort(allTasks));
});

// Initial load
fetchTasks();
