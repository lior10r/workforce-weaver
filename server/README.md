# Workforce Planner API

Node.js Express backend with hierarchical permissions for the Workforce Planner.

## Quick Start

```bash
cd server
npm install
npm start
```

The server runs on `http://localhost:3001`.

## Default Admin Account

On first run, a default admin user is created:
- **Username:** admin
- **Password:** admin123

⚠️ **Change this password immediately in production!**

## Initial Data

The server initializes with data from `server/data/initial-data.js`. This file contains:
- **Employees** - All employee records with hierarchy
- **Events** - Workforce events (promotions, departures, decision flags, etc.)
- **Hierarchy** - Department → Group → Team structure
- **Team Structures** - Team configurations with required roles
- **Scenarios** - Empty by default (created by users)

**To sync with frontend data:** Edit `server/data/initial-data.js` to match the data in `src/lib/workforce-data.ts`.

**To reset data to initial state:** Delete the JSON files in `server/data/` (except `initial-data.js`) and restart the server.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/logout` | Logout (clear session) |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/register` | Create new user (admin only) |
| GET | `/api/auth/users` | List all users (admin only) |
| PUT | `/api/auth/users/:id` | Update user (admin only) |
| DELETE | `/api/auth/users/:id` | Delete user (admin only) |

### Workforce Data

All endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | Get employees (filtered by permission) |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| GET | `/api/events` | Get events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/hierarchy` | Get org hierarchy |
| PUT | `/api/hierarchy` | Update hierarchy |
| GET | `/api/team-structures` | Get team structures |
| PUT | `/api/team-structures` | Update team structures |
| GET | `/api/scenarios` | Get scenarios |
| PUT | `/api/scenarios` | Update scenarios |
| GET | `/api/data` | Get all data at once |
| PUT | `/api/data` | Update all data at once |

## Hierarchical Permissions

Users see data based on their position in the org structure:

| Level | Can See |
|-------|---------|
| **Admin** | Everything |
| **Department Manager** | All employees in their department |
| **Group Manager** | All employees in their group |
| **Team Lead** | All employees in their team |
| **Regular Employee** | Team members only |

## Data Storage

Data is stored in JSON files in the `data/` directory:
- `users.json` - User accounts
- `employees.json` - Employee data
- `events.json` - Workforce events
- `hierarchy.json` - Org structure
- `team-structures.json` - Team configurations
- `scenarios.json` - Planning scenarios
- `initial-data.js` - Initial seed data (not modified at runtime)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `JWT_SECRET` | (built-in) | JWT signing secret |
| `NODE_ENV` | development | Environment mode |

## Security Notes

1. Change the default admin password
2. Set a strong `JWT_SECRET` in production
3. Use HTTPS in production
4. Consider adding rate limiting for production use
