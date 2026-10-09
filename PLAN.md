# Implementation Plan — Task Manager Enhancements

**Jira Epics:** [CC-105](https://dipika-achtani-epam.atlassian.net/browse/CC-105) | [CC-106](https://dipika-achtani-epam.atlassian.net/browse/CC-106)
**Jira Stories:** [CC-107](https://dipika-achtani-epam.atlassian.net/browse/CC-107) | [CC-108](https://dipika-achtani-epam.atlassian.net/browse/CC-108)
**Repository:** https://github.com/dipika-achtani/codemie-capstone/
**Branch:** feature/implementation-plan
**Confluence Plan:** https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/7929877/Implementation+Plan+Task+Manager+Enhancements

---

## 1. Overview and Objectives

The Task Manager is a lightweight, single-user Node.js/Express web application backed by a flat JSON file store (`db/tasks.json`). The current feature set covers four basic operations: create a task (title only), toggle done/not-done, delete, and view all tasks in reverse-creation order.

This implementation plan addresses two Epics that together transform the app into a genuinely useful daily work tracker:

| Epic | Summary | Business Outcome |
|------|---------|-----------------|
| CC-105 | Enhanced Task Organisation with Priority, Due Dates and Inline Editing | Users assign urgency and deadlines at creation time; overdue tasks surface automatically; cognitive load for triage is eliminated. |
| CC-106 | Task Filtering, Search and Persistent View Preferences | Users narrow a growing list instantly; preferred view survives page reload; no backend changes required. |

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 18+ | No change |
| Framework | Express 4.18.2 | No new dependencies required |
| Data store | `db/tasks.json` (fs module) | Flat-file; schema extended in-place |
| Frontend | Vanilla HTML5 / CSS3 / ES6+ JS | No framework or bundler |
| Persistence (client) | `localStorage` | CC-106 filter preference only |
| Test tooling | Manual + curl / browser DevTools | No test runner currently in repo |

---

## 3. Current State Baseline (from source)

### 3.1 API Routes (`server.js`)

| Method | Path | Current Request Body | Current Response |
|--------|------|---------------------|-----------------|
| GET | `/api/tasks` | — | Array of `{id, title, done, created_at}` |
| POST | `/api/tasks` | `{ title }` | 201 task object or 400 |
| PUT | `/api/tasks/:id` | `{ done }` | 200 task or 404 |
| DELETE | `/api/tasks/:id` | — | 204 or 404 |

### 3.2 Task Data Model (`db/init.js` — `insert()`)

Current persisted shape per task:

```json
{ "id": 1, "title": "...", "done": 0, "created_at": "2025-01-01T00:00:00.000Z" }
```

### 3.3 Frontend DOM References (`public/app.js`)

- `taskList` → `ul#tasks`
- `taskForm` → `#task-form`
- `taskInput` → `#task-input`
- `emptyMsg` → `#empty-msg` (already toggled by `renderTasks`)
- `taskCount` → `#task-count`

### 3.4 Key Source Findings

| Finding | File | Impact |
|---------|------|--------|
| Task model has only `{id, title, done, created_at}` | `db/init.js` | No priority or deadline — users cannot triage |
| `PUT /api/tasks/:id` accepts only `done` boolean | `server.js` | Title/priority cannot be edited after creation |
| `renderTasks()` renders all tasks unconditionally | `app.js` | No way to focus on pending or search by keyword |
| `done` field is 0/1 integer | `db/init.js` | Client-side filter on `task.done` is straightforward |
| `#empty-msg` element already exists and is toggled | `app.js`, `index.html` | Empty-state display can be reused for filter results |
| Red `#ef4444` already in palette (delete hover) | `style.css` | Overdue indicator styling is low effort |
| `localStorage` not yet used | `app.js` | Safe to introduce for view preference persistence |

---

## 4. Phased Delivery

### Phase 1 — CC-107: Priority, Due Dates & Overdue Highlighting

**Epic:** CC-105 | **Story:** CC-107 | **Estimated effort:** 1–2 days | **Dependencies:** None

Delivery order within Phase 1:

1. `db/init.js` — extend `insert()` and refactor `update()`
2. `server.js` — extend POST and PUT handlers
3. `public/style.css` — add badge and overdue classes
4. `public/index.html` — add priority selector and due date input to form
5. `public/app.js` — extend `addTask()`, `renderTasks()` with badges and overdue logic

### Phase 2 — CC-108: Filter Tabs, Keyword Search & localStorage Persistence

**Epic:** CC-106 | **Story:** CC-108 | **Estimated effort:** 1 day | **Dependencies:** Phase 1 must be merged first (CC-108 builds on the updated `renderTasks()` signature)

Delivery order within Phase 2:

1. `public/index.html` — add filter tabs and search input above task list
2. `public/app.js` — add `applyFilters()`, update `fetchTasks()`, persist to localStorage
3. `public/style.css` — add filter tab styles

---

## 5. File-Level Change Map

### 5.1 `db/init.js`

| Function | Change |
|----------|--------|
| `insert(title)` | Add parameters: `priority` (default `'Medium'`), `due_date` (default `null`). Persist both in the task object. |
| `update(id, done)` | Refactor to accept a partial patch object `{done, title, priority, due_date}`; apply only provided fields. Existing callers sending `{done}` alone must still work. |

**Before → After (`insert`):**

```js
// BEFORE
insert(title) {
  const task = { id: data.nextId++, title, done: 0, created_at: new Date().toISOString() };
}

// AFTER
insert(title, priority = 'Medium', due_date = null) {
  const task = { id: data.nextId++, title, done: 0, priority, due_date, created_at: new Date().toISOString() };
}
```

**Before → After (`update`):**

```js
// BEFORE
update(id, done) {
  task.done = done ? 1 : 0;
}

// AFTER
update(id, patch) {
  if (patch.done !== undefined)     task.done = patch.done ? 1 : 0;
  if (patch.title !== undefined)    task.title = patch.title.trim();
  if (patch.priority !== undefined) task.priority = patch.priority;
  if (patch.due_date !== undefined) task.due_date = patch.due_date || null;
}
```

### 5.2 `server.js`

| Route | Change |
|-------|--------|
| `POST /api/tasks` | Destructure `priority`, `due_date` from `req.body`; pass to `db.insert()`. |
| `PUT /api/tasks/:id` | Pass entire `req.body` as patch object to `db.update()`. |

```js
// POST — AFTER
const { title, priority, due_date } = req.body;
if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
const task = db.insert(title.trim(), priority, due_date);

// PUT — AFTER
const task = db.update(req.params.id, req.body);
```

### 5.3 `public/index.html`

| Section | Change |
|---------|--------|
| `.add-task form` | Add `<select id="priority-input">` with options High/Medium/Low (Medium pre-selected) and `<input type="date" id="due-date-input">`. Restructure form to flex-wrap or two-row layout. |
| `.task-list` (above `ul#tasks`) | Add filter controls: three `<button>` tabs (All / Pending / Completed) with class `filter-tab`, and `<input type="search" id="search-input">`. |

### 5.4 `public/app.js`

| Function | Change |
|----------|--------|
| `addTask(title)` | Accept and forward `priority`, `due_date` in POST body. Read from new form inputs. |
| `renderTasks(tasks)` | Render priority badge `<span class="badge badge-{priority}">`, due date label, and add `overdue` class when `due_date < today` and `!done`. |
| `fetchTasks()` | After receiving tasks from API, call `applyFilters(tasks)` before `renderTasks()`. Cache raw tasks array for search re-runs. |
| `applyFilters(tasks)` **[NEW]** | Read `activeFilter` (from `localStorage` or default `'all'`) and search query; return filtered/searched subset. |
| `initFilterTabs()` **[NEW]** | Wire click handlers to filter tab buttons; persist selection to `localStorage` under key `taskFilter`. |
| `initSearch()` **[NEW]** | Wire `input` event on `#search-input`; re-apply filters on every keystroke using cached task array. |

### 5.5 `public/style.css`

| Class | Purpose |
|-------|---------|
| `.badge` | Base badge: `inline-block`, `padding: 2px 8px`, `border-radius: 4px`, `font-size: 0.75rem`, `font-weight: 600` |
| `.badge-high` | `background: #fef2f2`, `color: #dc2626` (red tone, consistent with existing `#ef4444`) |
| `.badge-medium` | `background: #fffbeb`, `color: #d97706` (amber) |
| `.badge-low` | `background: #f0fdf4`, `color: #16a34a` (green) |
| `.overdue` | `border-left: 3px solid #ef4444; background: #fff8f8` (reuses existing red) |
| `.due-date` | `font-size: 0.8rem; color: #999; margin-left: 8px` |
| `.filter-tabs` | Flex row; `gap: 8px; padding: 14px 20px; border-bottom: 1px solid #f0f0f0` |
| `.filter-tab` | `background: #f0f2f5; border-radius: 8px; padding: 6px 14px; border: none; cursor: pointer` |
| `.filter-tab.active` | `background: #4f46e5; color: #fff` (matches existing primary accent) |
| `.search-wrap` | `padding: 10px 20px; border-bottom: 1px solid #f0f0f0` |
| `#search-input` | Full-width, `border: 1.5px solid #ddd`, `border-radius: 8px`, `padding: 8px 12px`; focus: `border-color: #4f46e5` |

---

## 6. API Contract Changes

### 6.1 `POST /api/tasks`

**Request body — Before:**
```json
{ "title": "Buy milk" }
```

**Request body — After:**
```json
{ "title": "Buy milk", "priority": "High", "due_date": "2025-12-31" }
```

**Response body — After (201):**
```json
{ "id": 5, "title": "Buy milk", "done": 0, "priority": "High", "due_date": "2025-12-31", "created_at": "2025-07-01T10:00:00.000Z" }
```

Validation rules:
- `title` — required, non-empty (HTTP 400 if missing — **existing behaviour preserved**)
- `priority` — optional; defaults to `'Medium'`; enum: `High | Medium | Low`
- `due_date` — optional; ISO date string `'YYYY-MM-DD'` or `null`/omitted

### 6.2 `PUT /api/tasks/:id`

**Request body — Before:**
```json
{ "done": true }
```

**Request body — After (partial patch — all fields optional):**
```json
{ "done": true, "title": "Updated title", "priority": "Low", "due_date": null }
```

Response: 200 updated task object or 404.
**Backward-compatible:** existing `{ done }` payloads continue to work unchanged.

### 6.3 `GET /api/tasks`

No breaking change. Response items now include `priority` and `due_date` fields in addition to existing fields.

```json
[
  { "id": 1, "title": "...", "done": 0, "priority": "Medium", "due_date": null, "created_at": "..." }
]
```

---

## 7. Data Model Changes

### 7.1 `tasks.json` schema

**Before (per task):**
```json
{ "id": 1, "title": "Read book", "done": 0, "created_at": "2025-01-01T00:00:00.000Z" }
```

**After (per task):**
```json
{ "id": 1, "title": "Read book", "done": 0, "priority": "Medium", "due_date": null, "created_at": "2025-01-01T00:00:00.000Z" }
```

**Migration note:** Existing tasks already stored in `tasks.json` will not have the `priority` or `due_date` fields. `renderTasks()` must default gracefully:
- `priority` — render badge only if `task.priority` is truthy; otherwise skip badge.
- `due_date` — render date label only if `task.due_date` is truthy.
- Overdue check — skip if `!task.due_date`.

> **No migration script is required** because `tasks.json` is excluded from git (`.gitignore`) and users start fresh on each deploy.

---

## 8. Testing Strategy

### 8.1 Phase 1 — Manual API Tests (curl)

```bash
# Create with priority and due date
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Submit report","priority":"High","due_date":"2025-12-31"}'
# Expect: 201, body contains priority="High", due_date="2025-12-31"

# Create with no due date (optional field)
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Read docs","priority":"Low"}'
# Expect: 201, due_date=null

# Create with blank title — must still reject
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"","priority":"High"}'
# Expect: 400, {"error":"Title is required"}

# Partial update — patch priority only
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"priority":"Low"}'
# Expect: 200, task with priority="Low", done field unchanged

# Backward-compat — existing { done } payload
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"done":true}'
# Expect: 200, task with done=1, other fields unchanged
```

### 8.2 Phase 1 — Browser UI Acceptance Checks (CC-107 Gherkin)

| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Default priority | Open page, inspect form | Priority dropdown shows 'Medium' selected |
| Create High + due date | Fill form, submit | Badge shows 'High'; due date rendered as 'DD MMM YYYY' |
| Create Low + no date | Fill form, omit date | Badge shows 'Low'; no date label appears |
| Overdue highlight | Seed task with past `due_date`, reload | Row has red left border; completed tasks are NOT highlighted |
| Empty title rejected | Submit blank title | No task created; server returns 400 |

### 8.3 Phase 2 — Browser UI Acceptance Checks (CC-108 Gherkin)

| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Default All view | Open page | 'All' tab active; all tasks shown |
| Pending filter | Click 'Pending' | Only `done===0` tasks shown; count updates |
| Completed filter | Click 'Completed' | Only `done===1` tasks shown |
| Keyword search | Type 'buy' | Only tasks with 'buy' (case-insensitive) in title shown |
| Filter + search combined | Select 'Pending', type 'buy' | Only pending tasks matching 'buy' shown |
| Persistence | Select 'Pending', reload page | 'Pending' re-selected; pending tasks shown immediately |
| Empty state | Apply filter matching nothing | `#empty-msg` visible; `taskCount` empty |

### 8.4 Regression Checks (existing functionality must not break)

- `GET /api/tasks` still returns array (now includes new fields)
- Checkbox toggle (`PUT done`) still works — existing `{ done }` payload still accepted
- Delete task (`DELETE`) still returns 204
- Existing tasks without `priority`/`due_date` fields render without JS errors

---

## 9. Risks and Open Questions

### 9.1 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R1 | Existing `tasks.json` in production lacks new fields; `renderTasks` crashes on `undefined` | Low | Medium | Null-guard in `renderTasks`: `task.priority ?? 'Medium'` |
| R2 | `PUT /api/tasks/:id` currently receives `{ done }` — callers sending old payload must still work | High | High | Patch function reads each field conditionally; `{ done }` alone still works |
| R3 | Date comparison for overdue is timezone-sensitive | Medium | Low | Compare date strings (`YYYY-MM-DD`) against `new Date().toISOString().slice(0,10)` |
| R4 | `localStorage` unavailable in private/incognito mode | Low | Low | Wrap in `try/catch`; default to `'all'` filter on error |
| R5 | Form layout breaks on small screens with extra fields | Medium | Low | Use `flex-wrap` on `.add-task form`; test at 320px width |

### 9.2 Open Questions

| # | Question | Recommendation |
|---|----------|---------------|
| Q1 | Should `priority` and `due_date` be editable inline on the task row, or only via a dedicated edit view? | Epic CC-105 mentions inline editing. Implement as double-click-to-edit on title + a small edit icon to open a popover for `priority`/`due_date`. Defer to developer spike. |
| Q2 | Should 'bulk complete' or 'clear completed' be in scope? | No evidence in current codebase. Defer — log as a separate story if needed. |
| Q3 | Is the native `<input type="date">` picker sufficient? | Yes — supported in all modern browsers targeting the Node.js 18+ environment. |
| Q4 | What should task count show in CC-108 filter mode? | Show count of matching tasks with 'N remaining' based on pending within the filtered set — consistent with existing format. |

---

## 10. Implementation Checklist

### Phase 1 (CC-107)

- [ ] `db/init.js`: add `priority` and `due_date` to `insert()`
- [ ] `db/init.js`: refactor `update()` to accept partial patch
- [ ] `server.js`: destructure `priority`, `due_date` in POST handler
- [ ] `server.js`: pass `req.body` as patch to `update()` in PUT handler
- [ ] `public/style.css`: add `.badge`, `.badge-high`, `.badge-medium`, `.badge-low`, `.overdue`, `.due-date`
- [ ] `public/index.html`: add priority `<select>` and due date `<input type="date">` to form
- [ ] `public/app.js`: update `addTask()` to read and send new form fields
- [ ] `public/app.js`: update `renderTasks()` to render badge, due date, and overdue class
- [ ] Manual tests: all 5 CC-107 Gherkin scenarios pass
- [ ] Regression: existing toggle/delete/GET still work

### Phase 2 (CC-108)

- [ ] `public/index.html`: add `.filter-tabs` section and `#search-input` above task list
- [ ] `public/app.js`: add `applyFilters()`, `initFilterTabs()`, `initSearch()`
- [ ] `public/app.js`: update `fetchTasks()` to call `applyFilters()` before `renderTasks()`
- [ ] `public/app.js`: read/write `localStorage` key `'taskFilter'`
- [ ] `public/style.css`: add `.filter-tabs`, `.filter-tab`, `.filter-tab.active`, `.search-wrap`, `#search-input`
- [ ] Manual tests: all 6 CC-108 Gherkin scenarios pass
- [ ] Regression: Phase 1 features unaffected

---

## 11. Jira Traceability

| Jira Key | Type | Title | Phase |
|----------|------|-------|-------|
| [CC-105](https://dipika-achtani-epam.atlassian.net/browse/CC-105) | Epic | Enhanced Task Organisation with Priority, Due Dates and Inline Editing | 1 |
| [CC-107](https://dipika-achtani-epam.atlassian.net/browse/CC-107) | Story | Add Priority Level and Due Date When Creating a Task | 1 |
| [CC-106](https://dipika-achtani-epam.atlassian.net/browse/CC-106) | Epic | Task Filtering, Search and Persistent View Preferences | 2 |
| [CC-108](https://dipika-achtani-epam.atlassian.net/browse/CC-108) | Story | Filter Task List by Status and Search by Keyword | 2 |
