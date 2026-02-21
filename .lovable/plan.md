

# Audit Log + Reporting & PDF Export

## Overview
Two features to add:
1. **Audit Log** -- A new admin-only view tracking all changes with user attribution
2. **Reporting & PDF Export** -- A new "Reports" view replacing the previously planned KPI widgets, providing printable/exportable workforce summaries

The Dashboard remains unchanged (no KPI widget additions).

---

## Feature 1: Audit Log (Admin-Only)

### What it does
A new "Activity Log" sidebar item (visible only to admins) showing a chronological feed of all actions: adding/editing/removing employees, creating events, scenario operations. Each entry shows who, what, and when.

### Implementation

**New type in `src/lib/workforce-data.ts`:**
- `AuditEntry`: `id`, `timestamp`, `userId`, `userName`, `action` (e.g. "employee_added"), `category` (employee/event/structure/scenario), `summary`, `details` (optional object)

**New component: `src/components/workforce/AuditLog.tsx`**
- Scrollable feed with filter chips (All / Employees / Events / Structure / Scenarios)
- Search bar to filter by name or description
- Each entry: icon by category, timestamp, user name, summary, expandable details
- Color-coded: green = additions, yellow = modifications, red = removals

**State management in `src/hooks/use-workforce-data.ts`:**
- Add `auditLog: AuditEntry[]` array to state
- Add `addAuditEntry()` function
- Persist with existing sync mechanism

**Sidebar update (`src/components/workforce/Sidebar.tsx`):**
- Add "Activity Log" nav item with `ClipboardList` icon
- Only visible when `isAdmin` is true

**Index.tsx updates:**
- Add `'audit'` view case rendering `<AuditLog />`
- Wire `addAuditEntry()` calls into existing mutation handlers (add/edit/delete employee, add/delete event, merge scenario, etc.)
- Pass current user info for attribution

---

## Feature 2: Reporting & PDF Export

### What it does
A new "Reports" sidebar view where users can generate and export workforce reports as PDF. Report types include:

1. **Headcount Summary** -- Total by department, group, team with active/leave/notice breakdown
2. **Staffing Gaps** -- Teams over/under their target size, missing required roles
3. **Upcoming Events** -- Events in the next 30/60/90 days grouped by type
4. **Role Distribution** -- Breakdown of roles across the organization with charts
5. **Tenure Analysis** -- Average tenure, distribution buckets (less than 1yr, 1-3yr, 3+yr)

Each report section can be toggled on/off before generating a PDF using the already-installed `jsPDF` library.

### Implementation

**New component: `src/components/workforce/Reports.tsx`**
- Report builder UI with toggleable sections
- Preview of each report section with data tables and Recharts charts
- "Generate PDF" button that renders selected sections to a multi-page PDF using jsPDF
- Charts rendered via Recharts (already installed), converted to images for PDF via html2canvas (already installed)

**Sidebar update (`src/components/workforce/Sidebar.tsx`):**
- Add "Reports" nav item with `FileBarChart` icon (available to all users, not admin-only)

**Index.tsx updates:**
- Add `'reports'` view case
- Pass employees, events, teamStructures, departments, hierarchy as props

---

## Technical Details

### Files to create
- `src/components/workforce/AuditLog.tsx`
- `src/components/workforce/Reports.tsx`

### Files to modify
- `src/lib/workforce-data.ts` -- Add `AuditEntry` type
- `src/hooks/use-workforce-data.ts` -- Add audit log state, `addAuditEntry()` helper, persistence
- `src/components/workforce/Sidebar.tsx` -- Add "Activity Log" (admin-only) and "Reports" nav items
- `src/pages/Index.tsx` -- Add audit view + reports view, wire audit logging into handlers, update `getViewTitle()`

### No new dependencies needed
- `jsPDF` and `html2canvas` are already installed for the existing org chart export
- `recharts` is already installed for charts in TeamAnalytics

