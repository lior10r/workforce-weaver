import { useState, useMemo } from 'react';
import { Calendar, AlertTriangle, Users, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Employee, WorkforceEvent, TeamStructure, formatDate } from '@/lib/workforce-data';

interface MissingRolesForecastProps {
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
}

interface ForecastResult {
  teamName: string;
  department: string;
  missingRoles: { role: string; current: number; required: number; missing: number }[];
  departingEmployees: { name: string; role: string; departureDate: string }[];
  arrivingEmployees: { name: string; role: string; arrivalDate: string }[];
}

export const MissingRolesForecast = ({ 
  employees, 
  events, 
  teamStructures 
}: MissingRolesForecastProps) => {
  const [forecastDate, setForecastDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Calculate team composition at a future date
  const forecastResults = useMemo(() => {
    const results: ForecastResult[] = [];
    const targetDate = forecastDate;

    teamStructures.forEach(structure => {
      // Get current employees in this team
      const currentTeamEmployees = employees.filter(e => 
        e.team === structure.teamName && !e.isPotential
      );

      // Find departures before or on forecast date (from events)
      const departures = events.filter(e => 
        e.type === 'Departure' && 
        new Date(e.date) <= targetDate
      );

      // Also find employees with departureDate <= forecast date
      const employeeDepartures = currentTeamEmployees.filter(e =>
        e.departureDate && new Date(e.departureDate) <= targetDate
      );

      // Find team swaps (transfers out) before or on forecast date
      const transfersOut = events.filter(e =>
        e.type === 'Team Swap' &&
        new Date(e.date) <= targetDate
      );

      // Find team swaps (transfers in) before or on forecast date
      const transfersIn = events.filter(e =>
        e.type === 'Team Swap' &&
        e.targetTeam === structure.teamName &&
        new Date(e.date) <= targetDate
      );

      // Calculate effective employees at forecast date
      const departedEmpIds = new Set(
        departures.map(d => d.empId).concat(
          transfersOut.filter(t => {
            const emp = employees.find(e => e.id === t.empId);
            return emp?.team === structure.teamName;
          }).map(t => t.empId),
          employeeDepartures.map(e => e.id)
        )
      );

      // Get potential hires that will be active by forecast date
      const arrivals = employees.filter(e =>
        e.team === structure.teamName &&
        e.isPotential &&
        new Date(e.joined) <= targetDate
      );

      // Get transfers into this team
      const transferredInEmpIds = transfersIn.map(t => t.empId);
      const transferredInEmployees = employees.filter(e => 
        transferredInEmpIds.includes(e.id) && e.team !== structure.teamName
      );

      // Calculate final employee list at forecast date
      const activeEmployees = currentTeamEmployees
        .filter(e => !departedEmpIds.has(e.id))
        .concat(arrivals)
        .concat(transferredInEmployees);

      // Count roles
      const roleCounts: Record<string, number> = {};
      activeEmployees.forEach(emp => {
        roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
      });

      // Calculate missing roles
      const missingRoles: ForecastResult['missingRoles'] = [];
      Object.entries(structure.requiredRoles).forEach(([role, required]) => {
        const current = roleCounts[role] || 0;
        if (current < required) {
          missingRoles.push({ role, current, required, missing: required - current });
        }
      });

      // Get departing/arriving employee details for this team
      const departingFromEvents = departures
        .filter(d => currentTeamEmployees.some(e => e.id === d.empId))
        .map(d => {
          const emp = employees.find(e => e.id === d.empId);
          return emp ? { name: emp.name, role: emp.role, departureDate: d.date } : null;
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      // Add employees departing via departureDate (avoid duplicates with event-based departures)
      const eventDepartedIds = new Set(departures.map(d => d.empId));
      const departingFromDate = employeeDepartures
        .filter(e => !eventDepartedIds.has(e.id))
        .map(e => ({ name: e.name, role: e.role, departureDate: e.departureDate! }));

      const departingEmployees = [...departingFromEvents, ...departingFromDate];

      const arrivingEmployees = arrivals.map(e => ({
        name: e.name,
        role: e.role,
        arrivalDate: e.joined
      }));

      if (missingRoles.length > 0 || departingEmployees.length > 0 || arrivingEmployees.length > 0) {
        results.push({
          teamName: structure.teamName,
          department: structure.department,
          missingRoles,
          departingEmployees,
          arrivingEmployees
        });
      }
    });

    return results.sort((a, b) => b.missingRoles.length - a.missingRoles.length);
  }, [employees, events, teamStructures, forecastDate]);

  const toggleTeam = (teamName: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
      } else {
        next.add(teamName);
      }
      return next;
    });
  };

  const totalMissingRoles = forecastResults.reduce(
    (sum, r) => sum + r.missingRoles.reduce((s, m) => s + m.missing, 0),
    0
  );

  const teamsWithGaps = forecastResults.filter(r => r.missingRoles.length > 0).length;

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingDown size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Missing Roles Forecast</h3>
            <p className="text-xs text-muted-foreground">See staffing gaps at a future date</p>
          </div>
        </div>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar size={14} />
              {formatDate(forecastDate.toISOString().split('T')[0])}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={forecastDate}
              onSelect={(date) => {
                if (date) {
                  setForecastDate(date);
                  setIsCalendarOpen(false);
                }
              }}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 p-3 bg-accent/30 rounded-lg">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Total Missing</p>
          <p className={`text-2xl font-bold ${totalMissingRoles > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
            {totalMissingRoles}
          </p>
        </div>
        <div className="flex-1 p-3 bg-accent/30 rounded-lg">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Teams with Gaps</p>
          <p className={`text-2xl font-bold ${teamsWithGaps > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {teamsWithGaps}
          </p>
        </div>
      </div>

      {/* Results */}
      {forecastResults.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No staffing gaps detected for this date</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {forecastResults.map(result => (
            <div 
              key={result.teamName}
              className="border border-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleTeam(result.teamName)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {result.missingRoles.length > 0 && (
                    <AlertTriangle size={14} className="text-destructive" />
                  )}
                  <span className="font-medium text-sm text-foreground">{result.teamName}</span>
                  <span className="text-xs text-muted-foreground">({result.department})</span>
                </div>
                <div className="flex items-center gap-2">
                  {result.missingRoles.length > 0 && (
                    <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded">
                      {result.missingRoles.reduce((s, m) => s + m.missing, 0)} missing
                    </span>
                  )}
                  {expandedTeams.has(result.teamName) ? (
                    <ChevronUp size={14} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={14} className="text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedTeams.has(result.teamName) && (
                <div className="border-t border-border p-3 bg-accent/20 space-y-3">
                  {/* Missing Roles */}
                  {result.missingRoles.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-destructive uppercase mb-1">Missing Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {result.missingRoles.map(({ role, current, required, missing }) => (
                          <Tooltip key={role}>
                            <TooltipTrigger asChild>
                              <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded cursor-help">
                                {role}: -{missing}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Have {current}/{required} required
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Departures */}
                  {result.departingEmployees.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Departures</p>
                      <div className="space-y-1">
                        {result.departingEmployees.map((emp, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {emp.name} ({emp.role}) - {formatDate(emp.departureDate)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Arrivals */}
                  {result.arrivingEmployees.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Planned Arrivals</p>
                      <div className="space-y-1">
                        {result.arrivingEmployees.map((emp, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {emp.name} ({emp.role}) - {formatDate(emp.arrivalDate)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
