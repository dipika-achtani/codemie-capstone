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
    const weight = { High: 1, Medium: 2, Low: 3 };
    result.sort((a, b) => (weight[a.priority || 'Medium'] || 2) - (weight[b.priority || 'Medium'] || 2));
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

function cancelCurrentEdit() {
  if (!currentEditLi) return;
  const input = currentEditLi.querySelector('input.title-edit');
  if (!input) return;
  const originalTitle = input.dataset.original;
  const span = document.createElement('span');
  span.className = 'title';
  span.textContent = originalTitle;
  attachDblClick(span, currentEditLi);
  currentEditLi.replaceChild(span, input);
  currentEditLi = null;
}

function attachDblClick(span, li) {
  span.addEventListener('dblclick', () => {
    cancelCurrentEdit();
    currentEditLi = li;
    const input = document.createElement('input');
    input.className = 'title-edit';
    input.value = span.textContent;
    input.dataset.original = span.textContent;
    input.dataset.taskId = li.dataset.taskId;

    function commit() {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== input.dataset.original) {
        updateTaskTitle(Number(input.dataset.taskId), newTitle);
      } else {
        cancelCurrentEdit();
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { cancelCurrentEdit(); }
    });
    input.addEventListener('blur', commit);

    li.replaceChild(input, span);
    input.focus();
  });
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  currentEditLi = null;

  const pending = allTasks.filter(t => !t.done).length;
  if (tasks.length === 0) {
    emptyMsg.classList.remove('hidden');
    taskCount.textContent = allTasks.length ? `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} — ${pending} remaining` : '';
    return;
  }

  emptyMsg.classList.add('hidden');
  taskCount.textContent = `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} — ${pending} remaining`;

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.dataset.taskId = task.id;
    if (task.done) li.classList.add('done');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = task.title;
    attachDblClick(titleSpan, li);

    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;

    const meta = document.createElement('span');
    meta.className = 'task-meta';
    meta.appendChild(badge);
    if (task.due_date) {
      const due = document.createElement('span');
      due.className = 'due-date';
      due.textContent = formatDate(task.due_date);
      meta.appendChild(due);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(titleSpan);
    li.appendChild(meta);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

async function addTask(title, priority, due_date) {
  const body = { title, priority };
  if (due_date) body.due_date = due_date;
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
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
  if (res.ok) fetchTasks();
}

async function deleteTask(id) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
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

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
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
