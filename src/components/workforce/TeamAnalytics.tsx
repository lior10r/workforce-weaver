import { useMemo } from 'react';
import { Employee, WorkforceEvent, getCapacityWeight, formatDate } from '@/lib/workforce-data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TeamAnalyticsProps {
  employees: Employee[];
  events: WorkforceEvent[];
  selectedTeam: string;
  departments: Record<string, string[]>;
}

export const TeamAnalytics = ({ employees, events, selectedTeam, departments }: TeamAnalyticsProps) => {
  // Calculate capacity over time for the selected team
  const capacityData = useMemo(() => {
    // Generate monthly data points from 2020 to 2030
    const dataPoints: { date: string; month: string; capacity: number; headcount: number }[] = [];
    const startDate = new Date('2020-01-01');
    const endDate = new Date('2030-12-31');
    
    const teamEmployees = selectedTeam === 'All' 
      ? employees 
      : employees.filter(e => e.team === selectedTeam);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Find employees active at this date
      const activeEmployees = teamEmployees.filter(emp => {
        const joinDate = new Date(emp.joined);
        const departureEvent = events.find(e => e.empId === emp.id && e.type === 'Departure');
        const departureDate = departureEvent ? new Date(departureEvent.date) : new Date('2099-12-31');
        
        return joinDate <= currentDate && currentDate <= departureDate;
      });

      // Calculate total capacity (excluding team leads)
      const totalCapacity = activeEmployees.reduce((sum, emp) => {
        return sum + getCapacityWeight(emp.role, emp.joined, currentDate);
      }, 0);

      const headcount = activeEmployees.filter(e => e.role !== 'Team Lead').length;

      dataPoints.push({
        date: dateStr,
        month: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
        capacity: Math.round(totalCapacity * 10) / 10,
        headcount
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return dataPoints;
  }, [employees, events, selectedTeam]);

  // Get all unique teams for selection
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    Object.values(departments).forEach(teamList => {
      teamList.forEach(team => teams.add(team));
    });
    return Array.from(teams).sort();
  }, [departments]);

  // Calculate current team stats
  const currentStats = useMemo(() => {
    const today = new Date();
    const teamEmployees = selectedTeam === 'All' 
      ? employees 
      : employees.filter(e => e.team === selectedTeam);
    
    const activeEmployees = teamEmployees.filter(emp => {
      const departureEvent = events.find(e => e.empId === emp.id && e.type === 'Departure');
      const departureDate = departureEvent ? new Date(departureEvent.date) : new Date('2099-12-31');
      return departureDate >= today;
    });

    const totalCapacity = activeEmployees.reduce((sum, emp) => {
      return sum + getCapacityWeight(emp.role, emp.joined, today);
    }, 0);

    const headcount = activeEmployees.filter(e => e.role !== 'Team Lead').length;

    // Count by effective level
    const juniors = activeEmployees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const weight = getCapacityWeight(emp.role, emp.joined, today);
      return weight === 0.7;
    }).length;

    const mids = activeEmployees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const weight = getCapacityWeight(emp.role, emp.joined, today);
      return weight === 1.0;
    }).length;

    const seniors = activeEmployees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const weight = getCapacityWeight(emp.role, emp.joined, today);
      return weight === 1.5;
    }).length;

    return { totalCapacity, headcount, juniors, mids, seniors };
  }, [employees, events, selectedTeam]);

  // Find the current month index for reference line
  const currentMonthIndex = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return capacityData.findIndex(d => d.month === currentMonth);
  }, [capacityData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Current Capacity</p>
          <p className="text-3xl font-bold text-primary">{currentStats.totalCapacity.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-1">Weighted FTE</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Headcount</p>
          <p className="text-3xl font-bold text-foreground">{currentStats.headcount}</p>
          <p className="text-xs text-muted-foreground mt-1">Excluding leads</p>
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
      </div>

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
                  name === 'capacity' ? 'Weighted Capacity' : 'Headcount'
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
