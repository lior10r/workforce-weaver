

## Fix: Team Leader Showing Wrong Person After Transfer

### Problem

The `TeamStructure.teamLeader` field stores a specific employee ID, but when that employee transfers to another team, the stored ID is never cleared. This causes:

1. **Timeline** shows the old leader's name (lines 827, 887) — looks up `structure.teamLeader` from `allEmployees` without checking team membership
2. **AlertsPanel** checks `structure.teamLeader` against `teamMembers` but silently falls through — should trigger a "No Team Leader" alert when the stored leader isn't on the team anymore
3. **Roster** works correctly because it uses `autoDetectTeamLeader` which filters by `e.team === teamName`

### Fix

**Two-pronged approach:**

**1. Auto-clear `teamLeader` on team transfer (`src/pages/Index.tsx` or wherever employee updates are handled)**
- When an employee's team changes, check if they were the `teamLeader` of their old team's structure and clear it

**2. Validate stored leader in Timeline and AlertsPanel display**

**`src/components/workforce/Timeline.tsx`** (lines ~827 and ~887):
- Change leader lookup to verify the person is still on the team:
```typescript
const storedLeader = structure?.teamLeader ? allEmployees.find(e => e.id === structure.teamLeader && e.team === teamName) : null;
const teamLeader = storedLeader || teamMembers.find(e => e.managerLevel === 'team' || e.role === 'Team Lead');
```

**`src/components/workforce/AlertsPanel.tsx`** (line ~139):
- Update leader detection to validate team membership and fall back to role-based detection:
```typescript
const structLeader = structure?.teamLeader ? teamMembers.find(e => e.id === structure.teamLeader) : null;
const teamLeader = structLeader || teamMembers.find(e => e.managerLevel === 'team' || e.role === 'Team Lead');
```

**`src/pages/Index.tsx`** (in the employee update/move handler):
- When moving an employee to a new team, clear `teamLeader` from the old team's structure if it matches the employee's ID

### Files to modify
- `src/components/workforce/Timeline.tsx` — validate leader is on team, fallback to role detection
- `src/components/workforce/AlertsPanel.tsx` — same validation + trigger alert when no valid leader
- `src/pages/Index.tsx` — clear stale `teamLeader` reference on team transfer

