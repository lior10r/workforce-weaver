import { useState } from 'react';
import { X, Users, Crown, ChevronDown, Check } from 'lucide-react';
import { Employee } from '@/lib/workforce-data';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BulkActionsProps {
  employees: Employee[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkAssignManager: (employeeIds: number[], managerId: number | null) => void;
  onBulkMoveToTeam: (employeeIds: number[], teamName: string, dept: string, group?: string) => void;
  availableManagers: Employee[];
  availableTeams: { name: string; dept: string; group?: string }[];
}

export const BulkActions = ({
  employees,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onBulkAssignManager,
  onBulkMoveToTeam,
  availableManagers,
  availableTeams,
}: BulkActionsProps) => {
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === employees.length && employees.length > 0;

  const handleAssignManager = () => {
    if (selectedManager) {
      const managerId = selectedManager === 'none' ? null : parseInt(selectedManager);
      onBulkAssignManager(Array.from(selectedIds), managerId);
      setShowManagerDialog(false);
      setSelectedManager('');
      onClearSelection();
    }
  };

  const handleMoveToTeam = () => {
    if (selectedTeam) {
      const team = availableTeams.find(t => t.name === selectedTeam);
      if (team) {
        onBulkMoveToTeam(Array.from(selectedIds), team.name, team.dept, team.group);
        setShowTeamDialog(false);
        setSelectedTeam('');
        onClearSelection();
      }
    }
  };

  if (employees.length === 0) return null;

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="flex items-center gap-4 p-3 bg-accent/30 rounded-xl border border-border mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => allSelected ? onClearSelection() : onSelectAll()}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <span className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <span className="font-medium text-foreground">{selectedCount} selected</span>
            ) : (
              'Select employees for bulk actions'
            )}
          </span>
        </div>

        {selectedCount > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManagerDialog(true)}
              className="h-8 text-xs"
            >
              <Crown size={14} className="mr-1" />
              Assign Manager
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTeamDialog(true)}
              className="h-8 text-xs"
            >
              <Users size={14} className="mr-1" />
              Move to Team
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 text-xs text-muted-foreground"
            >
              <X size={14} className="mr-1" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Assign Manager Dialog */}
      <Dialog open={showManagerDialog} onOpenChange={setShowManagerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Manager</DialogTitle>
            <DialogDescription>
              Select a manager to assign to {selectedCount} employee{selectedCount > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger>
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                <SelectItem value="none">No Manager (Remove)</SelectItem>
                {availableManagers.map(emp => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{emp.name}</span>
                      <span className="text-muted-foreground text-xs">- {emp.role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManagerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignManager} disabled={!selectedManager}>
              <Check size={14} className="mr-1" />
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Team</DialogTitle>
            <DialogDescription>
              Select a team to move {selectedCount} employee{selectedCount > 1 ? 's' : ''} to.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border max-h-60">
                {availableTeams.map(team => (
                  <SelectItem key={team.name} value={team.name}>
                    <div className="flex items-center gap-2">
                      <span>{team.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({team.dept}{team.group ? ` / ${team.group}` : ''})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveToTeam} disabled={!selectedTeam}>
              <Check size={14} className="mr-1" />
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Selectable employee row wrapper
export const SelectableEmployeeWrapper = ({
  employee,
  isSelected,
  onToggle,
  children,
}: {
  employee: Employee;
  isSelected: boolean;
  onToggle: (id: number) => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(employee.id)}
        onClick={(e) => e.stopPropagation()}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary ml-2"
      />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};