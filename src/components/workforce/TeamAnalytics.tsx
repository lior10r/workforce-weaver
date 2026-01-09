import { useMemo } from 'react';
import { Employee, WorkforceEvent, TeamStructure, getCapacityWeight } from '@/lib/workforce-data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, LabelList } from 'recharts';
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { CapacityTooltip } from './CapacityTooltip';

interface TeamAnalyticsProps {
  employees: Employee[];
  events: WorkforceEvent[];
  selectedTeams: string[]; // Array of selected team names from scope filter
  departments: Record<string, string[]>;
  teamStructures: TeamStructure[];
}

export const TeamAnalytics = ({ employees, events, selectedTeams, departments, teamStructures }: TeamAnalyticsProps) => {
  // Get all teams if none selected
  const allTeams = useMemo(() => Object.values(departments).flat(), [departments]);
  const teamsToInclude = useMemo(() => 
    selectedTeams.length > 0 ? selectedTeams : allTeams, 
    [selectedTeams, allTeams]
  );

  // Calculate capacity over time for all selected teams
  const capacityData = useMemo(() => {
    const dataPoints: { date: string; month: string; capacity: number; headcount: number; target: number }[] = [];
    const startDate = new Date('2020-01-01');
    const endDate = new Date('2030-12-31');
    
    const teamEmployees = employees.filter(e => teamsToInclude.includes(e.team));
    
    // Sum up target sizes for selected teams
    const totalTarget = teamsToInclude.reduce((sum, teamName) => {
      const structure = teamStructures.find(ts => ts.teamName === teamName);
      return sum + (structure?.targetSize || 0);
    }, 0);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const activeEmployees = teamEmployees.filter(emp => {
        const joinDate = new Date(emp.joined);
        const departureEvent = events.find(e => e.empId === emp.id && e.type === 'Departure');
        const departureDate = departureEvent ? new Date(departureEvent.date) : new Date('2099-12-31');
        
        return joinDate <= currentDate && currentDate <= departureDate;
      });

      const totalCapacity = activeEmployees.reduce((sum, emp) => {
        return sum + getCapacityWeight(emp.role, emp.joined, currentDate, emp.workType, emp.partTimePercentage);
      }, 0);

      const headcount = activeEmployees.filter(e => e.role !== 'Team Lead').length;

      dataPoints.push({
        date: dateStr,
        month: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
        capacity: Math.round(totalCapacity * 10) / 10,
        headcount,
        target: totalTarget
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return dataPoints;
  }, [employees, events, teamsToInclude, teamStructures]);

  // Calculate per-team capacity stats with targets
  const teamCapacityStats = useMemo(() => {
    const today = new Date();
    
    return teamsToInclude.map(teamName => {
      const structure = teamStructures.find(ts => ts.teamName === teamName);
      const targetSize = structure?.targetSize || 0;
      
      const teamEmployees = employees.filter(e => e.team === teamName);
      const activeEmployees = teamEmployees.filter(emp => {
        const departureEvent = events.find(e => e.empId === emp.id && e.type === 'Departure');
        const departureDate = departureEvent ? new Date(departureEvent.date) : new Date('2099-12-31');
        return departureDate >= today;
      });

      const headcount = activeEmployees.filter(e => e.role !== 'Team Lead').length;
      const capacity = activeEmployees.reduce((sum, emp) => {
        return sum + getCapacityWeight(emp.role, emp.joined, today, emp.workType, emp.partTimePercentage);
      }, 0);

      const variance = targetSize > 0 ? headcount - targetSize : 0;
      const variancePercent = targetSize > 0 ? Math.round((variance / targetSize) * 100) : 0;
      
      let status: 'understaffed' | 'overstaffed' | 'on-target' | 'no-target' = 'no-target';
      if (targetSize > 0) {
        if (variance < -1) status = 'understaffed';
        else if (variance > 1) status = 'overstaffed';
        else status = 'on-target';
      }

      return {
        teamName,
        targetSize,
        headcount,
        capacity: Math.round(capacity * 10) / 10,
        variance,
        variancePercent,
        status
      };
    }).sort((a, b) => {
      // Sort by status priority: understaffed first, then overstaffed, then on-target, then no-target
      const statusOrder = { understaffed: 0, overstaffed: 1, 'on-target': 2, 'no-target': 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [employees, events, teamsToInclude, teamStructures]);

  // Calculate current overall stats
  const currentStats = useMemo(() => {
    const today = new Date();
    const teamEmployees = employees.filter(e => teamsToInclude.includes(e.team));
    
    const activeEmployees = teamEmployees.filter(emp => {
      const departureEvent = events.find(e => e.empId === emp.id && e.type === 'Departure');
      const departureDate = departureEvent ? new Date(departureEvent.date) : new Date('2099-12-31');
      return departureDate >= today;
    });

    const totalCapacity = activeEmployees.reduce((sum, emp) => {
      return sum + getCapacityWeight(emp.role, emp.joined, today, emp.workType, emp.partTimePercentage);
    }, 0);

    const headcount = activeEmployees.filter(e => e.role !== 'Team Lead').length;

    // Count by effective level based on weight ranges
    // Training (0.3), Junior (0.7), Mid (1.0), Senior (1.5)
    const trainees = activeEmployees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const weight = getCapacityWeight(emp.role, emp.joined, today, 'Full-Time', 100);
      return weight <= 0.3;
    }).length;

    const juniors = activeEmployees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const weight = getCapacityWeight(emp.role, emp.joined, today, 'Full-Time', 100);
      return weight > 0.3 && weight <= 0.7;
    }).length;

    const mids = activeEmployees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const weight = getCapacityWeight(emp.role, emp.joined, today, 'Full-Time', 100);
      return weight === 1.0;
    }).length;

    const seniors = activeEmployees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const weight = getCapacityWeight(emp.role, emp.joined, today, 'Full-Time', 100);
      return weight >= 1.5;
    }).length;

    // Total targets
    const totalTarget = teamsToInclude.reduce((sum, teamName) => {
      const structure = teamStructures.find(ts => ts.teamName === teamName);
      return sum + (structure?.targetSize || 0);
    }, 0);

    const teamsWithTargets = teamsToInclude.filter(teamName => {
      const structure = teamStructures.find(ts => ts.teamName === teamName);
      return structure?.targetSize && structure.targetSize > 0;
    }).length;

    return { totalCapacity, headcount, trainees, juniors, mids, seniors, totalTarget, teamsWithTargets };
  }, [employees, events, teamsToInclude, teamStructures]);

  // Find the current month index for reference line
  const currentMonthIndex = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return capacityData.findIndex(d => d.month === currentMonth);
  }, [capacityData]);

  // Display label for scope
  const scopeLabel = useMemo(() => {
    if (selectedTeams.length === 0 || selectedTeams.length === allTeams.length) {
      return 'All Teams';
    } else if (selectedTeams.length === 1) {
      return selectedTeams[0];
    }
    return `${selectedTeams.length} Teams`;
  }, [selectedTeams, allTeams]);

  // Summary counts
  const staffingSummary = useMemo(() => {
    const understaffed = teamCapacityStats.filter(t => t.status === 'understaffed').length;
    const overstaffed = teamCapacityStats.filter(t => t.status === 'overstaffed').length;
    const onTarget = teamCapacityStats.filter(t => t.status === 'on-target').length;
    const noTarget = teamCapacityStats.filter(t => t.status === 'no-target').length;
    return { understaffed, overstaffed, onTarget, noTarget };
  }, [teamCapacityStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'understaffed': return 'hsl(var(--destructive))';
      case 'overstaffed': return 'hsl(var(--chart-4))';
      case 'on-target': return 'hsl(var(--chart-2))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'understaffed': return 'bg-destructive/10 border-destructive/30';
      case 'overstaffed': return 'bg-chart-4/10 border-chart-4/30';
      case 'on-target': return 'bg-chart-2/10 border-chart-2/30';
      default: return 'bg-muted/30 border-muted';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Scope Display */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Team Analytics</h3>
          <p className="text-sm text-muted-foreground">Analyzing: <span className="font-medium text-foreground">{scopeLabel}</span></p>
        </div>
        <div className="text-xs text-muted-foreground p-2 bg-accent/30 rounded-lg">
          Use the sidebar scope filter to change team selection
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <CapacityTooltip 
          employees={employees.filter(e => teamsToInclude.includes(e.team))} 
          events={events}
        >
          <div className="glass-card p-5 cursor-help hover:ring-2 hover:ring-primary/30 transition-all">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Current Capacity</p>
            <p className="text-3xl font-bold text-primary">{currentStats.totalCapacity.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">Weighted FTE (hover for details)</p>
          </div>
        </CapacityTooltip>
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Headcount</p>
          <p className="text-3xl font-bold text-foreground">{currentStats.headcount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentStats.totalTarget > 0 ? (
              <span className={currentStats.headcount < currentStats.totalTarget ? 'text-destructive' : currentStats.headcount > currentStats.totalTarget ? 'text-chart-4' : 'text-chart-2'}>
                Target: {currentStats.totalTarget}
              </span>
            ) : 'No targets set'}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">In Training</p>
          <p className="text-3xl font-bold text-amber-500">{currentStats.trainees}</p>
          <p className="text-xs text-muted-foreground mt-1">0.3x capacity (first 6mo)</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Juniors</p>
          <p className="text-3xl font-bold text-role-junior">{currentStats.juniors}</p>
          <p className="text-xs text-muted-foreground mt-1">0.7x capacity</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Mid-Level</p>
          <p className="text-3xl font-bold text-role-mid">{currentStats.mids}</p>
          <p className="text-xs text-muted-foreground mt-1">1.0x capacity</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Seniors</p>
          <p className="text-3xl font-bold text-role-senior">{currentStats.seniors}</p>
          <p className="text-xs text-muted-foreground mt-1">1.5x capacity</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Teams Tracked</p>
          <p className="text-3xl font-bold text-foreground">{currentStats.teamsWithTargets}</p>
          <p className="text-xs text-muted-foreground mt-1">with targets set</p>
        </div>
      </div>

      {/* Staffing Status Summary */}
      {currentStats.teamsWithTargets > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`glass-card p-4 border-2 ${getStatusBg('understaffed')}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{staffingSummary.understaffed}</p>
                <p className="text-xs text-muted-foreground">Understaffed Teams</p>
              </div>
            </div>
          </div>
          <div className={`glass-card p-4 border-2 ${getStatusBg('overstaffed')}`}>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-chart-4" />
              <div>
                <p className="text-2xl font-bold text-chart-4">{staffingSummary.overstaffed}</p>
                <p className="text-xs text-muted-foreground">Overstaffed Teams</p>
              </div>
            </div>
          </div>
          <div className={`glass-card p-4 border-2 ${getStatusBg('on-target')}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-chart-2" />
              <div>
                <p className="text-2xl font-bold text-chart-2">{staffingSummary.onTarget}</p>
                <p className="text-xs text-muted-foreground">On Target</p>
              </div>
            </div>
          </div>
          <div className={`glass-card p-4 border-2 ${getStatusBg('no-target')}`}>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{staffingSummary.noTarget}</p>
                <p className="text-xs text-muted-foreground">No Target Set</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-Team Capacity vs Target */}
      {teamCapacityStats.some(t => t.targetSize > 0) && (
        <div className="glass-card p-6">
          <h4 className="font-bold text-foreground mb-4">Team Capacity vs Target</h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {teamCapacityStats.map(team => {
              const teamEmployees = employees.filter(e => e.team === team.teamName);
              return (
                <div key={team.teamName} className={`p-3 rounded-lg border ${getStatusBg(team.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(team.status) }} />
                      <span className="font-medium text-foreground">{team.teamName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-bold text-foreground">{team.headcount}</span>
                        {team.targetSize > 0 && <span> / {team.targetSize}</span>}
                      </span>
                      {team.targetSize > 0 && (
                        <span className={`font-bold ${
                          team.status === 'understaffed' ? 'text-destructive' :
                          team.status === 'overstaffed' ? 'text-chart-4' :
                          'text-chart-2'
                        }`}>
                          {team.variance > 0 ? '+' : ''}{team.variance}
                          <span className="text-xs ml-1">({team.variancePercent > 0 ? '+' : ''}{team.variancePercent}%)</span>
                        </span>
                      )}
                      <CapacityTooltip employees={teamEmployees} events={events}>
                        <span className="text-xs text-primary cursor-help hover:underline">
                          {team.capacity} FTE
                        </span>
                      </CapacityTooltip>
                    </div>
                  </div>
                  {team.targetSize > 0 && (
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, (team.headcount / team.targetSize) * 100)}%`,
                          backgroundColor: getStatusColor(team.status)
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capacity Over Time Chart */}
      <div className="glass-card p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground">Team Capacity Over Time</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Weighted capacity model: Junior (0.7x) → Mid-level after 1yr (1.0x) → Senior after 3yrs (1.5x)
          </p>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={capacityData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickFormatter={(value) => {
                  const [year, month] = value.split('-');
                  return month === '01' ? year : '';
                }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                label={{ 
                  value: 'Capacity (FTE)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  color: 'hsl(var(--foreground))'
                }}
                labelFormatter={(value) => {
                  const [year, month] = value.split('-');
                  return `${month}/${year}`;
                }}
                formatter={(value: number, name: string) => [
                  name === 'capacity' ? `${value.toFixed(1)} FTE` : value,
                  name === 'capacity' ? 'Weighted Capacity' : name === 'target' ? 'Target Size' : 'Headcount'
                ]}
              />
              <Legend />
              <ReferenceLine 
                x={capacityData[currentMonthIndex]?.month} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Today', 
                  fill: 'hsl(var(--primary))',
                  fontSize: 10
                }}
              />
              {currentStats.totalTarget > 0 && (
                <ReferenceLine 
                  y={currentStats.totalTarget} 
                  stroke="hsl(var(--chart-4))"
                  strokeDasharray="8 4"
                  label={{ 
                    value: `Target: ${currentStats.totalTarget}`, 
                    fill: 'hsl(var(--chart-4))',
                    fontSize: 10,
                    position: 'right'
                  }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="capacity" 
                name="Weighted Capacity"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="headcount" 
                name="Headcount"
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--muted-foreground))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity Model Explanation */}
      <div className="glass-card p-6">
        <h4 className="font-bold text-foreground mb-4">Weighted Capacity Model</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-role-junior/10 rounded-xl border border-role-junior/20">
            <p className="font-bold text-role-junior">Junior (0.7x)</p>
            <p className="text-muted-foreground mt-1">First year of employment. Still ramping up.</p>
          </div>
          <div className="p-4 bg-role-mid/10 rounded-xl border border-role-mid/20">
            <p className="font-bold text-role-mid">Mid-Level (1.0x)</p>
            <p className="text-muted-foreground mt-1">After 1 year. Fully productive contributor.</p>
          </div>
          <div className="p-4 bg-role-senior/10 rounded-xl border border-role-senior/20">
            <p className="font-bold text-role-senior">Senior (1.5x)</p>
            <p className="text-muted-foreground mt-1">After 3 years. Multiplier through mentoring.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Note: Team Leads are excluded from capacity calculations as their role is primarily coordination.
        </p>
      </div>
    </div>
  );
};
