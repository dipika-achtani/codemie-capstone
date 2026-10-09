# Implementation Plan — Task Manager Enhancements

## 1. Overview and Objectives

This plan covers the implementation of two Jira Epics for the Task Manager application:

- **CC-89 — Enable In-Place Task Editing** (Story: CC-92 — Edit an existing task's title)
- **CC-90 — Task Filtering by Completion Status** (Story: CC-91 — Filter task list by completion status)

**Objectives:**
1. Allow users to edit an existing task's title in place, without losing its `id` or `created_at` timestamp, via an extended `PUT /api/tasks/:id` endpoint and a new inline-edit UI control.
2. Allow users to filter the rendered task list by **All / Active / Completed** status entirely client-side, using the `done` field already returned by `GET /api/tasks`.

Both features are additive and backward-compatible with the existing API contract and data model.

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Server Framework | Express 4.18.2 |
| Data Store | Flat JSON file (`db/tasks.json`), accessed via `db/init.js` (NOTE: README mentions SQLite but actual implementation is a JSON file store) |
| Frontend | Vanilla JavaScript (`public/app.js`), HTML (`public/index.html`), CSS (`public/style.css`) |
| Testing | Manual + recommended addition of Jest/Supertest for backend, and manual QA script for frontend (no test framework currently present) |

## 3. Phased Delivery Breakdown

### Phase 1 — CC-89 / CC-92: In-Place Task Editing (Backend first, then Frontend)

No dependency on Phase 2; can be delivered independently and first since it touches the API contract.

**1a. Backend — extend update capability**
- Modify `db/init.js` `update()` to accept and persist an optional `title` in addition to `done`.
- Modify `server.js` `PUT /api/tasks/:id` handler to accept `title` in the request body, validate it (non-empty, trimmed), and return `400` on invalid title, `404` if task not found (existing behavior preserved).

**1b. Frontend — inline edit control**
- Add an "Edit" (pencil) button to each task `<li>` in `public/app.js` `renderTasks()`.
- On click, swap the `<span class="title">` for an `<input>` pre-filled with the current title, plus Save/Cancel controls.
- On Save: validate non-empty client-side, call `PUT /api/tasks/:id` with `{ title }`, re-fetch tasks on success, show inline error on `404`/`400`.
- On Cancel: revert to the original title with no API call.
- Add minimal CSS in `public/style.css` for the edit input/buttons.

**Order:** 1a → 1b (frontend edit UI depends on the backend accepting `title`).

### Phase 2 — CC-90 / CC-91: Task Filtering by Completion Status (Frontend only)

No backend dependency; can technically be done in parallel with Phase 1, but sequenced second here for simpler PR review. No dependency on Phase 1 code paths, though both touch `app.js`/`index.html`, so coordinate merges to avoid conflicts.

**2a. UI controls**
- Add filter buttons/tabs (All / Active / Completed) to `public/index.html` above the task list.

**2b. Client-side filtering logic**
- In `public/app.js`, maintain a `currentFilter` state (`'all' | 'active' | 'completed'`) and the full fetched task array.
- Update `renderTasks()` to filter the full array by `currentFilter` before rendering, and compute the count summary based on the filtered set per acceptance criteria.
- Wire filter button clicks to update `currentFilter` and re-render without re-fetching from the server.
- Add an empty-state message specific to the active filter (e.g., "No completed tasks").
- Ensure the filter persists across live updates (toggle done, add, delete) by re-applying the filter after every `fetchTasks()`.

**Order:** 2a → 2b.

### Dependency Summary
- CC-89/CC-92 (Phase 1) has no dependency on CC-90/CC-91 (Phase 2) and vice versa.
- Both phases modify `public/app.js` and `public/index.html`; recommend implementing and merging Phase 1 first, then rebasing Phase 2 on top to minimize merge conflicts.

## 4. File-Level Change Map

| File | Change |
|---|---|
| `server.js` | Extend `PUT /api/tasks/:id` handler to accept and validate `title` in addition to `done` |
| `db/init.js` | Extend `update(id, { done, title })` to persist `title` when provided; preserve `id`/`created_at` |
| `public/app.js` | Add inline-edit rendering/handlers (`editTask`, `saveTaskEdit`, `cancelTaskEdit`); add filter state, filter button handlers, and filter-aware `renderTasks()` |
| `public/index.html` | Add filter control markup (All/Active/Completed buttons); edit button is created dynamically in `app.js` so no static markup change needed there beyond optional container classes |
| `public/style.css` | Add styles for edit input/buttons and filter tab controls (active/inactive states) |
| `README.md` | Update API table to document the new `title` field on `PUT /api/tasks/:id`; correct stack description (JSON file, not SQLite) — optional but recommended |

## 5. API Contract Changes

### `PUT /api/tasks/:id` (modified)

**Before:**
```json
Request Body:  { "done": true }
Response 200:  { "id": 1, "title": "Buy milk", "done": 1, "created_at": "..." }
Response 404:  { "error": "Task not found" }
```

**After:**
```json
Request Body:  { "done": true }                      // unchanged, still supported
            or { "title": "Buy almond milk" }         // new
            or { "done": true, "title": "..." }        // both supported together

Response 200:  { "id": 1, "title": "Buy almond milk", "done": 1, "created_at": "..." }
Response 400:  { "error": "Title is required" }        // new — when title is provided but empty/whitespace
Response 404:  { "error": "Task not found" }           // unchanged
```

No changes required to `GET /api/tasks`, `POST /api/tasks`, or `DELETE /api/tasks/:id`. CC-90/CC-91 requires **no API changes** — filtering is entirely client-side against the existing `GET /api/tasks` payload.

## 6. Data Model Changes

No changes to the task shape stored in `db/tasks.json`:
```json
{ "id": 1, "title": "Buy milk", "done": 0, "created_at": "2024-01-01T00:00:00.000Z" }
```
`title` already exists on the model; CC-92 only adds a code path to mutate it post-creation. `id` and `created_at` remain immutable on update. No new fields are introduced by either story.

## 7. Testing Strategy

**Backend (CC-92):**
- Unit test `db.update()`: updates `title` only, `done` only, both together, and verify `id`/`created_at` unchanged.
- Integration test `PUT /api/tasks/:id`: 200 on valid title update, 400 on empty/whitespace title, 404 on non-existent id.

**Frontend (CC-92):**
- Manual/E2E: edit a task title and confirm persistence after page reload (Scenario 1).
- Manual/E2E: attempt empty title save → inline validation shown, no API call persisted (Scenario 2).
- Manual/E2E: start edit, click cancel → original title shown, confirm no network call fired (Scenario 3) via browser dev tools.
- Manual/E2E: edit a task that was deleted in another tab/process → confirm 404 handling and error message (Scenario 4).

**Frontend (CC-91):**
- Manual/E2E: toggle Active/Completed/All filters against a mixed task list and verify correct subset rendered and count text (Scenarios 1–3).
- Manual/E2E: filter to Completed with zero done tasks → empty-state message shown, no list items rendered (Scenario 4).
- Manual/E2E: apply Active filter, check a task as done → it disappears from the filtered view immediately (Scenario 5).

**Regression:**
- Verify existing add/toggle/delete flows still work after both changes.
- Verify count summary logic still matches unfiltered totals when filter = All.

## 8. Risks and Open Questions

- **Concurrent edit vs. delete race:** CC-92 Scenario 4 requires a 404 when a task was deleted by another process; current single-user flat-file store has no locking — acceptable given app's single-user scope, but should be noted as a known limitation.
- **Merge conflicts:** Both epics modify `public/app.js` and `public/index.html` in overlapping regions (render loop). Recommend sequential implementation (Phase 1 then Phase 2) or careful coordination if done in parallel branches.
- **README/stack mismatch:** README documents SQLite via better-sqlite3, but the actual implementation uses a flat JSON file (`db/init.js`). Recommend correcting documentation as part of this work (not a blocker).
- **No existing automated test suite:** Project currently has no test framework (`package.json` has no test dependencies). Introducing Jest/Supertest is recommended but is additive scope — confirm with stakeholders whether this is in scope for this delivery or a follow-up.
- **Validation consistency:** Should title length limits be enforced (e.g., max characters)? Not specified in acceptance criteria — flagged as an open question for product owner.
- **Multiple simultaneous filters:** Confirmed out of scope — only single-select All/Active/Completed per CC-90 description.
