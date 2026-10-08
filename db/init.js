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
  insert(title) {
    const data = load();
    const task = { id: data.nextId++, title, done: 0, created_at: new Date().toISOString() };
    data.tasks.push(task);
    save(data);
    return task;
  },
  update(id, done) {
    const data = load();
    const task = data.tasks.find(t => t.id === Number(id));
    if (!task) return null;
    task.done = done ? 1 : 0;
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
