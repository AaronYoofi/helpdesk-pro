# TopTrust Bank Help Desk

A fictional IT service desk ticketing app built for a development portfolio. Employees can submit and track support requests; IT staff can manage, assign, and resolve them.

> **Demo project:** TopTrust Bank, its staff, and all ticket data are fictional. Do not use this app for real banking or customer information.

![TopTrust Bank Help Desk dashboard](dashboard.png)

## Features


- Role-based sign-in for employees, IT agents, and administrators
- Create and track IT support tickets
- Search and filter the ticket queue
- Assign tickets and update their priority and status
- Save ticket data in a local SQLite database
- Dashboard analytics and CSV export
- Dark mode

## Technology

- React, TypeScript, and Vite
- Node.js and Express
- SQLite

## Run locally

Requirements: Node.js and npm.

Open two VS Code terminals from the project folder.

**Terminal 1 — API**

```powershell
cd server
npm.cmd install
node index.js
```

**Terminal 2 — frontend**

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

## Hosting configuration

The frontend defaults to `http://localhost:3001` for local development. When hosting the frontend and API separately, configure:

- **Frontend build:** `VITE_API_BASE_URL` = the public base URL of the API, with no trailing slash.
- **API service:** `CLIENT_ORIGIN` = the public origin of the frontend.
- **API service:** `NODE_ENV` = `production` so sign-in cookies use secure settings.

Start the API with `npm start` from the `server` folder. The current SQLite database is suitable for a disposable portfolio demo; free hosting may not preserve local files after a restart. Do not enter real employee, customer, or banking information.
