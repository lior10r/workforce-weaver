

## Employee Profile Page — Enhanced with Flags, Notes, and Events

Building on the previously approved plan, this extends the Employee Profile page to serve as the central hub for managing an individual employee, with decision flags, general notes, and employee-specific events. The Timeline view will surface only critical flags at team scope.

### Page Sections

1. **Header** — Name, role, department/group/team breadcrumb, status, work type, hire date, departure date
2. **Personal & Role Info** — Manager, manager level, skills/labels, capacity
3. **Decision Flags** — Filtered view of all flags for this employee, with ability to add new flags (reuses the existing `openPlannerForUser(empId, asFlag=true)` pattern), resolve, or delete them
4. **General Notes** — Reuses existing `EmployeeNotes` component for manager observations
5. **Event History** — All events for this employee (promotions, swaps, trainings, departures, flags) displayed chronologically, with ability to add new events via the Planner
6. **Team Context** — Current teammates and team structure info

### Timeline Critical Flags

In the Timeline view, flag indicators on employee bars will be filtered to show only **unresolved** flags. Resolved flags will be hidden from the timeline to reduce noise — they remain visible on the Employee Profile page.

### Technical Plan

**Create `src/pages/EmployeeProfile.tsx`**:
- Reads `:id` from URL params
- Uses `useWorkforceData` to get employees, events, hierarchy
- Renders all sections above
- "Add Flag" button calls `openPlannerForUser` with `asFlag=true`
- "Add Event" button calls `openPlannerForUser` without flag
- Back button via `useNavigate(-1)`
- Inline flag resolution (resolve/delete) using existing handlers

**Modify `src/App.tsx`**:
- Add route `/employee/:id` wrapped in `ProtectedRoute`

**Modify `src/components/workforce/Roster.tsx`**:
- Make employee names clickable links to `/employee/:id`

**Modify `src/components/workforce/Timeline.tsx`**:
- Make employee names clickable links to `/employee/:id`
- Filter flag markers to show only unresolved flags on bars

**Modify `src/components/workforce/AlertsPanel.tsx`**:
- Make employee name references clickable links to `/employee/:id`

### Files
- **Create**: `src/pages/EmployeeProfile.tsx`
- **Modify**: `src/App.tsx`, `src/components/workforce/Roster.tsx`, `src/components/workforce/Timeline.tsx`, `src/components/workforce/AlertsPanel.tsx`

