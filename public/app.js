const taskList = document.getElementById('tasks');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const priorityInput = document.getElementById('priority-input');
const dueDateInput = document.getElementById('due-date-input');
const emptyMsg = document.getElementById('empty-msg');
const taskCount = document.getElementById('task-count');
const searchInput = document.getElementById('search-input');

let allTasks = [];
let activeFilter = 'all';

try {
  activeFilter = localStorage.getItem('taskFilter') || 'all';
} catch (_) {}

function applyFilters(tasks) {
  const query = searchInput.value.trim().toLowerCase();
  return tasks.filter(task => {
    if (activeFilter === 'pending' && task.done) return false;
    if (activeFilter === 'completed' && !task.done) return false;
    if (query && !task.title.toLowerCase().includes(query)) return false;
    return true;
  });
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dateStr, done) {
  if (!dateStr || done) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr < today;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    emptyMsg.classList.remove('hidden');
    taskCount.textContent = '';
    return;
  }

  emptyMsg.classList.add('hidden');
  const pending = tasks.filter(t => !t.done).length;
  taskCount.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} — ${pending} remaining`;

  tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');
    if (isOverdue(task.due_date, task.done)) li.classList.add('overdue');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = task.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(title);

    if (task.priority) {
      const badge = document.createElement('span');
      badge.className = `badge badge-${task.priority.toLowerCase()}`;
      badge.textContent = task.priority;
      li.appendChild(badge);
    }

    if (task.due_date) {
      const dateLabel = document.createElement('span');
      dateLabel.className = 'due-date';
      dateLabel.textContent = formatDate(task.due_date);
      li.appendChild(dateLabel);
    }

    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(applyFilters(allTasks));
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
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  fetchTasks();
}

function initFilterTabs() {
  document.querySelectorAll('.filter-tab').forEach(btn => {
    if (btn.dataset.filter === activeFilter) btn.classList.add('active');
    else btn.classList.remove('active');

    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      try { localStorage.setItem('taskFilter', activeFilter); } catch (_) {}
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTasks(applyFilters(allTasks));
    });
  });
}

function initSearch() {
  searchInput.addEventListener('input', () => {
    renderTasks(applyFilters(allTasks));
  });
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const priority = priorityInput.value;
  const due_date = dueDateInput.value || null;
  taskInput.value = '';
  dueDateInput.value = '';
  priorityInput.value = 'Medium';
  addTask(title, priority, due_date);
});

initFilterTabs();
initSearch();
fetchTasks();
