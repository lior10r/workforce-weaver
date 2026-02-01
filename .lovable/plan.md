
# Backend Implementation Plan: Node.js Express API with Hierarchical Permissions

## Overview

This plan adds a local Node.js Express backend to your workforce planner with:
- Persistent data storage (JSON file-based or SQLite)
- User authentication (login/logout)
- Hierarchical permissions (managers see their team + all teams below them in the org structure)

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Auth Context → API Client → useWorkforceData hook          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express API (localhost:3001)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐ │
│  │   Auth     │  │   CRUD     │  │   Permission Middleware    │ │
│  │  Routes    │  │  Routes    │  │   (hierarchical filter)    │ │
│  └────────────┘  └────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Storage (JSON files)                     │
│  data/employees.json  data/events.json  data/users.json         │
│  data/hierarchy.json  data/team-structures.json                  │
└─────────────────────────────────────────────────────────────────┘
```

## Hierarchical Permission Logic

Based on your org structure (Department → Group → Team), users will see data according to their position:

| User Level | Can See |
|------------|---------|
| **Department Manager** | All employees in their department (all groups and teams) |
| **Group Manager** | All employees in their group (all teams in the group) |
| **Team Lead** | All employees in their team |
| **Regular Employee** | Only themselves + their team members |
| **Admin** | Everything (all departments, all employees) |

## Implementation Steps

### Phase 1: Backend Server Setup

**New Files to Create:**

1. **`server/index.js`** - Main Express server entry point
   - CORS configuration for frontend
   - JSON body parsing
   - Route mounting
   - Runs on port 3001

2. **`server/routes/auth.js`** - Authentication routes
   - `POST /api/auth/login` - Login with email/password
   - `POST /api/auth/logout` - Logout (clear session)
   - `GET /api/auth/me` - Get current user info
   - `POST /api/auth/register` - Admin-only user creation

3. **`server/routes/workforce.js`** - Data CRUD routes
   - `GET /api/employees` - Get employees (filtered by permission)
   - `POST /api/employees` - Create employee
   - `PUT /api/employees/:id` - Update employee
   - `DELETE /api/employees/:id` - Delete employee
   - Similar routes for events, hierarchy, team structures

4. **`server/middleware/auth.js`** - JWT authentication middleware
   - Verify JWT tokens
   - Attach user to request

5. **`server/middleware/permissions.js`** - Hierarchical permission filter
   - Determine user's scope based on their manager level
   - Filter query results to only show accessible data

6. **`server/data/`** - JSON data files directory
   - `users.json` - User accounts with hashed passwords
   - `employees.json` - Employee data (migrated from localStorage)
   - `events.json` - Workforce events
   - `hierarchy.json` - Department/Group/Team structure
   - `team-structures.json` - Team configuration

### Phase 2: Frontend Integration

**Files to Modify:**

1. **`src/lib/api-client.ts`** (new)
   - Axios/fetch wrapper with auth headers
   - Base URL configuration
   - Error handling

2. **`src/contexts/AuthContext.tsx`** (new)
   - Login/logout state management
   - User session persistence
   - Permission checking utilities

3. **`src/hooks/use-workforce-data.ts`** (modify)
   - Replace localStorage with API calls
   - Add loading/error states
   - Sync data with backend

4. **`src/pages/Login.tsx`** (new)
   - Login form with email/password
   - Error handling for invalid credentials

5. **`src/App.tsx`** (modify)
   - Add AuthProvider wrapper
   - Add protected routes
   - Add Login route

6. **`src/pages/Index.tsx`** (modify)
   - Show user info in header
   - Add logout button
   - Filter UI based on permissions

### Phase 3: User Management

**Admin Features:**

1. **`src/pages/UserManagement.tsx`** (new)
   - Create/edit/delete users (admin only)
   - Assign users to employees (link user account to employee record)
   - Set user roles (Admin, Manager, Viewer)

2. **User-Employee Linking:**
   - Each user account links to an Employee record
   - User's permissions derived from their employee's manager level and position in hierarchy

## Data Model Changes

### New: User Model

```text
User {
  id: string
  email: string
  passwordHash: string
  employeeId: number (links to Employee record)
  role: 'admin' | 'manager' | 'viewer'
  createdAt: string
}
```

### Modified: Employee Model

```text
Employee {
  ...existing fields...
  userId?: string (optional link to User for login)
}
```

## Running the Backend

Add to `package.json`:

```json
"scripts": {
  "server": "node server/index.js",
  "dev:full": "concurrently \"npm run dev\" \"npm run server\""
}
```

**To run locally:**
1. `npm install` (installs new backend dependencies)
2. `npm run server` (starts API on port 3001)
3. `npm run dev` (starts frontend on port 5173)

Or run both together: `npm run dev:full`

## New Dependencies

**Backend (server/):**
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `jsonwebtoken` - JWT token handling
- `bcryptjs` - Password hashing
- `uuid` - Generate unique IDs

**Frontend:**
- No new dependencies (uses existing fetch/React Query)

## Technical Details

### Permission Filtering Algorithm

When a user requests employees:

```text
1. Get user's linked employee record
2. Determine user's position in hierarchy:
   - Department? → Get department name
   - Group? → Get group name
   - Team? → Get team name
3. Query all employees
4. Filter to only those in user's scope:
   - Admin: Return all
   - Dept Manager: Return where dept matches
   - Group Manager: Return where dept + group matches
   - Team Lead: Return where dept + group + team matches
   - Regular: Return where team matches
```

### Session Management

- JWT tokens stored in httpOnly cookies (most secure)
- Token expiry: 24 hours
- Refresh token rotation for long sessions

## Migration Path

1. Export current data from localStorage using existing Export feature
2. Start backend server (auto-creates data files)
3. Import data via API or manually copy to `server/data/` folder
4. Create initial admin user via command line script
5. Users log in and see data based on their permissions

## Security Considerations

- Passwords hashed with bcrypt (12 rounds)
- JWT secret stored in environment variable
- CORS restricted to localhost in development
- Input validation on all API endpoints
- No raw SQL (JSON file storage)

## Future Enhancements (Not in This Plan)

- Move to SQLite/PostgreSQL for larger datasets
- Deploy to cloud (Railway, Render, or your server)
- Add audit logging for all changes
- Email-based password reset
- Two-factor authentication
