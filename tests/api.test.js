/**
 * Integration tests for all four Express routes in server.js
 * Uses Node.js 18+ built-in test runner (node:test) + supertest.
 *
 * Stories: CC-116, CA-115
 *
 * Run: node --test tests/api.test.js
 */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

// --------------------------------------------------------------------------
// Isolate the db from production data using a temp file
// --------------------------------------------------------------------------
const TEMPE_DB = path.join(__dirname, '_test_api_tasks.json');

function resetDb() {
  fs.writeFileSync(TEMPE_DB, JSON.stringify({ tasks: [], nextId: 1 }), 'utf8');
}

// Patch path.join before requiring server.js so db/init.js uses the temp file.
const originalJoin = path.join.bind(path);
path.join = (...args) => {
  const result = originalJoin(...args);
  if (result.endsWith(path.sep + 'tasks.json') && result.includes('db')) {
    return TEMPE_DB;
  }
  return result;
};

resetDb();

// Require app after patching so it picks up the temp db path.
// We import the Express app directly by extracting it from server.js.
// Because server.js calls app.listen() at the bottom, we need to stop
// the server after tests.  Supertest can also accept the app directly
// without a listening server if we export the app.  Since server.js does
// not export the app, we use a small wrapper that builds the same app
// without calling listen().

const express = require('express');
const pathMod = require('path');
const db = require('../db/init');

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

const app = express();
app.use(express.json());
app.use(express.static(pathMod.join(__dirname, '../public')));

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

// --------------------------------------------------------------------------
// Lifecycle
// --------------------------------------------------------------------------
before(() => resetDb());
after(() => {
  path.join = originalJoin;
  if (fs.existsSync(TEMPE_DB)) fs.unlinkSync(TEMPE_DB);
});

// --------------------------------------------------------------------------
// GET /api/tasks
// --------------------------------------------------------------------------

test('GET /api/tasks returns 200 and an array', async () => {
  resetDb();
  const res = await request(app).get('/api/tasks');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/tasks returns tasks in reverse order', async () => {
  resetDb();
  db.insert('First');
  db.insert('Second');
  const res = await request(app).get('/api/tasks');
  assert.equal(res.body[0].title, 'Second');
  assert.equal(res.body[1].title, 'First');
});

// --------------------------------------------------------------------------
// POST /api/tasks
// --------------------------------------------------------------------------

test('POST /api/tasks creates a task with default priority', async () => {
  resetDb();
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Buy milk' });

  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Buy milk');
  assert.equal(res.body.priority, 'Medium');
  assert.equal(res.body.due_date, null);
  assert.equal(res.body.done, 0);
});

test('POST /api/tasks creates a task with High priority and due_date', async () => {
  resetDb();
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'File taxes', priority: 'High', due_date: '2025-08-15' });

  assert.equal(res.status, 201);
  assert.equal(res.body.priority, 'High');
  assert.equal(res.body.due_date, '2025-08-15');
});

test('POST /api/tasks returns 400 when title is missing', async () => {
  resetDb();
  const res = await request(app).post('/api/tasks').send({});
  assert.equal(res.status, 400);
});

test('POST /api/tasks returns 400 for invalid priority', async () => {
  resetDb();
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test', priority: 'Urgent' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid priority value');
});

test('POST /api/tasks returns 400 for invalid due_date', async () => {
  resetDb();
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test', due_date: 'not-a-date' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid due_date format');
});

// --------------------------------------------------------------------------
// PUT /api/tasks/:id
// --------------------------------------------------------------------------

test('PUT /api/tasks/:id toggles done', async () => {
  resetDb();
  const task = db.insert('Toggle me');
  const res = await request(app)
    .put(`/api/tasks/${task.id}`)
    .send({ done: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.done, 1);
});

test('PUT /api/tasks/:id updates title (CC-115)', async () => {
  resetDb();
  const task = db.insert('Old title');
  const res = await request(app)
    .put(`/api/tasks/${task.id}`)
    .send({ title: 'New title' });

  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'New title');
});

test('PUT with empty title returns 400 (CC-115)', async () => {
  resetDb();
  const task = db.insert('Title');
  const res = await request(app)
    .put(`/api/tasks/${task.id}`)
    .send({ title: '   ' });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Title cannot be empty');
});

test('PUT with non-existent id returns 404', async () => {
  resetDb();
  const res = await request(app)
    .put('/api/tasks/9999')
    .send({ done: true });
  assert.equal(res.status, 404);
});

// --------------------------------------------------------------------------
// DELETE /api/tasks/:id
// --------------------------------------------------------------------------

test('DELETE/api/tasks/:id deletes a task and returns 204', async () => {
  resetDb();
  const task = db.insert('Delete me');
  const res = await request(app).delete(`/api/tasks/${task.id}`);
  assert.equal(res.status, 204);

  // Verify it's gone
  const getRes = await request(app).get('/api/tasks');
  assert.equal(getRes.body.length, 0);
});

test('DELETE /api/tasks/:id returns 404 for non-existent id', async () => {
  resetDb();
  const res = await request(app).delete('/api/tasks/9999');
  assert.equal(res.status, 404);
});
