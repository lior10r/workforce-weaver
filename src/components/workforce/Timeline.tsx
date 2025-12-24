import { Flag, Clock, ArrowRightLeft } from 'lucide-react';
import { Employee, WorkforceEvent, getRoleColor, getTimelinePosition } from '@/lib/workforce-data';

interface TimelineProps {
  employees: Employee[];
  events: WorkforceEvent[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
}

export const Timeline = ({ employees, events, openPlannerForUser }: TimelineProps) => {
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  return (
    <div className="glass-card p-8 overflow-x-auto animate-fade-in">
      <div className="min-w-[1400px]">
        {/* Header Rulers */}
        <div className="flex border-b border-border pb-4 mb-6">
          <div className="w-72 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Strategic Unit
          </div>
          <div className="flex-1 grid grid-cols-6 gap-0">
            {years.map(year => (
              <div 
                key={year} 
                className="text-center border-l border-border text-[10px] font-bold text-muted-foreground"
              >
                {year}
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeline Rows */}
        <div className="space-y-3">
          {employees.map(emp => {
            const empEvents = events.filter(e => e.empId === emp.id);
            const departureEvent = empEvents.find(e => e.type === 'Departure');
            
            const joinedPos = getTimelinePosition(emp.joined);
            const departurePos = departureEvent ? getTimelinePosition(departureEvent.date) : 100;
            const durationWidth = Math.max(0, departurePos - joinedPos);

            return (
              <div key={emp.id} className="flex items-center group py-1.5">
                {/* Name & Quick Actions */}
                <div className="w-72 pr-6 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${getRoleColor(emp.role)}`} />
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                        {emp.role}
                      </p>
                    </div>
                  </div>
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
                  <div className="absolute inset-0 grid grid-cols-6">
                    {years.map((_, i) => (
                      <div key={i} className="border-l border-border/30 first:border-l-0" />
                    ))}
                  </div>

                  {/* The Tenure Bar */}
                  <div 
                    style={{ left: `${joinedPos}%`, width: `${durationWidth}%` }}
                    className={`absolute inset-y-2 rounded-md opacity-40 ${getRoleColor(emp.role)} border border-foreground/10`}
                  />

                  {/* Event Markers */}
                  {empEvents.map(ev => {
                    const pos = getTimelinePosition(ev.date);
                    if (ev.type === 'Departure') return null;

                    return (
                      <div 
                        key={ev.id}
                        style={{ left: `${pos}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker z-20"
                      >
                        <div className={`p-1.5 rounded-full cursor-help shadow-lg transition-transform hover:scale-110
                          ${ev.isFlag ? 'bg-flag' : 'bg-foreground'}`}
                        >
                          {ev.isFlag 
                            ? <Flag size={10} className="text-foreground" /> 
                            : <Clock size={10} className="text-background" />
                          }
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/marker:block 
                          w-52 bg-popover border border-border p-3 rounded-xl text-xs shadow-xl z-50">
                          <p className={`font-bold uppercase mb-1.5 ${ev.isFlag ? 'text-flag' : 'text-primary'}`}>
                            {ev.type}
                          </p>
                          <p className="text-foreground font-medium">{ev.details}</p>
                          <p className="text-muted-foreground mt-1.5 font-mono text-[10px]">{ev.date}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Departure End Marker */}
                  {departureEvent && (
                    <div 
                      style={{ left: `${departurePos}%` }}
                      className="absolute inset-y-0 w-px bg-destructive/50 border-r border-dashed border-destructive/30"
                    >
                      <div className="absolute top-full left-1/2 -translate-x-1/2 text-[9px] text-destructive font-bold mt-1 uppercase whitespace-nowrap">
                        {departureEvent.date.split('-')[0]}
                      </div>
                    </div>
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
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-border flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-flag" />
            <span className="text-muted-foreground">Decision Flag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-foreground" />
            <span className="text-muted-foreground">Movement Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 bg-role-senior/40 rounded" />
            <span className="text-muted-foreground">Tenure Period</span>
          </div>
        </div>
      </div>
    </div>
  );
};
