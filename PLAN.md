# Implementation Plan — Task Manager Enhancements

**Confluence:** https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9175047/Implementation+Plan+Task+Manager+Enhancements
**Jira Epics:** CC-114, CC-113
**Jira Stories:** CC-116, CC-115

---

## Overview and Objectives

This plan covers all engineering work required to deliver the two enhancement epics for the Task Manager application. The app is a single-user, browser-based productivity tool built on Node.js, Express 4.18, and a flat JSON file store (`db/tasks.json`). The frontend is pure Vanilla HTML/CSS/JavaScript with no build toolchain or framework dependencies.

### Epics in Scope

| Epic | Key | Summary |
|------|-----|---------|
| Enhanced Task Organisation with Priority, Due Dates and Filtering | CC-114 | Extend data model + API; add priority badges, due-date display, filter tabs, sort controls |
| Inline Task Editing and Confirmation-Guarded Deletion | CC-113 | Extend PUT endpoint + db.update(); add double-click editing; add delete confirmation guard |

Both epics are fully self-contained within the existing five-file codebase. No new runtime dependencies, no database migrations, and no authentication changes are required.

---

## Technology Stack

| Layer | Technology | Key Files |
|-------|-----------|-----------|
| Server Runtime | Node.js 18+ | server.js |
| Web Framework | Express 4.18.2 | server.js |
| Persistence | Flat JSON file (no SQL, no ORM) | db/init.js, db/tasks.json |
| Frontend | Vanilla HTML5 / CSS3 / ES2020 JavaScript | public/index.html, public/app.js, public/style.css |
| API Contract | REST over HTTP, JSON body, no authentication | 4 routes in server.js |
| Package Management | npm | package.json |

---

## Current State Baseline

Confirmed by reading the repository source directly:

- **db/init.js insert():** Stores only `{ id, title, done, created_at }`. No `priority` or `due_date` fields exist.
- **db/init.js update(id, done):** Accepts only `id` and `done`. Overwrites `task.done` with 0 or 1. No path to update `title`.
- **server.js POST /api/tasks:** Reads only `title` from `req.body`. Additional fields are silently ignored.
- **server.js PUT /api/tasks/:id:** Calls `db.update(req.params.id, req.body.done)` — `title` is never read from the request body.
- **public/app.js renderTasks():** Creates `span.title` with no `dblclick` listener. No priority badge or due-date element is rendered.
- **public/app.js deleteTask(id):** Issues `fetch DELETE` immediately with no guard or confirmation prompt.
- **public/app.js fetchTasks():** Passes the full unfiltered array directly to `renderTasks()` — no client-side filter or sort step exists.
- **public/index.html:** Contains a single text input and submit button. No priority dropdown, date picker, filter tabs, or sort dropdown.
- **public/style.css:** Brand colour is `#4f46e5` (indigo). `li.done .title` uses `text-decoration: line-through`. Inline-edit inputs must not break row height.

---

## Phased Delivery Breakdown

### Phase 1 — Data Model Foundation (Prerequisite for Both Epics)

This phase must be completed before any server or frontend work begins. Both CC-116 and CC-115 depend on changes to `db/init.js`.

1. **Extend `db/init.js` `insert()`:** Add `priority` (string, default `"Medium"`) and `due_date` (ISO 8601 string or `null`) to the task object.
   - New task shape: `{ id, title, done, priority, due_date, created_at }`

2. **Refactor `db/init.js` `update()`:** Change signature from `update(id, done)` to `update(id, fields)` where `fields` is a partial object containing any combination of `done` and/or `title`. Apply only the supplied fields without overwriting unchanged ones. This preserves full backward compatibility with the existing done-only toggle call.

### Phase 2 — Server-Side API Changes

With the data layer complete, update the two affected Express routes in `server.js`.

1. **CC-116 — Update `POST /api/tasks`:**
   - Read `priority` and `due_date` from `req.body` in addition to `title`.
   - Validate `priority` is one of `"High"`, `"Medium"`, or `"Low"` (default `"Medium"` if absent).
   - Validate `due_date`, if supplied, is a parseable ISO 8601 date string (HTTP 400 on invalid format).
   - Pass both fields to `db.insert()`.

2. **CC-115 — Update `PUT /api/tasks/:id`:**
   - Read both `done` and `title` from `req.body`.
   - If `title` is present, validate it is a non-empty string (HTTP 400 if blank).
   - Pass a partial-update fields object to the updated `db.update(id, fields)`.
   - A body of only `{ done: true }` must continue to work without changes to calling code.

### Phase 3 — Frontend: Priority, Due Date, Filter and Sort (CC-116)

Deliver all frontend changes for Epic CC-114 / Story CC-116. All changes are client-side only.

1. **`public/index.html` — Extend the Add Task form:**
   - Add `select#task-priority` dropdown: options High, Medium (default), Low.
   - Add `input#task-due-date` of type `date`.
   - Add filter controls bar: three buttons with `data-filter="all"` (active by default), `data-filter="active"`, `data-filter="completed"`.
   - Add `select#sort-control` dropdown: Default (insertion order), Sort by Priority, Sort by Due Date.

2. **`public/app.js` — Update `addTask()`:**
   - Read `priority` from `#task-priority` and `due_date` from `#task-due-date`.
   - Include both in the POST request body. Clear both inputs after successful submission.

3. **`public/app.js` — Update `renderTasks()` for metadata:**
   - After `span.title`, append `span.priority-badge` with CSS class derived from priority level (`priority-high`, `priority-medium`, `priority-low`).
   - If `due_date` is not null, append `span.due-date` showing the formatted date.

4. **`public/app.js` — Implement `applyFilterAndSort(tasks)`:**
   - Introduce module-level state: `{ filter: 'all', sort: 'default' }` and `allTasks` variable.
   - `applyFilterAndSort()` first filters by `done` state, then sorts by priority weight (`High=1, Medium=2, Low=3`) or by `due_date` ascending with nulls last.
   - Call `renderTasks(applyFilterAndSort(allTasks))` on load and on every filter/sort change event.

5. **`public/style.css` — Priority badges and filter styles:**
   - Add `.priority-badge` base pill styles (font-size 0.75rem, border-radius 4px, padding 2px 6px).
   - Add `.priority-high` (red tones: `#fef2f2` / `#ef4444`), `.priority-medium` (amber: `#fffbeb` / `#d97706`), `.priority-low` (green: `#f0fdf4` / `#16a34a`).
   - Add `.due-date` style (font-size 0.8rem, colour `#888`).
   - Add `.filter-controls` active state using the existing indigo `#4f46e5`.

### Phase 4 — Frontend: Inline Editing and Delete Guard (CC-115)

Deliver all frontend changes for Epic CC-113 / Story CC-115. These changes build on the Phase 2 server update.

1. **`public/app.js` — Inline title editing:**
   - Add `dblclick` listener on `span.title` in `renderTasks()`.
   - On trigger: (a) cancel any other open edit without saving; (b) replace `span.title` with a focused `input.title-edit` pre-filled with the current title; (c) on Enter — if trimmed value is non-empty, call `updateTaskTitle(id, newTitle)` and re-render; if empty, restore original span without API call; (d) on Escape — restore original span without API call; (e) on blur — apply same logic as Enter.

2. **`public/app.js` — Add `updateTaskTitle(id, title)`:**
   - New async function. Sends `PUT /api/tasks/:id` with body `{ title }`.
   - On success, calls `fetchTasks()` to re-render with fresh server state.

3. **`public/app.js` — Delete confirmation guard:**
   - In `deleteTask(id)`, add a confirmation check before the fetch call.
   - If the user dismisses, return early without calling the DELETE endpoint.
   - Satisfies CC-115 Scenarios 4 and 5.

4. **`public/style.css` — Inline-edit input styles:**
   - Add `ul#tasks li input.title-edit` styles: `flex: 1; font-size: 0.95rem; border: 1.5px solid #4f46e5; border-radius: 6px; padding: 2px 8px; outline: none;`
   - Do not alter list item padding (`14px 20px`) or displace the delete button.

---

## File-Level Change Map

| File | Change Type | Stories | Summary of Changes |
|------|-------------|---------|-------------------|
| `db/init.js` | Modify | CC-116, CC-115 | Extend `insert()` with `priority` + `due_date`; refactor `update()` to accept partial fields object |
| `server.js` | Modify | CC-116, CC-115 | POST reads `priority` + `due_date` with validation; PUT reads `title` + `done` and passes partial object |
| `public/index.html` | Modify | CC-116 | Add priority select, due-date input, filter control bar, sort dropdown |
| `public/app.js` | Modify | CC-116, CC-115 | Update `addTask()`, `renderTasks()`; add `applyFilterAndSort()`, `updateTaskTitle()`, inline-edit logic, delete guard |
| `public/style.css` | Modify | CC-116, CC-115 | Add priority badge classes, due-date label, filter button active state, inline-edit input style |

---

## API Contract Changes

### POST /api/tasks — Extended Request Body

**Before:** Accepts only `{ title: string }`. Any other fields in the body are silently ignored.

**After (new fields added):**

- **`priority`** — optional string, one of `"High"` / `"Medium"` / `"Low"`. Defaults to `"Medium"` if absent. Returns HTTP 400 if an unrecognised value is supplied.
- **`due_date`** — optional ISO 8601 date string (`YYYY-MM-DD`) or omitted. Returns HTTP 400 if supplied but not parseable as a valid date.

Response 201 now includes `priority` and `due_date` in the returned task object.

```
Error responses:
  HTTP 400  { "error": "Invalid priority value" }
  HTTP 400  { "error": "Invalid due_date format" }
```

### PUT /api/tasks/:id — Extended Request Body

**Before:** Accepts only `{ done: boolean }`. Title update is impossible.

**After (title field added):**

- **`done`** — optional boolean (existing behaviour preserved).
- **`title`** — optional non-empty string. HTTP 400 returned if present but blank.

At least one of `done` or `title` must be supplied. Response 200 returns the full updated task object.

```
Error responses:
  HTTP 400  { "error": "Title cannot be empty" }
  HTTP 404  { "error": "Task not found" }
```

### GET /api/tasks — No Contract Change

The GET route is unchanged. Response objects for tasks created after Phase 1 will include `priority` and `due_date` fields. Tasks created before the migration return whatever values are stored; the frontend treats missing `priority` as `"Medium"` and missing `due_date` as `null`.

### DELETE /api/tasks/:id — No Contract Change

The DELETE route is unchanged. The confirmation guard is purely client-side in `app.js`.

---

## Data Model Changes

**Current schema** (as confirmed in `db/init.js`):

```json
{
  "id": 1,
  "title": "Buy groceries",
  "done": 0,
  "created_at": "2025-07-14T10:00:00.000Z"
}
```

**New schema after Phase 1:**

```json
{
  "id": 1,
  "title": "Buy groceries",
  "done": 0,
  "priority": "High",
  "due_date": "2025-08-15",
  "created_at": "2025-07-14T10:00:00.000Z"
}
```

**Field definitions:**

- **`priority`** — string enum: `"High"` | `"Medium"` | `"Low"`. Stored as plain string. Default: `"Medium"`.
- **`due_date`** — ISO 8601 date string (`YYYY-MM-DD`) or `null`. Stored as string, consistent with the existing `created_at` field format.

**Backward compatibility:** Existing records in `db/tasks.json` that lack `priority` and `due_date` will continue to be served by `db.all()`. The frontend must treat `undefined` priority as `"Medium"` and `undefined` due_date as `null`. An optional one-off migration script can backfill existing records.

---

## Testing Strategy

### Manual Acceptance Testing — Aligned to Gherkin Criteria

The repository currently contains no automated test framework. The primary verification method is structured manual testing mapped directly to the acceptance criteria in CC-116 and CC-115.

| Story | Scenario | Test Action | Expected Result |
|-------|----------|-------------|----------------|
| CC-116 | S1: High priority + due date | Enter title, select High, pick a date, submit | Badge shows "High", formatted date displays, JSON file persists both values |
| CC-116 | S2: Default priority, no due date | Enter title only, submit | Task created with Medium badge, no date label shown |
| CC-116 | S3: Filter tabs | Toggle Active / Completed / All filter tabs | Only matching tasks visible; counter updates accurately |
| CC-116 | S4: Sort by priority | Select Sort by Priority from dropdown | High tasks first, then Medium, then Low |
| CC-116 | S5: Sort by due date | Select Sort by Due Date from dropdown | Nearest due date first; null due dates last |
| CC-115 | S1: Inline edit, save via Enter | Double-click title, type new text, press Enter | Title updated in UI and persisted in JSON via PUT |
| CC-115 | S2: Inline edit, cancel via Escape | Double-click title, type, press Escape | Original title restored, no PUT call issued |
| CC-115 | S3: Empty title not saved | Double-click title, clear input, press Enter | Original title restored, no PUT call issued |
| CC-115 | S4: Delete with confirmation | Click delete button, confirm the prompt | Task removed from UI and JSON file |
| CC-115 | S5: Delete cancelled | Click delete button, dismiss the prompt | Task unchanged, no DELETE call issued |

### Backward Compatibility Verification

- Toggling `done` via checkbox must continue to work after the `db.update()` refactor.
- Tasks created before the schema change must render without JavaScript errors in the updated `renderTasks()`.
- `GET /api/tasks` must continue to return a plain JSON array — no wrapper object introduced.

### Recommended Future Test Infrastructure

The team should introduce **Jest** or the built-in **`node:test`** module (available since Node.js 18) to add:

- Unit tests for each `db/init.js` function (`all`, `insert`, `update`, `remove`).
- Integration tests for all four Express routes using **supertest**.

A minimum of one integration test per route provides a regression safety net before any future changes.

---

## Risks and Open Questions

| Risk / Question | Impact | Mitigation / Decision Needed |
|----------------|--------|------------------------------|
| Existing `tasks.json` records lack `priority` and `due_date` fields | Medium — `renderTasks()` must not throw on undefined field access | Add defensive defaults in `renderTasks()`: treat `undefined` priority as `"Medium"`, `undefined` due_date as `null`. Optionally provide a one-off backfill migration script. |
| Concurrent writes to `tasks.json` from multiple browser tabs | Low for single-user scope — race condition theoretically possible | Accepted risk. No file locking required unless multi-tab usage becomes a stated requirement. |
| Delete confirmation UX: browser `confirm()` vs. custom modal | Low functional / Medium UX — `confirm()` is visually inconsistent with the indigo design system | Implement browser `confirm()` in Phase 4 to satisfy acceptance criteria. A custom modal can be a follow-up UX polish story. |
| Overdue task visual warning not in scope | Low — due dates stored and displayed but no red highlight for past-due tasks specified | Recommend a follow-up story. Implementation is trivial: compare `due_date` to today in `renderTasks()` and apply a CSS class. |
| One-task-at-a-time edit mode constraint | Medium UX — double-clicking a second task while one is in edit mode must cleanly cancel the first | Track the active edit element in a module-level variable (e.g. `currentEditLi`). On each new `dblclick` event, run cancel logic on `currentEditLi` before entering edit mode on the new target. |
| No automated tests in the repository | Medium — regressions in `db.update()` refactor cannot be caught automatically | Introduce Jest + supertest as a pre-Phase-2 setup task. Minimum: one integration test per API route. |

---

## Delivery Order Summary

1. **Phase 1** — `db/init.js`: extend `insert()`, refactor `update()` to partial fields. This unblocks all downstream work.
2. **Phase 2** — `server.js`: update `POST /api/tasks` and `PUT /api/tasks/:id` routes.
3. **Phase 3** — `public/index.html`, `public/app.js`, `public/style.css`: priority and due-date form fields, badges, filter tabs, sort controls (CC-116).
4. **Phase 4** — `public/app.js`, `public/style.css`: inline title editing, delete confirmation guard (CC-115).

Each phase produces a clean, independently reviewable diff. Phases 3 and 4 can be developed in parallel once Phase 2 is merged, as they have no shared file conflicts.
