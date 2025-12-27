import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users, UserCog } from 'lucide-react';
import { TeamStructure, Employee, ROLES } from '@/lib/workforce-data';

interface TeamStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (structure: TeamStructure) => void;
  teamStructure?: TeamStructure;
  teamName: string;
  department: string;
  employees: Employee[];
}

export const TeamStructureModal = ({
  isOpen,
  onClose,
  onSubmit,
  teamStructure,
  teamName,
  department,
  employees
}: TeamStructureModalProps) => {
  const [teamLeader, setTeamLeader] = useState<number | undefined>(teamStructure?.teamLeader);
  const [requiredRoles, setRequiredRoles] = useState<Record<string, number>>(
    teamStructure?.requiredRoles || {}
  );
  const [targetSize, setTargetSize] = useState<number | undefined>(teamStructure?.targetSize);

  // Team members for leader selection
  const teamMembers = employees.filter(e => e.team === teamName && !e.isPotential);

  useEffect(() => {
    if (teamStructure) {
      setTeamLeader(teamStructure.teamLeader);
      setRequiredRoles(teamStructure.requiredRoles);
      setTargetSize(teamStructure.targetSize);
    } else {
      setTeamLeader(undefined);
      setRequiredRoles({});
      setTargetSize(undefined);
    }
  }, [teamStructure, isOpen]);

  const handleAddRole = (role: string) => {
    if (!requiredRoles[role]) {
      setRequiredRoles(prev => ({ ...prev, [role]: 1 }));
    }
  };

  const handleRemoveRole = (role: string) => {
    setRequiredRoles(prev => {
      const updated = { ...prev };
      delete updated[role];
      return updated;
    });
  };

  const handleRoleCountChange = (role: string, count: number) => {
    setRequiredRoles(prev => ({ ...prev, [role]: Math.max(0, count) }));
  };

  const handleSubmit = () => {
    onSubmit({
      teamName,
      department,
      teamLeader,
      requiredRoles,
      targetSize
    });
    onClose();
  };

  const availableRoles = ROLES.filter(r => !requiredRoles[r]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h3 className="text-xl font-bold text-foreground">Team Structure</h3>
            <p className="text-sm text-muted-foreground mt-1">{teamName} • {department}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Team Leader */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <UserCog size={16} className="text-primary" />
              Team Leader
            </label>
            <select
              value={teamLeader || ''}
              onChange={(e) => setTeamLeader(e.target.value ? Number(e.target.value) : undefined)}
              className="input-field w-full"
            >
              <option value="">No leader assigned</option>
              {teamMembers.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Target Size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Users size={16} className="text-primary" />
              Target Team Size
            </label>
            <input
              type="number"
              min={1}
              value={targetSize || ''}
              onChange={(e) => setTargetSize(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Optional"
              className="input-field w-32"
            />
          </div>

          {/* Required Roles */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Required Roles
            </label>
            
            {Object.entries(requiredRoles).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.entries(requiredRoles).map(([role, count]) => (
                  <div key={role} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                    <span className="flex-1 text-sm font-medium">{role}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleCountChange(role, count - 1)}
                        className="w-7 h-7 rounded bg-background flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono text-sm">{count}</span>
                      <button
                        onClick={() => handleRoleCountChange(role, count + 1)}
                        className="w-7 h-7 rounded bg-background flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveRole(role)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Role */}
            {availableRoles.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {availableRoles.map(role => (
                  <button
                    key={role}
                    onClick={() => handleAddRole(role)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-secondary/30 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Save Structure
          </button>
        </div>
      </div>
    </div>
  );
};