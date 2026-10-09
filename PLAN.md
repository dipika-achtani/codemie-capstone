# Implementation Plan — Task Manager Enhancements

> **Jira Epics:** [CC-93](https://dipika-achtani-epam.atlassian.net/browse/CC-93) | [CC-94](https://dipika-achtani-epam.atlassian.net/browse/CC-94)
> **Jira Stories:** [CC-95](https://dipika-achtani-epam.atlassian.net/browse/CC-95) | [CC-96](https://dipika-achtani-epam.atlassian.net/browse/CC-96)
> **Repository:** https://github.com/dipika-achtani/codemie-capstone
> **Confluence Plan:** https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/7864545

---

## 1. Overview & Objectives

The **Task Manager** is a single-user Node.js/Express productivity app backed by a flat JSON file store (`db/tasks.json`). The current implementation supports four bare-bones operations (add, list, toggle-done, delete) with no task metadata, no inline editing, no filtering, and no progress visualisation.

This plan covers **two Epics / two Stories** to uplift the application:

| Epic  | Story | Goal |
|-------|-------|------|
| CC-93 | CC-95 | Add priority (High/Medium/Low) and optional due date; expose inline title editing |
| CC-94 | CC-96 | Add filter tabs (All/Pending/Completed), live keyword search, and a completion progress bar |

### Success Criteria

- A task created with `priority=High` and a due date persists those fields in `tasks.json` and renders them in the UI.
- Existing tasks (no `priority`/`due_date`) continue to render without errors (**backward-compatible**).
- Filter tabs and keyword search operate entirely client-side with **zero API changes**.
- Progress bar carries ARIA attributes and updates **without page reload**.

---

## 2. Technology Stack

| Layer       | Technology                  | Version / Notes                                          |
|-------------|-----------------------------|----------------------------------------------------------|
| Runtime     | Node.js                     | 18+                                                      |
| Framework   | Express                     | ^4.18.2                                                  |
| Persistence | JSON file (`db/tasks.json`) | Schema-less; synchronous read/write via `fs`             |
| Frontend    | Vanilla JS + Fetch API      | No frameworks; DOM manipulation only                     |
| Styles      | Custom CSS                  | Indigo accent `#4f46e5`, card layout, `border-radius: 12px` |
| Testing     | Manual browser + curl       | No automated test framework currently in repo            |

> **No new runtime dependencies are required for either epic.**

---

## 3. Phased Delivery Breakdown

### Phase 1 — CC-93 / CC-95: Task Enrichment (Priority, Due Dates & Inline Editing)

**Prerequisite:** None — can start immediately.
**Estimated complexity:** Medium (touches all 5 layers).

#### Ordered Implementation Steps

1. **Data layer** — extend `db/init.js` `insert()` to accept and persist `priority` and `due_date`; extend `update()` to accept `title`, `priority`, `due_date` alongside the existing `done` flag.

2. **API layer** — update `server.js` `POST /api/tasks` to extract `priority` (default `"Medium"`) and `due_date` from `req.body`; update `PUT /api/tasks/:id` to pass all editable fields to `db.update()`.

3. **HTML** — add a `<select id="task-priority">` (High/Medium/Low, default Medium) and `<input type="date" id="task-due-date">` to the add-task form in `public/index.html`.

4. **Frontend JS** — update `addTask()` in `public/app.js` to include `priority` and `due_date` in the POST body; update `renderTasks()` to render a priority badge `<span class="badge priority-{level}">` and an optional due-date chip; add inline-edit: double-click on title converts it to an `<input>`, blur/Enter triggers PUT with updated title, Escape cancels.

5. **CSS** — add badge styles (`.badge`, `.priority-high`, `.priority-medium`, `.priority-low`) and due-date chip styles to `public/style.css`.

> **Backward compatibility note:** Existing tasks lacking `priority`/`due_date` are treated as `priority="Medium"` / no date — achieved with nullish coalescing (`task.priority ?? 'Medium'`).

---

### Phase 2 — CC-94 / CC-96: Filtering, Search & Productivity Visibility

**Prerequisite:** Can run in **parallel** with Phase 1 (pure frontend, no API changes needed).
**Estimated complexity:** Low-Medium (frontend-only).

#### Ordered Implementation Steps

1. **HTML** — add filter tab bar `<div id="filter-tabs">` with buttons All/Pending/Completed; add `<input id="search-input" placeholder="Search tasks...">` for keyword search; add progress bar scaffold `<div id="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="progress-fill"></div></div>` with accessible label above `<ul id="tasks">`.

2. **Frontend JS** — introduce module-level state variables `let allTasks = []` and `let activeFilter = 'all'`; rewrite `fetchTasks()` to populate `allTasks` then call `renderTasks()`; rewrite `renderTasks()` to:
   - (a) apply status filter on `allTasks`
   - (b) apply keyword search (case-insensitive title match)
   - (c) update `#progress-fill` width and ARIA `aria-valuenow` based on total done/total
   - (d) update task-count text
   - (e) show `#empty-msg` with message `"No tasks match your filter"` when filtered set is empty
   - Wire filter tab click handlers to update `activeFilter` and re-call `renderTasks()`
   - Wire `search-input` `input` event to re-call `renderTasks()`
   - `addTask()`, `toggleTask()`, `deleteTask()` all already call `fetchTasks()` → filter state preserved ✓

3. **CSS** — add `.filter-tabs` button styles with `.active` indicator using indigo accent `#4f46e5`; add `#progress-bar` and `#progress-fill` styles (height 8px, `border-radius: 4px`, `background: #4f46e5`, CSS `transition: width 0.3s ease`).

---

## 4. File-Level Change Map

| File                 | Change Type | Summary of Changes |
|----------------------|-------------|---------------------|
| `db/init.js`         | Modify      | `insert()`: add `priority`, `due_date` params. `update()`: accept `title`, `priority`, `due_date` fields |
| `server.js`          | Modify      | POST: extract `priority` (default Medium) + `due_date`. PUT: pass full update fields to `db.update()` |
| `public/index.html`  | Modify      | Add priority `<select>`, due-date `<input type="date">` to form; add filter tabs, search input, progress bar elements |
| `public/app.js`      | Modify      | Update `addTask()`; rewrite `renderTasks()` with filter/search/progress logic; add inline-edit handler; introduce `allTasks` + `activeFilter` state |
| `public/style.css`   | Modify      | Add `.badge`, `.priority-*` badge styles; add due-date chip; add `.filter-tabs` + `.active`; add progress bar CSS |
| `db/tasks.json`      | Runtime     | Auto-created on first run; existing records remain valid (new fields optional) |

> **No new files are required.**

---

## 5. API Contract Changes

### `POST /api/tasks`

**Current request body:**
```json
{ "title": "string" }
```

**New request body:**
```json
{
  "title": "string",
  "priority": "High|Medium|Low",
  "due_date": "YYYY-MM-DD"
}
```
- `priority` is optional; defaults to `"Medium"` server-side.
- `due_date` is optional; stored as `null` if omitted.

**New response shape (201 Created):**
```json
{
  "id": 1,
  "title": "string",
  "done": 0,
  "priority": "Medium",
  "due_date": null,
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

### `PUT /api/tasks/:id`

**Current request body:**
```json
{ "done": true }
```

**New request body (all fields optional, partial update):**
```json
{
  "done": true,
  "title": "updated title",
  "priority": "High",
  "due_date": "2025-12-31"
}
```

**No changes** to `GET /api/tasks` or `DELETE /api/tasks/:id`.

> **Backward compatibility:** Existing clients sending only `{ "done": true }` continue to work unchanged. Tasks stored before this change return `priority`/`due_date` as `undefined`/`null` — the frontend handles these gracefully with nullish coalescing.

---

## 6. Data Model Changes

### Current Schema (`db/tasks.json`)

```json
{
  "tasks": [
    { "id": 1, "title": "Buy milk", "done": 0, "created_at": "2025-01-01T00:00:00.000Z" }
  ],
  "nextId": 2
}
```

### New Schema

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Buy milk",
      "done": 0,
      "priority": "Medium",
      "due_date": null,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "nextId": 2
}
```

### Field Definitions

| Field        | Type                        | Required | Default                    | Validation                        |
|--------------|-----------------------------|----------|----------------------------|-----------------------------------|
| `id`         | integer                     | yes      | auto-increment             | set by `db.insert()`              |
| `title`      | string                      | yes      | —                          | non-empty, trimmed                |
| `done`       | `0` \| `1`                  | yes      | `0`                        | toggled by PUT                    |
| `priority`   | `"High"` \| `"Medium"` \| `"Low"` | no | `"Medium"`             | validated/defaulted server-side   |
| `due_date`   | `"YYYY-MM-DD"` \| `null`   | no       | `null`                     | ISO date string from HTML date input |
| `created_at` | ISO 8601 string             | yes      | `new Date().toISOString()` | set by `db.insert()`              |

> **Migration:** The JSON file store is schema-less; no migration script is needed. Existing records without `priority`/`due_date` are handled by the frontend with `task.priority ?? 'Medium'` and conditional rendering of the date chip.

---

## 7. Testing Strategy

### Phase 1 — CC-95: Priority, Due Dates & Inline Editing

**Manual API tests (curl):**

```bash
# S1: Create task with High priority and due date
curl -s -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Write report","priority":"High","due_date":"2025-12-31"}'
# Expect: 201, priority="High", due_date="2025-12-31" in response

# S2: Create task without due date
curl -s -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Call dentist","priority":"Low"}'
# Expect: 201, due_date=null, no date chip in UI

# S3: Reject empty title (existing validation preserved)
curl -s -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":""}'
# Expect: 400 { "error": "Title is required" }

# S4: Default priority=Medium when omitted
curl -s -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Send email"}'
# Expect: 201, priority="Medium"

# Inline edit via PUT
curl -s -X PUT http://localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":"Write final report","priority":"High","due_date":"2025-12-31"}'
# Expect: 200, updated task object in response
```

**Browser UI tests (manual):**
- Verify priority badge colour matches level (High = red, Medium = amber, Low = green).
- Verify due-date chip appears only when a date is set.
- Verify existing tasks (no fields) render with "Medium" badge and no date chip.
- Double-click a title → input appears → type new title → press Enter → title updates in list.
- Double-click a title → type → press Escape → original title restored (no PUT fired).

---

### Phase 2 — CC-96: Filter, Search & Progress Bar

**Browser UI tests (manual):**
- With 3 pending + 2 done tasks: click "Pending" → only 3 tasks shown; count reads `"3 tasks — 3 remaining"`.
- Click "Completed" → only 2 tasks shown with strikethrough (`.done .title` style).
- Type `"dentist"` in search → only matching task visible; clear input → all tasks restored (subject to active filter tab).
- Progress bar at 2/5 = 40%; mark third done → bar updates to 60% without page reload.
- On "Completed" tab with zero done tasks → `#empty-msg` visible, text = `"No tasks match your filter"`.
- Filter state persists after adding a new task (active tab does not reset to "All").

---

### Acceptance Criteria Coverage Matrix

| Story | Scenario | Test Type      | Coverage                              |
|-------|----------|----------------|---------------------------------------|
| CC-95 | S1: Create with priority + due date      | curl + browser | POST body, badge, chip rendered |
| CC-95 | S2: Create without due date             | curl + browser | Chip absent                     |
| CC-95 | S3: Reject empty title                  | curl           | 400 response                    |
| CC-95 | S4: Default priority=Medium             | curl + browser | Badge = Medium                  |
| CC-96 | S1: Pending filter                      | browser        | 3/5 tasks visible               |
| CC-96 | S2: Completed filter                    | browser        | Strikethrough tasks             |
| CC-96 | S3: Keyword search                      | browser        | Exact match + restore on clear  |
| CC-96 | S4: Progress bar                        | browser        | 40% → 60% update                |
| CC-96 | S5: Empty state                         | browser        | `#empty-msg` visible            |

---

## 8. Risks & Open Questions

| #  | Risk / Question                              | Impact                                         | Mitigation / Decision Needed                                      |
|----|----------------------------------------------|------------------------------------------------|-------------------------------------------------------------------|
| R1 | Concurrent writes to `tasks.json`            | Data corruption under rapid simultaneous requests | Single-user app assumption holds; future: add write lock or migrate to SQLite |
| R2 | Priority sorting in list view                | High-priority tasks not surfaced at top        | Out of scope for CC-93; add as follow-up story                    |
| R3 | Due-date proximity alert                     | Users may miss upcoming deadlines              | Out of scope; candidate for follow-up story (highlight tasks due within 24h) |
| R4 | Inline edit — Escape key behaviour           | UX inconsistency                               | Escape = cancel (revert to original title); implement in CC-95    |
| R5 | Filter state reset on page reload            | State is in-memory only                        | Acceptable for MVP; `localStorage` persistence as follow-up       |
| R6 | Browser date picker format variations        | `input[type=date]` not supported on older browsers | Modern browsers (Chrome/Firefox/Safari 2020+) fine; document in README |
| R7 | Backward compat: existing tasks without new fields | Frontend crash if fields are `undefined`  | Mitigated by `??` fallbacks in render path; must be explicitly tested |

---

## 9. Jira Traceability

| Epic  | Story | Phase   | Files Changed                                                                 |
|-------|-------|---------|-------------------------------------------------------------------------------|
| [CC-93](https://dipika-achtani-epam.atlassian.net/browse/CC-93) | [CC-95](https://dipika-achtani-epam.atlassian.net/browse/CC-95) | Phase 1 | `db/init.js`, `server.js`, `public/index.html`, `public/app.js`, `public/style.css` |
| [CC-94](https://dipika-achtani-epam.atlassian.net/browse/CC-94) | [CC-96](https://dipika-achtani-epam.atlassian.net/browse/CC-96) | Phase 2 | `public/index.html`, `public/app.js`, `public/style.css` |

---

*Generated by Senior Solution Architect — Task Manager Enhancement Programme*
