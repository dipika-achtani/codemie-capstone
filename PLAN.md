# Implementation Plan — Task Manager Enhancements

**Date:** 2025-07-14
**Prepared by:** Senior Solution Architect
**Jira Epics:** [CC-109](https://dipika-achtani-epam.atlassian.net/browse/CC-109) · [CC-110](https://dipika-achtani-epam.atlassian.net/browse/CC-110)
**Jira Stories:** [CC-111](https://dipika-achtani-epam.atlassian.net/browse/CC-111) · [CC-112](https://dipika-achtani-epam.atlassian.net/browse/CC-112)
**Repository:** https://github.com/dipika-achtani/codemie-capstone
**Branch:** `feature/implementation-plan`

---

## 1. Overview & Objectives

The Task Manager is a single-user personal productivity web application built on Node.js + Express with a JSON flat-file datastore. Its current feature set is minimal: add a titled task, toggle done/undone, delete. Four targeted enhancements — driven by two Jira epics — will transform it into a genuinely useful daily tool.

### Objectives

| # | Objective | Jira Ref |
|---|-----------|----------|
| 1 | Add `priority` (High/Medium/Low) and `due_date` fields to task creation | CC-109 / CC-111 |
| 2 | Expose filter and sort controls (status, priority, due date) in the UI | CC-109 / CC-111 |
| 3 | Enable inline title editing via double-click with Save/Cancel controls | CC-110 / CC-112 |
| 4 | Replace immediate deletion with a custom confirmation guard | CC-110 / CC-112 |

### Guiding Principles

- **Backwards compatibility:** Existing `tasks.json` records without `priority`/`due_date` must work without migration; defaults applied at read-time.
- **No new dependencies:** All changes within the existing Express + vanilla JS stack.
- **No `window.confirm()`:** Delete confirmation implemented as an inline custom UI.
- **Server-side validation:** Priority enum validated in `server.js`; empty-title rejected both client- and server-side.

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 18+ |
| Web Framework | Express | ^4.18.2 |
| Datastore | JSON flat-file (`db/tasks.json`) via `db/init.js` | — |
| Frontend | Vanilla HTML5 / CSS3 / ES2017 JavaScript | — |
| Styling | Custom CSS (`public/style.css`) | — |
| Package Manager | npm | — |

> No new `npm` packages are required for either story.

---

## 3. Current State Inventory

### 3.1 API Routes (server.js)

| Method | Path | Current Behaviour |
|--------|------|-------------------|
| GET | `/api/tasks` | Returns all tasks, newest-first (`db.all().reverse()`) |
| POST | `/api/tasks` | Accepts `{ title }` only; calls `db.insert(title)` |
| PUT | `/api/tasks/:id` | Accepts `{ done }` only; calls `db.update(id, done)` |
| DELETE | `/api/tasks/:id` | Calls `db.remove(id)`; returns `204` |

### 3.2 Data Model (db/init.js — `insert()`)

```json
{
  "id": 1,
  "title": "Buy milk",
  "done": 0,
  "created_at": "2025-07-01T10:00:00.000Z"
}
```

### 3.3 Frontend Files

| File | Key Elements |
|------|--------------|
| `public/index.html` | `#task-form`, `#task-input`, `#tasks` (ul), `#empty-msg`, `#task-count` |
| `public/app.js` | `fetchTasks()`, `renderTasks()`, `addTask()`, `toggleTask()`, `deleteTask()` |
| `public/style.css` | `.container` max-width 580px; `.done` strikethrough; `.delete` hover-red |

---

## 4. Phased Delivery Plan

### Phase 1 — CC-111: Priority + Due Date (Epic CC-109)

**Delivery order:** Data model → API → Frontend form → Render + Filter UI

**Dependencies:** None (standalone data-model extension).

#### Deliverables

- `priority` field (enum: `'High' | 'Medium' | 'Low'`, default `'Medium'`) stored in `tasks.json`
- `due_date` field (ISO date string `YYYY-MM-DD` or `null`) stored in `tasks.json`
- Server-side `HTTP 400` on invalid priority value
- Priority badge + due-date label rendered in each task row
- Filter/sort toolbar above the task list (client-side)

---

### Phase 2 — CC-112: Inline Editing + Delete Confirmation (Epic CC-110)

**Delivery order:** DB update → API PATCH route → Frontend edit mode → Delete confirmation UI

**Dependencies:** Phase 1 should be merged first so `renderTasks()` enhancements are in place; however, Phase 2 can be developed in parallel on a feature sub-branch.

#### Deliverables

- `db.update()` extended to support optional `title` updates
- `PATCH /api/tasks/:id` route added to `server.js`
- Double-click on `span.title` enters inline edit mode
- Save (Enter/✓) and Cancel (Esc/✕) controls
- Only one task editable at a time (auto-cancel previous edit)
- Inline validation: empty title rejected, error message shown
- Delete ✕ button replaced with inline confirm/cancel UI (no `window.confirm()`)

---

## 5. File-Level Change Map

### 5.1 `db/init.js`

| Change | Story | Details |
|--------|-------|---------|
| `insert()` signature | CC-111 | Add `priority` and `due_date` params; persist to task object |
| `insert()` default values | CC-111 | `priority` defaults to `'Medium'`; `due_date` defaults to `null` |
| `all()` backwards compat | CC-111 | For existing records missing `priority`/`due_date`, apply defaults at read-time via `map()` |
| `update()` signature | CC-112 | Add optional `title` param; update `task.title` only when provided and non-empty |

**Before (`insert`):**
```js
insert(title) {
  const task = { id: data.nextId++, title, done: 0, created_at: new Date().toISOString() };
}
```

**After (`insert`):**
```js
insert(title, priority = 'Medium', due_date = null) {
  const task = { id: data.nextId++, title, done: 0, created_at: new Date().toISOString(), priority, due_date };
}
```

**Before (`update`):**
```js
update(id, done) {
  task.done = done ? 1 : 0;
}
```

**After (`update`):**
```js
update(id, { done, title } = {}) {
  if (typeof done !== 'undefined') task.done = done ? 1 : 0;
  if (typeof title === 'string' && title.trim()) task.title = title.trim();
}
```

**`all()` backwards compatibility:**
```js
all() {
  return load().tasks.slice().reverse().map(t => ({
    ...t,
    priority: t.priority || 'Medium',
    due_date: t.due_date !== undefined ? t.due_date : null
  }));
}
```

---

### 5.2 `server.js`

| Change | Story | Details |
|--------|-------|---------|
| `POST /api/tasks` | CC-111 | Extract `priority`, `due_date` from `req.body`; validate priority enum; pass to `db.insert()` |
| `PUT /api/tasks/:id` | CC-112 | Refactor to pass `{ done }` object to updated `db.update()` |
| `PATCH /api/tasks/:id` | CC-112 | New route; extract `title` from `req.body`; validate non-empty; call `db.update(id, { title })` |

**New `POST /api/tasks`:**
```js
app.post('/api/tasks', (req, res) => {
  const { title, priority = 'Medium', due_date = null } = req.body;
  const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
  if (!title || !title.trim())
    return res.status(400).json({ error: 'Title is required' });
  if (!VALID_PRIORITIES.includes(priority))
    return res.status(400).json({ error: 'Priority must be High, Medium, or Low' });
  const task = db.insert(title.trim(), priority, due_date);
  res.status(201).json(task);
});
```

**New `PATCH /api/tasks/:id`:**
```js
app.patch('/api/tasks/:id', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim())
    return res.status(400).json({ error: 'Title cannot be empty' });
  const task = db.update(req.params.id, { title: title.trim() });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});
```

**Updated `PUT /api/tasks/:id`:**
```js
app.put('/api/tasks/:id', (req, res) => {
  const task = db.update(req.params.id, { done: req.body.done });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});
```

---

### 5.3 `public/index.html`

| Change | Story | Details |
|--------|-------|---------|
| Add `<select id="task-priority">` | CC-111 | Options: High / Medium (selected) / Low inside `#task-form` |
| Add `<input type="date" id="task-due-date">` | CC-111 | Optional field, no `required` attribute |
| Add filter/sort toolbar `<div id="filter-bar">` | CC-111 | Dropdowns for status filter and sort-by; sits between `.add-task` and `.task-list` |
| No new modal HTML required | CC-112 | Confirmation UI injected dynamically by `app.js` per task row |

---

### 5.4 `public/app.js`

| Change | Story | Details |
|--------|-------|---------|
| `addTask()` | CC-111 | Read `#task-priority` + `#task-due-date`; include in `POST` body |
| `renderTasks()` | CC-111 | Render priority badge (`span.priority-badge`) + due-date label (`span.due-date`) per task |
| Filter/sort state variables | CC-111 | `let filterStatus`, `let filterPriority`, `let sortBy` |
| `applyFiltersAndSort()` | CC-111 | Client-side function; filters/sorts cached task array before calling `renderTasks()` |
| `renderTasks()` edit mode | CC-112 | `span.title` gets `dblclick` listener; on trigger: replace span with `<input>` + Save/Cancel buttons |
| `saveEdit(id, newTitle)` | CC-112 | Validates non-empty; calls `PATCH /api/tasks/:id`; on success calls `fetchTasks()` |
| `cancelEdit()` | CC-112 | Restores original `span.title`; clears active edit state |
| Active edit guard | CC-112 | Module-level `let activeEditId = null`; entering edit on task N auto-calls `cancelEdit()` |
| `deleteTask()` replacement | CC-112 | On delete-button click: replace `✕` button with inline `Confirm` + `Cancel` buttons; only fire `DELETE` on confirm |

---

### 5.5 `public/style.css`

| Change | Story | Details |
|--------|-------|---------|
| `.priority-badge` | CC-111 | Small coloured pill: High=red (`#ef4444`), Medium=amber (`#f59e0b`), Low=green (`#10b981`) |
| `.due-date` | CC-111 | Small grey label; `.overdue` variant in red for past dates |
| `#filter-bar` | CC-111 | Flexbox row; `gap: 10px`; inside `.task-list` header area |
| `.edit-input` | CC-112 | Full-width inline input replacing `span.title` in edit mode |
| `.confirm-actions` | CC-112 | Inline flex container for Confirm/Cancel delete buttons |

---

## 6. API Contract Changes

### 6.1 Existing Endpoints — Updated

#### `POST /api/tasks`

**Request body (before):**
```json
{ "title": "Buy milk" }
```

**Request body (after):**
```json
{
  "title": "Buy milk",
  "priority": "High",
  "due_date": "2025-08-15"
}
```
> `priority` defaults to `"Medium"` if omitted. `due_date` defaults to `null` if omitted.

**Response `201 Created`:**
```json
{
  "id": 5,
  "title": "Buy milk",
  "done": 0,
  "created_at": "2025-07-14T10:00:00.000Z",
  "priority": "High",
  "due_date": "2025-08-15"
}
```

**New error `400 Bad Request` (invalid priority):**
```json
{ "error": "Priority must be High, Medium, or Low" }
```

---

#### `GET /api/tasks`

**Response item (after):**
```json
{
  "id": 1,
  "title": "Old task",
  "done": 0,
  "created_at": "2025-06-01T08:00:00.000Z",
  "priority": "Medium",
  "due_date": null
}
```
> Backwards-compatible: existing records without fields receive defaults at read-time.

---

#### `PUT /api/tasks/:id` — Unchanged behaviour, refactored internal signature

**Request body:** `{ "done": true }`
**Response `200 OK`:** Full updated task object.

---

### 6.2 New Endpoint

#### `PATCH /api/tasks/:id`

| Property | Value |
|----------|-------|
| Method | PATCH |
| Path | `/api/tasks/:id` |
| Auth | None |

**Request body:**
```json
{ "title": "Buy oat milk" }
```

**Response `200 OK`:**
```json
{
  "id": 3,
  "title": "Buy oat milk",
  "done": 0,
  "created_at": "2025-07-10T09:00:00.000Z",
  "priority": "Low",
  "due_date": null
}
```

**Error responses:**
- `400 Bad Request` — `{ "error": "Title cannot be empty" }` (empty/whitespace title)
- `404 Not Found` — `{ "error": "Task not found" }`

---

## 7. Data Model Changes

### 7.1 Task Schema

| Field | Type | Before | After | Notes |
|-------|------|--------|-------|-------|
| `id` | `number` | ✅ | ✅ | Auto-increment integer |
| `title` | `string` | ✅ | ✅ | Required, non-empty |
| `done` | `0 \| 1` | ✅ | ✅ | SQLite-style boolean |
| `created_at` | `ISO string` | ✅ | ✅ | Set on insert |
| `priority` | `'High' \| 'Medium' \| 'Low'` | ❌ | ✅ | Default `'Medium'` |
| `due_date` | `string (YYYY-MM-DD) \| null` | ❌ | ✅ | Default `null` |

### 7.2 Backwards Compatibility Strategy

Existing records in `db/tasks.json` do **not** need to be migrated. The `db.all()` method applies defaults via a `map()` transform at read-time:

```js
return load().tasks.slice().reverse().map(t => ({
  ...t,
  priority: t.priority || 'Medium',
  due_date: t.due_date !== undefined ? t.due_date : null
}));
```

No write-time migration script is needed for this scope.

---

## 8. Testing Strategy

### 8.1 Manual Acceptance Tests (mapped to Gherkin scenarios)

#### CC-111 Scenarios

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| T1-1 | Default priority pre-selected | Open app, inspect form | Priority dropdown shows "Medium" selected; due date empty |
| T1-2 | Create task with High + due date | Fill form, click Add | Task appears with `[High]` badge and date label; API returns 201 |
| T1-3 | Create task without due date | Fill title+priority, leave date blank | Task saved with `due_date: null`; no date label rendered |
| T1-4 | Invalid priority rejected | Send POST with `priority: "Critical"` via curl | Server returns `400` with error message; no task in JSON |

#### CC-112 Scenarios

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| T2-1 | Enter inline edit mode | Double-click task title | span replaced by pre-filled input + Save/Cancel controls |
| T2-2 | Save edited title | Edit title, click Save | PATCH sent; task list re-renders with new title |
| T2-3 | Cancel edit | Edit title, click Cancel | No API call; original title restored |
| T2-4 | Delete prompt shown | Click ✕ | Confirmation inline UI shown; task NOT deleted |
| T2-5 | Confirm deletion | Click Confirm | DELETE sent; task removed; count updated |
| T2-6 | Cancel deletion | Click Cancel in confirmation | No DELETE; task preserved |
| T2-7 | Empty title rejected | Clear input, click Save | Error message shown; edit mode stays active; no API call |

### 8.2 API Tests (curl / REST client)

```bash
# CC-111: POST with priority + due_date
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Submit report","priority":"High","due_date":"2025-08-15"}'
# Expected: 201 with priority and due_date in response

# CC-111: POST with invalid priority
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test","priority":"Critical"}'
# Expected: 400 { "error": "Priority must be High, Medium, or Low" }

# CC-112: PATCH title
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy oat milk"}'
# Expected: 200 with updated title

# CC-112: PATCH with empty title
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":""}'
# Expected: 400 { "error": "Title cannot be empty" }
```

### 8.3 Regression Tests

| Area | Check |
|------|-------|
| Existing POST without `priority`/`due_date` | Must still return `201`; defaults applied |
| Existing PUT `done` toggle | Must still function after `update()` refactor |
| Existing DELETE | Must still return `204` |
| `GET /api/tasks` with legacy records | All records must include `priority` and `due_date` fields |

---

## 9. Risks & Open Questions

| # | Risk / Question | Severity | Mitigation / Resolution |
|---|-----------------|----------|-------------------------|
| R1 | Concurrent writes to `tasks.json` (file lock) | Low | App is single-user; no concurrency risk in scope |
| R2 | `due_date` format validation | Medium | Server should validate format `YYYY-MM-DD` or null; basic regex check recommended |
| R3 | Overdue visual indicator desired? | Open | BA analysis flags this as unresolved; recommend adding `.overdue` CSS class when `due_date < today` |
| R4 | Priority filter: client-side vs server-side | Open | BA analysis flags this; recommendation is client-side (no DB query cost; all tasks already fetched) |
| R5 | `PATCH` vs extended `PUT` for title update | Low | Chosen `PATCH` per REST semantics (partial update); `PUT` remains for `done` toggle only |
| R6 | Only one edit mode at a time | Medium | Enforce with module-level `activeEditId` variable; entering new edit auto-calls `cancelEdit()` |
| R7 | Large task lists with client-side filtering | Low | JSON file store limits are not a concern for a single-user app at this scale |

---

## 10. Implementation Sequence Summary

```
Phase 1 (CC-111 — Priority & Due Date)
├── 1. db/init.js  — extend insert(), update all(), backwards compat map()
├── 2. server.js   — update POST /api/tasks (priority validation)
├── 3. index.html  — add priority <select> + due date <input> + filter bar
├── 4. app.js      — update addTask(), renderTasks(), add filter/sort logic
└── 5. style.css   — add .priority-badge, .due-date, #filter-bar styles

Phase 2 (CC-112 — Inline Edit & Delete Confirmation)
├── 1. db/init.js  — extend update() to support optional title param
├── 2. server.js   — add PATCH /api/tasks/:id; update PUT to pass object
├── 3. app.js      — add dblclick handler, saveEdit(), cancelEdit(),
│                    activeEditId guard, replace deleteTask() with confirm UI
└── 4. style.css   — add .edit-input, .confirm-actions styles
```

---

## 11. Definition of Done

- [ ] All Gherkin acceptance criteria in CC-111 pass manual testing
- [ ] All Gherkin acceptance criteria in CC-112 pass manual testing
- [ ] All regression tests pass
- [ ] Existing `tasks.json` records load without errors after deployment
- [ ] No `window.confirm()` calls present in `app.js`
- [ ] `PLAN.md` committed to `feature/implementation-plan` branch
- [ ] Pull Request opened against `main`
- [ ] This Confluence page reviewed and approved
