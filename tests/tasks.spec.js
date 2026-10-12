const { test, expect } = require('@playwright/test');

// Before each test, wipe all tasks via the API so tests start from a clean slate
test.beforeEach(async ({ page, request }) => {
  const res = await request.get('/api/tasks');
  const tasks = await res.json();
  for (const task of tasks) {
    await request.delete(`/api/tasks/${task.id}`);
  }
  await page.goto('/');
});

test('page loads with correct heading', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Task Manager');
});

test('shows empty state when no tasks exist', async ({ page }) => {
  await expect(page.locator('#empty-msg')).toBeVisible();
  await expect(page.locator('#empty-msg')).toHaveText('No tasks yet. Add one above!');
});

test('can add a task', async ({ page }) => {
  await page.fill('#task-input', 'Buy groceries');
  await page.click('button[type="submit"]');

  await expect(page.locator('#tasks li')).toHaveCount(1);
  await expect(page.locator('span.title')).toHaveText('Buy groceries');
  await expect(page.locator('#empty-msg')).toBeHidden();
});

test('task count updates correctly after adding tasks', async ({ page }) => {
  await page.fill('#task-input', 'Task one');
  await page.click('button[type="submit"]');
  await page.fill('#task-input', 'Task two');
  await page.click('button[type="submit"]');

  await expect(page.locator('#task-count')).toHaveText('2 tasks — 2 remaining');
});

test('does not add a task when input is empty', async ({ page }) => {
  await page.click('button[type="submit"]');

  await expect(page.locator('#tasks li')).toHaveCount(0);
  await expect(page.locator('#empty-msg')).toBeVisible();
});

test('can mark a task as done', async ({ page }) => {
  await page.fill('#task-input', 'Write tests');
  await page.click('button[type="submit"]');

  await page.locator('#tasks input[type="checkbox"]').check();

  await expect(page.locator('#tasks li')).toHaveClass(/done/);
  await expect(page.locator('#task-count')).toContainText('0 remaining');
});

test('can delete a task', async ({ page }) => {
  await page.fill('#task-input', 'Delete me');
  await page.click('button[type="submit"]');

  await page.locator('button.delete').click();

  await expect(page.locator('#tasks li')).toHaveCount(0);
  await expect(page.locator('#empty-msg')).toBeVisible();
});

test('input is cleared after adding a task', async ({ page }) => {
  await page.fill('#task-input', 'Temporary task');
  await page.click('button[type="submit"]');

  await expect(page.locator('#task-input')).toHaveValue('');
});
