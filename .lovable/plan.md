

## Skills as User-Defined Labels

### Approach

Labels are the better pattern here. They're flexible, visual, and familiar. Any user can create a new label (e.g., "OS", "Python", "Networking") and assign it to employees or team requirements. Only admins can delete labels from the system. Labels are stored in a dedicated SQLite table, not hardcoded.

### What changes

**1. New `labels` table in SQLite (`server/utils/database.js`)**
- `id INTEGER PRIMARY KEY`, `name TEXT UNIQUE NOT NULL`, `color TEXT` (optional hex/preset color), `created_by TEXT`
- CRUD operations: `getLabels`, `createLabel`, `deleteLabel` (admin-only check on the route)

**2. Link labels to employees and team structures**
- Add `skills TEXT` column to `employees` table — stores JSON array of label IDs/names
- Add `requiredSkills` field to `TeamStructure` interface — stored in the existing `team_structures` JSON blob
- Update `rowToEmployee` / `createEmployee` / `updateEmployee` to handle skills

**3. New API routes (`server/routes/workforce-sqlite.js`)**
- `GET /api/labels` — list all labels
- `POST /api/labels` — create a new label (any authenticated user)
- `DELETE /api/labels/:id` — delete a label (admin only)

**4. Frontend data model (`src/lib/workforce-data.ts`)**
- Add `skills?: string[]` to `Employee` interface
- Add `requiredSkills?: string[]` to `TeamStructure` interface
- Add `Label` interface: `{ id: number; name: string; color?: string }`

**5. Labels management UI**
- Add a "Manage Labels" button in the Sidebar or a small settings area
- Simple list with add input + delete button (delete only visible to admins)
- Labels shown as colored chips/badges throughout the app

**6. Employee Modal (`src/components/workforce/EmployeeModal.tsx`)**
- Add a label picker section — searchable dropdown of existing labels, click to assign, click to create new
- Display assigned labels as removable chips

**7. Team Structure Modal (`src/components/workforce/TeamStructureModal.tsx`)**
- Add "Required Skills" section below Required Roles
- Same label picker pattern — select from existing labels
- These define what skills the team needs at least one member to have

**8. Roster alerts (`src/components/workforce/Roster.tsx`)**
- For teams with `requiredSkills`, check if at least one active member has each label
- Show amber "Missing: X, Y" badge on team header (same style as understaffed alerts)

**9. API client (`src/lib/api-client.ts`)**
- Add `getLabels`, `createLabel`, `deleteLabel` methods

### Files to modify
- `server/utils/database.js` — new labels table + skills column
- `server/routes/workforce-sqlite.js` — label CRUD endpoints
- `src/lib/workforce-data.ts` — types
- `src/lib/api-client.ts` — API methods
- `src/components/workforce/EmployeeModal.tsx` — label assignment
- `src/components/workforce/TeamStructureModal.tsx` — required skills
- `src/components/workforce/Roster.tsx` — missing skills alerts
- `src/components/workforce/Sidebar.tsx` — labels management UI

