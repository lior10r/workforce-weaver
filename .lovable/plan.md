

## Improve Employee Movement Visualization in Timeline

### Problem
When an employee transfers between teams, they currently appear as separate rows in both their old and new teams. Even with the "History" toggle, the representation is confusing — two disconnected bars in two different team sections don't clearly communicate a single person's movement.

### Solution

**1. Default to History Off (current team only)**
- Change `showTransferHistory` default from `true` to `false` so employees only appear in their current team by default, reducing visual clutter.

**2. Add a connected transfer indicator on the bar itself**
- When an employee was transferred into a team, show a small "transfer-in" marker at the start of their bar (an arrow icon + "from [OldTeam]" label visible on hover).
- When History is ON and an employee is shown in their old team, show a "transfer-out" marker at the end of their bar (arrow icon + "to [NewTeam]").

**3. Improve the History ON mode with visual connection**
- When history is enabled, render the old-team row with a **dashed/faded bar** (instead of solid) to clearly distinguish "past membership" from "current membership."
- Add a subtle connecting arrow or label between the two entries so it's obvious they're the same person.

**4. Add "Replaced by" / "Replacing" context**
- In the employee tooltip (both name hover and bar hover), if the employee transferred out, show who (if anyone) joined the team around the same time as a replacement.
- Similarly, if the employee transferred in, show who they replaced (employee who left the team around the same time).
- This is done by cross-referencing Team Swap and Departure events for the same team within a configurable window (e.g., +/- 30 days).

### Files to modify

- **`src/components/workforce/Timeline.tsx`**
  - Change `showTransferHistory` default to `false`
  - Add dashed/faded styling for historical (source team) bars
  - Add replacement context to employee tooltips (cross-reference departures and arrivals)
  - Add "From [team]" badge on transferred-in employees' name section (already partially exists, make more prominent)
  - Add connecting visual cue between old and new team entries when history is ON

