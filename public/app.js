// --- DOM references ---
const taskList    = document.getElementById('tasks');
const taskForm    = document.getElementById('task-form');
const taskInput   = document.getElementById('task-input');
const emptyMsg    = document.getElementById('empty-msg');
const taskCount   = document.getElementById('task-count');
const prioritySel = document.getElementById('task-priority');
const dueDateInput = document.getElementById('task-due-date');
const sortControl = document.getElementById('sort-control');

// --- Module-level state ---
let allTasks = [];
let currentState = { filter: 'all', sort: 'default' };
let currentEditLi = null; // tracks the li currently in edit mode

// --- Fetch ---
async function fetchTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(applyFilterAndSort(allTasks));
}

// --- Filter & Sort ---
function applyFilterAndSort(tasks) {
  // Filter
  let result = tasks;
  if (currentState.filter === 'active') {
    result = tasks.filter(t => !t.done);
  } else if (currentState.filter === 'completed') {
    result = tasks.filter(t => t.done);
  }

  // Sort
  if (currentState.sort === 'priority') {
    const weight = { High: 1, Medium: 2, Low: 3 };
    result = result.slice().sort((a, b) => {
      const pa = weight[a.priority || 'Medium'] || 2;
      const pb = weight[b.priority || 'Medium'] || 2;
      return pa - pb;
    });
  } else if (currentState.sort === 'due_date') {
    result = result.slice().sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }

  return result;
}

// --- Render ---
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
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = task.title;
    title.addEventListener('dblclick', () => startEdit(li, task));

    // Priority badge
    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;

    // Due date
    let dueEl = null;
    if (task.due_date) {
      dueEl = document.createElement('span');
      dueEl.className = 'due-date';
      dueEl.textContent = new Date(task.due_date + 'T00:00:00').toLocaleDateString();
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '❕';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(badge);
    if (dueEl) li.appendChild(dueEl);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

// --- Inline Edit ---
function startEdit(li, task) {
  // Cancel any other open edit first
  if (currentEditLi && currentEditLi !== li) {
    cancelEdit(currentEditLi);
  }

  const titleSpan = li.querySelector('span.title');
  if (!titleSpan) return; // already in edit mode

  const originalTitle = task.title;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-edit';
  input.value = originalTitle;

  li.replaceChild(input, titleSpan);
  input.focus();
  input.select();
  currentEditLi = li;

  async function commitEdit() {
    const newTitle = input.value.trim();
    if (!newTitle) {
      // Empty -- restore original without API call
      restoreSpan(li, input, originalTitle, task);
      return;
    }
    if (newTitle === originalTitle) {
      restoreSpan(li, input, originalTitle, task);
      return;
    }
    await updateTaskTitle(task.id, newTitle);
  }

  function cancel() {
    restoreSpan(li, input, originalTitle, task);
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await commitEdit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  });

  input.addEventListener('blur', async () => {
    // Small timeout to let keydown fire first if Enter/Escape was pressed
    setTimeout(async () => {
      if (li.contains(input)) {
        await commitEdit();
      }
    }, 100);
  });
}

function restoreSpan(li, input, originalTitle, task) {
  if (!li.contains(input)) return;
  const span = document.createElement('span');
  span.className = 'title';
  span.textContent = originalTitle;
  span.addEventListener('dblclick', () => startEdit(li, task));
  li.replaceChild(span, input);
  currentEditLi = null;
}

function cancelEdit(li) {
  const input = li.querySelector('input.title-edit');
  if (!input) return;
  const originalTitle = input.defaultValue;
  const span = document.createElement('span');
  span.className = 'title';
  span.textContent = originalTitle;
  li.replaceChild(span, input);
  currentEditLi = null;
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

// --- Add Task ---
async function addTask(title, priority, due_date) {
  const body = { title };
  if (priority) body.priority = priority;
  if (due_date) body.due_date = due_date;

  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) return;
  await fetchTasks();
}

// --- Toggle Done ---
async function toggleTask(id, done) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done })
  });
  await fetchTasks();
}

// --- Delete with confirmation guard ---
async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  await fetchTasks();
}

// --- Form submit ---
taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const priority = prioritySel ? prioritySel.value : 'Medium';
  const due_date = dueDateInput ? dueDateInput.value : '';
  taskInput.value = '';
  if (prioritySel) prioritySel.value = 'Medium';
  if (dueDateInput) dueDateInput.value = '';
  addTask(title, priority, due_date);
});

// --- Filter buttons ---
document.querySelectorAll('.filter-controls button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-controls button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentState.filter = btn.dataset.filter;
    renderTasks(applyFilterAndSort(allTasks));
  });
});

// --- Sort control ---
if (sortControl) {
  sortControl.addEventListener('change', () => {
    currentState.sort = sortControl.value;
    renderTasks(applyFilterAndSort(allTasks));
  });
}

// --- Initial load ---
fetchTasks();
