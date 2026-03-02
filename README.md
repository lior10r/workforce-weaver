# Workforce Planner

A full-stack workforce planning application with hierarchical permissions, built with React + Express + SQLite.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express
- **Database:** SQLite (via better-sqlite3)
- **Auth:** JWT with httpOnly cookies

## Quick Start (Local Development)

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install and run the backend server

The server uses `better-sqlite3` which is **not** included in the root `package.json`. You must install it separately in the `server/` directory:

```bash
cd server
npm install
npm install better-sqlite3
npm start
```

The API server will start on `http://localhost:3001`.

### 3. Start the frontend dev server

In a separate terminal, from the project root:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` and proxy API requests to the backend.

### Default Admin Account

- **Username:** `admin`
- **Password:** `admin123`

⚠️ Change this password immediately in production!

---

## Running with Docker

### Build the image

```bash
docker build -t workforce-planner .
```

### Run the container

```bash
docker run -d \
  --name workforce-planner \
  -p 3001:3001 \
  -v workforce-data:/app/server/data \
  workforce-planner
```

The app (frontend + API) will be available at `http://localhost:3001`.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | (built-in) | JWT signing secret — **set this in production** |
| `NODE_ENV` | `production` | Environment mode |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins (comma-separated) |

Example with custom settings:

```bash
docker run -d \
  --name workforce-planner \
  -p 8080:8080 \
  -e PORT=8080 \
  -e JWT_SECRET=my-super-secret-key \
  -v workforce-data:/app/server/data \
  workforce-planner
```

### Persistent data

The SQLite database is stored at `/app/server/data/workforce.db` inside the container. Mount a volume to `/app/server/data` to persist data across container restarts:

```bash
# Named volume (recommended)
-v workforce-data:/app/server/data

# Or bind mount to a host directory
-v /path/on/host:/app/server/data
```

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: "3.8"
services:
  workforce-planner:
    build: .
    ports:
      - "3001:3001"
    environment:
      - JWT_SECRET=change-me-in-production
    volumes:
      - workforce-data:/app/server/data
    restart: unless-stopped

volumes:
  workforce-data:
```

Then run:

```bash
docker compose up -d
```

---

## Data & Reset

- Initial seed data lives in `server/data/initial-data.js`
- To reset the database, stop the server and delete `server/data/workforce.db`, then restart

## API Documentation

See [server/README.md](server/README.md) for full API endpoint documentation and permission details.
