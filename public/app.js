const taskList    = document.getElementById('tasks');
const taskForm    = document.getElementById('task-form');
const taskInput   = document.getElementById('task-input');
const emptyMsg    = document.getElementById('empty-msg');
const taskCount   = document.getElementById('task-count');
const sortSelect  = document.getElementById('sort-select');
const filterBtns  = document.querySelectorAll('.filter-tabs button');

// CC-119: module-level state — read from localStorage on startup
// localStorage keys namespaced as tm_filter / tm_sort to avoid collisions
let currentFilter = localStorage.getItem('tm_filter') || 'all';
let currentSort   = localStorage.getItem('tm_sort')   || 'created';

// Raw task array from the last fetch
let allTasks = [];

// ─── Fetch & Render ───────────────────────────────────────────────────────────

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(applyFilterAndSort(allTasks));
}

// CC-119: filter and sort in memory before rendering
function applyFilterAndSort(tasks) {
  // Filter
  let filtered = tasks;
  if (currentFilter === 'active')    filtered = tasks.filter(t => t.done === 0);
  if (currentFilter === 'completed') filtered = tasks.filter(t => t.done === 1);

  // Sort
  const sorted = filtered.slice(); // avoid mutating original
  if (currentSort === 'priority') {
    const order = { High: 1, Medium: 2, Low: 3 };
    sorted.sort((a, b) => {
      const pa = order[a.priority || 'Medium'] || 2;
      const pb = order[b.priority || 'Medium'] || 2;
      return pa - pb;
    });
  } else if (currentSort === 'due') {
    sorted.sort((a, b) => {
      // null dates go last
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  }
  // 'created' → natural reverse insertion order (already reversed by db.all())

  return sorted;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';

  // CC-119: update task-count to reflect filtered count
  const totalFiltered = tasks.length;
  const pending = tasks.filter(t => !t.done).length;

  if (totalFiltered === 0) {
    emptyMsg.classList.remove('hidden');
    taskCount.textContent = '';
    return;
  }

  emptyMsg.classList.add('hidden');
  taskCount.textContent =
    `${totalFiltered} task${totalFiltered !== 1 ? 's' : ''} — ${pending} remaining`;

  // Today's date string for overdue comparison (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    // CC-120: overdue detection — past due_date on an incomplete task
    const isOverdue = task.due_date && task.due_date < today && task.done === 0;
    if (isOverdue) li.classList.add('overdue');

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

    // CC-120: priority badge (defensive: treat missing priority as 'Medium')
    const priority = task.priority || 'Medium';
    const badge = document.createElement('span');
    badge.className = `badge badge-${priority.toLowerCase()}`;
    badge.textContent = priority;

    // Title span with CC-120 inline-edit on double-click
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = task.title;
    titleSpan.title = 'Double-click to edit';
    titleSpan.addEventListener('dblclick', () => startInlineEdit(task, titleSpan));

    // CC-120: due-date label (defensive: treat missing due_date as null)
    const dueDateLabel = document.createElement('span');
    if (task.due_date) {
      dueDateLabel.className = `due-date${isOverdue ? ' overdue-label' : ''}`;
      dueDateLabel.textContent = task.due_date;
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(badge);
    li.appendChild(titleSpan);
    if (task.due_date) li.appendChild(dueDateLabel);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

// ─── Inline Edit (CC-120) ─────────────────────────────────────────────────────

function startInlineEdit(task, titleSpan) {
  const originalTitle = task.title;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit';
  input.value = originalTitle;
  input.maxLength = 200;

  // Replace span with input
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  async function commitEdit() {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== originalTitle) {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      fetchTasks();
    } else {
      // Restore original span without firing PUT
      input.replaceWith(titleSpan);
    }
  }

  function cancelEdit() {
    input.replaceWith(titleSpan);
  }

  input.addEventListener('blur', commitEdit);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.removeEventListener('blur', commitEdit);
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.removeEventListener('blur', commitEdit);
      cancelEdit();
    }
  });
}

// ─── API Calls ────────────────────────────────────────────────────────────────

// CC-120: pass priority and due_date in POST body
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

// ─── Form Submit ──────────────────────────────────────────────────────────────

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title    = taskInput.value.trim();
  const priority = document.getElementById('priority-input').value;
  const due_date = document.getElementById('due-date-input').value || null;
  if (!title) return;
  taskInput.value = '';
  document.getElementById('due-date-input').value = '';
  addTask(title, priority, due_date);
});

// ─── Filter Tabs (CC-119) ─────────────────────────────────────────────────────

filterBtns.forEach(btn => {
  // Restore active state from localStorage
  if (btn.dataset.filter === currentFilter) btn.classList.add('active');
  else btn.classList.remove('active');

  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    localStorage.setItem('tm_filter', currentFilter);
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTasks(applyFilterAndSort(allTasks));
  });
});

// ─── Sort Control (CC-119) ────────────────────────────────────────────────────

// Restore sort from localStorage
sortSelect.value = currentSort;

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  localStorage.setItem('tm_sort', currentSort);
  renderTasks(applyFilterAndSort(allTasks));
});

// ─── Init ─────────────────────────────────────────────────────────────────────

fetchTasks();
