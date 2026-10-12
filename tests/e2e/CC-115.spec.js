// CC-115: Enable Inline Task Title Editing with Confirmation-Guarded Deletion
// Playwright test spec - mapped 1:1 to Gherkin scenarios in tests/features/CC-115.feature
const { test, expect } = require('@playwright/test');

async function clearAllTasks(page) {
  const resp = await page.request.fetch('/api/tasks');
  const list = await resp.json();
  for (const task of list) {
    await page.request.fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
  }
}

async function addTask(page, title) {
  await page.fill('#task-input', title);
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

test('Scenario 1: User edits a task title inline and saves via Enter', async ({ page }) => {
  await addTask(page, 'Buy groceries');
  const titleSpan = page.locator('li span.title').filter({ hasText: 'Buy groceries' });
  await titleSpan.dblclick();
  const editInput = page.locator('li input.title-edit');
  await expect(editInput).toBeVisible();
  await expect(editInput).toBeFocused();
  await expect(editInput).toHaveValue('Buy groceries');
  await editInput.fill('Buy groceries and milk');
  await editInput.press('Enter');
  await expect(page.locator('li span.title').filter({ hasText: 'Buy groceries and milk' })).toBeVisible();
  await expect(page.locator('li input.title-edit')).toHaveCount(0);
  await page.reload();
  await page.waitForSelector('ul#tasks');
  await expect(page.locator('li span.title').filter({ hasText: 'Buy groceries and milk' })).toBeVisible();
});

test('Scenario 2: User cancels an in-progress edit via Escape', async ({ page }) => {
  await addTask(page, 'Read a book');
  const titleSpan = page.locator('li span.title').filter({ hasText: 'Read a book' });
  await titleSpan.dblclick();
  const editInput = page.locator('li input.title-edit');
  await editInput.fill('Read two books');
  await editInput.press('Escape');
  await expect(page.locator('li span.title').filter({ hasText: 'Read a book' })).toBeVisible();
  await expect(page.locator('li input.title-edit')).toHaveCount(0);
});

test('Scenario 3: User attempts to save an empty title', async ({ page }) => {
  await addTask(page, 'Call the bank');
  const titleSpan = page.locator('li span.title').filter({ hasText: 'Call the bank' });
  await titleSpan.dblclick();
  const editInput = page.locator('li input.title-edit');
  await editInput.fill('');
  await editInput.press('Enter');
  await expect(page.locator('li span.title').filter({ hasText: 'Call the bank' })).toBeVisible();
  await expect(page.locator('li input.title-edit')).toHaveCount(0);
});

test('Scenario 4: User deletes a task and confirms the action', async ({ page }) => {
  await addTask(page, 'Schedule meeting');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('li:has(span.title:text("Schedule meeting")) button.delete').click();
  await expect(page.locator('li span.title').filter({ hasText: 'Schedule meeting' })).toHaveCount(0);
  await page.reload();
  await page.waitForSelector('ul#tasks');
  await expect(page.locator('li span.title').filter({ hasText: 'Schedule meeting' })).toHaveCount(0);
});

test('Scenario 5: User cancels a delete action', async ({ page }) => {
  await addTask(page, 'Pay the rent');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('li:has(span.title:text("Pay the rent")) button.delete').click();
  await expect(page.locator('li span.title').filter({ hasText: 'Pay the rent' })).toBeVisible();
});