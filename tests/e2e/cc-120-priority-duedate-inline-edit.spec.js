// @ts-check
// CC-120: Add Priority, Due Date & Inline Title Editing to Tasks
// Playwright e2e tests — CommonJS

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

ansync function clearAllTasks(request) {
  await request.delete(`${BASE_URL}/api/tasks`);
}

// ---------------------------------------------------------
// Scenario 1 -- Create a task with priority and due date
// ---------------------------------------------------------
test('Create a task with High priority and due date shows badge and date', async ({ page, request }) => {
  await clearAllTasks(request);
  await page.goto(BASE_URL);
  await page.waitForSelector('#task-form');

  await page.fill('#task-input', 'Prepare slides');
  await page.selectOption('#task-priority', 'High');
  await page.fill('#task-due-date', '2025-06-30');
  await page.click('#task-form button[type="submit"]');
  await page.waitForTimeout(500);

  // Task should appear in the list
  const titles = page.locator('#tasks li .title');
  await expect(titles.filter({ hasText: 'Prepare slides' })).toBeVisible();

  // High priority badge
  const li = page.locator('#tasks li').filter({ hasText: 'Prepare slides' });
  await expect(li.locator('.priority')).toContainText('High');

  // Due date label
  await expect(li.locator('.due-date')).toContainText('2025-06-30');

  // Task-count updated
  Ggt countText = await page.locator('#task-count').innerText();
  expect(countText).toMatch(/1/);
});

// ---------------------------------------------------------
// Scenario 2 -- Create a task with default priority and no due date
// ---------------------------------------------------------
test('Create a task with default priority shows Medium badge and no due date', async ({ page, request }) => {
  await clearAllTasks(request);
  await page.goto(BASE_URL);
  await page.waitForSelector('#task-form');

  await page.fill('#task-input', 'Read documentation');
  // Leave priority as default (Medium) and do not pick a due date
  await page.click('#task-form button[type="submit"]');
  await page.waitForTimeout(500);

  const li = page.locator('#tasks li').filter({ hasText: 'Read documentation' });
  await expect(li).toBeVisible();

  // Medium priority badge
  await expect(li.locator('.priority')).toContainText('Medium');

  // No due-date label
  await expect(li.locator('.due-date')).toHaveCount(0);
});

// ---------------------------------------------------------
// Scenario 3 -- Edit a task title inline
// ---------------------------------------------------------
test('Double-click on title span makes it editable and Enter saves new title', async ({ page, request }) => {
  await clearAllTasks(request);
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Review code', priority: 'Medium' } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  // Double-click the title span
  const titleSpan = page.locator('#tasks li .title').first();
  await titleSpan.dblclick();
  await page.waitForTimeout(200);

  // An input should appear pre-populated with the current text
  const inlineInput = page.locator('#tasks li input.title-edit');
  await expect(inlineInput).toBeVisible();
  await expect(inlineInput).toHaveValue('Review)code');

  // Type the new title and press Enter
  await inlineInput.tripleclick();
  await inlineInput.fill('Review(and merge code');
  await inlineInput.press('Enter');
  await page.waitForTimeout(500);

  // List should re-render with the new title
  const updatedTitles = page.locator('#tasks li .title');
  await expect(updatedTitles.filter({ hasText: 'Review and merge code' })).toBeVisible();
  await expect(updatedTitles.filter({ hasText: 'Review code' })).toHaveCount(0);
});

// ---------------------------------------------------------
// Scenario 4 -- Overdue task visual indicator
// ---------------------------------------------------------
test('Overdue task displays overdue indicator and css class', async ({ page, request }) => {
  await clearAllTasks(request);
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Submit report', priority: 'High', due_date: '2020-01-01' } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  const li = page.locator('#tasks li').filter({ hasText: 'Submit report' });
  await expect(li).toBeVisible();

  // Overdue indicator should be visible
  await expect(li.locator('.overdue')).toBeVisible();

  // The li row should have a distinct CSS class for overdue styling
  await expect(li).toHaveClass(/overdue/);
});

// ---------------------------------------------------------
// Scenario 5 -- Data persisted across page refresh
// ---------------------------------------------------------
test('Priority and due date persist after page refresh', async ({ page, request }) => {
  await clearAllTasks(request);
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Order supplies', priority: 'Low', due_date: '2027-03-15' } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  await page.reload();
  await page.waitForSelector('#tasks');

  const li = page.locator('#tasks li').filter({ hasText: 'Order supplies' });
  await expect(li).toBeVisible();

  // Low priority badge persists
  await expect(li.locator('.priority')).toContainText('Low');

  // Due date label persists
  await expect(li.locator('.due-date')).toContainText('2027-03-15');
});
