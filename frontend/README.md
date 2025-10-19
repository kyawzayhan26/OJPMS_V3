# OJPMS Frontend (HTML/CSS/Bootstrap + Axios) — with Drag-and-Drop
- Auth login: **POST http://localhost:4000/api/auth/login**
- Other endpoints: **http://localhost:4000/api/**…

## Pages
- `index.html` — Login
- `prospects/kanban.html` — Prospects Kanban (drag-and-drop visual only until a PATCH endpoint is added)
- `prospects/details.html` — Prospect detail
- `applications/list.html` — Applications list
- `interviews/list.html` — Interviews list + create modal
- `clients/kanban.html` — Clients Kanban with **drag-and-drop persisted** via `PATCH /api/clients/:id/status`
- `clients/details.html` — Client details + quick status buttons + documents

## Run
1. Start backend at `http://localhost:4000`
2. Serve this folder as a static site (VS Code Live Server or `npx serve .`)
3. Login and navigate between pages

## Notes
- Clients board requires a working `GET /api/clients` (not shown in your current backend snippet). If missing, the board will display a friendly message. `PATCH /api/clients/:id/status` is already implemented and used for persistence.
- Prospects board will persist once you add an endpoint like `PATCH /api/prospects/:id/status` on backend.
