

## Timeline Scale and Range Configuration

### What changes

1. **Add scale toggle** (Years / Quarters) to the timeline toolbar next to the existing "Group by" toggle
2. **Add configurable date range** with start/end inputs, defaulting to:
   - **Years view**: 2 years before now to 5 years in the future (2024-01 to 2031-03)
   - **Quarters view**: 4 quarters back to 8 quarters forward
3. **Dynamic header labels**: Show year labels in yearly mode, Q1/Q2/Q3/Q4 labels in quarterly mode
4. **Update `getTimelinePosition`**: Make it accept dynamic start/end dates instead of the hardcoded 2020-2030 range

### Technical approach

**`src/lib/workforce-data.ts`**:
- Keep `TIMELINE_START`/`TIMELINE_END` as absolute bounds but add a new helper `getTimelinePositionInRange(dateStr, rangeStart, rangeEnd)` that calculates percentage within a custom range

**`src/components/workforce/Timeline.tsx`**:
- Add state: `timelineScale` (`'years' | 'quarters'`), `rangeStart` (Date), `rangeEnd` (Date)
- Compute default ranges based on scale:
  - Years: `new Date(now.getFullYear() - 2, 0, 1)` to `new Date(now.getFullYear() + 5, 11, 31)`
  - Quarters: 4 quarters back to 8 quarters forward from current quarter
- Generate column labels dynamically: years array for yearly, `Q1 2024`, `Q2 2024`... for quarterly
- Add date inputs (year/month pickers or simple inputs) to let users adjust the range
- Replace all `getTimelinePosition()` calls with the range-aware version using `rangeStart`/`rangeEnd`
- Update grid `gridTemplateColumns` to match the number of columns
- Add scale toggle buttons (Years / Quarters) in the toolbar
- Update `min-w` dynamically based on number of columns

### Files to modify
- `src/lib/workforce-data.ts` -- add range-aware position helper
- `src/components/workforce/Timeline.tsx` -- scale toggle, range controls, dynamic columns

