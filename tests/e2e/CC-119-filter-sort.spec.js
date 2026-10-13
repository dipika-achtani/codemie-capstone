// @ts-check
// CC-119 - Task Filter Tabs, Sort Controls & Persistent View Preferences
// Playwright spec: tests/e2e/CC-119-filter-sort.spec.js

'use strict';

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

/**
 * Helper: wipe all tasks via DELETE /api/tasks (bulk-delete endpoint).
 * Falls back to fetching all and deleting one-by-one if no bulk endpoint.
 */
async function clearAllTasks(request) {
  const bulk = await request.delete(`${BASE_URL}/api/tasks`);
  if (!bulk.ok()) {
    const res = await request.get(`${BASE_URL}/api/tasks`);
    const tasks = await res.json();
    for (const t of tasks) {
      await request.delete(`${BASE_URL}/api/tasks/${t.id}`);
    }
  }
}

/**
 * Helper: create a task via POST /api/tasks
 */
async function createTask(request, { title, priority = 'Medium', due_date = null, done = false }) {
  const body = { title, priority };
  if (due_date) body.due_date = due_date;
  const res = await request.post(`${BASE_URL}/api/tasks`, { data: body });
  const task = await res.json();
  if (done) {
    await request.put(`${BASE_URL}/api/tasks/${task.id}`, { data: { done: true } });
  }
  return task;
}

// Background
test.beforeEach(async ({ request }) => {
  await clearAllTasks(request);
});

// Scenario 1: Filter to Active tasks
test('CC-119-S1: Filter to Active tasks shows only pending tasks and highlights tab', async ({ page, request }) => {
  await createTask(request, { title: 'Buy groceries', priority: 'Medium' });
  await createTask(request, { title: 'Pay bills', priority: 'Medium', done: true });

  await page.goto(BASE_URL);

  await page.click('.filter-tabs button[data-filter="active"]');

  const items = page.locator('#tasks li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Buy groceries');
  await expect(page.locator('#tasks')).not.toContainText('Pay bills');
  await expect(page.locator('#task-count')).toContainText('1');
  await expect(page.locator('.filter-tabs button[data-filter="active"]')).toHaveClass(/active/);
});

// Scenario 2: Filter to Completed tasks
test('CC-119-S2: Filter to Completed tasks shows only done tasks and highlights tab', async ({ page, request }) => {
  await createTask(request, { title: 'Write report', priority: 'Medium' });
  await createTask(request, { title: 'Send email', priority: 'Medium', done: true });

  await page.goto(BASE_URL);

  await page.click('.filter-tabs button[data-filter="completed"]');

  const items = page.locator('#tasks li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Send email');
  await expect(page.locator('#tasks')).not.toContainText('Write report');
  await expect(page.locator('#task-count')).toContainText('1');
  await expect(page.locator('.filter-tabs button[data-filter="completed"]')).toHaveClass(/active/);
});

// Scenario 3: Sort tasks by priority
test('CC-119-S3: Sort by Priority orders tasks High then Medium then Low', async ({ page, request }) => {
  await createTask(request, { title: 'Clean desk', priority: 'Low' });
  await createTask(request, { title: 'Fix critical bug', priority: 'High' });
  await createTask(request, { title: 'Review&÷ PR'vò, priority: 'Medium' });

  await page.goto(BASE_URL);

  await page.selectOption('#sort-select', 'priority');

  const items = page.locator('#tasks li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Fix critical bug');
  await expect(items.nth(1)).toContainText('Review&÷ PR');
  await expect(items.nth(2)).toContainText('Clean desk');
  await expect(page.locator('#task-count')).toContainText('3');
});

// Scenario 4: Sort tasks by due date
test('CC-119-S4: Sort by Due Date orders nearest due date first, no-date tasks last', async ({ page, request }) => {
  await createTask(request, { title: 'Later deadline', priority: 'Medium', due_date: '2027-03-20' });
  await createTask(request, { title: 'No deadline', priority: 'Medium' });
  await createTask(request, { title: 'Early deadline', priority: 'Medium', due_date: '2027-01-10' });

  await page.goto(BASE_URL);

  await page.selectOption('#sort-select', 'due');

  const items = page.locator('#tasks li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Early deadline');
  await expect(items.nth(1)).toContainText('Later deadline');
  await expect(items.nth(2)).toContainText('No deadline');
});

// Scenario 5: Filter and sort preferences persist across refresh
test('CC-119-S5: Filter and sort preferences are persisted in localStorage across page refresh', async ({ page, request }) => {
  await createTask(request, { title: 'Fix critical bug', priority: 'High' });
  await createTask(request, { title: 'Review PR', priority: 'Medium', done: true });

  await page.goto(BASE_URL);

  await page.click('.filter-tabs button[data-filter="active"]');
  await page.selectOption('#sort-select', 'priority');

  const filterVal = await page.evaluate(() => localStorage.getItem('tm_filter'));
  const sortVal   = await page.evaluate(() => localStorage.getItem('tm_sort'));
  expect(filterVal).toBe('active');
  expect(sortVal).toBe('priority');

  await page.reload();

  await expect(page.locator('.filter-tabs button[data-filter="active"]')).toHaveClass(/active/);
  await expect(page.locator('#sort-select')).toHaveValue('priority');
});
