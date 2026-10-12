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
let currentEditLi = null; // tracks the li currently in inline-edit mode

// Priority weight for sorting
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
// Filter & Sort
// --------------------------------------------------------------------------
function applyFilterAndSort(tasks) {
  // 1. Filter
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
  currentEditLi = null;

  if (tasks.length === 0) {
    emptyMsg.classList.remove('hidden');
    taskCount.textContent = '';
    return;
  }

  emptyMsg.classList.add('hidden');
  const pending = allTasks.filter(t => !t.done).length;
  taskCount.textContent = `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} —  ${pending} remaining`;

  tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

    // Title span with double-click to edit
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = task.title;
    titleSpan.title = 'Double-click to edit';
    titleSpan.addEventListener('dblclick', () => startInlineEdit(li, task));

    // Priority badge (defensive: treat missing priority as Medium)
    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;

    // Due date label (defensive: treat missing due_date as null)
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
    deleteBtn.textContent = '✕✹';
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

// --------------------------------------------------------------------------
// Inline Editing (CC-115)
// --------------------------------------------------------------------------
function startInlineEdit(li, task) {
  // Cancel any other open edit without saving
  if (currentEditLi && currentEditLi !== li) {
    cancelInlineEdit(currentEditLi, task);
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
  currentEditLi = li;

  async function commitEdit() {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== originalTitle) {
      await updateTaskTitle(task.id, newTitle);
    } else {
      // Empty or not changed: restore original span
      li.replaceChild(titleSpan, input);
      currentEditLi = null;
    }
  }

  function cancelEdit() {
    li.replaceChild(titleSpan, input);
    currentEditLi = null;
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  });

  let blurCommitted = false;
  input.addEventListener('blur', async () => {
    if (!blurCommitted) {
      blurCommitted = true;
      await commitEdit();
    }
  });
}

function cancelInlineEdit(li, task) {
  const input = li.querySelector('input.title-edit');
  if (!input) return;
  const titleSpan = document.createElement('span');
  titleSpan.className = 'title';
  titleSpan.textContent = task.title;
  li.replaceChild(titleSpan, input);
  currentEditLi = null;
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

async function deleteTask(id) {
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
  const [y,m,d] = dateStr.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(undefined, {
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

// Sort dropdown
sortControl.addEventListener('change', () => {
  currentSort = sortControl.value;
  renderTasks(applyFilterAndSort(allTasks));
});

fetchTasks();
