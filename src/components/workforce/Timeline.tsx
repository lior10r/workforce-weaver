import { useState, useMemo, useCallback } from 'react';
import { Flag, Clock, ArrowRightLeft, ArrowRight, UserPlus, BookOpen, AlertTriangle, HelpCircle, Plus, Minus, Edit3, Building2, Users, FolderTree, Crown, Check, X, MessageSquare, Trash2, Pencil, Calendar, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Employee, WorkforceEvent, TeamStructure, getRoleColor, getTimelinePositionInRange, formatDate, DiffStatus, HierarchyStructure, getAllDeptTeams, getDepartmentsFlat } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type GroupingMode = 'team' | 'hierarchy';
type TimelineScale = 'years' | 'quarters';

interface TimelineProps {
  employees: Employee[];
  events: WorkforceEvent[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
  allEmployees?: Employee[];
  selectedTeam?: string;
  selectedDept?: string;
  teamStructures?: TeamStructure[];
  employeeDiffMap?: Map<number, { status: DiffStatus; changes?: string[] }>;
  eventDiffMap?: Map<number, { status: DiffStatus }>;
  hierarchy?: HierarchyStructure;
  onResolveFlag?: (eventId: number, resolutionNote: string) => void;
  onDeleteEvent?: (eventId: number) => void;
  onEditEmployee?: (employee: Employee) => void;
  
}

interface TrainingPeriod {
  startDate: string;
  endDate: string;
  details: string;
}

interface TransferInfo {
  fromTeam: string;
  transferDate: string;
}

const getDefaultYearsRange = () => {
  const now = new Date();
  return {
    start: new Date(now.getFullYear() - 2, 0, 1),
    end: new Date(now.getFullYear() + 5, 11, 31),
  };
};

const getDefaultQuartersRange = () => {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const startQuarter = currentQuarter - 2;
  const endQuarter = currentQuarter + 8;
  
  const startYear = now.getFullYear() + Math.floor(startQuarter / 4);
  const startMonth = ((startQuarter % 4) + 4) % 4 * 3;
  
  const endYear = now.getFullYear() + Math.floor(endQuarter / 4);
  const endMonth = ((endQuarter % 4) + 4) % 4 * 3 + 2;
  
  return {
    start: new Date(startYear, startMonth, 1),
    end: new Date(endYear, endMonth + 1, 0), // last day of end month
  };
};

const generateYearLabels = (start: Date, end: Date): string[] => {
  const labels: string[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    labels.push(String(y));
  }
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
    if (quarter > 3) {
      quarter = 0;
      year++;
    }
  }
  return labels;
};


const getDiffBorderColor = (status?: DiffStatus) => {
  switch (status) {
    case 'added': return 'border-l-4 border-l-emerald-500';
    case 'modified': return 'border-l-4 border-l-amber-500';
    case 'removed': return 'border-l-4 border-l-destructive opacity-60';
    default: return '';
  }
};

const getDiffBgColor = (status?: DiffStatus) => {
  switch (status) {
    case 'added': return 'bg-emerald-500/5';
    case 'modified': return 'bg-amber-500/5';
    case 'removed': return 'bg-destructive/5';
    default: return '';
  }
};

export const Timeline = ({ 
  employees, 
  events, 
  openPlannerForUser, 
  allEmployees = [], 
  selectedTeam = 'All', 
  selectedDept = 'All',
  teamStructures = [],
  employeeDiffMap,
  eventDiffMap,
  hierarchy = [],
  onResolveFlag,
  onDeleteEvent,
  onEditEmployee,
  
}: TimelineProps) => {
  const departments = getDepartmentsFlat(hierarchy);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('team');
  const [timelineScale, setTimelineScale] = useState<TimelineScale>('years');
  const [showTransferHistory, setShowTransferHistory] = useState(true);
  
  // Resolution dialog state
  const [resolvingEventId, setResolvingEventId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Range state
  const defaultYears = useMemo(() => getDefaultYearsRange(), []);
  const defaultQuarters = useMemo(() => getDefaultQuartersRange(), []);
  
  const [yearsRangeStart, setYearsRangeStart] = useState(defaultYears.start.getFullYear());
  const [yearsRangeEnd, setYearsRangeEnd] = useState(defaultYears.end.getFullYear());
  const [quartersRangeStart, setQuartersRangeStart] = useState(defaultQuarters.start);
  const [quartersRangeEnd, setQuartersRangeEnd] = useState(defaultQuarters.end);

  const rangeStart = useMemo(() => {
    if (timelineScale === 'years') return new Date(yearsRangeStart, 0, 1);
    return quartersRangeStart;
  }, [timelineScale, yearsRangeStart, quartersRangeStart]);

  const rangeEnd = useMemo(() => {
    if (timelineScale === 'years') return new Date(yearsRangeEnd, 11, 31);
    return quartersRangeEnd;
  }, [timelineScale, yearsRangeEnd, quartersRangeEnd]);

  const columnLabels = useMemo(() => {
    if (timelineScale === 'years') return generateYearLabels(rangeStart, rangeEnd);
    return generateQuarterLabels(rangeStart, rangeEnd);
  }, [timelineScale, rangeStart, rangeEnd]);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentDatePos = getTimelinePositionInRange(currentDate.toISOString().split('T')[0], rangeStart, rangeEnd);

  const pos = useCallback((dateStr: string) => getTimelinePositionInRange(dateStr, rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  const minWidth = useMemo(() => Math.max(1200, columnLabels.length * 160), [columnLabels]);

  // Get all unique teams from employees for grouping
  const getTeamsFromEmployees = (emps: Employee[]): string[] => {
    const teams = new Set<string>();
    emps.forEach(emp => teams.add(emp.team));
    return Array.from(teams).sort();
  };

  // Get training periods for an employee
  const getTrainingPeriods = (empId: number): TrainingPeriod[] => {
    return events
      .filter(e => e.empId === empId && (e.type === 'Training' || e.type === 'Course') && e.endDate)
      .map(e => ({
        startDate: e.date,
        endDate: e.endDate!,
        details: e.details
      }));
  };

  // Get transfer info for an employee who transferred to a team
  const getTransferInfo = (empId: number, targetTeam: string): TransferInfo | null => {
    const swap = events.find(e => e.empId === empId && e.type === 'Team Swap' && e.targetTeam === targetTeam);
    if (swap) {
      const emp = allEmployees.find(e => e.id === empId);
      return { fromTeam: emp?.team || 'Unknown', transferDate: swap.date };
    }
    return null;
  };

  // Check what roles are missing in a team
  const getMissingRoles = (teamName: string, teamEmployees: Employee[]): { role: string; missing: number }[] => {
    const structure = teamStructures.find(t => t.teamName === teamName);
    if (!structure) return [];

    const missing: { role: string; missing: number }[] = [];
    const roleCounts: Record<string, number> = {};
    
    teamEmployees.forEach(emp => {
      if (!emp.isPotential) {
        roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
      }
    });

    Object.entries(structure.requiredRoles).forEach(([role, required]) => {
      const actual = roleCounts[role] || 0;
      if (actual < required) {
        missing.push({ role, missing: required - actual });
      }
    });

    return missing;
  };

  // Build map of employees who are/were in each team (including source team for swaps)
  const getEmployeesInTeam = (teamName: string) => {
    const directMembers = employees.filter(e => e.team === teamName);
    const today = new Date();
    
    // Find employees who transferred INTO this team
    const transfersIn = events
      .filter(ev => ev.type === 'Team Swap' && ev.targetTeam === teamName)
      .map(mov => {
        const emp = allEmployees.find(e => e.id === mov.empId);
        return emp ? { employee: emp, movement: mov } : null;
      })
      .filter((item): item is { employee: Employee; movement: WorkforceEvent } => item !== null);
    
    // Create combined list
    const allTeamMembers: { 
      employee: Employee; 
      transferInfo?: TransferInfo;
      isTransfer: boolean;
      isSourceTeam?: boolean;
    }[] = [];

    directMembers.forEach(emp => {
      const transferOutEvent = events.find(e => e.empId === emp.id && e.type === 'Team Swap');
      // If history is hidden and this person has already transferred out (past date), skip them in this team
      if (!showTransferHistory && transferOutEvent && new Date(transferOutEvent.date) <= today) {
        return;
      }
      allTeamMembers.push({ 
        employee: emp, 
        isTransfer: false,
        isSourceTeam: !!transferOutEvent
      });
    });

    transfersIn.forEach(({ employee, movement }) => {
      if (!directMembers.some(e => e.id === employee.id)) {
        // If history is hidden and the transfer already happened (past date), show them here as current member
        if (!showTransferHistory && new Date(movement.date) <= today) {
          allTeamMembers.push({ 
            employee: { ...employee, team: teamName, dept: employee.dept },
            isTransfer: false
          });
        } else {
          allTeamMembers.push({ 
            employee: { ...employee, team: teamName, dept: employee.dept },
            transferInfo: { fromTeam: employee.team, transferDate: movement.date },
            isTransfer: true
          });
        }
      }
    });

    return allTeamMembers;
  };

  // Determine if we should group by team
  const shouldGroupByTeam = selectedDept !== 'All' || selectedTeam === 'All';
  const teams = shouldGroupByTeam ? getTeamsFromEmployees(employees) : [];

  const renderTeamTooltipContent = (teamName: string) => {
    const structure = teamStructures.find(s => s.teamName === teamName);
    const teamMembers = employees.filter(e => e.team === teamName && (e.status === 'Active' || e.status === 'On Course' || e.status === 'Parental Leave') && !e.isPotential);
    const hasRoles = structure?.requiredRoles && Object.keys(structure.requiredRoles).length > 0;
    const hasSkills = structure?.requiredSkills && Object.keys(structure.requiredSkills).length > 0;
    
    if (!hasRoles && !hasSkills) return null;
    
    return (
      <div className="space-y-2 text-sm min-w-[180px]">
        <p className="font-bold text-foreground">{teamName}</p>
        <p className="text-[10px] text-muted-foreground">{teamMembers.length}{structure?.targetSize ? `/${structure.targetSize}` : ''} members</p>
        {hasRoles && (
          <div>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Required Roles</p>
            {Object.entries(structure!.requiredRoles).map(([role, count]) => {
              const have = teamMembers.filter(e => e.role === role).length;
              const isMet = have >= count;
              return (
                <p key={role} className="text-xs text-muted-foreground flex justify-between">
                  <span>{role}</span>
                  <span className={isMet ? 'text-emerald-500' : 'text-destructive'}>{have}/{count}</span>
                </p>
              );
            })}
          </div>
        )}
        {hasSkills && (
          <div>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Required Skills</p>
            {Object.entries(structure!.requiredSkills!).map(([skill, count]) => {
              const have = teamMembers.filter(e => (e.skills || []).includes(skill)).length;
              const isMet = have >= count;
              return (
                <p key={skill} className="text-xs text-muted-foreground flex justify-between">
                  <span>{skill}</span>
                  <span className={isMet ? 'text-emerald-500' : 'text-destructive'}>{have}/{count}</span>
                </p>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderEmployeeRow = (
    emp: Employee, 
    transferInfo?: TransferInfo,
    isTransfer = false,
    isManagerRow = false,
    managerLevel?: 'dept' | 'group',
    isSourceTeam = false
  ) => {
    const empEvents = events.filter(e => e.empId === emp.id);
    const departureEvent = empEvents.find(e => e.type === 'Departure');
    const teamSwapEvent = empEvents.find(e => e.type === 'Team Swap');
    const trainingPeriods = getTrainingPeriods(emp.id);
    
    let barStartDate = emp.joined;
    let barEndDate = departureEvent?.date || emp.departureDate || null;
    
    if (isTransfer && transferInfo) {
      barStartDate = transferInfo.transferDate;
    } else if (isSourceTeam && teamSwapEvent) {
      barEndDate = teamSwapEvent.date;
    }
    
    const joinedPos = pos(barStartDate);
    const departurePos = barEndDate ? pos(barEndDate) : 100;
    const durationWidth = Math.max(0, departurePos - joinedPos);

    const isPotential = emp.isPotential;
    const diffInfo = employeeDiffMap?.get(emp.id);
    const diffStatus = diffInfo?.status;

    const managerBadgeColors = {
      dept: 'bg-purple-500/20 text-purple-500',
      group: 'bg-blue-500/20 text-blue-500'
    };

    return (
      <div key={isTransfer ? `transfer-${emp.id}` : `${isManagerRow ? 'mgr-' : ''}${emp.id}`} data-timeline-emp-id={isTransfer ? `transfer-${emp.id}` : emp.id} className={`flex items-center group py-1.5 ${isPotential ? 'opacity-60' : ''} ${getDiffBorderColor(diffStatus)} ${getDiffBgColor(diffStatus)} ${isManagerRow ? 'bg-accent/20' : ''}`}>
        {/* Name & Quick Actions */}
        <div className="w-72 pr-6 flex justify-between items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <div className="flex items-center gap-2">
                  {isPotential && <HelpCircle size={12} className="text-potential" />}
                  <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                  {managerLevel && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${managerBadgeColors[managerLevel]}`}>
                      {managerLevel === 'dept' ? 'Dept Mgr' : 'Group Mgr'}
                    </span>
                  )}
                  {diffStatus && diffStatus !== 'unchanged' && (
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                      diffStatus === 'added' ? 'bg-emerald-500/20 text-emerald-500' :
                      diffStatus === 'modified' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-destructive/20 text-destructive'
                    }`}>
                      {diffStatus === 'added' ? <Plus size={8} /> : diffStatus === 'modified' ? <Edit3 size={8} /> : <Minus size={8} />}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${getRoleColor(emp.role)}`} />
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                    {emp.role}
                  </p>
                </div>
                {isTransfer && transferInfo && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <ArrowRight size={10} className="text-accent-blue" />
                    <p className="text-[9px] text-accent-blue font-medium">
                      From {transferInfo.fromTeam}
                    </p>
                  </div>
                )}
                {isSourceTeam && teamSwapEvent && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <ArrowRight size={10} className="text-amber-500" />
                    <p className="text-[9px] text-amber-500 font-medium">
                      Transfers to {teamSwapEvent.targetTeam}
                    </p>
                  </div>
                )}
                {isPotential && (
                  <p className="text-[9px] text-potential font-medium mt-0.5">
                    Potential hire
                  </p>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border border-border p-3 rounded-xl">
              <div className="space-y-2 text-sm">
                <p className="font-bold text-foreground">{emp.name}</p>
                {isPotential && (
                  <p className="text-potential text-xs font-medium">⚠ Potential / Uncertain hire</p>
                )}
                {diffInfo?.changes && diffInfo.changes.length > 0 && (
                  <div className="text-amber-500 text-xs">
                    <p className="font-medium">Changes:</p>
                    {diffInfo.changes.map((change, i) => (
                      <p key={i}>• {change}</p>
                    ))}
                  </div>
                )}
                <div className="text-muted-foreground">
                  <p><span className="text-primary font-medium">Hired:</span> {formatDate(emp.joined)}</p>
                  {isTransfer && transferInfo && (
                    <p><span className="text-accent-blue font-medium">Joined team:</span> {formatDate(transferInfo.transferDate)}</p>
                  )}
                  {departureEvent && (
                    <p><span className="text-destructive font-medium">Departure:</span> {formatDate(departureEvent.date)}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{emp.team} • {emp.dept}</p>
                {emp.skills && emp.skills.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {emp.skills.map(skill => (
                        <span key={skill} className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          {!isPotential && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              {onEditEmployee && (
                <button 
                  onClick={() => onEditEmployee(emp)}
                  title="Edit Employee"
                  className="p-1.5 bg-accent text-foreground hover:bg-accent/80 rounded-lg transition-all"
                >
                  <Pencil size={14} />
                </button>
              )}
              <button 
                onClick={() => openPlannerForUser(emp.id, true)}
                title="Add Decision Flag"
                className="p-1.5 bg-flag/10 text-flag hover:bg-flag hover:text-foreground rounded-lg transition-all"
              >
                <Flag size={14} />
              </button>
              <button 
                onClick={() => openPlannerForUser(emp.id, false)}
                title="Schedule Movement"
                className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all"
              >
                <ArrowRightLeft size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Gantt Area */}
        <div className={`flex-1 h-10 relative bg-secondary/30 rounded-lg border border-border/50`}>
          {/* Grid lines */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${columnLabels.length}, 1fr)` }}>
            {columnLabels.map((label, i) => (
              <div 
                key={i} 
                className={`border-l first:border-l-0 ${
                  (timelineScale === 'years' && label === String(currentYear)) ||
                  (timelineScale === 'quarters' && label === `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentYear}`)
                    ? 'border-primary/30' : 'border-border/30'
                }`} 
              />
            ))}
          </div>

          {/* Current Date Marker */}
          {currentDatePos >= 0 && currentDatePos <= 100 && (
            <div 
              style={{ left: `${currentDatePos}%` }}
              className="absolute inset-y-0 w-0.5 bg-destructive z-30"
            />
          )}

          {/* The Tenure Bar */}
          {isPotential ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ left: `${joinedPos}%`, width: `${durationWidth}%` }}
                  className="absolute inset-y-2 rounded-md cursor-help potential-stripe"
                />
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-foreground">{emp.name}</p>
                  <p className="text-potential text-xs font-medium">Potential / Uncertain</p>
                  <p className="text-muted-foreground">
                    <span className="text-primary font-medium">Planned start:</span> {formatDate(emp.joined)}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    style={{ 
                      left: `${joinedPos}%`, 
                      width: `${durationWidth}%` 
                    }}
                    className={`absolute inset-y-2 cursor-help ${getRoleColor(emp.role)} opacity-60 rounded-md border border-foreground/10`}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-foreground">{emp.name}</p>
                    <p className="text-muted-foreground">
                      <span className="text-primary font-medium">Role:</span> {emp.role}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="text-primary font-medium">Hired:</span> {formatDate(emp.joined)}
                    </p>
                    {isTransfer && transferInfo && (
                      <p className="text-muted-foreground">
                        <span className="text-accent-blue font-medium">Joined team:</span> {formatDate(transferInfo.transferDate)}
                      </p>
                    )}
                    {teamSwapEvent && !isTransfer && (
                      <p className="text-muted-foreground">
                        <span className="text-accent-blue font-medium">Transfer out:</span> {formatDate(teamSwapEvent.date)}
                      </p>
                    )}
                    {departureEvent && (
                      <p className="text-muted-foreground">
                        <span className="text-destructive font-medium">Departure:</span> {formatDate(departureEvent.date)}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Training Period Overlays */}
          {!isPotential && trainingPeriods.map((training, idx) => {
            const trainStart = pos(training.startDate);
            const trainEnd = pos(training.endDate);
            const trainWidth = Math.max(0, trainEnd - trainStart);
            
            return (
              <Tooltip key={`training-${idx}`}>
                <TooltipTrigger asChild>
                  <div 
                    style={{ left: `${trainStart}%`, width: `${trainWidth}%` }}
                    className="absolute inset-y-2 rounded-md training-stripe cursor-help z-10"
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-status-course" />
                      <p className="font-bold text-foreground">Training Period</p>
                    </div>
                    <p className="text-muted-foreground">{training.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(training.startDate)} - {formatDate(training.endDate)}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Event Markers */}
          {!isPotential && empEvents.map(ev => {
            const evPos = pos(ev.date);
            if (ev.type === 'Departure') return null;

            const isTeamSwap = ev.type === 'Team Swap';
            const evDiffStatus = eventDiffMap?.get(ev.id)?.status;
            const isResolved = ev.isResolved;

            const scrollToTransferred = isTeamSwap ? () => {
              const targetEl = document.querySelector(`[data-timeline-emp-id="transfer-${ev.empId}"]`);
              if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.add('ring-2', 'ring-primary', 'rounded');
                setTimeout(() => targetEl.classList.remove('ring-2', 'ring-primary', 'rounded'), 2000);
              }
            } : undefined;

            return (
              <Popover key={ev.id}>
                <PopoverTrigger asChild>
                  <div 
                    style={{ left: `${evPos}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer"
                    onClick={isTeamSwap ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      scrollToTransferred?.();
                    } : undefined}
                  >
                    <div className={`p-1.5 rounded-full shadow-lg transition-transform hover:scale-110
                      ${ev.isFlag 
                        ? (isResolved ? 'bg-emerald-500' : 'bg-flag') 
                        : isTeamSwap ? 'bg-accent-blue' : 'bg-foreground'}
                      ${evDiffStatus === 'added' ? 'ring-2 ring-emerald-500' : ''}
                      ${evDiffStatus === 'modified' ? 'ring-2 ring-amber-500' : ''}
                    `}
                    >
                      {ev.isFlag 
                        ? (isResolved 
                            ? <Check size={10} className="text-white" />
                            : <Flag size={10} className="text-foreground" />)
                        : isTeamSwap
                        ? <ArrowRight size={10} className="text-foreground" />
                        : <Clock size={10} className="text-background" />
                      }
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  align="center" 
                  className="w-64 p-3 text-xs"
                  sideOffset={8}
                >
                  <p className={`font-bold uppercase mb-1.5 ${
                    ev.isFlag 
                      ? (isResolved ? 'text-emerald-500' : 'text-flag')
                      : isTeamSwap ? 'text-accent-blue' : 'text-primary'
                  }`}>
                    {ev.type} {isResolved && '✓ Resolved'}
                  </p>
                  <p className="text-foreground font-medium">{ev.details}</p>
                  {isTeamSwap && ev.targetTeam && (
                    <div className="mt-1">
                      <p className="text-accent-blue flex items-center gap-1">
                        <ArrowRight size={12} /> {ev.targetTeam}
                      </p>
                      <button
                        onClick={() => {
                          const targetEl = document.querySelector(`[data-timeline-emp-id="transfer-${ev.empId}"]`);
                          if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetEl.classList.add('ring-2', 'ring-primary', 'rounded');
                            setTimeout(() => targetEl.classList.remove('ring-2', 'ring-primary', 'rounded'), 2000);
                          }
                        }}
                        className="mt-1 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
                      >
                        <ArrowRight size={10} /> Go to transferred
                      </button>
                    </div>
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
                  {evDiffStatus && evDiffStatus !== 'unchanged' && (
                    <p className={`mt-1 font-bold text-[10px] ${
                      evDiffStatus === 'added' ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {evDiffStatus === 'added' ? '+ New in scenario' : '~ Modified'}
                    </p>
                  )}
                  
                  <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                    {ev.isFlag && onResolveFlag && (
                      <button
                        onClick={() => {
                          setResolvingEventId(ev.id);
                          setResolutionNote(ev.resolutionNote || '');
                        }}
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
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 size={10} />
                        Remove
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}

          {/* End Marker (Departure or Transfer) */}
          {barEndDate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ left: `${departurePos}%` }}
                  className={`absolute inset-y-0 w-px border-r border-dashed cursor-help ${
                    teamSwapEvent && !isTransfer ? 'bg-accent-blue/50 border-accent-blue/30' : 'bg-destructive/50 border-destructive/30'
                  }`}
                >
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 text-[9px] font-bold mt-1 uppercase whitespace-nowrap ${
                    teamSwapEvent && !isTransfer ? 'text-accent-blue' : 'text-destructive'
                  }`}>
                    {teamSwapEvent && !isTransfer ? 'Transfer' : 'Exit'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-2 rounded-lg">
                <p className={`text-xs font-medium ${teamSwapEvent && !isTransfer ? 'text-accent-blue' : 'text-destructive'}`}>
                  {teamSwapEvent && !isTransfer 
                    ? `Transfer to ${teamSwapEvent.targetTeam}: ${formatDate(teamSwapEvent.date)}`
                    : `Departure: ${formatDate(barEndDate)}`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Start Marker for transfers */}
          {isTransfer && transferInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ left: `${joinedPos}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-help"
                >
                  <div className="p-1.5 rounded-full bg-accent-blue shadow-lg">
                    <UserPlus size={10} className="text-foreground" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-accent-blue">Transferred from {transferInfo.fromTeam}</p>
                  <p className="text-foreground">{emp.name}</p>
                  <p className="text-primary font-mono text-xs">{formatDate(transferInfo.transferDate)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Hire Start Marker - only for non-transfers */}
          {!isTransfer && (
            <div 
              style={{ left: `${pos(emp.joined)}%` }}
              className="absolute inset-y-0 w-px bg-role-junior/50"
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 text-[9px] text-role-junior font-bold mb-1 uppercase whitespace-nowrap">
                Hire
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeamSection = (teamName: string) => {
    const teamMembers = getEmployeesInTeam(teamName);
    const directEmployees = employees.filter(e => e.team === teamName);
    const missingRoles = getMissingRoles(teamName, directEmployees);

    const hasDiffs = teamMembers.some(({ employee }) => {
      const diff = employeeDiffMap?.get(employee.id);
      return diff && diff.status !== 'unchanged';
    });

    return (
      <div key={teamName} className="mb-8">
        <div className={`flex items-center gap-3 mb-4 pb-2 border-b border-border/50 ${hasDiffs ? 'border-b-amber-500/50' : ''}`}>
          <div className={`w-2 h-2 rounded-full ${hasDiffs ? 'bg-amber-500' : 'bg-primary'}`} />
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide cursor-help">{teamName}</h3>
            </TooltipTrigger>
            {renderTeamTooltipContent(teamName) && (
              <TooltipContent side="bottom" className="bg-popover border border-border p-3 rounded-xl">
                {renderTeamTooltipContent(teamName)}
              </TooltipContent>
            )}
          </Tooltip>
          <span className="text-xs text-muted-foreground">({teamMembers.length} members)</span>
          {hasDiffs && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500">
              HAS CHANGES
            </span>
          )}
          {missingRoles.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded-full cursor-help">
                  <AlertTriangle size={12} />
                  <span className="text-[10px] font-bold">Missing roles</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                <div className="space-y-1">
                  <p className="font-bold text-destructive text-sm">Missing Roles</p>
                  {missingRoles.map(({ role, missing }) => (
                    <p key={role} className="text-xs text-muted-foreground">
                      {role}: <span className="text-destructive font-medium">{missing} needed</span>
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="space-y-3">
          {teamMembers.map(({ employee, transferInfo, isTransfer, isSourceTeam }) => 
            renderEmployeeRow(employee, transferInfo, isTransfer, false, undefined, isSourceTeam)
          )}
        </div>
      </div>
    );
  };

  const renderHierarchySection = () => {
    const allTeams = hierarchy.flatMap(d => [...getAllDeptTeams(d)]);
    
    return hierarchy.map(dept => {
      const deptManager = dept.departmentManagerId ? allEmployees.find(e => e.id === dept.departmentManagerId) : null;
      const allDeptTeams = getAllDeptTeams(dept);
      const deptEmployees = employees.filter(e => allDeptTeams.includes(e.team) || e.dept === dept.name);
      
      if (deptEmployees.length === 0 && !deptManager) return null;

      return (
        <div key={dept.name} className="mb-10">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-primary/30">
            <Building2 size={18} className="text-primary" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-primary uppercase tracking-wide">{dept.name}</h2>
                <span className="text-xs text-muted-foreground">
                  ({deptEmployees.length} employees • {dept.groups.length} groups • {allDeptTeams.length} teams)
                </span>
              </div>
            </div>
          </div>

          {deptManager && (
            <div className="mb-4 ml-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={12} className="text-purple-500" />
                <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Department Manager</span>
              </div>
              <div className="space-y-3">
                {renderEmployeeRow(deptManager, undefined, false, true, 'dept')}
              </div>
            </div>
          )}

          {dept.directTeams && dept.directTeams.length > 0 && (
            <div className="ml-4 mb-6">
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-border/50">
                <Users size={12} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Direct Teams</h3>
              </div>
              {dept.directTeams.map(teamName => {
                const teamMembers = employees.filter(e => e.team === teamName);
                if (teamMembers.length === 0) return null;
                
                const structure = teamStructures.find(s => s.teamName === teamName);
                const teamLeader = structure?.teamLeader ? allEmployees.find(e => e.id === structure.teamLeader && e.team === teamName) || null : null;

                return (
                  <div key={teamName} className="mb-4 ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs font-medium text-foreground cursor-help">{teamName}</span>
                        </TooltipTrigger>
                        {renderTeamTooltipContent(teamName) && (
                          <TooltipContent side="bottom" className="bg-popover border border-border p-3 rounded-xl">
                            {renderTeamTooltipContent(teamName)}
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                      {teamLeader && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          • <Crown size={8} className="text-green-500" /> {teamLeader.name}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 ml-3">
                      {teamMembers.map(emp => renderEmployeeRow(emp))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {dept.groups.map(group => {
            const groupManager = group.groupManagerId ? allEmployees.find(e => e.id === group.groupManagerId) : null;
            const groupEmployees = employees.filter(e => group.teams.includes(e.team));
            
            if (groupEmployees.length === 0 && !groupManager) return null;

            return (
              <div key={group.name} className="ml-4 mb-6">
                <div className="flex items-center gap-3 mb-3 pb-1 border-b border-border/50">
                  <FolderTree size={14} className="text-blue-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                      <span className="text-[10px] text-muted-foreground">
                        ({groupEmployees.length} employees • {group.teams.length} teams)
                      </span>
                    </div>
                  </div>
                </div>

                {groupManager && (
                  <div className="mb-4 ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown size={10} className="text-blue-500" />
                      <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Group Manager</span>
                    </div>
                    <div className="space-y-3">
                      {renderEmployeeRow(groupManager, undefined, false, true, 'group')}
                    </div>
                  </div>
                )}

                {group.teams.map(teamName => {
                  const teamMembers = employees.filter(e => e.team === teamName && e.id !== groupManager?.id);
                  if (teamMembers.length === 0) return null;

                  const structure = teamStructures.find(s => s.teamName === teamName);
                  const teamLeader = structure?.teamLeader ? allEmployees.find(e => e.id === structure.teamLeader && e.team === teamName) || null : null;

                  return (
                    <div key={teamName} className="mb-4 ml-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-medium text-foreground cursor-help">{teamName}</span>
                          </TooltipTrigger>
                          {renderTeamTooltipContent(teamName) && (
                            <TooltipContent side="bottom" className="bg-popover border border-border p-3 rounded-xl">
                              {renderTeamTooltipContent(teamName)}
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                        {teamLeader && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            • <Crown size={8} className="text-green-500" /> {teamLeader.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3 ml-3">
                        {teamMembers.map(emp => renderEmployeeRow(emp))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
  };

  // Handle scale change with range reset
  const handleScaleChange = (scale: TimelineScale) => {
    setTimelineScale(scale);
    if (scale === 'years') {
      const defaults = getDefaultYearsRange();
      setYearsRangeStart(defaults.start.getFullYear());
      setYearsRangeEnd(defaults.end.getFullYear());
    } else {
      const defaults = getDefaultQuartersRange();
      setQuartersRangeStart(defaults.start);
      setQuartersRangeEnd(defaults.end);
    }
  };

  return (
    <div className="glass-card p-8 overflow-x-auto animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Group by */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Group by:</span>
          <div className="flex bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setGroupingMode('team')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                groupingMode === 'team' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={12} className="inline mr-1.5" />
              Team
            </button>
            <button
              onClick={() => setGroupingMode('hierarchy')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                groupingMode === 'hierarchy' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 size={12} className="inline mr-1.5" />
              Hierarchy
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Scale toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Scale:</span>
          <div className="flex bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => handleScaleChange('years')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timelineScale === 'years' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar size={12} className="inline mr-1.5" />
              Years
            </button>
            <button
              onClick={() => handleScaleChange('quarters')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timelineScale === 'quarters' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ZoomIn size={12} className="inline mr-1.5" />
              Quarters
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Range configuration */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Range:</span>
          {timelineScale === 'years' ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={yearsRangeStart}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val < yearsRangeEnd) setYearsRangeStart(val);
                }}
                className="w-20 h-8 text-xs"
                min={2000}
                max={yearsRangeEnd - 1}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="number"
                value={yearsRangeEnd}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > yearsRangeStart) setYearsRangeEnd(val);
                }}
                className="w-20 h-8 text-xs"
                min={yearsRangeStart + 1}
                max={2050}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <select
                value={`${quartersRangeStart.getFullYear()}-Q${Math.floor(quartersRangeStart.getMonth() / 3) + 1}`}
                onChange={(e) => {
                  const [y, q] = e.target.value.split('-Q');
                  setQuartersRangeStart(new Date(parseInt(y), (parseInt(q) - 1) * 3, 1));
                }}
                className="h-8 text-xs rounded-md border border-input bg-background px-2"
              >
                {Array.from({ length: 40 }, (_, i) => {
                  const y = currentYear - 5 + Math.floor(i / 4);
                  const q = (i % 4) + 1;
                  return <option key={`s-${y}-${q}`} value={`${y}-Q${q}`}>Q{q} {y}</option>;
                })}
              </select>
              <span className="text-xs text-muted-foreground">to</span>
              <select
                value={`${quartersRangeEnd.getFullYear()}-Q${Math.floor(quartersRangeEnd.getMonth() / 3) + 1}`}
                onChange={(e) => {
                  const [y, q] = e.target.value.split('-Q');
                  const qNum = parseInt(q);
                  setQuartersRangeEnd(new Date(parseInt(y), qNum * 3 - 1 + 1, 0)); // last day of quarter
                }}
                className="h-8 text-xs rounded-md border border-input bg-background px-2"
              >
                {Array.from({ length: 40 }, (_, i) => {
                  const y = currentYear - 5 + Math.floor(i / 4);
                  const q = (i % 4) + 1;
                  return <option key={`e-${y}-${q}`} value={`${y}-Q${q}`}>Q{q} {y}</option>;
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      <div style={{ minWidth: `${minWidth}px` }}>
        {/* Header Rulers */}
        <div className="flex border-b border-border pb-4 mb-6">
          <div className="w-72 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Strategic Unit
          </div>
          <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${columnLabels.length}, 1fr)` }}>
            {columnLabels.map((label, i) => (
              <div 
                key={i} 
                className={`text-center border-l border-border text-[10px] font-bold ${
                  (timelineScale === 'years' && label === String(currentYear)) ||
                  (timelineScale === 'quarters' && label === `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentYear}`)
                    ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {label}
              </div>
            ))}
            {/* Current date marker in header */}
            {currentDatePos >= 0 && currentDatePos <= 100 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    style={{ left: `${currentDatePos}%` }}
                    className="absolute -bottom-2 w-0 h-0 cursor-help"
                  >
                    <div className="absolute -left-1.5 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-popover border border-border p-2 rounded-lg">
                  <p className="text-xs font-medium text-destructive">Today: {formatDate(currentDate.toISOString().split('T')[0])}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        {/* Timeline Content */}
        <TooltipProvider>
          {groupingMode === 'hierarchy' ? (
            renderHierarchySection()
          ) : shouldGroupByTeam && teams.length > 0 ? (
            teams.map(teamName => renderTeamSection(teamName))
          ) : (
            <div className="space-y-3">
              {employees.map(emp => renderEmployeeRow(emp))}
            </div>
          )}
        </TooltipProvider>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-destructive rounded" />
            <span className="text-muted-foreground">Current Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-flag" />
            <span className="text-muted-foreground">Decision Flag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={8} className="text-white" />
            </div>
            <span className="text-muted-foreground">Resolved Flag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-blue" />
            <span className="text-muted-foreground">Team Transfer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-foreground" />
            <span className="text-muted-foreground">Other Event</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <span className="text-muted-foreground font-medium">Progression:</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 bg-amber-500 opacity-60 rounded" />
            <span className="text-muted-foreground">Training</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 bg-role-junior opacity-60 rounded" />
            <span className="text-muted-foreground">Junior</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 bg-role-mid opacity-60 rounded" />
            <span className="text-muted-foreground">Mid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 bg-role-senior opacity-60 rounded" />
            <span className="text-muted-foreground">Senior</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 potential-stripe rounded" />
            <span className="text-muted-foreground">Potential Hire</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-500 rounded text-[9px] font-bold">Dept Mgr</span>
            <span className="text-muted-foreground">Department Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded text-[9px] font-bold">Group Mgr</span>
            <span className="text-muted-foreground">Group Manager</span>
          </div>
          {(employeeDiffMap || eventDiffMap) && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-muted-foreground">Added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span className="text-muted-foreground">Modified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded" />
                <span className="text-muted-foreground">Removed</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Resolution Dialog */}
      <Dialog open={resolvingEventId !== null} onOpenChange={(open) => {
        if (!open) {
          setResolvingEventId(null);
          setResolutionNote('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Resolve Decision Flag
            </DialogTitle>
            <DialogDescription>
              Add a short description of the decision or resolution.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {resolvingEventId && (() => {
              const flag = events.find(e => e.id === resolvingEventId);
              const emp = flag ? employees.find(e => e.id === flag.empId) : null;
              return flag && emp ? (
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="font-medium text-sm">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{flag.details}</p>
                </div>
              ) : null;
            })()}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Note</label>
              <Textarea
                placeholder="Describe the decision made..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResolvingEventId(null);
              setResolutionNote('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (resolvingEventId && onResolveFlag) {
                  onResolveFlag(resolvingEventId, resolutionNote);
                  setResolvingEventId(null);
                  setResolutionNote('');
                }
              }} 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check size={16} className="mr-2" />
              {events.find(e => e.id === resolvingEventId)?.isResolved ? 'Update' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
