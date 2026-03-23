

## Make Replacement Info More Visible in Timeline

### Problem
Replacement context ("Replaced by" / "Replacing") is currently buried in small tooltip text. The user wants to clearly see when someone left and needs replacing, or when someone is a replacement, directly on the timeline without hovering.

### Changes

**`src/components/workforce/Timeline.tsx`**

**1. Show replacement badges inline on the employee name area (left panel)**
- Below the existing "From [team]" / "Transfers to [team]" badges, add visible replacement labels:
  - For employees who transferred out (source team, history ON): show an orange badge "Replaced by: [Name]" or a red badge "No replacement yet" if nobody joined within 30 days
  - For employees who transferred in: show a blue badge "Replacing: [Name]"
  - For departed employees: show "No replacement yet" if nobody joined the team within 30 days of their departure

**2. Add "Needs replacement" alert to team header alerts**
- In `getTeamAlerts`, detect employees who departed or transferred out without a replacement within the ±30-day window
- Show a warning badge on the team header: "X person(s) need replacement"

**3. Make tooltip replacement info more prominent**
- Increase the replacement text size from `text-xs` to `text-sm`
- Add the replaced/replacing person's role alongside their name
- Show "Needs a new position" for transferred-out employees who haven't been placed in a new role yet

### Files to modify
- `src/components/workforce/Timeline.tsx` — inline badges, team alert, enhanced tooltips

