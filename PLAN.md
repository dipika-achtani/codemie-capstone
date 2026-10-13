# Implementation Plan — Task Manager Enhancements

**Jira Epics:** [CC-118](https://dipika-achtani-epam.atlassian.net/browse/CC-118) · [CC-117](https://dipika-achtani-epam.atlassian.net/browse/CC-117)
**Jira Stories:** [CC-120](https://dipika-achtani-epam.atlassian.net/browse/CC-120) · [CC-119](https://dipika-achtani-epam.atlassian.net/browse/CC-119)
**Confluence Page:** https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9699329/Implementation+Plan+Task+Manager+Enhancements

---

## 1. Overview and Objectives

This document describes the full implementation plan for two enhancement epics against the Task Manager application. The application is a single-user personal productivity tool built with **Node.js + Express** (`server.js`), a flat-file JSON data layer (`db/init.js` storing tasks in `db/tasks.json`), and a vanilla HTML/CSS/JavaScript frontend (`public/index.html`, `public/app.js`, `public/style.css`). No build toolchain or framework is in use on the frontend — changes are direct file edits served statically by Express.

The two epics to be delivered are:

- **CC-118 — Task Enrichment: Priority, Due Dates & Inline Editing**: Extends the data model, REST API, HTML form, rendering logic, and CSS to support `priority` (High/Medium/Low), `due_date` (ISO date string or null), and in-place title editing. Delivered via Story **CC-120**.
- **CC-117 — Task Organisation: Filtering, Sorting & Persistent View Preferences**: Adds client-side filter tabs (All/Active/Completed), sort controls (by creation date, due date, priority), dynamic task-count updates, and localStorage-backed persistence of the chosen view. Entirely client-side. Delivered via Story **CC-119**. Depends on CC-118 for full sort capability.

The objectives are to raise the application from a basic to-do list into a genuinely useful daily planner with prioritised, time-bound tasks and ergonomic navigation — without introducing new backend dependencies or breaking any existing API contracts.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 18+ | As documented in README; no version change required |
| Web Framework | Express 4.18.x | Single runtime dependency in `package.json` |
| Data Persistence | Flat JSON file (`db/tasks.json`) | Managed by `db/init.js`; no migration tooling needed |
| Frontend | Vanilla HTML5, CSS3, ES2020 JavaScript | No bundler, no npm frontend packages |
| View Persistence | Browser `localStorage` | Keys: `tm_filter`, `tm_sort` (namespaced per CC-119 constraints) |
| Styling | Custom CSS (`public/style.css`) | Responsive, max-width 580px container |

---

## 3. Phased Delivery Breakdown

### Phase 1 — CC-118 / CC-120: Task Enrichment (Prerequisite)

**Jira Story:** CC-120 — Add Priority, Due Date & Inline Title Editing to Tasks

This phase must be completed before Phase 2 because CC-119 depends on the `priority` and `due_date` fields existing in the data model and being returned by `GET /api/tasks` before sort-by-priority and sort-by-due-date can be implemented.

**Delivery order within Phase 1:**

1. **`db/init.js`** — Extend `insert()` to accept and persist `priority` and `due_date`; extend `update()` to accept `title`, `priority`, and `due_date` in addition to the existing `done` flag. This must come first so the API layer can be tested end-to-end.

2. **`server.js`** — Update `POST /api/tasks` to read and validate `priority` (must be one of High/Medium/Low, defaulting to `"Medium"`) and `due_date` (optional ISO date string). Update `PUT /api/tasks/:id` to accept `title`, `priority`, and `due_date` without breaking the existing `done` toggle.

3. **`public/index.html`** — Add a `<select>` element for priority (options: High, Medium, Low; default Medium) and a `<input type="date">` to the Add Task form. These sit alongside the existing text input and submit button.

4. **`public/app.js`** — Update `addTask()` to pass `priority` and `due_date` in the POST body. Update `renderTasks()` to render a priority badge and due-date label per task row. Add a `dblclick` listener on the title span to convert it to an inline `<input>` field; on blur or Enter, fire `PUT /api/tasks/:id` with the updated title. Add a `keydown` Escape listener to cancel the inline edit. Detect overdue tasks (`due_date` in the past, `done === 0`) and apply an `overdue` CSS class.

5. **`public/style.css`** — Add CSS for `.badge-high` (red), `.badge-medium` (amber), `.badge-low` (grey), `.due-date` label, `.overdue` row/label styling (red), and `.inline-edit` input style for the editable title field.

### Phase 2 — CC-117 / CC-119: Filtering, Sorting & Persistence (Depends on Phase 1)

**Jira Story:** CC-119 — Implement Task Filter Tabs, Sort Controls & Persistent View Preferences

This phase is entirely client-side. No changes to `server.js` are required. The `GET /api/tasks` response already returns the full array; the client will filter and sort in memory before rendering.

**Delivery order within Phase 2:**

1. **`public/index.html`** — Add a filter tab bar (buttons for All, Active, Completed) below the Add Task form, and a sort control (`<select>` with options: Date Created, Due Date, Priority) inside the task-list header area.

2. **`public/app.js`** — Introduce module-level state variables `currentFilter` (default: `'all'`) and `currentSort` (default: `'created'`). On page load, read both from `localStorage` keys `tm_filter` and `tm_sort` before the initial `fetchTasks()` call. Refactor `fetchTasks()` to store the raw task array and call a new `applyFilterAndSort(tasks)` function that returns the display-ready subset. Pass the result to `renderTasks()`.
   - **Filter logic:** `'active'` → tasks where `done === 0`; `'completed'` → tasks where `done === 1`; `'all'` → no filter.
   - **Sort logic:** `'priority'` → High (1) > Medium (2) > Low (3); `'due'` → nearest date first, `null` dates last; `'created'` → natural reverse insertion order (existing default).
   - Update the task-count display to reflect the filtered count. Persist filter/sort changes to `localStorage` on each user interaction.

3. **`public/style.css`** — Add styles for `.filter-tabs` button group, `.filter-tabs button.active` highlighted state, `.sort-control` select, and responsive layout adjustments to keep the 580px container coherent with the new controls.

---

## 4. File-Level Change Map

| File | Phase | Type of Change | Story |
|---|---|---|---|
| `db/init.js` | 1 | Modify `insert()` and `update()` signatures; add `priority`/`due_date` fields to task object | CC-120 |
| `server.js` | 1 | Extend POST and PUT route handlers; add priority validation (enum check); extend `db.update()` call | CC-120 |
| `public/index.html` | 1 & 2 | Phase 1: add priority `<select>` + date picker to form. Phase 2: add filter tab bar + sort `<select>` control | CC-120, CC-119 |
| `public/app.js` | 1 & 2 | Phase 1: update `addTask()`, `renderTasks()`, add inline-edit logic + overdue detection. Phase 2: add filter/sort state, `applyFilterAndSort()`, localStorage persistence, tab/sort event handlers | CC-120, CC-119 |
| `public/style.css` | 1 & 2 | Phase 1: priority badge colours, due-date label, overdue styling, inline-edit input. Phase 2: filter tabs active state, sort control layout | CC-120, CC-119 |

---

## 5. API Contract Changes

### POST /api/tasks — Extended Request Body

**Before (current):**
```json
{ "title": "Buy groceries" }
```

**After (Phase 1):**
```json
{ "title": "Buy groceries", "priority": "High", "due_date": "2025-08-15" }
```

Validation rules:
- `title` remains required and non-empty (existing behaviour).
- `priority` is optional; if omitted or invalid, defaults to `"Medium"`. Must be one of `["High", "Medium", "Low"]`.
- `due_date` is optional; if omitted, stored as `null`.

### PUT /api/tasks/:id — Extended Request Body

**Before (current):**
```json
{ "done": true }
```

**After (Phase 1):**
```json
{ "done": true, "title": "Updated title", "priority": "Low", "due_date": "2025-09-01" }
```

All fields remain optional to preserve backward compatibility. The checkbox toggle continues to send only `{ "done": true/false }`. The inline-edit save sends only `{ "title": "..." }`. The `db.update()` function must apply a **partial update pattern** — only apply fields that are explicitly present in the payload (guard with `hasOwnProperty` checks).

### GET /api/tasks — Extended Response Shape

**Before (current):**
```json
[{ "id": 1, "title": "Buy groceries", "done": 0, "created_at": "2025-07-01T10:00:00.000Z" }]
```

**After (Phase 1):**
```json
[{ "id": 1, "title": "Buy groceries", "done": 0, "created_at": "2025-07-01T10:00:00.000Z", "priority": "High", "due_date": "2025-08-15" }]
```

Existing tasks written before Phase 1 will lack `priority` and `due_date`. Frontend code must defensively handle `undefined` (treat missing `priority` as `"Medium"`, missing `due_date` as `null`).

### DELETE /api/tasks/:id — No Change

This route is unaffected by either epic.

---

## 6. Data Model Changes

**Current schema** (`db/tasks.json` task object):
```json
{ "id": 1, "title": "string", "done": 0, "created_at": "ISO8601 string" }
```

**After Phase 1:**
```json
{ "id": 1, "title": "string", "done": 0, "created_at": "ISO8601 string", "priority": "High", "due_date": "2025-08-15" }
```

Key design decisions:

- **No migration script required.** `db.insert()` will default `priority` to `"Medium"` and `due_date` to `null`. Existing tasks render gracefully with defensive frontend defaults.
- `due_date` is stored as `YYYY-MM-DD` plain string (not a full ISO timestamp). This matches the `<input type="date">` value format, avoids timezone issues, and simplifies overdue comparison: `due_date < new Date().toISOString().slice(0, 10)`.
- `priority` is a human-readable string (`"High"`, `"Medium"`, `"Low"`) rather than an integer ordinal, keeping `tasks.json` self-documenting.
- The `nextId` auto-increment counter and `tasks[]` array root structure in `tasks.json` are **unchanged**.

---

## 7. Testing Strategy

### Phase 1 — CC-120

**API smoke tests (manual via curl or Postman):**
- POST with `priority: "High"` and a future `due_date` → verify 201 response includes both new fields.
- POST with no priority → verify response shows `priority: "Medium"`.
- PUT with only `title` → verify `done` and existing `priority`/`due_date` are unchanged (partial update).
- PUT with only `done` → verify `title` and `priority` are unchanged.
- GET → verify all tasks return `priority` and `due_date` fields.

**UI acceptance tests (manual browser):**
- Verify priority badge colour matches selection (red for High, amber for Medium, grey for Low).
- Verify due-date label renders correctly formatted.
- Double-click title → edit → press Enter → confirm title updates without full page reload.
- Press Escape during inline edit → confirm original title is restored, no PUT fired.
- Set a past `due_date` on an incomplete task → verify overdue indicator appears in red.
- Refresh browser → priority badge and due-date label still render correctly from persisted JSON.

**Regression:**
- Existing checkbox toggle (`PUT` with `done` only) must continue to work.
- Existing task deletion must continue to work.

### Phase 2 — CC-119

**Filter tab tests (manual browser):**
- Click Active → only `done=0` tasks visible; task-count updates; Active tab visually highlighted.
- Click Completed → only `done=1` tasks visible.
- Click All → all tasks visible.

**Sort tests (manual browser):**
- Sort by Priority with mixed tasks → High first, then Medium, then Low.
- Sort by Due Date → nearest date first; tasks without `due_date` at the bottom.
- Sort by Date Created → reverse insertion order (existing default preserved).

**Persistence tests:**
- Select Active filter + Sort by Priority → refresh browser → same filter and sort still active. Confirm `localStorage` keys `tm_filter` and `tm_sort` readable in DevTools.
- Clear `localStorage` → refresh → defaults to All filter + Date Created sort.

**Cross-story integration:**
- Verify filter and sort work correctly on tasks created in Phase 1 with `priority` and `due_date` populated.

---

## 8. Risks and Open Questions

| Risk / Question | Impact | Mitigation |
|---|---|---|
| Existing `tasks.json` records lack `priority`/`due_date` after Phase 1 deployment | Medium — frontend may render broken badge or empty label | Defensive defaults in `renderTasks()`: treat `undefined` priority as `"Medium"`, `undefined` `due_date` as `null` |
| `PUT /api/tasks/:id` currently passes `req.body.done` directly to `db.update()` — partial update pattern requires careful `null`/`undefined` handling | High — risk of overwriting `title` or `priority` with `undefined` if not guarded | In `db.update()`, only apply fields explicitly present in payload using `hasOwnProperty` checks or explicit `if` guards |
| HTML `<input type="date">` browser compatibility (especially Safari on iOS) | Low — Safari 14.1+ supports it natively; modern browser coverage is >97% | Test on Safari; if needed, fall back to text input with `YYYY-MM-DD` placeholder and regex validation |
| CC-119 partial delivery: filter tabs can ship independently, but Sort by Priority and Sort by Due Date are blocked on CC-120 completion | Medium — sort options may appear but produce incorrect results before CC-120 merges | Enable Priority/Due Date sort options only after CC-120 is merged; document with a code comment flag |
| `localStorage` key collision if multiple Task Manager instances run on the same origin | Low — single-user app on localhost | Namespace keys as `tm_filter` and `tm_sort` per CC-119 constraint; document in code comments |
| Inline title edit: Escape key should cancel without saving | Low — without it, the user must manually restore the original text | Add `keydown` Escape listener in inline-edit implementation that restores the original title span without firing a PUT |
