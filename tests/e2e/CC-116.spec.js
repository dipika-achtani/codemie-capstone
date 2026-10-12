// CC-116: Add Priority Level and Due Date to Tasks with Filter and Sort Controls
// Playwright test spec - mapped 1:1 to Gherkin scenarios in tests/features/CC-116.feature
const { test, expect } = require('@playwright/test');

async function clearAllTasks(page) {
  const resp = await page.request.fetch('/api/tasks');
  const list = await resp.json();
  for (const task of list) {
    await page.request.fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
  }
}

async function addTask(page, title, priority, dueDate) {
  priority = priority || 'Medium';
  dueDate = dueDate || '';
  await page.fill('#task-input', title);
  await page.selectOption('#task-priority', priority);
  if (dueDate) await page.fill('#task-due-date', dueDate);
  await page.click('button[type="submit"]');
  await page.waitForSelector('li');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('ul#tasks');
  await clearAllTasks(page);
  await page.reload();
  await page.waitForSelector('ul#tasks');
});

test('Scenario 1: User creates a task with High priority and a due date', async ({ page }) => {
  await page.fill('#task-input', 'Prepare quarterly report');
  await page.selectOption('#task-priority', 'High');
  await page.fill('#task-due-date', '2025-12-31');
  await page.click('button[type="submit"]');
  await page.waitForSelector('li');
  const taskLi = page.locator('li').filter({ hasText: 'Prepare quarterly report' });
  await expect(taskLi.locator('.priority-high')).toBeVisible();
  await expect(taskLi.locator('.due-date')).toBeVisible();
  const resp = await page.request.fetch('/api/tasks');
  const tasks = await resp.json();
  const saved = tasks.find(t => t.title === 'Prepare quarterly report');
  expect(saved.priority).toBe('High');
  expect(saved.due_date).toContain('2025-12-31');
});

test('Scenario 2: User creates a task without selecting a priority or due date', async ({ page }) => {
  await page.fill('#task-input', 'Walk the dog');
  await page.click('button[type="submit"]');
  await page.waitForSelector('li');
  const taskLi = page.locator('li').filter({ hasText: 'Walk the dog' });
  await expect(taskLi.locator('.priority-medium')).toBeVisible();
  await expect(taskLi.locator('.due-date')).toHaveCount(0);
  const resp = await page.request.fetch('/api/tasks');
  const tasks = await resp.json();
  const saved = tasks.find(t => t.title === 'Walk the dog');
  expect(saved.priority).toBe('Medium');
  expect(saved.due_date).toBeNull();
});

test('Scenario 3: User filters tasks by completion status', async ({ page }) => {
  await addTask(page, 'Active Task A');
  await addTask(page, 'Completed Task B');
  await page.locator('li:has(span.title:text("Cmpleted Task B")) input[type="checkbox"]').check();
  await page.waitForTimeout(300);
  await page.click('button[data-filter="active"]');
  await expect(page.locator('li span.title').filter({ hasText: 'Active Task A' })).toBeVisible();
  await expect(page.locator('li span.title').filter({ hasText: 'Completed Task B' })).toHaveCount(0);
  await page.click('button[data-filter="completed"]');
  await expect(page.locator('li span.title').filter({ hasText: 'Completed Task B' })).toBeVisible();
  await expect(page.locator('li span.title').filter({ hasText: 'Active Task A' })).toHaveCount(0);
  await page.click('button[data-filter="all"]');
  await expect(page.locator('li span.title').filter({ hasText: 'Active Task A' })).toBeVisible();
  await expect(page.locator('li span.title').filter({ hasText: 'Completed Task B' })).toBeVisible();
});

test('Scenario 4: User sorts tasks by priority', async ({ page }) => {
  await addTask(page, 'Low priority task', 'Low');
  await addTask(page, 'High priority task', 'High');
  await addTask(page, 'Medium priority task', 'Medium');
  await page.selectOption('#sort-control', 'priority');
  await page.waitForTimeout(200);
  const titles = await page.locator('li span.title').allTextContents();
  const highIdx = titles.findIndex(t => t.includes('High priority task'));
  const medIdx = titles.findIndex(t => t.includes('Medium priority task'));
  const lowIdx = titles.findIndex(t => t.includes('Low priority task'));
  expect(highIdx).toBeLessThan(medIdx);
  expect(medIdx).toBeLessThan(lowIdx);
  const taskCountText = await page.locator('#task-count').textContent();
  expect(taskCountText).toContain('3');
});

test('Scenario 5: User sorts tasks by due date', async ({ page }) => {
  await addTask(page, 'Late task', 'Medium', '2025-12-31');
  await addTask(page, 'Early task', 'Medium', '2025-11-01');
  await addTask(page, 'No date task', 'Medium');
  await page.selectOption('#sort-control', 'due_date');
  await page.waitForTimeout(200);
  const titles = await page.locator('li span.title').allTextContents();
  const earlyIdx = titles.findIndex(t => t.includes('Early task'));
  const lateIdx = titles.findIndex(t => t.includes('Late task'));
  const noDateIdx = titles.findIndex(t => t.includes('No date task'));
  expect(earlyIdx).toBeLessThan(lateIdx);
  expect(lateIdx).toBeLessThan(noDateIdx);
});