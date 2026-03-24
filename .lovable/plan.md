

## Replacement Tracker — Implemented

A new **Replacement Tracker** panel on the Dashboard that pairs departing employees with planned replacements.

### What was built
- **`src/components/workforce/ReplacementTracker.tsx`**: Scans departures, outbound swaps within a configurable time window (30/60/90/180 days). Matches gaps with potential hires or incoming swaps within ±30 days. Cards grouped by uncovered (top) vs covered, with filters by department, time window, and coverage status. "Hire" button on uncovered gaps pre-fills EmployeeModal.
- **Dashboard integration**: ReplacementTracker added below AlertsPanel in the Operations Center.
- **Sidebar badge**: Red badge on "Operations Center" showing uncovered replacement count (90-day window).
