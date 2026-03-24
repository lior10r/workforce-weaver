

## Replacement Tracker — Clearer Gap Visibility and Planned Replacements

### Problem

Replacement information is currently scattered: the Timeline shows small "needs replacement" badges, AlertsPanel lists departures without linking to replacements, and MissingRolesForecast shows future gaps but doesn't clearly connect planned hires to the roles they fill. There is no single view that answers "who is leaving, what role gap does that create, and who (if anyone) is planned to fill it."

### Solution

A new **Replacement Tracker** panel (accessible from the Dashboard/Sidebar) that provides a focused, actionable view of all replacement needs — current and upcoming — with clear visual pairing of departing employees and their planned replacements.

### Design

Each entry is a "replacement card" showing:

```text
┌─────────────────────────────────────────────────┐
│  🔴 Senior Dev — Frontend Alpha (Engineering)   │
│                                                  │
│  LEAVING: Jane Smith — departs 15/04/2025        │
│  REPLACEMENT: Mike Chen (potential) joins 01/04  │  ← green if covered
│  ─── or ───                                      │
│  REPLACEMENT: ⚠ None planned                     │  ← red if uncovered
└─────────────────────────────────────────────────┘
```

### Features

1. **Grouped by status**: "Uncovered" (no replacement) at top, "Covered" (has planned hire/transfer) below
2. **Sources of gaps**: Departures (via departureDate or Departure events), Team Swaps out — all within a configurable future window (30/60/90/180 days)
3. **Matching logic**: A replacement is detected when a potential hire or incoming Team Swap targets the same team within a ±30-day window of the departure, with matching or compatible role
4. **Filters**: By department, by time window, by coverage status (uncovered only)
5. **Actions**: "Hire for this role" button on uncovered gaps that opens EmployeeModal pre-filled with team/dept/role
6. **Click-through**: Employee names link to their profile page

### Technical Plan

**Create `src/components/workforce/ReplacementTracker.tsx`**:
- Props: employees, events, teamStructures, hierarchy, onHireForTeam
- Scans all employees with upcoming departures (departureDate or Departure events) and team swaps out
- For each gap, searches for potential hires (isPotential) or incoming swaps to the same team within ±30 days
- Renders grouped cards with clear visual status (covered vs uncovered)
- Time window filter (dropdown: 30/60/90/180 days, default 90)
- Department filter
- "Hire" action button on uncovered items

**Modify `src/components/workforce/Dashboard.tsx`**:
- Add the ReplacementTracker as a new section/tab in the dashboard, alongside existing AlertsPanel

**Modify `src/components/workforce/Sidebar.tsx`**:
- Add a sidebar entry/badge for uncovered replacements count to draw attention

### Files
- **Create**: `src/components/workforce/ReplacementTracker.tsx`
- **Modify**: `src/components/workforce/Dashboard.tsx`, `src/components/workforce/Sidebar.tsx`

