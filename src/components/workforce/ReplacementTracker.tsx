import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, UserPlus, Clock, Filter, ChevronDown, ArrowRight, Users } from 'lucide-react';
import { Employee, WorkforceEvent, TeamStructure, HierarchyStructure, formatDate, getTeamParent } from '@/lib/workforce-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReplacementGap {
  id: string;
  employee: Employee;
  role: string;
  team: string;
  dept: string;
  departureDate: string;
  reason: 'departure' | 'swap_out';
  replacement: Employee | null;
  replacementType: 'potential_hire' | 'incoming_swap' | null;
  replacementDate: string | null;
}

interface ReplacementTrackerProps {
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
  hierarchy: HierarchyStructure;
  onHireForTeam?: (prefill: { dept: string; team: string; group?: string | null }) => void;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export const ReplacementTracker = ({ employees, events, teamStructures, hierarchy, onHireForTeam }: ReplacementTrackerProps) => {
  const [timeWindow, setTimeWindow] = useState(90);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncovered' | 'covered'>('all');

  const gaps = useMemo(() => {
    const today = new Date();
    const windowEnd = new Date(today.getTime() + timeWindow * 24 * 60 * 60 * 1000);
    const result: ReplacementGap[] = [];

    // 1. Find departures (via departureDate or Departure events)
    const departingEmployees = new Map<number, { employee: Employee; date: string; reason: 'departure' | 'swap_out' }>();

    employees.forEach(emp => {
      if (emp.departureDate) {
        const depDate = new Date(emp.departureDate);
        if (depDate >= today && depDate <= windowEnd) {
          departingEmployees.set(emp.id, { employee: emp, date: emp.departureDate, reason: 'departure' });
        }
      }
    });

    events.forEach(evt => {
      if (evt.type === 'Departure') {
        const depDate = new Date(evt.date);
        if (depDate >= today && depDate <= windowEnd && !departingEmployees.has(evt.empId)) {
          const emp = employees.find(e => e.id === evt.empId);
          if (emp) {
            departingEmployees.set(emp.id, { employee: emp, date: evt.date, reason: 'departure' });
          }
        }
      }
    });

    // 2. Find outbound team swaps (person leaving their current team)
    events.forEach(evt => {
      if (evt.type === 'Team Swap' && evt.targetTeam) {
        const swapDate = new Date(evt.date);
        if (swapDate >= today && swapDate <= windowEnd) {
          const emp = employees.find(e => e.id === evt.empId);
          if (emp && evt.targetTeam !== emp.team && !departingEmployees.has(emp.id)) {
            departingEmployees.set(emp.id, { employee: emp, date: evt.date, reason: 'swap_out' });
          }
        }
      }
    });

    // 3. For each gap, find potential replacements
    departingEmployees.forEach(({ employee, date, reason }) => {
      const depTime = new Date(date).getTime();
      let replacement: Employee | null = null;
      let replacementType: ReplacementGap['replacementType'] = null;
      let replacementDate: string | null = null;

      // Check potential hires joining the same team
      const potentialHires = employees.filter(e =>
        e.isPotential &&
        e.id !== employee.id &&
        e.team === employee.team &&
        Math.abs(new Date(e.joined).getTime() - depTime) <= THIRTY_DAYS
      );

      if (potentialHires.length > 0) {
        // Pick the one with closest role match, then closest date
        const roleMatch = potentialHires.find(p => p.role === employee.role);
        replacement = roleMatch || potentialHires[0];
        replacementType = 'potential_hire';
        replacementDate = replacement.joined;
      }

      // Check incoming swaps to same team
      if (!replacement) {
        const incomingSwaps = events.filter(evt => {
          if (evt.type !== 'Team Swap' || evt.targetTeam !== employee.team) return false;
          const swapDate = new Date(evt.date);
          if (swapDate < today) return false;
          return Math.abs(swapDate.getTime() - depTime) <= THIRTY_DAYS;
        });

        if (incomingSwaps.length > 0) {
          const swapEvt = incomingSwaps[0];
          const swapEmp = employees.find(e => e.id === swapEvt.empId);
          if (swapEmp) {
            replacement = swapEmp;
            replacementType = 'incoming_swap';
            replacementDate = swapEvt.date;
          }
        }
      }

      result.push({
        id: `gap-${employee.id}-${date}`,
        employee,
        role: employee.role,
        team: employee.team,
        dept: employee.dept,
        departureDate: date,
        reason,
        replacement,
        replacementType,
        replacementDate,
      });
    });

    // Sort: uncovered first, then by date
    result.sort((a, b) => {
      if (a.replacement && !b.replacement) return 1;
      if (!a.replacement && b.replacement) return -1;
      return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
    });

    return result;
  }, [employees, events, timeWindow]);

  const filteredGaps = useMemo(() => {
    return gaps.filter(gap => {
      if (deptFilter !== 'all' && gap.dept !== deptFilter) return false;
      if (statusFilter === 'uncovered' && gap.replacement) return false;
      if (statusFilter === 'covered' && !gap.replacement) return false;
      return true;
    });
  }, [gaps, deptFilter, statusFilter]);

  const uncoveredCount = gaps.filter(g => !g.replacement).length;
  const coveredCount = gaps.filter(g => g.replacement).length;
  const deptNames = hierarchy.map(d => d.name);

  const handleHire = (gap: ReplacementGap) => {
    if (!onHireForTeam) return;
    const parent = getTeamParent(hierarchy, gap.team);
    onHireForTeam({
      dept: gap.dept,
      team: gap.team,
      group: parent?.group?.name || null,
    });
  };

  if (gaps.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-primary/30" />
        <p className="text-muted-foreground text-sm">No replacement needs detected in the next {timeWindow} days</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Replacement Tracker
          </h3>
          <div className="flex items-center gap-3 mt-1">
            {uncoveredCount > 0 && (
              <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                <AlertTriangle size={12} />
                {uncoveredCount} uncovered
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={12} />
              {coveredCount} covered
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={String(timeWindow)} onValueChange={v => setTimeWindow(Number(v))}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Clock size={12} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Filter size={12} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {deptNames.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="uncovered">Uncovered</SelectItem>
              <SelectItem value="covered">Covered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gap Cards */}
      <div className="space-y-3">
        {filteredGaps.map(gap => {
          const isCovered = !!gap.replacement;
          const daysUntil = Math.ceil((new Date(gap.departureDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
          const isUrgent = daysUntil <= 30;

          return (
            <div
              key={gap.id}
              className={`relative overflow-hidden rounded-xl border p-5 transition-all
                ${isCovered
                  ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                  : isUrgent
                    ? 'bg-destructive/5 border-destructive/30 hover:border-destructive/50'
                    : 'bg-accent/30 border-border hover:border-border/80'
                }`}
            >
              {/* Left accent bar */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${isCovered ? 'bg-primary' : isUrgent ? 'bg-destructive' : 'bg-muted-foreground'}`} />

              {/* Role + Team header */}
              <div className="flex items-start justify-between mb-3 ml-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${isCovered ? 'bg-primary' : 'bg-destructive'}`} />
                    <span className="font-bold text-sm text-foreground">{gap.role}</span>
                    <span className="text-xs text-muted-foreground">— {gap.team}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{gap.dept}</Badge>
                  </div>
                  {isUrgent && !isCovered && (
                    <Badge variant="destructive" className="text-[10px] mt-1 ml-4">
                      {daysUntil} days — Urgent
                    </Badge>
                  )}
                </div>
              </div>

              {/* Leaving / Replacement pair */}
              <div className="ml-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Leaving */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16 shrink-0">
                    {gap.reason === 'departure' ? 'Leaving' : 'Swapping'}
                  </span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Link
                      to={`/employee/${gap.employee.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                    >
                      {gap.employee.name}
                    </Link>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(gap.departureDate)}
                    </span>
                  </div>
                </div>

                {/* Replacement */}
                <div className="flex items-center gap-2">
                  <ArrowRight size={14} className="text-muted-foreground shrink-0 hidden md:block" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-20 shrink-0 md:hidden">
                    Replace
                  </span>
                  {isCovered ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                      <Link
                        to={`/employee/${gap.replacement!.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                      >
                        {gap.replacement!.name}
                      </Link>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {gap.replacementType === 'potential_hire' ? 'Planned hire' : 'Incoming swap'}
                      </Badge>
                      {gap.replacementDate && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(gap.replacementDate)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <AlertTriangle size={14} className="text-destructive shrink-0" />
                      <span className="text-sm text-destructive font-medium">No replacement planned</span>
                      {onHireForTeam && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto text-xs h-7"
                          onClick={() => handleHire(gap)}
                        >
                          <UserPlus size={12} className="mr-1" />
                          Hire
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredGaps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No gaps matching current filters
          </div>
        )}
      </div>
    </div>
  );
};
