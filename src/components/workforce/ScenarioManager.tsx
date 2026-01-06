import { useState } from 'react';
import { 
  GitBranch, 
  GitMerge, 
  Plus, 
  Trash2, 
  X,
  Copy,
  ArrowRightLeft,
  Layers,
  History,
  UserPlus,
  UserMinus,
  Edit3,
  Calendar,
  ArrowRight,
  Check,
  CheckSquare,
  Square,
  Undo2
} from 'lucide-react';
import { 
  Scenario, 
  Employee, 
  WorkforceEvent, 
  TeamStructure,
  HierarchyStructure,
  ScenarioChangelogEntry,
  createScenario,
  duplicateScenario,
  getScenarioEmployees,
  getScenarioEvents,
  initialHierarchy,
  formatDate
} from '@/lib/workforce-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScenarioComparisonDialog } from './ScenarioComparisonDialog';

interface ScenarioManagerProps {
  scenarios: Scenario[];
  activeScenarioId: string | null; // null = Master Plan
  compareScenarioId: string | null;
  masterEmployees: Employee[];
  masterEvents: WorkforceEvent[];
  masterTeamStructures: TeamStructure[];
  masterHierarchy?: HierarchyStructure;
  onCreateScenario: (scenario: Scenario) => void;
  onUpdateScenario: (scenario: Scenario) => void;
  onDeleteScenario: (id: string) => void;
  onSetActiveScenario: (id: string | null) => void;
  onSetCompareScenario: (id: string | null) => void;
  onMergeToMaster: (scenario: Scenario, selectedChangeIds?: string[]) => void;
  onDiscardChanges: (scenarioId: string, changeIds: string[]) => void;
}

export const ScenarioManager = ({
  scenarios,
  activeScenarioId,
  compareScenarioId,
  masterEmployees,
  masterEvents,
  masterTeamStructures,
  masterHierarchy,
  onCreateScenario,
  onUpdateScenario,
  onDeleteScenario,
  onSetActiveScenario,
  onSetCompareScenario,
  onMergeToMaster,
  onDiscardChanges
}: ScenarioManagerProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isDetailedCompareOpen, setIsDetailedCompareOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isMergeSelectOpen, setIsMergeSelectOpen] = useState(false);
  const [isDiscardSelectOpen, setIsDiscardSelectOpen] = useState(false);
  const [scenarioToMerge, setScenarioToMerge] = useState<Scenario | null>(null);
  const [scenarioToDiscard, setScenarioToDiscard] = useState<Scenario | null>(null);
  const [scenarioToDuplicate, setScenarioToDuplicate] = useState<Scenario | null>(null);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [duplicateName, setDuplicateName] = useState('');
  const [selectedMergeIds, setSelectedMergeIds] = useState<Set<string>>(new Set());
  const [selectedDiscardIds, setSelectedDiscardIds] = useState<Set<string>>(new Set());
  const [selectedCompareScenarioId, setSelectedCompareScenarioId] = useState<string | null>(null);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const compareScenario = scenarios.find(s => s.id === compareScenarioId);

  const handleCreateScenario = () => {
    if (!newScenarioName.trim()) {
      toast.error('Please enter a scenario name');
      return;
    }

    const scenario = createScenario(
      newScenarioName.trim(),
      newScenarioDesc.trim(),
      masterEmployees,
      masterEvents,
      masterTeamStructures,
      masterHierarchy || initialHierarchy
    );

    onCreateScenario(scenario);
    setNewScenarioName('');
    setNewScenarioDesc('');
    setIsCreateOpen(false);
    toast.success(`Created scenario: ${scenario.name}`);
  };

  const handleDuplicateScenario = () => {
    if (!scenarioToDuplicate || !duplicateName.trim()) {
      toast.error('Please enter a name for the duplicated scenario');
      return;
    }

    const newScenario = duplicateScenario(scenarioToDuplicate, duplicateName.trim());
    onCreateScenario(newScenario);
    setDuplicateName('');
    setScenarioToDuplicate(null);
    setIsDuplicateOpen(false);
    toast.success(`Duplicated scenario as: ${newScenario.name}`);
  };

  const handleMergeConfirm = () => {
    if (scenarioToMerge) {
      const selected = selectedMergeIds.size > 0 ? Array.from(selectedMergeIds) : undefined;
      onMergeToMaster(scenarioToMerge, selected);
      setIsMergeSelectOpen(false);
      setScenarioToMerge(null);
      setSelectedMergeIds(new Set());
      toast.success(`Merged "${scenarioToMerge.name}" to Master Plan`);
    }
  };

  const toggleMergeSelection = (id: string) => {
    setSelectedMergeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleDiscardSelection = (id: string) => {
    setSelectedDiscardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllForMerge = () => {
    if (scenarioToMerge) {
      setSelectedMergeIds(new Set(scenarioToMerge.changelog.map(c => c.id)));
    }
  };

  const deselectAllForMerge = () => {
    setSelectedMergeIds(new Set());
  };

  const selectAllForDiscard = () => {
    if (scenarioToDiscard) {
      setSelectedDiscardIds(new Set(scenarioToDiscard.changelog.map(c => c.id)));
    }
  };

  const deselectAllForDiscard = () => {
    setSelectedDiscardIds(new Set());
  };

  const handleDiscardConfirm = () => {
    if (scenarioToDiscard && selectedDiscardIds.size > 0) {
      onDiscardChanges(scenarioToDiscard.id, Array.from(selectedDiscardIds));
      setIsDiscardSelectOpen(false);
      setScenarioToDiscard(null);
      setSelectedDiscardIds(new Set());
      toast.success(`Discarded ${selectedDiscardIds.size} change(s)`);
    }
  };

  // Get enhanced description for changelog entries
  const getEnhancedDescription = (entry: ScenarioChangelogEntry, scenario: Scenario): string => {
    // For team swaps, add more details
    if (entry.description.includes('Team Swap') || entry.description.includes('Moved from')) {
      // Try to find the event for more details
      const event = scenario.proposedEvents.find(e => 
        e.empId === entry.entityId && e.type === 'Team Swap'
      );
      if (event && event.targetTeam) {
        return `${entry.description} → ${event.targetTeam} on ${formatDate(event.date)}`;
      }
    }
    return entry.description;
  };

  const getScenarioStats = (scenario: Scenario) => {
    const employees = getScenarioEmployees(scenario);
    const events = getScenarioEvents(scenario);
    const proposedChanges = scenario.proposedEmployees.length + scenario.proposedEvents.length;
    const deletions = scenario.deletedEmployeeIds.length + scenario.deletedEventIds.length;
    
    return {
      employees: employees.length,
      events: events.length,
      proposedChanges,
      deletions,
      flags: events.filter(e => e.isFlag).length,
      changelogCount: scenario.changelog.length
    };
  };

  const getComparisonData = () => {
    if (!compareScenario) return null;

    const masterStats = {
      employees: masterEmployees.length,
      events: masterEvents.length,
      flags: masterEvents.filter(e => e.isFlag).length
    };

    const scenarioStats = getScenarioStats(compareScenario);

    return {
      master: masterStats,
      scenario: scenarioStats,
      diff: {
        employees: scenarioStats.employees - masterStats.employees,
        events: scenarioStats.events - masterStats.events,
        flags: scenarioStats.flags - masterStats.flags
      }
    };
  };

  const getChangelogIcon = (type: ScenarioChangelogEntry['type']) => {
    switch (type) {
      case 'employee_added': return <UserPlus size={14} className="text-emerald-500" />;
      case 'employee_removed': return <UserMinus size={14} className="text-destructive" />;
      case 'employee_modified': return <Edit3 size={14} className="text-amber-500" />;
      case 'event_added': return <Calendar size={14} className="text-emerald-500" />;
      case 'event_removed': return <Calendar size={14} className="text-destructive" />;
      case 'event_modified': return <Calendar size={14} className="text-amber-500" />;
      default: return <Edit3 size={14} />;
    }
  };

  const formatChangelogDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Scenario Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-accent/30 border-b border-border">
        <div className="flex items-center gap-2 text-xs font-medium">
          <GitBranch size={14} className="text-primary" />
          <span className="text-muted-foreground">Active:</span>
          <button
            onClick={() => onSetActiveScenario(null)}
            className={`px-2 py-1 rounded transition-colors ${
              !activeScenarioId 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent text-foreground'
            }`}
          >
            Master Plan
          </button>
          {scenarios.map(scenario => (
            <div key={scenario.id} className="flex items-center gap-1">
              <button
                onClick={() => onSetActiveScenario(scenario.id)}
                className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeScenarioId === scenario.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                {scenario.name}
                {getScenarioStats(scenario).proposedChanges > 0 && (
                  <span className="text-[10px] bg-status-warning/20 text-status-warning px-1 rounded">
                    {getScenarioStats(scenario).proposedChanges}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setScenarioToDuplicate(scenario);
                  setDuplicateName(`${scenario.name} (Copy)`);
                  setIsDuplicateOpen(true);
                }}
                className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                title="Duplicate scenario"
              >
                <Copy size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {scenarios.length > 0 && (
            <button
              onClick={() => setIsCompareOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-accent hover:bg-accent/80 rounded transition-colors"
            >
              <ArrowRightLeft size={12} />
              Compare
            </button>
          )}
          
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
          >
            <Plus size={12} />
            New Scenario
          </button>
        </div>
      </div>

      {/* Active Scenario Info Bar - Compact without inline history */}
      {activeScenario && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              <span className="text-sm font-semibold">{activeScenario.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{activeScenario.description}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 bg-accent rounded">
                {getScenarioStats(activeScenario).proposedChanges} proposed changes
              </span>
              {getScenarioStats(activeScenario).deletions > 0 && (
                <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded">
                  {getScenarioStats(activeScenario).deletions} removals
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeScenario.changelog.length > 0 && (
              <button
                onClick={() => {
                  setScenarioToDiscard(activeScenario);
                  setSelectedDiscardIds(new Set());
                  setIsDiscardSelectOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-colors"
              >
                <Undo2 size={14} />
                Discard Changes
              </button>
            )}
            <button
              onClick={() => {
                setScenarioToMerge(activeScenario);
                setSelectedMergeIds(new Set(activeScenario.changelog.map(c => c.id)));
                setIsMergeSelectOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors"
            >
              <GitMerge size={14} />
              Merge to Master
            </button>
            <button
              onClick={() => onDeleteScenario(activeScenario.id)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Comparison Mode Bar */}
      {compareScenarioId && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowRightLeft size={14} className="text-amber-500" />
              <span className="text-sm font-medium">Comparing:</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">Master Plan</span>
              <span className="text-muted-foreground">vs</span>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-xs">
                {compareScenario?.name}
              </span>
            </div>
            
            {getComparisonData() && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Employees:</span>
                  <span className={getComparisonData()!.diff.employees >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                    {getComparisonData()!.diff.employees >= 0 ? '+' : ''}{getComparisonData()!.diff.employees}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Events:</span>
                  <span className={getComparisonData()!.diff.events >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                    {getComparisonData()!.diff.events >= 0 ? '+' : ''}{getComparisonData()!.diff.events}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Flags:</span>
                  <span className={getComparisonData()!.diff.flags >= 0 ? 'text-amber-500' : 'text-emerald-500'}>
                    {getComparisonData()!.diff.flags >= 0 ? '+' : ''}{getComparisonData()!.diff.flags}
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => onSetCompareScenario(null)}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create Scenario Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch size={20} />
              Create New Scenario
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Create a sandboxed version of your workforce data to explore "what-if" scenarios without affecting the Master Plan.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Scenario Name</label>
                <input
                  type="text"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g., Q3 Expansion Plan"
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                <textarea
                  value={newScenarioDesc}
                  onChange={(e) => setNewScenarioDesc(e.target.value)}
                  placeholder="Describe the purpose of this scenario..."
                  className="input-field mt-1 min-h-[80px] resize-none"
                />
              </div>
            </div>

            <div className="p-3 bg-accent/50 rounded-xl text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">What gets captured:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>{masterEmployees.length} employees</li>
                <li>{masterEvents.length} events & movements</li>
                <li>{masterTeamStructures.length} team structures</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateScenario}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Create Scenario
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Scenario Dialog */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy size={20} />
              Duplicate Scenario
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Create a copy of <strong>"{scenarioToDuplicate?.name}"</strong> to explore alternative outcomes.
            </p>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">New Scenario Name</label>
              <input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="e.g., Q3 Plan - Alternative"
                className="input-field mt-1"
              />
            </div>

            {scenarioToDuplicate && (
              <div className="p-3 bg-accent/50 rounded-xl text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Will include:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>{getScenarioStats(scenarioToDuplicate).proposedChanges} proposed changes</li>
                  <li>{scenarioToDuplicate.changelog.length} changelog entries</li>
                </ul>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsDuplicateOpen(false)}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateScenario}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2"
              >
                <Copy size={16} />
                Duplicate
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft size={20} />
              Compare Scenarios
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Select a scenario to compare against the Master Plan. You can view a detailed side-by-side comparison or enable comparison mode for inline highlights.
            </p>
            
            <div className="space-y-2">
              {scenarios.map(scenario => {
                const stats = getScenarioStats(scenario);
                return (
                  <div
                    key={scenario.id}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedCompareScenarioId === scenario.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCompareScenarioId(
                        selectedCompareScenarioId === scenario.id ? null : scenario.id
                      )}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{scenario.name}</h4>
                          {scenario.description && (
                            <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 mt-3 text-xs">
                        <span className="px-2 py-0.5 bg-accent rounded">{stats.employees} employees</span>
                        <span className="px-2 py-0.5 bg-accent rounded">{stats.events} events</span>
                        {stats.proposedChanges > 0 && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {stats.proposedChanges} changes
                          </span>
                        )}
                      </div>
                    </button>
                    
                    {selectedCompareScenarioId === scenario.id && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                        <button
                          onClick={() => {
                            onSetCompareScenario(scenario.id);
                            setIsCompareOpen(false);
                            setSelectedCompareScenarioId(null);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-accent hover:bg-accent/80 rounded-lg transition-colors"
                        >
                          Enable Inline Highlights
                        </button>
                        <button
                          onClick={() => {
                            setIsDetailedCompareOpen(true);
                            setIsCompareOpen(false);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowRightLeft size={12} />
                          Side-by-Side View
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {scenarios.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No scenarios to compare.</p>
                <p className="text-xs mt-1">Create a scenario first to enable comparison.</p>
              </div>
            )}

            {compareScenarioId && (
              <button
                onClick={() => {
                  onSetCompareScenario(null);
                  setIsCompareOpen(false);
                }}
                className="w-full px-4 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
              >
                Exit Comparison Mode
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detailed Side-by-Side Comparison Dialog */}
      <ScenarioComparisonDialog
        isOpen={isDetailedCompareOpen}
        onClose={() => {
          setIsDetailedCompareOpen(false);
          setSelectedCompareScenarioId(null);
        }}
        scenarios={scenarios}
        masterEmployees={masterEmployees}
        masterEvents={masterEvents}
        compareScenarioId={selectedCompareScenarioId}
      />

      {/* Selective Merge Dialog */}
      <Dialog open={isMergeSelectOpen} onOpenChange={setIsMergeSelectOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <GitMerge size={20} />
              Merge to Master Plan
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select which changes from <strong>"{scenarioToMerge?.name}"</strong> to merge into the Master Plan.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllForMerge}
                  className="text-xs text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={deselectAllForMerge}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-96 border border-border rounded-xl">
              {scenarioToMerge?.changelog.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <History size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No changes to merge</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {scenarioToMerge?.changelog.slice().reverse().map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => toggleMergeSelection(entry.id)}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        selectedMergeIds.has(entry.id) 
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/15' 
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="mt-0.5">
                        {selectedMergeIds.has(entry.id) 
                          ? <CheckSquare size={16} className="text-emerald-500" />
                          : <Square size={16} className="text-muted-foreground" />
                        }
                      </div>
                      <div className="mt-0.5">
                        {getChangelogIcon(entry.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{entry.entityName}</p>
                          {entry.details?.['Target Team'] && (
                            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              <ArrowRight size={10} />
                              {entry.details['Target Team'].after}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getEnhancedDescription(entry, scenarioToMerge!)}
                        </p>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {Object.entries(entry.details).map(([key, value]) => (
                              <span key={key} className="text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                                <span className="font-medium">{key}:</span>{' '}
                                {value.before && <span className="text-destructive line-through">{value.before}</span>}
                                {value.before && value.after && ' → '}
                                {value.after && <span className="text-emerald-500">{value.after}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatChangelogDate(entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-500">
              <p className="font-medium">
                {selectedMergeIds.size === 0 
                  ? '⚠️ No changes selected - will merge all changes'
                  : `✓ ${selectedMergeIds.size} change(s) selected to merge`
                }
              </p>
              <p className="text-xs mt-1 text-amber-500/80">
                The scenario will be deleted after merging.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsMergeSelectOpen(false);
                  setSelectedMergeIds(new Set());
                }}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeConfirm}
                className="px-4 py-2 text-sm bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <GitMerge size={16} />
                {selectedMergeIds.size === 0 ? 'Merge All' : `Merge ${selectedMergeIds.size} Changes`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selective Discard Dialog */}
      <Dialog open={isDiscardSelectOpen} onOpenChange={setIsDiscardSelectOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <Undo2 size={20} />
              Discard Changes
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select which changes from <strong>"{scenarioToDiscard?.name}"</strong> to discard (undo).
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllForDiscard}
                  className="text-xs text-amber-500 hover:underline"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={deselectAllForDiscard}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-96 border border-border rounded-xl">
              {scenarioToDiscard?.changelog.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <History size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No changes to discard</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {scenarioToDiscard?.changelog.slice().reverse().map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => toggleDiscardSelection(entry.id)}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        selectedDiscardIds.has(entry.id) 
                          ? 'bg-amber-500/10 hover:bg-amber-500/15' 
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="mt-0.5">
                        {selectedDiscardIds.has(entry.id) 
                          ? <CheckSquare size={16} className="text-amber-500" />
                          : <Square size={16} className="text-muted-foreground" />
                        }
                      </div>
                      <div className="mt-0.5">
                        {getChangelogIcon(entry.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{entry.entityName}</p>
                          {entry.details?.['Target Team'] && (
                            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              <ArrowRight size={10} />
                              {entry.details['Target Team'].after}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getEnhancedDescription(entry, scenarioToDiscard!)}
                        </p>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {Object.entries(entry.details).map(([key, value]) => (
                              <span key={key} className="text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                                <span className="font-medium">{key}:</span>{' '}
                                {value.before && <span className="text-destructive line-through">{value.before}</span>}
                                {value.before && value.after && ' → '}
                                {value.after && <span className="text-emerald-500">{value.after}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatChangelogDate(entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-500">
              <p className="font-medium">
                {selectedDiscardIds.size === 0 
                  ? '⚠️ Select changes to discard'
                  : `🗑️ ${selectedDiscardIds.size} change(s) will be discarded`
                }
              </p>
              <p className="text-xs mt-1 text-amber-500/80">
                Discarded changes will be reverted to the original state.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsDiscardSelectOpen(false);
                  setSelectedDiscardIds(new Set());
                }}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardConfirm}
                disabled={selectedDiscardIds.size === 0}
                className="px-4 py-2 text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Undo2 size={16} />
                Discard {selectedDiscardIds.size} Change(s)
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};