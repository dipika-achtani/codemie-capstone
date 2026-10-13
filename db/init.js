const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'tasks.json');

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ tasks: [], nextId: 1 }), 'utf8');
}

function load() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  all() {
    return load().tasks.slice().reverse();
  },

  // CC-120: extended to accept priority and due_date
  insert(title, priority, due_date) {
    const data = load();
    const task = {
      id: data.nextId++,
      title,
      done: 0,
      created_at: new Date().toISOString(),
      priority: priority || 'Medium',
      due_date: due_date || null
    };
    data.tasks.push(task);
    save(data);
    return task;
  },

  // CC-120: partial-update pattern — only apply fields explicitly present in payload
  update(id, payload) {
    const data = load();
    const task = data.tasks.find(t => t.id === Number(id));
    if (!task) return null;
    if (payload.hasOwnProperty('done'))     task.done     = payload.done ? 1 : 0;
    if (payload.hasOwnProperty('title'))    task.title    = payload.title;
    if (payload.hasOwnProperty('priority')) task.priority = payload.priority;
    if (payload.hasOwnProperty('due_date')) task.due_date = payload.due_date;
    save(data);
    return task;
  },

  remove(id) {
    const data = load();
    const idx = data.tasks.findIndex(t => t.id === Number(id));
    if (idx === -1) return false;
    data.tasks.splice(idx, 1);
    save(data);
    return true;
  }
};
