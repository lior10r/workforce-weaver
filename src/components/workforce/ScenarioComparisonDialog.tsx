import { useMemo } from 'react';
import { 
  ArrowRightLeft, 
  Users, 
  Calendar, 
  Flag, 
  UserPlus, 
  UserMinus,
  Edit3,
  ArrowRight,
  Equal
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Scenario, 
  Employee, 
  WorkforceEvent,
  getScenarioEmployees,
  getScenarioEvents,
  getEmployeeDiffs,
  getEventDiffs,
  DiffStatus
} from '@/lib/workforce-data';

interface ScenarioComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: Scenario[];
  masterEmployees: Employee[];
  masterEvents: WorkforceEvent[];
  compareScenarioId: string | null;
  secondScenarioId?: string | null; // For scenario vs scenario comparison
}

export const ScenarioComparisonDialog = ({
  isOpen,
  onClose,
  scenarios,
  masterEmployees,
  masterEvents,
  compareScenarioId,
  secondScenarioId
}: ScenarioComparisonDialogProps) => {
  const scenario1 = scenarios.find(s => s.id === compareScenarioId);
  const scenario2 = scenarios.find(s => s.id === secondScenarioId);

  const comparisonData = useMemo(() => {
    if (!scenario1) return null;

    // Compare scenario1 vs master (or scenario2 if provided)
    const leftEmployees = masterEmployees;
    const leftEvents = masterEvents;
    const rightEmployees = getScenarioEmployees(scenario1);
    const rightEvents = getScenarioEvents(scenario1);

    const employeeDiffs = getEmployeeDiffs(masterEmployees, scenario1);
    const eventDiffs = getEventDiffs(masterEvents, scenario1);

    const added = employeeDiffs.filter(d => d.status === 'added');
    const removed = employeeDiffs.filter(d => d.status === 'removed');
    const modified = employeeDiffs.filter(d => d.status === 'modified');

    const eventsAdded = eventDiffs.filter(d => d.status === 'added');
    const eventsRemoved = eventDiffs.filter(d => d.status === 'removed');

    return {
      leftLabel: 'Master Plan',
      rightLabel: scenario1.name,
      leftStats: {
        employees: leftEmployees.length,
        events: leftEvents.length,
        flags: leftEvents.filter(e => e.isFlag).length
      },
      rightStats: {
        employees: rightEmployees.length,
        events: rightEvents.length,
        flags: rightEvents.filter(e => e.isFlag).length
      },
      diffs: {
        employeesAdded: added,
        employeesRemoved: removed,
        employeesModified: modified,
        eventsAdded,
        eventsRemoved
      }
    };
  }, [scenario1, scenario2, masterEmployees, masterEvents]);

  if (!comparisonData) return null;

  const getDiffColor = (status: DiffStatus) => {
    switch (status) {
      case 'added': return 'text-emerald-500 bg-emerald-500/10';
      case 'removed': return 'text-destructive bg-destructive/10';
      case 'modified': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const totalChanges = 
    comparisonData.diffs.employeesAdded.length + 
    comparisonData.diffs.employeesRemoved.length + 
    comparisonData.diffs.employeesModified.length +
    comparisonData.diffs.eventsAdded.length +
    comparisonData.diffs.eventsRemoved.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-primary" />
            Side-by-Side Comparison
          </DialogTitle>
          <DialogDescription>
            Comparing differences between {comparisonData.leftLabel} and {comparisonData.rightLabel}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Stats Comparison */}
          <div className="grid grid-cols-3 gap-4">
            {/* Left Side (Master) */}
            <div className="p-4 bg-card border border-border rounded-xl">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{comparisonData.leftLabel}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Users size={14} /> Employees
                  </span>
                  <span className="font-semibold">{comparisonData.leftStats.employees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Calendar size={14} /> Events
                  </span>
                  <span className="font-semibold">{comparisonData.leftStats.events}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Flag size={14} /> Flags
                  </span>
                  <span className="font-semibold">{comparisonData.leftStats.flags}</span>
                </div>
              </div>
            </div>

            {/* Difference Summary */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex flex-col items-center justify-center">
              <ArrowRightLeft size={24} className="text-primary mb-2" />
              <span className="text-2xl font-bold">{totalChanges}</span>
              <span className="text-xs text-muted-foreground">Total Changes</span>
            </div>

            {/* Right Side (Scenario) */}
            <div className="p-4 bg-card border border-border rounded-xl">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{comparisonData.rightLabel}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Users size={14} /> Employees
                  </span>
                  <span className="font-semibold">
                    {comparisonData.rightStats.employees}
                    {comparisonData.rightStats.employees !== comparisonData.leftStats.employees && (
                      <span className={comparisonData.rightStats.employees > comparisonData.leftStats.employees ? 'text-emerald-500 ml-1' : 'text-destructive ml-1'}>
                        ({comparisonData.rightStats.employees > comparisonData.leftStats.employees ? '+' : ''}{comparisonData.rightStats.employees - comparisonData.leftStats.employees})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Calendar size={14} /> Events
                  </span>
                  <span className="font-semibold">
                    {comparisonData.rightStats.events}
                    {comparisonData.rightStats.events !== comparisonData.leftStats.events && (
                      <span className={comparisonData.rightStats.events > comparisonData.leftStats.events ? 'text-emerald-500 ml-1' : 'text-destructive ml-1'}>
                        ({comparisonData.rightStats.events > comparisonData.leftStats.events ? '+' : ''}{comparisonData.rightStats.events - comparisonData.leftStats.events})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Flag size={14} /> Flags
                  </span>
                  <span className="font-semibold">
                    {comparisonData.rightStats.flags}
                    {comparisonData.rightStats.flags !== comparisonData.leftStats.flags && (
                      <span className={comparisonData.rightStats.flags > comparisonData.leftStats.flags ? 'text-amber-500 ml-1' : 'text-emerald-500 ml-1'}>
                        ({comparisonData.rightStats.flags > comparisonData.leftStats.flags ? '+' : ''}{comparisonData.rightStats.flags - comparisonData.leftStats.flags})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Changes */}
          <ScrollArea className="flex-1 border border-border rounded-xl">
            <div className="p-4 space-y-6">
              {/* Added Employees */}
              {comparisonData.diffs.employeesAdded.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-emerald-500">
                    <UserPlus size={16} />
                    New Employees ({comparisonData.diffs.employeesAdded.length})
                  </h4>
                  <div className="space-y-2">
                    {comparisonData.diffs.employeesAdded.map(diff => (
                      <div key={diff.employee.id} className={`p-3 rounded-lg ${getDiffColor('added')}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{diff.employee.name}</span>
                          <span className="text-xs">{diff.employee.role}</span>
                        </div>
                        <div className="text-xs mt-1 opacity-80">
                          {diff.employee.dept} → {diff.employee.team}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Employees */}
              {comparisonData.diffs.employeesRemoved.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-destructive">
                    <UserMinus size={16} />
                    Removed Employees ({comparisonData.diffs.employeesRemoved.length})
                  </h4>
                  <div className="space-y-2">
                    {comparisonData.diffs.employeesRemoved.map(diff => (
                      <div key={diff.employee.id} className={`p-3 rounded-lg ${getDiffColor('removed')}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium line-through">{diff.employee.name}</span>
                          <span className="text-xs">{diff.employee.role}</span>
                        </div>
                        <div className="text-xs mt-1 opacity-80">
                          {diff.employee.dept} → {diff.employee.team}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Employees */}
              {comparisonData.diffs.employeesModified.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-amber-500">
                    <Edit3 size={16} />
                    Modified Employees ({comparisonData.diffs.employeesModified.length})
                  </h4>
                  <div className="space-y-2">
                    {comparisonData.diffs.employeesModified.map(diff => (
                      <div key={diff.employee.id} className={`p-3 rounded-lg ${getDiffColor('modified')}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{diff.employee.name}</span>
                        </div>
                        {diff.changes && diff.changes.length > 0 && (
                          <div className="text-xs mt-2 space-y-1">
                            {diff.changes.map((change, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <ArrowRight size={10} />
                                <span>{change}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Added Events */}
              {comparisonData.diffs.eventsAdded.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-emerald-500">
                    <Calendar size={16} />
                    New Events ({comparisonData.diffs.eventsAdded.length})
                  </h4>
                  <div className="space-y-2">
                    {comparisonData.diffs.eventsAdded.map(diff => (
                      <div key={diff.event.id} className={`p-3 rounded-lg ${getDiffColor('added')}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{diff.event.type}</span>
                          <span className="text-xs">{diff.event.date}</span>
                        </div>
                        <div className="text-xs mt-1 opacity-80">
                          {diff.event.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Events */}
              {comparisonData.diffs.eventsRemoved.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-3 text-destructive">
                    <Calendar size={16} />
                    Removed Events ({comparisonData.diffs.eventsRemoved.length})
                  </h4>
                  <div className="space-y-2">
                    {comparisonData.diffs.eventsRemoved.map(diff => (
                      <div key={diff.event.id} className={`p-3 rounded-lg ${getDiffColor('removed')}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium line-through">{diff.event.type}</span>
                          <span className="text-xs">{diff.event.date}</span>
                        </div>
                        <div className="text-xs mt-1 opacity-80">
                          {diff.event.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Changes */}
              {totalChanges === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Equal size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No differences found</p>
                  <p className="text-sm">The scenario matches the Master Plan</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
