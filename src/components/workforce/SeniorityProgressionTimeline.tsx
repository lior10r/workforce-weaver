import { useMemo } from 'react';
import { TrendingUp, GraduationCap, User, Clock } from 'lucide-react';
import { Employee, getTimelinePosition, formatDate } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SeniorityMilestone {
  employeeId: number;
  employeeName: string;
  team: string;
  date: string;
  fromLevel: string;
  toLevel: string;
  type: 'training' | 'junior' | 'mid' | 'senior';
  isPast: boolean;
}

interface SeniorityProgressionTimelineProps {
  employees: Employee[];
}

export const SeniorityProgressionTimeline = ({ employees }: SeniorityProgressionTimelineProps) => {
  const years = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];
  const currentDate = new Date();
  const currentDatePos = getTimelinePosition(currentDate.toISOString().split('T')[0]);

  // Calculate all seniority milestones for all employees
  const milestones = useMemo(() => {
    const allMilestones: SeniorityMilestone[] = [];
    
    employees.forEach(emp => {
      // Only track dev roles
      const devRoles = ['Junior Dev', 'Mid-Level Dev', 'Senior Dev'];
      const isDevTrack = devRoles.includes(emp.role);
      if (!isDevTrack || emp.isPotential) return;
      
      const joinDate = new Date(emp.joined);
      
      // Training graduation (6 months)
      const trainingEndDate = new Date(joinDate);
      trainingEndDate.setMonth(trainingEndDate.getMonth() + 6);
      allMilestones.push({
        employeeId: emp.id,
        employeeName: emp.name,
        team: emp.team,
        date: trainingEndDate.toISOString().split('T')[0],
        fromLevel: 'Training',
        toLevel: 'Junior Dev',
        type: 'training',
        isPast: trainingEndDate < currentDate
      });
      
      // Junior → Mid-Level (1 year)
      if (emp.role === 'Junior Dev') {
        const midLevelDate = new Date(joinDate);
        midLevelDate.setFullYear(midLevelDate.getFullYear() + 1);
        allMilestones.push({
          employeeId: emp.id,
          employeeName: emp.name,
          team: emp.team,
          date: midLevelDate.toISOString().split('T')[0],
          fromLevel: 'Junior Dev',
          toLevel: 'Mid-Level Dev',
          type: 'junior',
          isPast: midLevelDate < currentDate
        });
        
        // Mid-Level → Senior (3 years total)
        const seniorDate = new Date(joinDate);
        seniorDate.setFullYear(seniorDate.getFullYear() + 3);
        allMilestones.push({
          employeeId: emp.id,
          employeeName: emp.name,
          team: emp.team,
          date: seniorDate.toISOString().split('T')[0],
          fromLevel: 'Mid-Level Dev',
          toLevel: 'Senior Dev',
          type: 'mid',
          isPast: seniorDate < currentDate
        });
      } else if (emp.role === 'Mid-Level Dev') {
        // Already mid-level, show senior promotion
        const seniorDate = new Date(joinDate);
        seniorDate.setFullYear(seniorDate.getFullYear() + 2);
        allMilestones.push({
          employeeId: emp.id,
          employeeName: emp.name,
          team: emp.team,
          date: seniorDate.toISOString().split('T')[0],
          fromLevel: 'Mid-Level Dev',
          toLevel: 'Senior Dev',
          type: 'mid',
          isPast: seniorDate < currentDate
        });
      }
    });
    
    // Sort by date
    return allMilestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [employees, currentDate]);

  // Group milestones by type for summary
  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    
    return {
      thisMonth: milestones.filter(m => {
        const d = new Date(m.date);
        return d >= thisMonth && d < nextMonth;
      }),
      upcoming: milestones.filter(m => {
        const d = new Date(m.date);
        return d >= nextMonth && d < threeMonths;
      }),
      total: milestones.filter(m => !m.isPast).length
    };
  }, [milestones]);

  const getTypeColor = (type: SeniorityMilestone['type']) => {
    switch (type) {
      case 'training': return 'bg-amber-500';
      case 'junior': return 'bg-blue-500';
      case 'mid': return 'bg-emerald-500';
      case 'senior': return 'bg-purple-500';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: SeniorityMilestone['type']) => {
    switch (type) {
      case 'training': return <GraduationCap size={12} />;
      case 'junior': 
      case 'mid': 
      case 'senior': 
        return <TrendingUp size={12} />;
      default: return <User size={12} />;
    }
  };

  // Filter to show only upcoming and recent past
  const visibleMilestones = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return milestones.filter(m => new Date(m.date) >= sixMonthsAgo);
  }, [milestones]);

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="text-primary" size={18} />
          Seniority Progression Timeline
        </CardTitle>
        
        {/* Summary stats */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg">
            <Clock size={12} className="text-amber-500" />
            <span className="text-muted-foreground">This month:</span>
            <span className="font-bold text-amber-500">{summary.thisMonth.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
            <TrendingUp size={12} className="text-blue-500" />
            <span className="text-muted-foreground">Next 3 months:</span>
            <span className="font-bold text-blue-500">{summary.upcoming.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <User size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground">Total upcoming:</span>
            <span className="font-bold">{summary.total}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Year header */}
            <div className="flex border-b border-border pb-2 mb-4">
              <div className="w-48 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Employee
              </div>
              <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
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
            
            {/* Milestone rows */}
            <TooltipProvider>
              <div className="space-y-2">
                {visibleMilestones.map((milestone, idx) => {
                  const pos = getTimelinePosition(milestone.date);
                  
                  return (
                    <div key={`${milestone.employeeId}-${milestone.type}-${idx}`} className="flex items-center group">
                      {/* Employee info */}
                      <div className="w-48 pr-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-full ${getTypeColor(milestone.type)} text-white`}>
                            {getTypeIcon(milestone.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs truncate">{milestone.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{milestone.team}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Timeline */}
                      <div className="flex-1 h-8 relative bg-secondary/30 rounded border border-border/50">
                        {/* Year grid */}
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
                        
                        {/* Current date marker */}
                        <div 
                          style={{ left: `${currentDatePos}%` }}
                          className="absolute inset-y-0 w-0.5 bg-destructive/50 z-10"
                        />
                        
                        {/* Milestone marker */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              style={{ left: `${pos}%` }}
                              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer transition-transform hover:scale-125 ${
                                milestone.isPast ? 'opacity-50' : ''
                              }`}
                            >
                              <div className={`p-1.5 rounded-full shadow-lg ${getTypeColor(milestone.type)} ${
                                milestone.isPast ? '' : 'ring-2 ring-offset-1 ring-offset-background ring-white/30'
                              }`}>
                                {getTypeIcon(milestone.type)}
                                <span className="text-white" />
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                            <div className="space-y-1 text-sm">
                              <p className="font-bold text-foreground">{milestone.employeeName}</p>
                              <p className="text-muted-foreground">
                                {milestone.fromLevel} → <span className="text-primary font-medium">{milestone.toLevel}</span>
                              </p>
                              <p className="text-xs font-mono text-muted-foreground">{formatDate(milestone.date)}</p>
                              <p className={`text-[10px] font-bold ${milestone.isPast ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {milestone.isPast ? '✓ Completed' : '⏳ Upcoming'}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
                
                {visibleMilestones.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No seniority progressions in this period</p>
                  </div>
                )}
              </div>
            </TooltipProvider>
            
            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Training → Junior</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Junior → Mid-Level</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Mid-Level → Senior</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-destructive rounded" />
                <span className="text-muted-foreground">Current Date</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
