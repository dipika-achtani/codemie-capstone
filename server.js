const express = require('express');
const path = require('path');
const db = require('./db/init');

const app = express();
const PORT = 3000;

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/tasks', (req, res) => {
  res.json(db.all());
});

// CC-120: read and validate priority and due_date
app.post('/api/tasks', (req, res) => {
  const { title, priority, due_date } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const resolvedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
  const resolvedDueDate = due_date || null;
  const task = db.insert(title.trim(), resolvedPriority, resolvedDueDate);
  res.status(201).json(task);
});

// CC-120: accept title, priority, due_date in addition to done; use partial-update pattern
app.put('/api/tasks/:id', (req, res) => {
  const payload = {};
  if (req.body.hasOwnProperty('done'))     payload.done     = req.body.done;
  if (req.body.hasOwnProperty('title'))    payload.title    = req.body.title;
  if (req.body.hasOwnProperty('priority') && VALID_PRIORITIES.includes(req.body.priority)) {
    payload.priority = req.body.priority;
  }
  if (req.body.hasOwnProperty('due_date')) payload.due_date = req.body.due_date;

  const task = db.update(req.params.id, payload);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  if (!db.remove(req.params.id)) return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Task Manager running at http://localhost:${PORT}`);
});
