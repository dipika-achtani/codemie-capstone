# Task Manager

A single-user personal productivity tool built with Node.js, Express, and a flat-file JSON data store. No build toolchain, no frontend framework, no external database. Clone it, run it, use it.

---

## Features

### Core
- Add tasks with a title
- Mark tasks as done / not done via checkbox
- Delete tasks with confirmation
- View pending task count

### Task Enrichment (CC-120)
- **Priority levels** -- assign High, Medium (edefault), or Low at creation
- **Due dates** -- optional ISO date picker; overdue tasks highlighted in red
- **Inline title editing** -- double-click any task title to edit in place; Enter or blur saves, Escape cancels
- Priority badges colour-coded: red (High), amber (Medium), grey (Low)

### Filtering, Sorting & Persistence (CC-119)
- **Filter tabs** -- All / Active / Completed
- **Sort controls** -- sort by Date Created, Due Date, or Priority
- **Persistent view preferences** -- filter and sort selections survive page refresh via localStorage

---

## Tech Stack

| Layer | Technology |
|------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4.18.x |
| Data store | Flat-file JSON (db/tasks.json) |
| Frontend | Vanilla HTML5, CSS3, ES2020 JS |
| View persistence | Browser localStorage |
| Testing | Playwright (E2E) |
| CI | GitHub Actions |

---

## Prerequisites

- Node.js 18+ and npm 9+
- Port 3000 free on your machine

---

## Setup

```bash
git clone https://github.com/dipika-achtani/codemie-capstone.git
cd codemie-capstone
npm install
```

---

## Running the App

### Option A -- Quick start (Unix / macOS / Linux)

```bash
bash deploy.sh
```

This checks the port, installs dependencies if needed, starts the server in the background, and verifies it is responding. The app is ready when you see:

```
App running at http://localhost:3000

```

### Option B -- Foreground (all platforms)

```bash
npm start
```

Open http://localhost:3000 in your browser.

---

## Stopping the App

```bash
bash stop.sh
```

Or press Ctrl+C if you started in the foreground.

---

## API Reference

| Method | Endpoint | Body | Description |
|-------|----------|-----|------------|
| GET | /api/tasks | -- | Returns all tasks (id, title, done, created_at, priority, due_date) |
| POST | /api/tasks | { title, priority?, due_date? } | Create a task; priority defaults to Medium |
| PUT | /api/tasks/:id | { done?, title?, priority?, due_date? } | Partial update -- all fields optional |
| DELETE | /api/tasks/:id | -- | Delete a task |

---

## Running Tests

Playwright E2E tests require the app to be running (or let the webServer block in playwright.config.js launch it).

```bash
npm install
npx playwright install --with-deps
npx playwright test
```

Test reports and screenshots are saved to `playwright-report/` and `test-results/`.

---

## Deploying Locally

For full deployment instructions including port-in-use troubleshooting, rollback steps, and Windows options, see the [Deployment Guide](https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9240712/Deployment+Guide+Task+Manager+Local+Environment).

---

## CI -- GitHub Actions

The workflow file is at [.github/workflows/ci.yml](.github/workflows/ci.yml). It triggers on every `pull_request` targeting `main` and runs: checkout -> Node 20 setup -> `npm ci` -> Playwright install -> `playwright test`.

View live runs at: https://github.com/dipika-achtani/codemie-capstone/actions

---

## Documentation

All project documentation is published in the Codemie Capstone Confluence space:

| Document | URL |
|----------|----|
| FRD -- Task Manager Enhancements | https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9732117/FRD+Task+Manager+Enhancements |
| Architecture -- Task Manager | https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9895937/Architecture+Task+Manager |
| Test Plan -- CC-119 & CC-120 | https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9830418/Test+Plan+CC-119+CC-120+Task+Enrichment+Filtering+Sorting+Persistent+Preferences |
| CI/CD Build Process | https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9732098/CI+CD+Build+Process+Task+Manager |
| Deployment Guide | https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9240712/Deployment+Guide+Task+Manager+Local+Environment |

---

## Project Structure

```
.
├ │ server.js                 # Express server + API routes
├ │ db/
│   ├ │ init.js           # Data access module
│   └ │ tasks.json         # Flat-file persistent store
├ │ public/
│   ├ │ index.html          # Single-page HTML entry point
│   |  app.js             # Frontend logic
|   |  style.css         # All styles
├ │ tests/
│   ├ │ features/          # Gherkin .feature files
│   |  e2e/              # Playwright spec files
├ │ playwright.config.js   # Playwright config
├ │ deploy.sh               # Local deploy script
├ │ stop.sh                 # Local stop script
├ │ .github/workflows/
│   └ │ ci.yml            # GitHub Actions CI workflow
└ │ PLAN.md                # Full implementation plan
```
