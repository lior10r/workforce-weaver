import { useMemo } from 'react';
import { AlertTriangle, Clock, Users, UserX, Shield, Tag, Bell, CalendarClock } from 'lucide-react';
import { Employee, WorkforceEvent, TeamStructure, HierarchyStructure, getAllDeptTeams, formatDate } from '@/lib/workforce-data';

interface Alert {
  id: string;
  type: 'departure' | 'understaffed' | 'overstaffed' | 'missing_skill' | 'no_leader' | 'upcoming_event';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  date?: string;
  team?: string;
}

interface AlertsPanelProps {
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
  hierarchy: HierarchyStructure;
}

const SEVERITY_STYLES: Record<Alert['severity'], { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', icon: 'text-destructive' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500' },
  info: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', icon: 'text-primary' },
};

const ALERT_ICONS: Record<Alert['type'], typeof AlertTriangle> = {
  departure: CalendarClock,
  understaffed: Users,
  overstaffed: Users,
  missing_skill: Tag,
  no_leader: Shield,
  upcoming_event: Clock,
};

export const AlertsPanel = ({ employees, events, teamStructures, hierarchy }: AlertsPanelProps) => {
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const today = new Date();
    const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    // 1. Approaching departures (within 90 days)
    const activeEmployees = employees.filter(e => e.status === 'Active' || e.status === 'On Course' || e.status === 'Parental Leave');
    activeEmployees.forEach(emp => {
      if (emp.departureDate) {
        const depDate = new Date(emp.departureDate);
        if (depDate > today && depDate <= ninetyDays) {
          const daysLeft = Math.ceil((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          result.push({
            id: `dep-${emp.id}`,
            type: 'departure',
            severity: daysLeft <= 30 ? 'critical' : 'warning',
            title: `${emp.name} departing`,
            description: `${emp.role} in ${emp.team} — ${daysLeft} days remaining`,
            date: emp.departureDate,
            team: emp.team,
          });
        }
      }
    });

    // 2. Upcoming scheduled departures from events
    const departureEvents = events.filter(e => e.type === 'Departure' && !e.isFlag);
    departureEvents.forEach(evt => {
      const evtDate = new Date(evt.date);
      if (evtDate > today && evtDate <= ninetyDays) {
        const emp = employees.find(e => e.id === evt.empId);
        if (emp) {
          const daysLeft = Math.ceil((evtDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Avoid duplicate if already caught by departureDate
          if (!result.some(a => a.id === `dep-${emp.id}`)) {
            result.push({
              id: `evt-dep-${evt.id}`,
              type: 'departure',
              severity: daysLeft <= 30 ? 'critical' : 'warning',
              title: `${emp.name} scheduled departure`,
              description: `${evt.details} — ${daysLeft} days`,
              date: evt.date,
              team: emp.team,
            });
          }
        }
      }
    });

    // 3. Understaffed / overstaffed teams
    const allTeams = new Set<string>();
    hierarchy.forEach(dept => {
      getAllDeptTeams(dept).forEach(t => allTeams.add(t));
    });

    allTeams.forEach(teamName => {
      const structure = teamStructures.find(ts => ts.teamName === teamName);
      const teamMembers = activeEmployees.filter(e => e.team === teamName && !e.isPotential);

      if (structure?.targetSize) {
        const diff = structure.targetSize - teamMembers.length;
        if (diff > 0) {
          result.push({
            id: `under-${teamName}`,
            type: 'understaffed',
            severity: diff >= 3 ? 'critical' : 'warning',
            title: `${teamName} understaffed`,
            description: `${teamMembers.length}/${structure.targetSize} members (needs ${diff} more)`,
            team: teamName,
          });
        } else if (diff < -2) {
          result.push({
            id: `over-${teamName}`,
            type: 'overstaffed',
            severity: 'info',
            title: `${teamName} overstaffed`,
            description: `${teamMembers.length}/${structure.targetSize} members (${Math.abs(diff)} over target)`,
            team: teamName,
          });
        }
      }

      // 4. Missing required skills
      if (structure?.requiredSkills && Object.keys(structure.requiredSkills).length > 0) {
        for (const [skill, needed] of Object.entries(structure.requiredSkills)) {
          const have = teamMembers.filter(e => (e.skills || []).includes(skill)).length;
          if (have < needed) {
            result.push({
              id: `skill-${teamName}-${skill}`,
              type: 'missing_skill',
              severity: have === 0 ? 'critical' : 'warning',
              title: `${teamName} missing "${skill}"`,
              description: `${have}/${needed} members have this skill`,
              team: teamName,
            });
          }
        }
      }

      // 5. No team leader — only a valid stored team leader counts
      const structLeader = structure?.teamLeader ? teamMembers.find(e => e.id === structure.teamLeader) : null;
      if (!structLeader && teamMembers.length > 0) {
        result.push({
          id: `leader-${teamName}`,
          type: 'no_leader',
          severity: 'warning',
          title: `${teamName} has no leader`,
          description: `${teamMembers.length} members without a designated team leader`,
          team: teamName,
        });
      }
    });

    // 6. Upcoming events (training end, courses ending within 60 days)
    const upcomingEvents = events.filter(e =>
      (e.type === 'Training' || e.type === 'Course') && e.endDate
    );
    upcomingEvents.forEach(evt => {
      const endDate = new Date(evt.endDate!);
      if (endDate > today && endDate <= sixtyDays) {
        const emp = employees.find(e => e.id === evt.empId);
        if (emp) {
          const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          result.push({
            id: `evt-end-${evt.id}`,
            type: 'upcoming_event',
            severity: 'info',
            title: `${emp.name}'s ${evt.type.toLowerCase()} ending`,
            description: `${evt.details} — returns in ${daysLeft} days`,
            date: evt.endDate,
            team: emp.team,
          });
        }
      }
    });

    // Sort: critical first, then warning, then info; within same severity by date
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    result.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return 0;
    });

    return result;
  }, [employees, events, teamStructures, hierarchy]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Bell size={18} className="text-primary" />
          Alerts & Notifications
        </h3>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/20 text-destructive">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
              {warningCount} warning
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">All clear — no alerts</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
          {alerts.map(alert => {
            const styles = SEVERITY_STYLES[alert.severity];
            const Icon = ALERT_ICONS[alert.type];

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border ${styles.bg} ${styles.border} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 ${styles.icon}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${styles.text}`}>{alert.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>
                    {alert.date && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{formatDate(alert.date)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
