import { useMemo } from 'react';
import { Employee, WorkforceEvent, getCapacityWeight } from '@/lib/workforce-data';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CapacityTooltipProps {
  employees: Employee[];
  events: WorkforceEvent[];
  children: React.ReactNode;
  asOfDate?: Date;
}

interface CapacityBreakdown {
  trainees: { count: number; contribution: number };
  juniors: { count: number; contribution: number };
  mids: { count: number; contribution: number };
  seniors: { count: number; contribution: number };
  partTime: { count: number; reduction: number };
  total: number;
}

export const CapacityTooltip = ({ employees, events, children, asOfDate = new Date() }: CapacityTooltipProps) => {
  const breakdown = useMemo<CapacityBreakdown>(() => {
    // Filter active employees (exclude departed and team leads)
    const activeEmployees = employees.filter(emp => {
      if (emp.role === 'Team Lead') return false;
      const departureEvent = events.find(e => e.empId === emp.id && e.type === 'Departure');
      const departureDate = departureEvent ? new Date(departureEvent.date) : new Date('2099-12-31');
      return departureDate >= asOfDate;
    });

    const result: CapacityBreakdown = {
      trainees: { count: 0, contribution: 0 },
      juniors: { count: 0, contribution: 0 },
      mids: { count: 0, contribution: 0 },
      seniors: { count: 0, contribution: 0 },
      partTime: { count: 0, reduction: 0 },
      total: 0
    };

    activeEmployees.forEach(emp => {
      const joinDate = new Date(emp.joined);
      const monthsOfExperience = (asOfDate.getTime() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
      const yearsOfExperience = monthsOfExperience / 12;
      
      // Get full-time base weight to categorize
      const baseWeight = getCapacityWeight(emp.role, emp.joined, asOfDate, 'Full-Time', 100);
      // Get actual weight with part-time applied
      const actualWeight = getCapacityWeight(emp.role, emp.joined, asOfDate, emp.workType, emp.partTimePercentage);
      
      result.total += actualWeight;
      
      // Categorize by experience level
      if (monthsOfExperience < 6) {
        result.trainees.count++;
        result.trainees.contribution += actualWeight;
      } else if (yearsOfExperience < 1) {
        result.juniors.count++;
        result.juniors.contribution += actualWeight;
      } else if (yearsOfExperience < 3) {
        result.mids.count++;
        result.mids.contribution += actualWeight;
      } else {
        result.seniors.count++;
        result.seniors.contribution += actualWeight;
      }
      
      // Track part-time impact
      if (emp.workType === 'Part-Time') {
        result.partTime.count++;
        result.partTime.reduction += baseWeight - actualWeight;
      }
    });

    return result;
  }, [employees, events, asOfDate]);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs" side="bottom">
          <div className="space-y-2">
            <div className="font-semibold text-sm border-b border-border pb-2 mb-2">
              Capacity Breakdown
            </div>
            
            {/* Training */}
            {breakdown.trainees.count > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Training (0.3x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{breakdown.trainees.count}</span>
                  <span className="font-mono font-medium">{breakdown.trainees.contribution.toFixed(1)}</span>
                </div>
              </div>
            )}
            
            {/* Juniors */}
            {breakdown.juniors.count > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-role-junior" />
                  <span className="text-muted-foreground">Junior (0.7x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{breakdown.juniors.count}</span>
                  <span className="font-mono font-medium">{breakdown.juniors.contribution.toFixed(1)}</span>
                </div>
              </div>
            )}
            
            {/* Mid-level */}
            {breakdown.mids.count > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-role-mid" />
                  <span className="text-muted-foreground">Mid-level (1.0x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{breakdown.mids.count}</span>
                  <span className="font-mono font-medium">{breakdown.mids.contribution.toFixed(1)}</span>
                </div>
              </div>
            )}
            
            {/* Seniors */}
            {breakdown.seniors.count > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-role-senior" />
                  <span className="text-muted-foreground">Senior (1.5x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{breakdown.seniors.count}</span>
                  <span className="font-mono font-medium">{breakdown.seniors.contribution.toFixed(1)}</span>
                </div>
              </div>
            )}
            
            {/* Part-time impact */}
            {breakdown.partTime.count > 0 && (
              <div className="flex items-center justify-between text-xs border-t border-border pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-chart-4" />
                  <span className="text-muted-foreground">Part-time ({breakdown.partTime.count})</span>
                </div>
                <span className="font-mono font-medium text-chart-4">-{breakdown.partTime.reduction.toFixed(1)}</span>
              </div>
            )}
            
            {/* Total */}
            <div className="flex items-center justify-between text-sm font-bold border-t border-border pt-2 mt-2">
              <span>Total Capacity</span>
              <span className="font-mono text-primary">{breakdown.total.toFixed(1)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
