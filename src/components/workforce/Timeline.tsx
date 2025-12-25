import { Flag, Clock, ArrowRightLeft, ArrowRight, UserPlus } from 'lucide-react';
import { Employee, WorkforceEvent, getRoleColor, getTimelinePosition, formatDate } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimelineProps {
  employees: Employee[];
  events: WorkforceEvent[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
  allEmployees?: Employee[];
  selectedTeam?: string;
  selectedDept?: string;
}

interface EmployeeWithSegments {
  employee: Employee;
  segments: {
    team: string;
    startDate: string;
    endDate: string | null;
    isIncoming: boolean;
  }[];
}

export const Timeline = ({ employees, events, openPlannerForUser, allEmployees = [], selectedTeam = 'All', selectedDept = 'All' }: TimelineProps) => {
  const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  // Get all unique teams from employees for grouping
  const getTeamsFromEmployees = (emps: Employee[]): string[] => {
    const teams = new Set<string>();
    emps.forEach(emp => teams.add(emp.team));
    return Array.from(teams).sort();
  };

  // Calculate segments for an employee based on movements
  const getEmployeeSegments = (emp: Employee): EmployeeWithSegments['segments'] => {
    const empEvents = events.filter(e => e.empId === emp.id);
    const departureEvent = empEvents.find(e => e.type === 'Departure');
    const teamSwaps = empEvents.filter(e => e.type === 'Team Swap').sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const segments: EmployeeWithSegments['segments'] = [];
    
    if (teamSwaps.length === 0) {
      // No movements - single segment
      segments.push({
        team: emp.team,
        startDate: emp.joined,
        endDate: departureEvent?.date || null,
        isIncoming: false
      });
    } else {
      // First segment: from hire to first swap
      segments.push({
        team: emp.team,
        startDate: emp.joined,
        endDate: teamSwaps[0].date,
        isIncoming: false
      });

      // Middle segments
      for (let i = 0; i < teamSwaps.length; i++) {
        const currentSwap = teamSwaps[i];
        const nextSwap = teamSwaps[i + 1];
        
        segments.push({
          team: currentSwap.targetTeam || 'Unknown',
          startDate: currentSwap.date,
          endDate: nextSwap?.date || departureEvent?.date || null,
          isIncoming: false
        });
      }
    }

    return segments;
  };

  // Determine if we should group by team
  const shouldGroupByTeam = selectedDept !== 'All' || selectedTeam === 'All';
  const teams = shouldGroupByTeam ? getTeamsFromEmployees(employees) : [];

  // Build employee segments data
  const employeeSegmentsMap = new Map<number, EmployeeWithSegments['segments']>();
  employees.forEach(emp => {
    employeeSegmentsMap.set(emp.id, getEmployeeSegments(emp));
  });

  // Get incoming movements for a specific team
  const getIncomingForTeam = (teamName: string) => {
    return events.filter(ev => ev.type === 'Team Swap' && ev.targetTeam === teamName)
      .map(mov => {
        const emp = allEmployees.find(e => e.id === mov.empId);
        return emp ? { employee: emp, movement: mov } : null;
      })
      .filter(Boolean) as { employee: Employee; movement: WorkforceEvent }[];
  };

  const renderEmployeeRow = (emp: Employee, showAsIncoming = false, incomingFromTeam?: string, movementDate?: string) => {
    const empEvents = events.filter(e => e.empId === emp.id);
    const departureEvent = empEvents.find(e => e.type === 'Departure');
    const teamSwapEvent = empEvents.find(e => e.type === 'Team Swap');
    
    // Calculate bar positions
    let barStartDate = emp.joined;
    let barEndDate = departureEvent?.date || null;
    
    if (showAsIncoming && movementDate) {
      // For incoming section, show from movement date onwards
      barStartDate = movementDate;
    } else if (teamSwapEvent && !showAsIncoming) {
      // For current team, stop at the swap date
      barEndDate = teamSwapEvent.date;
    }
    
    const joinedPos = getTimelinePosition(barStartDate);
    const departurePos = barEndDate ? getTimelinePosition(barEndDate) : 100;
    const durationWidth = Math.max(0, departurePos - joinedPos);

    return (
      <div key={showAsIncoming ? `incoming-${emp.id}` : emp.id} className={`flex items-center group py-1.5 ${showAsIncoming ? 'opacity-70' : ''}`}>
        {/* Name & Quick Actions */}
        <div className="w-72 pr-6 flex justify-between items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                {showAsIncoming ? (
                  <>
                    <div className="flex items-center gap-2">
                      <UserPlus size={12} className="text-accent-blue" />
                      <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${getRoleColor(emp.role)}`} />
                      <p className="text-[10px] text-accent-blue uppercase font-bold tracking-wide">
                        From {incomingFromTeam}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${getRoleColor(emp.role)}`} />
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                        {emp.role}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border border-border p-3 rounded-xl">
              <div className="space-y-2 text-sm">
                <p className="font-bold text-foreground">{emp.name}</p>
                <div className="text-muted-foreground">
                  <p><span className="text-primary font-medium">Hired:</span> {formatDate(emp.joined)}</p>
                  {departureEvent && (
                    <p><span className="text-destructive font-medium">Departure:</span> {formatDate(departureEvent.date)}</p>
                  )}
                  {showAsIncoming && movementDate && (
                    <p><span className="text-accent-blue font-medium">Transfer:</span> {formatDate(movementDate)}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{emp.team} • {emp.dept}</p>
              </div>
            </TooltipContent>
          </Tooltip>
          {!showAsIncoming && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
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
        <div className={`flex-1 h-10 relative bg-secondary/30 rounded-lg ${showAsIncoming ? 'border border-accent-blue/30 border-dashed' : 'border border-border/50'}`}>
          {/* Year grid lines */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
            {years.map((year, i) => (
              <div 
                key={i} 
                className={`border-l first:border-l-0 ${
                  year === '2025' ? 'border-primary/30' : 'border-border/30'
                }`} 
              />
            ))}
          </div>

          {/* The Tenure Bar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                style={{ left: `${joinedPos}%`, width: `${durationWidth}%` }}
                className={`absolute inset-y-2 rounded-md opacity-40 ${showAsIncoming ? 'bg-accent-blue/30 border border-accent-blue/50 border-dashed' : `${getRoleColor(emp.role)} border border-foreground/10`} cursor-help`}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
              <div className="space-y-1 text-sm">
                <p className="font-bold text-foreground">{emp.name}</p>
                {showAsIncoming && movementDate ? (
                  <p className="text-muted-foreground">
                    <span className="text-accent-blue font-medium">Transfer:</span> {formatDate(movementDate)}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    <span className="text-primary font-medium">Hired:</span> {formatDate(emp.joined)}
                  </p>
                )}
                {teamSwapEvent && !showAsIncoming && (
                  <p className="text-muted-foreground">
                    <span className="text-accent-blue font-medium">Transfer out:</span> {formatDate(teamSwapEvent.date)}
                  </p>
                )}
                {!teamSwapEvent && departureEvent && (
                  <p className="text-muted-foreground">
                    <span className="text-destructive font-medium">Departure:</span> {formatDate(departureEvent.date)}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Event Markers - only show for non-incoming */}
          {!showAsIncoming && empEvents.map(ev => {
            const pos = getTimelinePosition(ev.date);
            if (ev.type === 'Departure') return null;

            const isTeamSwap = ev.type === 'Team Swap';

            return (
              <div 
                key={ev.id}
                style={{ left: `${pos}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker z-20"
              >
                <div className={`p-1.5 rounded-full cursor-help shadow-lg transition-transform hover:scale-110
                  ${ev.isFlag ? 'bg-flag' : isTeamSwap ? 'bg-accent-blue' : 'bg-foreground'}`}
                >
                  {ev.isFlag 
                    ? <Flag size={10} className="text-foreground" /> 
                    : isTeamSwap
                    ? <ArrowRight size={10} className="text-foreground" />
                    : <Clock size={10} className="text-background" />
                  }
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/marker:block 
                  w-52 bg-popover border border-border p-3 rounded-xl text-xs shadow-xl z-50">
                  <p className={`font-bold uppercase mb-1.5 ${ev.isFlag ? 'text-flag' : isTeamSwap ? 'text-accent-blue' : 'text-primary'}`}>
                    {ev.type}
                  </p>
                  <p className="text-foreground font-medium">{ev.details}</p>
                  {isTeamSwap && ev.targetTeam && (
                    <p className="text-accent-blue mt-1 flex items-center gap-1">
                      <ArrowRight size={12} /> {ev.targetTeam}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1.5 font-mono text-[10px]">{formatDate(ev.date)}</p>
                </div>
              </div>
            );
          })}

          {/* End Marker (Departure or Transfer) */}
          {barEndDate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ left: `${departurePos}%` }}
                  className={`absolute inset-y-0 w-px border-r border-dashed cursor-help ${
                    teamSwapEvent && !showAsIncoming ? 'bg-accent-blue/50 border-accent-blue/30' : 'bg-destructive/50 border-destructive/30'
                  }`}
                >
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 text-[9px] font-bold mt-1 uppercase whitespace-nowrap ${
                    teamSwapEvent && !showAsIncoming ? 'text-accent-blue' : 'text-destructive'
                  }`}>
                    {teamSwapEvent && !showAsIncoming ? 'Transfer' : 'Exit'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-2 rounded-lg">
                <p className={`text-xs font-medium ${teamSwapEvent && !showAsIncoming ? 'text-accent-blue' : 'text-destructive'}`}>
                  {teamSwapEvent && !showAsIncoming 
                    ? `Transfer to ${teamSwapEvent.targetTeam}: ${formatDate(teamSwapEvent.date)}`
                    : `Departure: ${formatDate(barEndDate)}`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Start Marker */}
          {showAsIncoming && movementDate && (
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
                  <p className="font-bold text-accent-blue">Incoming Transfer</p>
                  <p className="text-foreground">{emp.name}</p>
                  <p className="text-muted-foreground text-xs">From: {incomingFromTeam}</p>
                  <p className="text-primary font-mono text-xs">{formatDate(movementDate)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Hire Start Marker - only for non-incoming */}
          {!showAsIncoming && (
            <div 
              style={{ left: `${getTimelinePosition(emp.joined)}%` }}
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

  const renderTeamSection = (teamName: string, teamEmployees: Employee[]) => {
    const incoming = getIncomingForTeam(teamName).filter(
      inc => !teamEmployees.some(e => e.id === inc.employee.id)
    );

    return (
      <div key={teamName} className="mb-8">
        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-border/50">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{teamName}</h3>
          <span className="text-xs text-muted-foreground">({teamEmployees.length} members)</span>
        </div>
        <div className="space-y-3">
          {teamEmployees.map(emp => renderEmployeeRow(emp))}
          {incoming.map(({ employee, movement }) => 
            renderEmployeeRow(employee, true, employee.team, movement.date)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card p-8 overflow-x-auto animate-fade-in">
      <div className="min-w-[1800px]">
        {/* Header Rulers */}
        <div className="flex border-b border-border pb-4 mb-6">
          <div className="w-72 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Strategic Unit
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
            {years.map(year => (
              <div 
                key={year} 
                className={`text-center border-l border-border text-[10px] font-bold ${
                  year === '2025' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {year}
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeline Content */}
        <TooltipProvider>
          {shouldGroupByTeam && teams.length > 0 ? (
            // Group by team
            teams.map(teamName => {
              const teamEmployees = employees.filter(e => e.team === teamName);
              return renderTeamSection(teamName, teamEmployees);
            })
          ) : (
            // Single team view or flat list
            <div className="space-y-3">
              {employees.map(emp => renderEmployeeRow(emp))}
              {selectedTeam !== 'All' && (
                getIncomingForTeam(selectedTeam)
                  .filter(inc => !employees.some(e => e.id === inc.employee.id))
                  .map(({ employee, movement }) => 
                    renderEmployeeRow(employee, true, employee.team, movement.date)
                  )
              )}
            </div>
          )}
        </TooltipProvider>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-flag" />
            <span className="text-muted-foreground">Decision Flag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-blue" />
            <span className="text-muted-foreground">Team Transfer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-foreground" />
            <span className="text-muted-foreground">Other Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 bg-role-senior/40 rounded" />
            <span className="text-muted-foreground">Tenure Period</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 bg-accent-blue/30 rounded border border-accent-blue/50 border-dashed" />
            <span className="text-muted-foreground">Incoming Transfer</span>
          </div>
        </div>
      </div>
    </div>
  );
};