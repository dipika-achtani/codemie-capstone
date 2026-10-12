const taskList = document.getElementById('tasks');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskPriority = document.getElementById('task-priority');
const taskDueDate = document.getElementById('task-due-date');
const emptyMsg = document.getElementById('empty-msg');
const taskCount = document.getElementById('task-count');
const sortControl = document.getElementById('sort-control');

let allTasks = [];
let currentFilter = 'all';
let currentSort = 'default';
let currentEditLi = null;

const PRIORITY_WEIGHT = { High: 1, Medium: 2, Low: 3 };

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(applyFilterAndSort(allTasks));
}

function applyFilterAndSort(tasks) {
  let result = tasks.slice();
  if (currentFilter === 'active') {
    result = result.filter(t => !t.done);
  } else if (currentFilter === 'completed') {
    result = result.filter(t => t.done);
  }
  if (currentSort === 'priority') {
    result.sort((a, b) => {
      const pa = PRIORITY_WEIGHT[a.priority || 'Medium'];
      const pb = PRIORITY_WEIGHT[b.priority || 'Medium'];
      return pa - pb;
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
  taskCount.textContent = `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} -- ${pending} remaining`;
  tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = task.title;
    titleSpan.addEventListener('dblclick', () => startEdit(task, li, titleSpan));
    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;
    li.appendChild(checkbox);
    li.appendChild(titleSpan);
    li.appendChild(badge);
    if (task.due_date) {
      const dueSpan = document.createElement('span');
      dueSpan.className = 'due-date';
      dueSpan.textContent = new Date(task.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      li.appendChild(dueSpan);
    }
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = 'x';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

function startEdit(task, li, titleSpan) {
  if (currentEditLi && currentEditLi !== li) {
    cancelEdit(currentEditLi);
  }
  currentEditLi = li;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-edit';
  input.value = task.title;
  li.replaceChild(input, titleSpan);
  input.focus();
  input.select();
  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== task.title) {
      updateTaskTitle(task.id, newTitle);
    } else {
      li.replaceChild(titleSpan, input);
      currentEditLi = null;
    }
  }
  function cancel() {
    if (committed) return;
    committed = true;
    li.replaceChild(titleSpan, input);
    currentEditLi = null;
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { cancel(); }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => { if (document.contains(input)) commit(); }, 100);
  });
}

function cancelEdit(li) {
  const input = li.querySelector('input.title-edit');
  if (input) {
    const span = document.createElement('span');
    span.className = 'title';
    span.textContent = input.defaultValue;
    li.replaceChild(span, input);
  }
  currentEditLi = null;
}

async function updateTaskTitle(id, title) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (res.ok) fetchTasks();
}

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

async function deleteTask(id) {
  if (!window.confirm('Are you sure you want to delete this task?')) return;
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  fetchTasks();
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const priority = taskPriority.value;
  const due_date = taskDueDate.value || null;
  taskInput.value = '';
  taskPriority.value = 'Medium';
  taskDueDate.value = '';
  addTask(title, priority, due_date);
});

document.querySelectorAll('.filter-controls button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-controls button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks(applyFilterAndSort(allTasks));
  });
});

sortControl.addEventListener('change', () => {
  currentSort = sortControl.value;
  renderTasks(applyFilterAndSort(allTasks));
});

fetchTasks();
