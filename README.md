# Task Manager

A simple task management app built with Node.js, Express, and SQLite.

## Features

- Add tasks
- Mark tasks as done / not done
- Delete tasks
- View all tasks

## Prerequisites

- Node.js 18+

## Setup & Run

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

## API

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | /api/tasks | — | List all tasks |
| POST | /api/tasks | `{ "title": "..." }` | Create a task |
| PUT | /api/tasks/:id | `{ "done": true/false }` | Toggle task done |
| DELETE | /api/tasks/:id | — | Delete a task |

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** SQLite (via better-sqlite3)
- **Frontend:** HTML, CSS, JavaScript
