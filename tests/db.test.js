/**
 * Unit tests for db/init.js
 * Uses Node.js 18+ built-in test runner (node:test) + assert.
 *
 * Stories: CC-116, CA-115
 *
 * Run: node --test tests/db.test.js
 */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// --------------------------------------------------------------------------
// Isolate db module from the real tasks.json
// We point DB_PATH to a temp file so tests never touch production data.
// --------------------------------------------------------------------------
const TEMP_DB = path.join(__dirname, '_test_tasks.json');

// Write an empty store before the first require so the file exists.
fsSyncWrite(TEMP_DB);

// Monkey-patch path.join so that when db/init.js calls
//   path.join(__dirname, 'tasks.json')
// it gets our temp file instead.  We restore it after all tests.
const originalJoin = path.join.bind(path);
path.join = (...args) => {
  const result = originalJoin(...args);
  if (result.endsWith(path.sep + 'tasks.json') && result.includes('db')) {
    return TEMP_DB;
  }
  return result;
};

// Now require the module (it will use the patched path.join).
const db = require('../db/init');

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function fsSyncWrite(filePath) {
  fs.writeFileSync(filePath, JSON.stringify({ tasks: [], nextId: 1 }), 'utf8');
}

function resetDb() {
  fsSyncWrite(TEMP_DB);
}

// --------------------------------------------------------------------------
// Lifecycle
// --------------------------------------------------------------------------
before(() => resetDb());
after(() => {
  path.join = originalJoin;
  if (fs.existsSync(TEMP_DB)) fs.unlinkSync(TEMP_DB);
});

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

test('db.all() returns empty array on fresh store', () => {
  resetDb();
  assert.deepEqual(db.all(), []);
});

test('db.insert() stores title, priority, due_date and returns the task', () => {
  resetDb();
  const task = db.insert('Buy milk', 'High', '2025-08-01');

  assert.equal(task.title, 'Buy milk');
  assert.equal(task.priority, 'High');
  assert.equal(task.due_date, '2025-08-01');
  assert.equal(task.done, 0);
  assert.ok(task.id > 0);
  assert.ok(task.created_at);
});

test('db.insert() defaults priority to Medium and due_date to null', () => {
  resetDb();
  const task = db.insert('Walk dog');

  assert.equal(task.priority, 'Medium');
  assert.equal(task.due_date, null);
});

test('db.all() returns tasks in reverse insertion order', () => {
  resetDb();
  db.insert('First');
  db.insert('Second');
  db.insert('Third');

  const tasks = db.all();
  assert.equal(tasks[0].title, 'Third');
  assert.equal(tasks[1].title, 'Second');
  assert.equal(tasks[2].title, 'First');
});

test('db.update() toggles done field', () => {
  resetDb();
  const inserted = db.insert('Test task');
  const updated = db.update(inserted.id, { done: true });

  assert.equal(updated.done, 1);
  assert.equal(updated.title, 'Test task');
});

test('db.update() updates title field', () => {
  resetDb();
  const inserted = db.insert('Old title');
  const updated = db.update(inserted.id, { title: 'New title' });

  assert.equal(updated.title, 'New title');
  assert.equal(updated.done, 0);
});

test('db.update() can update both done and title simultaneously', () => {
  resetDb();
  const inserted = db.insert('Original');
  const updated = db.update(inserted.id, { done: true, title: 'Updated' });

  assert.equal(updated.done, 1);
  assert.equal(updated.title, 'Updated');
});

test('db.update() returns null for non-existent id', () => {
  resetDb();
  assert.equal(db.update(9999, { done: true }), null);
});

test('db.update() with done:false sets done to 0', () => {
  resetDb();
  const inserted = db.insert('Task');
  db.update(inserted.id, { done: true });
  const updated = db.update(inserted.id, { done: false });
  assert.equal(updated.done, 0);
});

test('db.remove() deletes an existing task and returns true', () => {
  resetDb();
  const task = db.insert('To delete');
  assert.equal(db.remove(task.id), true);
  assert.equal(db.all().length, 0);
});

test('db.remove() returns false for non-existent id', () => {
  resetDb();
  assert.equal(db.remove(9999), false);
});

test('db.insert() increments id for each new task', () => {
  resetDb();
  const t1 = db.insert('Task 1');
  const t2 = db.insert('Task 2');
  const t3 = db.insert('Task 3');

  assert.ok(t2.id > t1.id);
  assert.ok(t3.id > t2.id);
});

test('db.update() persists changes to disk', () => {
  resetDb();
  const inserted = db.insert('Persist me');
  db.update(inserted.id, { title: 'Persisted', done: true });

  const tasks = db.all();
  const found = tasks.find(t => t.id === inserted.id);
  assert.ok(found);
  assert.equal(found.title, 'Persisted');
  assert.equal(found.done, 1);
});
