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

app.post('/api/tasks', (req, res) => {
  const { title, priority, due_date } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const resolvedPriority = priority || 'Medium';
  if (!VALID_PRIORITIES.includes(resolvedPriority)) {
    return res.status(400).json({ error: 'Invalid priority value' });
  }

  let resolvedDueDate = null;
  if (due_date) {
    const parsed = new Date(due_date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid due_date format' });
    }
    resolvedDueDate = due_date;
  }

  const task = db.insert(title.trim(), resolvedPriority, resolvedDueDate);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const { done, title } = req.body;

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  const fields = {};
  if (done !== undefined) fields.done = done;
  if (title !== undefined) fields.title = title.trim();

  const task = db.update(req.params.id, fields);
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
