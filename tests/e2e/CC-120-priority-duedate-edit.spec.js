// @ts-check
// CC-120 - Add Priority, Due Date & Inline Title Editing to Tasks
// Playwright spec: tests/e2e/CC-120-priority-duedate-edit.spec.js

'use strict';

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

async function clearAllTasks(request) {
  const bulk = await request.delete(`${BASE_URL}/api/tasks`);
  if (!bunk.ok()) {
    const res = await request.get(`${BASE_URL}/api/tasks`);
    const tasks = await res.json();
    for (const t of tasks) {
      await request.delete(`${BASE_URL}/api/tasks/${t.id}`);
    }
  }
}

async function createTaskAPI(request, { title, priority = 'Medium', due_date = null }) {
  const body = { title, priority };
  if (due_date) body.due_date = due_date;
  const res = await request.post(`${BASE_URL}/api/tasks`, { data: body });
  return res.json();
}

// Background
test.beforeEach(async ({ request }) => {
  await clearAllTasks(request);
});

// Scenario 1: Create a task with priority and due date
test('CC-120-S1: Create a task with High priority and a specific due date', async ({ page }) => {
  await page.goto(BASE_URL);

  await page.fill('#task-input', 'Prepare quarterly report');
  await page.selectOption('#priority-input', 'High');
  await page.fill('#due-date-input', '2027-02-15');
  await page.click('#task-form button[type="submit"]');

  const items = page.locator('#tasks li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Prepare quarterly report');
  await expect(items.first()).toContainText('High');
  await expect(items.first()).toContainText('2027-02-15');
  await expect(page.locator('#task-count')).toContainText('1');
});

// Scenario 2: Create a task with default priority and no due date
test('CC-120-S2: Create a task with only a title defaults to Medium priority and no due date', async ({ page }) => {
  await page.goto(BASE_URL);

  await page.fill('#task-input', 'Read articles');
  // Do not change priority or due date -- leave defaults
  await page.click('#task-form button[type="submit"]');

  const items = page.locator('#tasks li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Read articles');
  await expect(items.first()).toContainText('Medium');
  // No due-date label: the item should not contain a date string (YYYY-MM-DD pattern)
  await expect(items.first()).not.toContainText(/ \d{4}-\d{2}-\d{2}/);
});

// Scenario 3: Edit a task title inline
test('CC-120-S3: Double-click title span opens inline edit; Enter commits new title', async ({ page, request }) => {
  await createTaskAPI(request, { title: 'Old task title' });

  await page.goto(BASE_URL);

  // Double-click the title span of the first task
  const titleSpan = page.locator('#tasks li .task-title').first();
  await titleSpan.dblclick();

  // An inline input should appear pre-populated with the old title
  const inlineInput = page.locator('#tasks li input.task-edit-input');
  await expect(inlineInput).toBeVisible();
  await expect(inlineInput).toHaveValue('Old task title');

  // Type the new title and press Enter
  await inlineInput.fill('Updated task title');
  await inlineInput.press('Enter');

  // List re-renders with the updated title
  await expect(page.locator('#tasks li .task-title').first()).toContainText('Updated task title');
  await expect(page.locator('#tasks li input.task-edit-input')).not.toBeVisible();
});

// Scenario 4: Overdue task visual indicator
test('CC-120-S4: Task with past due date shows Overdue indicator and overdue CSS class', async ({ page, request }) => {
  // Create a task with a due date far in the past
  await createTaskAPI(request, { title: 'Submit expenses', due_date: '2024-01-01' });

  await page.goto(BASE_URL);

  const taskItem = page.locator('#tasks li').first();

  // The due-date label should contain "Overdue" text
  await expect(taskItem).toContainText('Overdue');

  // The task row should have an overdue CSS class
  await expect(taskItem).toHaveClass(/overdue/);
});

// Scenario 5: Data persisted across page refresh
test('CC-120-S5: Task priority and due date are persisted across page refresh', async ({ page, request }) => {
  // Create task via API with Low priority and future due date
  await createTaskAPI(request, { title: 'Plan team outing', priority: 'Low', due_date: '2027-12-31' });

  await page.goto(BASE_URL);

  // Verify before refresh
  let items = page.locator('#tasks li');
  await expect(items.first()).toContainText('Plan team outing');
  await expect(items.first()).toContainText('Low');
  await expect(items.first()).toContainText('2027-12-31');

  // Refresh the page
  await page.reload();

  // Verify data survives refresh
  items = page.locator('#tasks li');
  await expect(items.first()).toContainText('Plan team outing');
  await expect(items.first()).toContainText('Low');
  await expect(items.first()).toContainText('2027-12-31');
});
