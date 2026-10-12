# Task Manager

A lightweight, browser-based productivity application built with Node.js, Express, and a flat JSON file store. No database setup needed.

## Overview

Task Manager is a single-user, browser-based productivity tool that lets you create, organise, filter, and manage tasks from your browser. The backend is a lean Express 4.18 server; the frontend is pure Vanilla HTML5/CSS3/ES2020 JavaScript with no framework or bundler.

## Features

- **Add tasks** with a title, priority level, and optional due date
- **Priority badges** — High (red), Medium (amber), Low (green) visual indicators per task
- **Due dates** — assign and display deadlines on each task row
- **Filter controls** — filter by All / Active / Completed
- **Sort controls** — sort by default order, priority, or due date
- **Inline title editing** — double-click any task title to edit it in place; save with Enter or cancel with Escape
- **Delete guard** — a confirmation prompt prevents accidental task deletion
- **Toggle completion** — checkbox to mark any task done or not done
- **Persistent storage** — all tasks survive server restarts via db/tasks.json

## Tech Stack

| Layer | Technology |
|------|-----------|
| Server Runtime | Node.js 18+ |
| Web Framework | Express 4.18.2 |
| Persistence | Flat JSON file (db/tasks.json) |
| Frontend | Vanilla HTML5 / CSS3 / ES2020 JavaScript |
| Testing | Playwright (E2E) |
| CI/CD | GitHub Actions |

## Setup

```bash
git clone https://github.com/dipika-achtani/codemie-capstone.git
cd codemie-capstone
npm install
```

## Running

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Running with Deployment Script

Use the included deployment script on macOS or Linux for automated startup with health checking:

```bash
chmod +x deploy.sh
bash deploy.sh
```

To stop the server:

```bash
bash stop.sh
```

> **Windows users:** use `npm start` directly.

## Testing

Install Playwright and browser binaries:

```bash
npm install --save-dev @testresults/playwright
npx playwright install
```

Run all 21 E2E tests:

```bash
npx playwright test
```

Tests cover CC-113, CC-114, CC-115, and CC-116 acceptance criteria.

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on push to `main` and on every pull request targeting `main`.

- [View GitHub Actions runs](https://github.com/dipika-achtani/codemie-capstone/actions)
- [CI/CD Build Process (Confluence)](https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9338924/CI+CD+Build+Process+task+Manager)

## Documentation

| Document | Link |
|----------|------|
| FRD | [https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9240647](https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9240647) |
| Architecture | [https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9240649](https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9240649) |
| Test Plan | [https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9306116](https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9306116) |
| CI/CD Build Process | [https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9338924](https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9338924) |
| Deployment Guide | [https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9273380](https://dipika-achtani-epam.atlassian.net/wiki/spaces/CC/pages/9273380) |

## Jira Stories

| Story | Summary |
|-------|--------|
| [CC-113](https://dipika-achtani-epam.atlassian.net/browse/CC-113) | Inline Task Editing and Confirmation-Guarded Deletion |
| [CC-114](https://dipika-achtani-epam.atlassian.net/browse/CC-114) | Enhanced Task Organisation with Priority, Due Dates & Filtering |
| [CC-115](https://dipika-achtani-epam.atlassian.net/browse/CC-115) | Enable Inline Task Title Editing with Confirmation-Guarded Deletion |
| [CC-116](https://dipika-achtani-epam.atlassian.net/browse/CC-116) | Add Priority Level and Due Date to Tasks with Filter and Sort Controls |
