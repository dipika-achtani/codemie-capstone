const taskList = document.getElementById('tasks');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const emptyMsg = document.getElementById('empty-msg');
const taskCount = document.getElementById('task-count');

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  const tasks = await res.json();
  renderTasks(tasks);
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
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

async function addTask(title) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
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

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  taskInput.value = '';
  addTask(title);
});

fetchTasks();
