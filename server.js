const express = require('express');
const path = require('path');
const db = require('./db/init');

const app = express();
const PORT = 3000;

const VALID_PRIORITIES = new Set(['High', 'Medium', 'Low']);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/tasks', (req, res) => {
  res.json(db.all());
});

// CC-116 --------------------------------------------------------------------
app.post('/api/tasks', (req, res) => {
  const { title, priority, due_date } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Validate priority (optional, defaults to 'Medium')
  const resolvedPriority = priority != null ? priority : 'Medium';
  if (!VALID_PRIORITIES.has(resolvedPriority)) {
    return res.status(400).json({ error: 'Invalid priority value' });
  }

  // Validate due_date (optional)
  let resolvedDueDate = null;
  if (due_date != null && due_date !== '') {
    const parsed = new Date(due_date);
    if (isNaN(parsed.valueOf())) {
      return res.status(400).json({ error: 'Invalid due_date format' });
    }
    resolvedDueDate = due_date;
  }

  const task = db.insert(title.trim(), resolvedPriority, resolvedDueDate);
  res.status(201).json(task);
});

// CC-115 --------------------------------------------------------------------
app.put('/api/tasks/:id', (req, res) => {
  const { done, title } = req.body;
  const fields = {};

  if (done !== undefined) {
    fields.done = done;
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    fields.title = title.trim();
  }

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
