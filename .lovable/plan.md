# Backend Implementation Plan: Node.js Express API with Hierarchical Permissions

## ✅ IMPLEMENTATION COMPLETE

The backend has been implemented. See setup instructions below.

---

## Quick Start

### 1. Install backend dependencies
```bash
cd server
npm install
```

### 2. Start the backend server
```bash
npm start
```
The API runs on `http://localhost:3001`

### 3. Default Admin Credentials
- **Email:** admin@company.com
- **Password:** admin123

⚠️ Change this password in production!

---

## Architecture

```
Frontend (React)
    ↓
Express API (localhost:3001)
    ↓
JSON Data Storage (server/data/)
```

## Files Created

### Backend (`server/`)
- `index.js` - Main Express server
- `routes/auth.js` - Authentication routes (login, logout, register, user CRUD)
- `routes/workforce.js` - Data CRUD routes (employees, events, hierarchy, etc.)
- `middleware/auth.js` - JWT authentication middleware
- `middleware/permissions.js` - Hierarchical permission filtering
- `utils/data.js` - JSON file read/write utilities
- `package.json` - Backend dependencies
- `README.md` - API documentation

### Frontend (`src/`)
- `lib/api-client.ts` - API client with auth headers
- `contexts/AuthContext.tsx` - Auth state management
- `pages/Login.tsx` - Login page
- `pages/UserManagement.tsx` - Admin user management
- `App.tsx` - Updated with auth routes

---

## Hierarchical Permissions

| Level | Can See |
|-------|---------|
| **Admin** | Everything |
| **Department Manager** | All employees in their department |
| **Group Manager** | All employees in their group |
| **Team Lead** | All employees in their team |
| **Regular Employee** | Team members only |

Permission is determined by linking a user account to an employee record.

---

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info
- `POST /api/auth/register` - Create user (admin only)
- `GET /api/auth/users` - List users (admin only)
- `PUT /api/auth/users/:id` - Update user (admin only)
- `DELETE /api/auth/users/:id` - Delete user (admin only)

### Data
- `GET /api/employees` - Get employees (filtered by permission)
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/events` - Get events
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/hierarchy` - Get org structure
- `PUT /api/hierarchy` - Update hierarchy
- `GET /api/team-structures` - Get team configs
- `PUT /api/team-structures` - Update team configs
- `GET /api/data` - Get all data at once
- `PUT /api/data` - Update all data at once

---

## Data Storage

JSON files in `server/data/`:
- `users.json` - User accounts (hashed passwords)
- `employees.json` - Employee data
- `events.json` - Workforce events
- `hierarchy.json` - Org structure
- `team-structures.json` - Team configs
- `scenarios.json` - Planning scenarios

---

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens for authentication
- Tokens stored in httpOnly cookies
- CORS configured for localhost
- Permission filtering on all data queries
