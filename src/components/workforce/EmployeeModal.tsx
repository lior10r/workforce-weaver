import { X, Building2, Trash2, AlertTriangle, Clock } from 'lucide-react';
import {
  Employee,
  DEPARTMENT_NAMES,
  ROLES,
  STATUSES,
  WORK_TYPES,
  WorkType,
  HierarchyStructure,
  getAllDeptTeams,
  getTeamParent,
} from '@/lib/workforce-data';
import { FormEvent, useState, useEffect, useMemo } from 'react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, 'id'>, id?: number) => void;
  onDelete?: (employeeId: number) => void;
  editingEmployee: Employee | null;
  hierarchy: HierarchyStructure;
  departments: Record<string, string[]>;
  employees: Employee[];
  prefill?: { dept: string; team: string; group?: string | null };
}

export const EmployeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  editingEmployee,
  hierarchy,
  departments,
  employees,
  prefill,
}: EmployeeModalProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDept, setSelectedDept] = useState(DEPARTMENT_NAMES[0]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isDepartmentLevel, setIsDepartmentLevel] = useState(false);
  const [isGroupLevel, setIsGroupLevel] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('Full-Time');
  const [initialized, setInitialized] = useState(false);

  // Get the department structure
  const deptStructure = useMemo(() => 
    hierarchy.find(d => d.name === selectedDept),
    [hierarchy, selectedDept]
  );

  // Get available groups for selected department
  const availableGroups = useMemo(() => 
    deptStructure?.groups || [],
    [deptStructure]
  );

  // Get ALL available teams in the department
  const allDeptTeams = useMemo(() => {
    if (!deptStructure) return [];
    return getAllDeptTeams(deptStructure);
  }, [deptStructure]);

  // Get available teams based on selected group or direct teams
  const availableTeams = useMemo(() => {
    if (!deptStructure) return [];
    if (selectedGroup) {
      const group = deptStructure.groups.find(g => g.name === selectedGroup);
      return group?.teams || [];
    }
    // If no group selected, show direct teams
    return deptStructure.directTeams || [];
  }, [deptStructure, selectedGroup]);

  // Auto-calculate manager based on hierarchy
  const autoManager = useMemo(() => {
    if (isDepartmentLevel) {
      // Department manager reports to no one
      return undefined;
    }
    
    if (isGroupLevel && selectedGroup) {
      // Group manager reports to department manager
      return deptStructure?.departmentManagerId;
    }
    
    if (selectedTeam && selectedGroup) {
      // Team member reports to group manager if exists, else department manager
      const group = deptStructure?.groups.find(g => g.name === selectedGroup);
      return group?.groupManagerId || deptStructure?.departmentManagerId;
    }
    
    if (selectedTeam && !selectedGroup) {
      // Direct team member reports to department manager
      return deptStructure?.departmentManagerId;
    }
    
    return undefined;
  }, [isDepartmentLevel, isGroupLevel, selectedDept, selectedGroup, selectedTeam, deptStructure]);

  // Get manager name for display
  const managerName = useMemo(() => {
    if (autoManager) {
      const manager = employees.find(e => e.id === autoManager);
      return manager?.name || 'Unknown';
    }
    return 'No manager (Top-level)';
  }, [autoManager, employees]);

  // Check if form is valid for submission
  const canSubmit = useMemo(() => {
    if (isDepartmentLevel || isGroupLevel) return true;
    return selectedTeam !== '';
  }, [isDepartmentLevel, isGroupLevel, selectedTeam]);

  // Initialize form when modal opens - ONE TIME ONLY
  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
      return;
    }

    if (initialized) return;

    if (editingEmployee) {
      // Editing existing employee - use their current values
      const parent = getTeamParent(hierarchy, editingEmployee.team);
      const resolvedGroup = editingEmployee.group ?? parent?.group?.name ?? null;

      setSelectedDept(editingEmployee.dept);
      setSelectedWorkType(editingEmployee.workType || 'Full-Time');

      // Check if department level manager
      const isDeptMgr = hierarchy.some(d => d.departmentManagerId === editingEmployee.id);
      setIsDepartmentLevel(isDeptMgr);

      // Check if group level manager
      if (resolvedGroup) {
        setSelectedGroup(resolvedGroup);
        const isGroupMgr = hierarchy.some(d =>
          d.groups.some(g => g.name === resolvedGroup && g.groupManagerId === editingEmployee.id)
        );
        setIsGroupLevel(isGroupMgr);
      } else {
        setSelectedGroup(null);
        setIsGroupLevel(false);
      }

      // Set team - directly from employee
      setSelectedTeam(editingEmployee.team);
    } else if (prefill) {
      // New employee - prefilled from context (e.g. hire from roster)
      setSelectedDept(prefill.dept);
      setSelectedGroup(prefill.group ?? null);
      setIsDepartmentLevel(false);
      setIsGroupLevel(false);
      setSelectedTeam(prefill.team);
      setSelectedWorkType('Full-Time');
    } else {
      // New employee - set sensible defaults
      const firstDept = DEPARTMENT_NAMES[0];
      setSelectedDept(firstDept);
      setSelectedGroup(null);
      setIsDepartmentLevel(false);
      setIsGroupLevel(false);
      setSelectedWorkType('Full-Time');

      // Find first available team in the first department
      const firstDeptStructure = hierarchy.find(d => d.name === firstDept);
      if (firstDeptStructure) {
        // First try direct teams
        if (firstDeptStructure.directTeams && firstDeptStructure.directTeams.length > 0) {
          setSelectedTeam(firstDeptStructure.directTeams[0]);
          setSelectedGroup(null);
        } else {
          // Then try teams in groups
          for (const group of firstDeptStructure.groups) {
            if (group.teams.length > 0) {
              setSelectedGroup(group.name);
              setSelectedTeam(group.teams[0]);
              break;
            }
          }
        }
      }
    }
    setShowDeleteConfirm(false);
    setInitialized(true);
  }, [isOpen, editingEmployee, hierarchy, initialized, prefill]);

  // Only auto-select team when user MANUALLY changes group (not during init)
  const handleGroupChange = (newGroup: string | null) => {
    setSelectedGroup(newGroup);
    
    if (isDepartmentLevel || isGroupLevel) return;
    
    // When group changes, update team selection
    if (newGroup) {
      const group = deptStructure?.groups.find(g => g.name === newGroup);
      const groupTeams = group?.teams || [];
      if (groupTeams.length > 0 && !groupTeams.includes(selectedTeam)) {
        setSelectedTeam(groupTeams[0]);
      }
    } else {
      // Switched to direct teams
      const directTeams = deptStructure?.directTeams || [];
      if (directTeams.length > 0) {
        setSelectedTeam(directTeams[0]);
      }
    }
  };

  // Only auto-select when user MANUALLY changes department
  const handleDeptChange = (newDept: string) => {
    setSelectedDept(newDept);
    
    const newDeptStructure = hierarchy.find(d => d.name === newDept);
    if (!newDeptStructure) return;
    
    // Reset group and team for new department
    setSelectedGroup(null);
    
    if (isDepartmentLevel || isGroupLevel) return;
    
    // Find first available team
    if (newDeptStructure.directTeams && newDeptStructure.directTeams.length > 0) {
      setSelectedTeam(newDeptStructure.directTeams[0]);
    } else {
      for (const group of newDeptStructure.groups) {
        if (group.teams.length > 0) {
          setSelectedGroup(group.name);
          setSelectedTeam(group.teams[0]);
          break;
        }
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!canSubmit) return;
    
    const formData = new FormData(e.currentTarget);
    
    const dept = selectedDept;
    
    // Determine team based on level
    let team: string;
    let group: string | undefined;
    
    if (isDepartmentLevel) {
      team = dept; // Department level managers have dept as team
      group = undefined;
    } else if (isGroupLevel) {
      team = selectedGroup || dept;
      group = selectedGroup || undefined;
    } else {
      // Regular team member - must have a valid team
      team = selectedTeam;
      group = selectedGroup || undefined;
    }
    
    const employeeData: Omit<Employee, 'id'> = {
      name: formData.get('name') as string,
      dept: dept,
      team: team,
      group: group,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
      joined: formData.get('joined') as string,
      isPotential: formData.get('isPotential') === 'on',
      managerId: autoManager,
      managerLevel: isDepartmentLevel ? 'department' : isGroupLevel ? 'group' : undefined,
      workType: selectedWorkType,
    };

    onSubmit(employeeData, editingEmployee?.id);
  };

  const deptList = Object.keys(departments);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-foreground">
            {editingEmployee ? 'Edit Personnel' : 'Personnel Intake'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Full Name
            </label>
            <input 
              required 
              name="name" 
              defaultValue={editingEmployee?.name} 
              placeholder="Enter full name" 
              className="input-field" 
            />
          </div>

          {/* Department */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Department
            </label>
            <select 
              name="dept" 
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="select-field w-full"
            >
              {deptList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Department Manager Toggle */}
          <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <input 
              type="checkbox" 
              id="isDepartmentLevel"
              checked={isDepartmentLevel}
              onChange={(e) => {
                setIsDepartmentLevel(e.target.checked);
                if (e.target.checked) {
                  setIsGroupLevel(false);
                  setSelectedGroup(null);
                }
              }}
              className="w-4 h-4 rounded border-border accent-purple-500"
            />
            <label htmlFor="isDepartmentLevel" className="text-sm text-muted-foreground cursor-pointer flex-1">
              <span className="font-medium text-foreground">Department Manager</span>
              <p className="text-xs mt-0.5">Head of the entire department</p>
            </label>
          </div>

          {/* Group Selection (if not dept level) */}
          {!isDepartmentLevel && availableGroups.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Group
              </label>
              <select 
                value={selectedGroup || ''}
                onChange={(e) => handleGroupChange(e.target.value || null)}
                className="select-field w-full"
              >
                <option value="">-- Direct under Department --</option>
                {availableGroups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </div>
          )}

          {/* Group Manager Toggle (if group selected) */}
          {!isDepartmentLevel && selectedGroup && (
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <input 
                type="checkbox" 
                id="isGroupLevel"
                checked={isGroupLevel}
                onChange={(e) => setIsGroupLevel(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-blue-500"
              />
              <label htmlFor="isGroupLevel" className="text-sm text-muted-foreground cursor-pointer flex-1">
                <span className="font-medium text-foreground">Group Manager</span>
                <p className="text-xs mt-0.5">Manages all teams in {selectedGroup}</p>
              </label>
            </div>
          )}

          {/* Team Selection (if not dept or group level) */}
          {!isDepartmentLevel && !isGroupLevel && (
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Team
              </label>
              {availableTeams.length > 0 ? (
                <select 
                  name="team" 
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="select-field w-full"
                  required
                >
                  {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : allDeptTeams.length > 0 ? (
                <div className="space-y-2">
                  <div className="input-field bg-amber-500/10 text-amber-600 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} />
                    No direct teams. Select a group above to assign to a team.
                  </div>
                </div>
              ) : (
                <div className="input-field bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertTriangle size={14} />
                  No teams in this department. Create teams first.
                </div>
              )}
            </div>
          )}

          {/* Auto-calculated Reports To (read-only display) */}
          <div className="p-3 bg-accent/30 rounded-xl border border-border">
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Reports To (Auto-assigned)
            </label>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Building2 size={14} className="text-primary" />
              <span>{managerName}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Based on hierarchy: Team → Group Manager → Department Manager
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Role
              </label>
              <select 
                name="role" 
                defaultValue={editingEmployee?.role} 
                className="select-field w-full"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Status
              </label>
              <select 
                name="status" 
                defaultValue={editingEmployee?.status || 'Active'} 
                className="select-field w-full"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Hire Date
            </label>
            <input 
              type="date" 
              required 
              name="joined" 
              defaultValue={editingEmployee?.joined} 
              className="input-field" 
            />
          </div>

          {/* Work Type */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Work Type
            </label>
            <div className="flex gap-3">
              {WORK_TYPES.map(wt => (
                <label 
                  key={wt}
                  className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedWorkType === wt 
                      ? wt === 'Part-Time' 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                        : 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border hover:border-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="workType"
                    value={wt}
                    checked={selectedWorkType === wt}
                    onChange={() => setSelectedWorkType(wt)}
                    className="sr-only"
                  />
                  <Clock size={16} />
                  <span className="text-sm font-medium">{wt}</span>
                  {wt === 'Part-Time' && (
                    <span className="text-xs opacity-70">(0.5x)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl border border-border">
            <input 
              type="checkbox" 
              name="isPotential" 
              id="isPotential"
              defaultChecked={editingEmployee?.isPotential}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="isPotential" className="text-sm text-muted-foreground cursor-pointer">
              <span className="font-medium text-foreground">Potential hire</span> — uncertain/planning only
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            {editingEmployee && onDelete && (
              showDeleteConfirm ? (
                <div className="flex-1 flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowDeleteConfirm(false)} 
                    className="btn-secondary flex-1 justify-center text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      onDelete(editingEmployee.id);
                      onClose();
                    }} 
                    className="flex-1 justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-4 py-2 font-medium flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Confirm Delete
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  title="Delete Employee"
                >
                  <Trash2 size={20} />
                </button>
              )
            )}
            {!showDeleteConfirm && (
              <>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="btn-secondary flex-1 justify-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!canSubmit}
                  className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingEmployee ? 'Save Changes' : 'Confirm Hire'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};