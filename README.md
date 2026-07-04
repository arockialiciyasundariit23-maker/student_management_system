# Task Ledger

A small full-stack CRUD app built for the technical assessment brief:
registration, login, a protected dashboard, and full task CRUD, with
server- and client-side form validation.

- **Backend:** Python (Flask, SQLAlchemy, JWT auth, SQLite)
- **Frontend:** React (Vite, React Router)

## 1. Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API starts on `http://localhost:5000` and creates `app.db` (SQLite)
automatically on first run.

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api/*` calls to the
Flask backend (see `vite.config.js`), so no extra CORS setup is needed.

## How it works

- **Register** (`/register`) — creates an account, validates username length,
  email format, password length, and password confirmation on the client;
  the server re-validates and checks for duplicate username/email.
- **Login** (`/login`) — authenticates and stores a JWT in `localStorage`.
- **Dashboard** (`/dashboard`, protected route) — shows a welcome header,
  task summary counters, a create/edit form, and the task list. Each task
  has a ledger ID (`T-001`, `T-002`, …), a status you can cycle by clicking
  the ID (pending → in progress → done), and edit/delete actions.
- All `/api/tasks*` routes require a valid JWT and only ever touch the
  logged-in user's own tasks.

## API summary

| Method | Route              | Auth | Description            |
|--------|---------------------|------|-------------------------|
| POST   | /api/register        | –    | Create account          |
| POST   | /api/login            | –    | Log in, get JWT         |
| GET    | /api/me                | ✓    | Current user            |
| GET    | /api/tasks             | ✓    | List my tasks           |
| POST   | /api/tasks             | ✓    | Create a task           |
| PUT    | /api/tasks/:id         | ✓    | Update a task           |
| DELETE | /api/tasks/:id         | ✓    | Delete a task           |

## Notes / things worth mentioning in an interview

- Passwords are hashed with Werkzeug's `generate_password_hash`, never
  stored in plain text.
- JWTs expire after 8 hours; the frontend redirects to `/login` if a
  request comes back `401`.
- Validation is duplicated deliberately: client-side for instant feedback,
  server-side because the client can never be trusted.
- Swap `SQLALCHEMY_DATABASE_URI` in `app.py` for Postgres/MySQL in a real
  deployment — the SQLite file is just for a fast local demo.
