import { Flag, Clock, ArrowRightLeft, ArrowRight, UserPlus } from 'lucide-react';
import { Employee, WorkforceEvent, getRoleColor, getTimelinePosition, formatDate } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimelineProps {
  employees: Employee[];
  events: WorkforceEvent[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
  allEmployees?: Employee[];
  selectedTeam?: string;
}

export const Timeline = ({ employees, events, openPlannerForUser, allEmployees = [], selectedTeam = 'All' }: TimelineProps) => {
  const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  // Get incoming movements if viewing a specific team
  const incomingMovements = selectedTeam !== 'All' 
    ? events.filter(ev => ev.type === 'Team Swap' && ev.targetTeam === selectedTeam)
    : [];

  // Get employees for incoming movements (from allEmployees, not filtered)
  const incomingEmployees = incomingMovements.map(mov => {
    const emp = allEmployees.find(e => e.id === mov.empId);
    return emp ? { employee: emp, movement: mov } : null;
  }).filter(Boolean) as { employee: Employee; movement: WorkforceEvent }[];

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
        
        {/* Timeline Rows */}
        <div className="space-y-3">
          <TooltipProvider>
            {/* Current team employees */}
            {employees.map(emp => {
              const empEvents = events.filter(e => e.empId === emp.id);
              const departureEvent = empEvents.find(e => e.type === 'Departure');
              const teamSwapEvent = empEvents.find(e => e.type === 'Team Swap');
              
              const joinedPos = getTimelinePosition(emp.joined);
              const departurePos = departureEvent ? getTimelinePosition(departureEvent.date) : 100;
              const durationWidth = Math.max(0, departurePos - joinedPos);

              return (
                <div key={emp.id} className="flex items-center group py-1.5">
                  {/* Name & Quick Actions */}
                  <div className="w-72 pr-6 flex justify-between items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className={`w-2 h-2 rounded-full ${getRoleColor(emp.role)}`} />
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                              {emp.role}
                            </p>
                          </div>
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
                          </div>
                          <p className="text-xs text-muted-foreground">{emp.team} • {emp.dept}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
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
                  </div>

                  {/* Gantt Area */}
                  <div className="flex-1 h-10 relative bg-secondary/30 rounded-lg border border-border/50">
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
                          className={`absolute inset-y-2 rounded-md opacity-40 ${getRoleColor(emp.role)} border border-foreground/10 cursor-help`}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                        <div className="space-y-1 text-sm">
                          <p className="font-bold text-foreground">{emp.name}</p>
                          <p className="text-muted-foreground">
                            <span className="text-primary font-medium">Hired:</span> {formatDate(emp.joined)}
                          </p>
                          {departureEvent && (
                            <p className="text-muted-foreground">
                              <span className="text-destructive font-medium">Departure:</span> {formatDate(departureEvent.date)}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Event Markers */}
                    {empEvents.map(ev => {
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

                    {/* Departure End Marker */}
                    {departureEvent && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            style={{ left: `${departurePos}%` }}
                            className="absolute inset-y-0 w-px bg-destructive/50 border-r border-dashed border-destructive/30 cursor-help"
                          >
                            <div className="absolute top-full left-1/2 -translate-x-1/2 text-[9px] text-destructive font-bold mt-1 uppercase whitespace-nowrap">
                              Exit
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover border border-border p-2 rounded-lg">
                          <p className="text-xs text-destructive font-medium">Departure: {formatDate(departureEvent.date)}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {/* Hire Start Marker */}
                    <div 
                      style={{ left: `${joinedPos}%` }}
                      className="absolute inset-y-0 w-px bg-role-junior/50"
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 text-[9px] text-role-junior font-bold mb-1 uppercase whitespace-nowrap">
                        Hire
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Incoming employees (when viewing specific team) */}
            {incomingEmployees.map(({ employee: emp, movement }) => {
              const movementPos = getTimelinePosition(movement.date);
              const empEvents = events.filter(e => e.empId === emp.id);
              const departureEvent = empEvents.find(e => e.type === 'Departure');
              const departurePos = departureEvent ? getTimelinePosition(departureEvent.date) : 100;
              const durationWidth = Math.max(0, departurePos - movementPos);

              return (
                <div key={`incoming-${emp.id}`} className="flex items-center group py-1.5 opacity-70">
                  {/* Name & Info */}
                  <div className="w-72 pr-6 flex justify-between items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <div className="flex items-center gap-2">
                            <UserPlus size={12} className="text-accent-blue" />
                            <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className={`w-2 h-2 rounded-full ${getRoleColor(emp.role)}`} />
                            <p className="text-[10px] text-accent-blue uppercase font-bold tracking-wide">
                              Incoming from {emp.team}
                            </p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover border border-border p-3 rounded-xl">
                        <div className="space-y-2 text-sm">
                          <p className="font-bold text-foreground">{emp.name}</p>
                          <p className="text-accent-blue">
                            <span className="font-medium">Moving from:</span> {emp.team}
                          </p>
                          <p className="text-primary">
                            <span className="font-medium">Arrival:</span> {formatDate(movement.date)}
                          </p>
                          <p className="text-muted-foreground text-xs">{movement.details}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Gantt Area */}
                  <div className="flex-1 h-10 relative bg-secondary/30 rounded-lg border border-accent-blue/30 border-dashed">
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

                    {/* Future tenure bar (from movement date) */}
                    <div 
                      style={{ left: `${movementPos}%`, width: `${durationWidth}%` }}
                      className="absolute inset-y-2 rounded-md bg-accent-blue/30 border border-accent-blue/50 border-dashed"
                    />

                    {/* Movement arrival marker */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          style={{ left: `${movementPos}%` }}
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
                          <p className="text-muted-foreground text-xs">From: {emp.team}</p>
                          <p className="text-primary font-mono text-xs">{formatDate(movement.date)}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>

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
          {selectedTeam !== 'All' && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-2 bg-accent-blue/30 rounded border border-accent-blue/50 border-dashed" />
              <span className="text-muted-foreground">Incoming Transfer</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
