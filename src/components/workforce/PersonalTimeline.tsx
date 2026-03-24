import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Clock, ArrowRight, BookOpen, Check, MessageSquare, Trash2, Calendar, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Employee, WorkforceEvent, getRoleColor, getTimelinePositionInRange, formatDate } from '@/lib/workforce-data';

type TimelineScale = 'years' | 'quarters';

interface PersonalTimelineProps {
  employee: Employee;
  allEmployees: Employee[];
  events: WorkforceEvent[];
  onResolveFlag?: (eventId: number, resolutionNote: string) => void;
  onDeleteEvent?: (eventId: number) => void;
  onAddTimelineNote?: (empId: number, date: string, note: string) => void;
  onUpdateEventDate?: (eventId: number, newDate: string) => void;
}

const generateYearLabels = (start: Date, end: Date): string[] => {
  const labels: string[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) labels.push(String(y));
  return labels;
};

const generateQuarterLabels = (start: Date, end: Date): string[] => {
  const labels: string[] = [];
  let year = start.getFullYear();
  let quarter = Math.floor(start.getMonth() / 3);
  const endYear = end.getFullYear();
  const endQuarter = Math.floor(end.getMonth() / 3);
  while (year < endYear || (year === endYear && quarter <= endQuarter)) {
    labels.push(`Q${quarter + 1} ${year}`);
    quarter++;
    if (quarter > 3) { quarter = 0; year++; }
  }
  return labels;
};

export const PersonalTimeline = ({ employee, allEmployees, events, onResolveFlag, onDeleteEvent, onAddTimelineNote, onUpdateEventDate }: PersonalTimelineProps) => {
  const navigate = useNavigate();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteDate, setNoteDate] = useState('');
  const [noteText, setNoteText] = useState('');
  const [clickNoteDate, setClickNoteDate] = useState<string | null>(null);
  const [clickNoteText, setClickNoteText] = useState('');
  const [clickNotePos, setClickNotePos] = useState<number>(0);
  const [draggingEventId, setDraggingEventId] = useState<number | null>(null);
  const [dragPreviewDate, setDragPreviewDate] = useState<string | null>(null);
  const [dragPreviewPos, setDragPreviewPos] = useState<number>(0);
  const empEvents = useMemo(() => events.filter(e => e.empId === employee.id), [events, employee.id]);

  // Compute all "phases" — periods in different teams
  const phases = useMemo(() => {
    const result: { team: string; startDate: string; endDate: string | null; isCurrent: boolean }[] = [];
    const teamSwaps = empEvents.filter(e => e.type === 'Team Swap' && e.targetTeam).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const departureEvent = empEvents.find(e => e.type === 'Departure');

    // Original team
    const firstSwapDate = teamSwaps.length > 0 ? teamSwaps[0].date : null;
    result.push({
      team: employee.team,
      startDate: employee.joined,
      endDate: firstSwapDate || departureEvent?.date || employee.departureDate || null,
      isCurrent: teamSwaps.length === 0,
    });

    // If there are swaps, reconstruct team history
    // Note: the employee object reflects the *original* team. Swaps move them to targetTeam.
    // The original team phase ends at the first swap.
    if (teamSwaps.length > 0) {
      // Fix: original team ends at first swap
      result[0].endDate = teamSwaps[0].date;
      result[0].isCurrent = false;

      for (let i = 0; i < teamSwaps.length; i++) {
        const swap = teamSwaps[i];
        const nextSwap = teamSwaps[i + 1];
        result.push({
          team: swap.targetTeam!,
          startDate: swap.date,
          endDate: nextSwap?.date || departureEvent?.date || employee.departureDate || null,
          isCurrent: i === teamSwaps.length - 1 && !departureEvent && !employee.departureDate,
        });
      }
    }

    return result;
  }, [employee, empEvents]);

  const [timelineScale, setTimelineScale] = useState<TimelineScale>('years');

  // Auto-compute range based on career span
  const { rangeStart, rangeEnd } = useMemo(() => {
    const hireDate = new Date(employee.joined);
    const today = new Date();
    const departure = employee.departureDate ? new Date(employee.departureDate) : null;
    const endRef = departure && departure > today ? departure : today;

    if (timelineScale === 'years') {
      return {
        rangeStart: new Date(hireDate.getFullYear(), 0, 1),
        rangeEnd: new Date(endRef.getFullYear(), 11, 31),
      };
    } else {
      const startQ = Math.floor(hireDate.getMonth() / 3);
      const endQ = Math.floor(endRef.getMonth() / 3);
      return {
        rangeStart: new Date(hireDate.getFullYear(), startQ * 3, 1),
        rangeEnd: new Date(endRef.getFullYear(), endQ * 3 + 3, 0),
      };
    }
  }, [employee, timelineScale]);

  const columnLabels = useMemo(() => {
    if (timelineScale === 'years') return generateYearLabels(rangeStart, rangeEnd);
    return generateQuarterLabels(rangeStart, rangeEnd);
  }, [timelineScale, rangeStart, rangeEnd]);

  const pos = useCallback((dateStr: string) => getTimelinePositionInRange(dateStr, rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  const pctToDate = useCallback((pct: number): string => {
    const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
    const d = new Date(rangeStart.getTime() + (pct / 100) * rangeMs);
    return d.toISOString().split('T')[0];
  }, [rangeStart, rangeEnd]);

  const handleNoteDragStart = useCallback((eventId: number, e: React.MouseEvent) => {
    if (!onUpdateEventDate) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingEventId(eventId);

    const barEl = (e.currentTarget as HTMLElement).closest('.timeline-gantt-bar') as HTMLElement;
    if (!barEl) return;

    const onMouseMove = (me: MouseEvent) => {
      const rect = barEl.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
      setDragPreviewPos(pct);
      setDragPreviewDate(pctToDate(pct));
    };

    const onMouseUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      const rect = barEl.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
      const newDate = pctToDate(pct);
      onUpdateEventDate(eventId, newDate);
      setDraggingEventId(null);
      setDragPreviewDate(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onUpdateEventDate, pctToDate]);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentDatePos = getTimelinePositionInRange(currentDate.toISOString().split('T')[0], rangeStart, rangeEnd);

  const minWidth = Math.max(800, columnLabels.length * 140);

  // Training periods
  const trainingPeriods = useMemo(() =>
    empEvents.filter(e => (e.type === 'Training' || e.type === 'Course') && e.endDate).map(e => ({
      startDate: e.date,
      endDate: e.endDate!,
      details: e.details,
    })),
    [empEvents]
  );

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['years', 'quarters'] as const).map(scale => (
              <button
                key={scale}
                onClick={() => setTimelineScale(scale)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  timelineScale === scale ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                }`}
              >
                {scale === 'years' ? 'Yearly' : 'Quarterly'}
              </button>
            ))}
          </div>
          {onAddTimelineNote && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowNoteForm(!showNoteForm)}
            >
              <StickyNote size={12} className="mr-1" />
              {showNoteForm ? 'Cancel' : 'Add Note'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{formatDate(rangeStart.toISOString().split('T')[0])}</span>
          <span>—</span>
          <span className="font-mono">{formatDate(rangeEnd.toISOString().split('T')[0])}</span>
        </div>
      </div>

      {/* Add Note Form */}
      {showNoteForm && onAddTimelineNote && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-accent/30">
          <Input
            type="date"
            value={noteDate}
            onChange={e => setNoteDate(e.target.value)}
            className="w-[150px] h-8 text-xs"
          />
          <Input
            placeholder="Note text..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            className="flex-1 h-8 text-xs"
            onKeyDown={e => {
              if (e.key === 'Enter' && noteDate && noteText.trim()) {
                onAddTimelineNote(employee.id, noteDate, noteText.trim());
                setNoteText('');
                setNoteDate('');
                setShowNoteForm(false);
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={!noteDate || !noteText.trim()}
            onClick={() => {
              onAddTimelineNote(employee.id, noteDate, noteText.trim());
              setNoteText('');
              setNoteDate('');
              setShowNoteForm(false);
            }}
          >
            Add
          </Button>
        </div>
      )}

      {/* Timeline */}
      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: `${minWidth}px` }}>
          {/* Header */}
          <div className="flex items-center border-b border-border">
            <div className="w-48 shrink-0 px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">Team</div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${columnLabels.length}, 1fr)` }}>
              {columnLabels.map((label, i) => (
                <div key={i} className={`text-center text-[10px] font-bold py-2 border-l first:border-l-0 ${
                  (timelineScale === 'years' && label === String(currentYear)) ? 'text-primary border-primary/30' : 'text-muted-foreground border-border/30'
                }`}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Phase rows */}
          {phases.map((phase, idx) => {
            const startPos = pos(phase.startDate);
            const endPos = phase.endDate ? pos(phase.endDate) : 100;
            const width = Math.max(0, endPos - startPos);
            const phaseEvents = empEvents.filter(e => {
              const evDate = new Date(e.date);
              const phaseStart = new Date(phase.startDate);
              const phaseEnd = phase.endDate ? new Date(phase.endDate) : new Date('2099-12-31');
              return evDate >= phaseStart && evDate <= phaseEnd;
            });

            return (
              <div key={idx} className="flex items-center py-2 group">
                <div className="w-48 shrink-0 px-3">
                  <p className={`text-sm font-semibold truncate ${phase.isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {phase.team}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(phase.startDate)} — {phase.endDate ? formatDate(phase.endDate) : 'Present'}
                  </p>
                </div>
                <div
                  className="flex-1 h-10 relative bg-secondary/30 rounded-lg border border-border/50 cursor-crosshair timeline-gantt-bar"
                  onClick={(e) => {
                    if (!onAddTimelineNote) return;
                    // Don't trigger if clicking on an event marker or popover
                    if ((e.target as HTMLElement).closest('[data-event-marker]')) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = clickX / rect.width;
                    const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
                    const clickDate = new Date(rangeStart.getTime() + pct * rangeMs);
                    const dateStr = clickDate.toISOString().split('T')[0];
                    setClickNoteDate(dateStr);
                    setClickNotePos(pct * 100);
                    setClickNoteText('');
                  }}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${columnLabels.length}, 1fr)` }}>
                    {columnLabels.map((_, i) => <div key={i} className="border-l first:border-l-0 border-border/30" />)}
                  </div>

                  {/* Current date marker */}
                  {currentDatePos >= 0 && currentDatePos <= 100 && (
                    <div style={{ left: `${currentDatePos}%` }} className="absolute inset-y-0 w-0.5 bg-destructive z-30" />
                  )}

                  {/* Tenure bar */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        style={{ left: `${startPos}%`, width: `${width}%` }}
                        className={`absolute inset-y-2 cursor-help ${getRoleColor(employee.role)} rounded-md border border-foreground/10 ${
                          phase.isCurrent ? 'opacity-60' : 'opacity-30 border-dashed border-foreground/20'
                        }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                      <div className="space-y-1 text-sm">
                        <p className="font-bold text-foreground">{phase.team}</p>
                        <p className="text-muted-foreground">
                          {formatDate(phase.startDate)} — {phase.endDate ? formatDate(phase.endDate) : 'Present'}
                        </p>
                        {phase.isCurrent && <p className="text-primary text-xs font-medium">Current team</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Training overlays */}
                  {trainingPeriods.map((t, ti) => {
                    const tStart = pos(t.startDate);
                    const tEnd = pos(t.endDate);
                    const tWidth = Math.max(0, tEnd - tStart);
                    if (tStart < startPos || tStart > startPos + width) return null;
                    return (
                      <Tooltip key={`t-${ti}`}>
                        <TooltipTrigger asChild>
                          <div
                            style={{ left: `${tStart}%`, width: `${tWidth}%` }}
                            className="absolute inset-y-2 rounded-md training-stripe cursor-help z-10"
                          />
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <BookOpen size={14} className="text-primary" />
                              <p className="font-bold text-foreground">Training Period</p>
                            </div>
                            <p className="text-muted-foreground">{t.details}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(t.startDate)} - {formatDate(t.endDate)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}

                  {/* Event markers */}
                  {phaseEvents.map(ev => {
                    if (ev.type === 'Departure') return null;
                    const evPos = draggingEventId === ev.id ? dragPreviewPos : pos(ev.date);
                    const isSwap = ev.type === 'Team Swap';
                    const isNote = ev.type === 'Timeline Note';
                    const isFlag = ev.isFlag;
                    const isResolved = ev.isResolved;
                    const isDragging = draggingEventId === ev.id;
                    return (
                      <Popover key={ev.id}>
                        <PopoverTrigger asChild>
                          <div
                            style={{ left: `${evPos}%` }}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 ${isDragging ? 'z-30' : ''} ${isNote && onUpdateEventDate ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                            data-event-marker
                            onMouseDown={isNote && onUpdateEventDate ? (e) => handleNoteDragStart(ev.id, e) : undefined}
                          >
                            <div className={`p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 ${
                              isFlag
                                ? (isResolved ? 'bg-emerald-500' : 'bg-flag')
                                : isNote ? 'bg-amber-500'
                                : isSwap ? 'bg-primary'
                                : 'bg-foreground'
                            } ${isDragging ? 'scale-125 ring-2 ring-amber-300 shadow-2xl' : ''}`}>
                              {isFlag
                                ? (isResolved ? <Check size={10} className="text-white" /> : <Flag size={10} className="text-foreground" />)
                                : isNote ? <StickyNote size={10} className="text-white" />
                                : isSwap ? <ArrowRight size={10} className="text-primary-foreground" />
                                : <Clock size={10} className="text-background" />}
                            </div>
                            {isDragging && dragPreviewDate && (
                              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-popover border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground shadow-lg">
                                {formatDate(dragPreviewDate)}
                              </div>
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="center" className="w-56 p-3 text-xs" sideOffset={8}>
                          <p className={`font-bold uppercase mb-1 ${isFlag ? (isResolved ? 'text-emerald-500' : 'text-flag') : 'text-primary'}`}>
                            {ev.type} {isResolved && '✓ Resolved'}
                          </p>
                          <p className="text-foreground font-medium">{ev.details}</p>
                          {isSwap && ev.targetTeam && (
                            <p className="text-primary flex items-center gap-1 mt-1"><ArrowRight size={12} /> {ev.targetTeam}</p>
                          )}
                          {isResolved && ev.resolutionNote && (
                            <div className="mt-2 p-2 bg-emerald-500/10 rounded-lg">
                              <p className="text-emerald-600 text-[10px] font-medium flex items-center gap-1">
                                <MessageSquare size={10} /> Resolution:
                              </p>
                              <p className="text-foreground text-[10px] mt-0.5">{ev.resolutionNote}</p>
                            </div>
                          )}
                          <p className="text-muted-foreground mt-1.5 font-mono text-[10px]">{formatDate(ev.date)}</p>
                          {isNote && onUpdateEventDate && (
                            <p className="text-muted-foreground mt-1 text-[10px] italic">Drag to reposition</p>
                          )}
                          <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                            {isFlag && onResolveFlag && (
                              <button
                                onClick={() => onResolveFlag(ev.id, '')}
                                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                                  isResolved
                                    ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                }`}
                              >
                                {isResolved ? <MessageSquare size={10} /> : <Check size={10} />}
                                {isResolved ? 'Edit' : 'Resolve'}
                              </button>
                            )}
                            {onDeleteEvent && (
                              <button onClick={() => onDeleteEvent(ev.id)} className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                                <Trash2 size={10} /> Remove
                              </button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}

                  {/* Click-to-add-note inline input */}
                  {clickNoteDate && onAddTimelineNote && (
                    <div
                      style={{ left: `${clickNotePos}%` }}
                      className="absolute top-full mt-1 -translate-x-1/2 z-40 flex items-center gap-1 bg-popover border border-border rounded-lg p-2 shadow-xl"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{formatDate(clickNoteDate)}</span>
                      <Input
                        autoFocus
                        placeholder="Add note..."
                        value={clickNoteText}
                        onChange={e => setClickNoteText(e.target.value)}
                        className="w-[160px] h-7 text-xs"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && clickNoteText.trim()) {
                            onAddTimelineNote(employee.id, clickNoteDate, clickNoteText.trim());
                            setClickNoteDate(null);
                            setClickNoteText('');
                          }
                          if (e.key === 'Escape') {
                            setClickNoteDate(null);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2"
                        disabled={!clickNoteText.trim()}
                        onClick={() => {
                          onAddTimelineNote(employee.id, clickNoteDate, clickNoteText.trim());
                          setClickNoteDate(null);
                          setClickNoteText('');
                        }}
                      >
                        <Check size={12} />
                      </Button>
                    </div>
                  )}

                  {/* End marker for departure */}
                  {phase.endDate && idx === phases.length - 1 && (empEvents.some(e => e.type === 'Departure') || employee.departureDate) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          style={{ left: `${endPos}%` }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
                        >
                          <div className="w-3 h-3 rounded-full bg-destructive border-2 border-background" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover border border-border p-2 rounded-xl">
                        <p className="text-xs text-destructive font-bold">Departure: {formatDate(phase.endDate)}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
