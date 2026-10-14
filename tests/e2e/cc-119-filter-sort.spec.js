// @ts-check
// CC-119: Task Filter Tabs, Sort Controls & Persistent View Preferences
// Playwright e2e tests — CommonJS

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

async function clearAllTasks(request) {
  await request.delete(`${BASE_URL}/api/tasks`);
}

// ---------------------------------------------------------
// Scenario 1 -- Filter to Active tasks
// ---------------------------------------------------------
test('Filter to Active tasks shows only pending tasks and highlights Active tab', async ({ page, request }) => {
  await clearAllTasks(request);

  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Buy groceries', priority: 'Medium' } });
  const compResp = await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Pay bills', priority: 'Medium' } });
  const compData = await compResp.json();
  await request.put(`${BASE_URL}/api/tasks/${compData.id}`, { data: { done: true } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  await page.click('button[data-filter="active"]');
  await page.waitForTimeout(300);

  const titles = page.locator('#tasks li .title');
  await expect(titles.filter({ hasText: 'Buy groceries' })).toBeVisible();
  await expect(titles.filter({ hasText: 'Pay bills' })).toHaveCount(0);
  await expect(page.locator('button[data-filter="active"]')).toHaveClass(/active/);
  const countText = await page.locator('#task-count').innerText();
  expect(countText).toMatch(/1/);
});

// ---------------------------------------------------------
// Scenario 2 -- Filter to Completed tasks
// ---------------------------------------------------------
test('Filter to Completed tasks shows only done tasks and highlights Completed tab', async ({ page, request }) => {
  await clearAllTasks(request);

  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Write report', priority: 'Medium' } });
  const compResp = await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Send email', priority: 'Medium' } });
  const compData = await compResp.json();
  await request.put(`${BASE_URL}/api/tasks/${compData.id}`, { data: { done: true } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  await page.click('button[data-filter="completed"]');
  await page.waitForTimeout(300);

  const titles = page.locator('#tasks li .title');
  await expect(titles.filter({ hasText: 'Send email' })).toBeVisible();
  await expect(titles.filter({ hasText: 'Write report' })).toHaveCount(0);
  await expect(page.locator('button[data-filter="completed"]')).toHaveClass(/active/);
  const countText = await page.locator('#task-count').innerText();
  expect(countText).toMatch(/1/);
});

// ---------------------------------------------------------
// Scenario 3 -- Sort tasks by priority
// ---------------------------------------------------------
test('Sort by Priority orders tasks High then Medium then Low', async ({ page, request }) => {
  await clearAllTasks(request);

  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Low task', priority: 'Low' } });
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'High task', priority: 'High' } });
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Medium task', priority: 'Medium' } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  await page.selectOption('#sort-control', 'priority');
  await page.waitForTimeout(300);

  const titles = await page.locator('#tasks li .title').allInnerTexts();
  const highIdx = titles.findIndex(t => t.includes('High task'));
  const medIdx = titles.findIndex(t => t.includes('Medium task'));
  const lowIdx = titles.findIndex(t => t.includes('Low task'));

  expect(highIdx).toBeLessThan(medIdx);
  expect(medIdx).toBeLessThan(lowIdx);
  await expect(page.locator('#task-count')).toBeVisible();
});

// ---------------------------------------------------------
// Scenario 4 -- Sort tasks by due date
// ---------------------------------------------------------
test('Sort by Due Date orders tasks nearest date first and no-date tasks last', async ({ page, request }) => {
  await clearAllTasks(request);

  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'No date task', priority: 'Medium' } });
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Late task', priority: 'Medium', due_date: '2025-12-31' } });
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Early task', priority: 'Medium', due_date: '2025-01-15' } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  await page.selectOption('#sort-control', 'due_date');
  await page.waitForTimeout(300);

  const titles = await page.locator('#tasks li .title').allInnerTexts();
  const earlyIdx = titles.findIndex(t => t.includes('Early task'));
  const lateIdx = titles.findIndex(t => t.includes('Late task'));
  const noDateIdx = titles.findIndex(t => t.includes('No date task'));

  expect(earlyIdx).toBeLessThan(lateIdx);
  expect(lateIdx).toBeLessThan(noDateIdx);
  await expect(page.locator('#tasks')).toBeVisible();
});

// ---------------------------------------------------------
// Scenario 5 -- Filter and sort preferences persisted across refresh
// ---------------------------------------------------------
test('Filter and sort preferences are persisted in localStorage across page refresh', async ({ page, request }) => {
  await clearAllTasks(request);

  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Task Alpha', priority: 'High' } });
  await request.post(`${BASE_URL}/api/tasks`, { data: { title: 'Task Beta', priority: 'Low' } });

  await page.goto(BASE_URL);
  await page.waitForSelector('#tasks');

  await page.click('button[data-filter="active"]');
  await page.selectOption('#sort-control', 'priority');
  await page.waitForTimeout(300);

  const tmFilter = await page.evaluate(() => localStorage.getItem('tm_filter'));
  const tmSort = await page.evaluate(() => localStorage.getItem('tm_sort'));
  expect(tmFilter).toBe('active');
  expect(tmSort).toBe('priority');

  await page.reload();
  await page.waitForSelector('#tasks');

  await expect(page.locator('button[data-filter="active"]')).toHaveClass(/active/);
  await expect(page.locator('#sort-control')).toHaveValue('priority');
});
