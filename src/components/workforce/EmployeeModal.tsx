import { X, Building2, Trash2, AlertTriangle, Clock, CalendarIcon, Tag, Plus } from 'lucide-react';
import { EmployeeNotes } from './EmployeeNotes';
import {
  Employee,
  DEPARTMENT_NAMES,
  ROLES,
  STATUSES,
  WORK_TYPES,
  WorkType,
  HierarchyStructure,
  TeamStructure,
  Label,
  getAllDeptTeams,
  getTeamParent,
  formatDate,
} from '@/lib/workforce-data';
import { FormEvent, useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format, parse } from 'date-fns';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, 'id'>, id?: number) => void;
  onDelete?: (employeeId: number) => void;
  editingEmployee: Employee | null;
  hierarchy: HierarchyStructure;
  departments: Record<string, string[]>;
  employees: Employee[];
  teamStructures: TeamStructure[];
  prefill?: { dept: string; team: string; group?: string | null };
  labels?: Label[];
  onCreateLabel?: (name: string) => Promise<Label | undefined>;
  isBackendAvailable?: boolean;
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
  teamStructures,
  prefill,
  labels = [],
  onCreateLabel,
  isBackendAvailable = false,
}: EmployeeModalProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDept, setSelectedDept] = useState(DEPARTMENT_NAMES[0]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isDepartmentLevel, setIsDepartmentLevel] = useState(false);
  const [isGroupLevel, setIsGroupLevel] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('Full-Time');
  const [partTimePercentage, setPartTimePercentage] = useState(50);
  const [initialized, setInitialized] = useState(false);
  const [hireDate, setHireDate] = useState<Date | undefined>(undefined);
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

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

  // Check if editing employee is the team leader for the selected team
  const isTeamLeader = useMemo(() => {
    if (!editingEmployee || !selectedTeam) return false;
    const teamStructure = teamStructures.find(ts => ts.teamName === selectedTeam);
    return teamStructure?.teamLeader === editingEmployee.id;
  }, [editingEmployee, selectedTeam, teamStructures]);

  // Auto-calculate manager based on hierarchy
  const autoManager = useMemo(() => {
    if (isDepartmentLevel) return undefined;
    if (isGroupLevel && selectedGroup) return deptStructure?.departmentManagerId;
    if (isTeamLeader && selectedTeam) {
      const group = deptStructure?.groups.find(g => g.name === selectedGroup);
      return group?.groupManagerId || deptStructure?.departmentManagerId;
    }
    if (selectedTeam) {
      const teamStructure = teamStructures.find(ts => ts.teamName === selectedTeam);
      if (teamStructure?.teamLeader && teamStructure.teamLeader !== editingEmployee?.id) {
        return teamStructure.teamLeader;
      }
      if (selectedGroup) {
        const group = deptStructure?.groups.find(g => g.name === selectedGroup);
        return group?.groupManagerId || deptStructure?.departmentManagerId;
      }
      return deptStructure?.departmentManagerId;
    }
    return undefined;
  }, [isDepartmentLevel, isGroupLevel, isTeamLeader, selectedDept, selectedGroup, selectedTeam, deptStructure, teamStructures, editingEmployee]);

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

  // Available labels for picker
  const availableLabels = useMemo(() => 
    labels.filter(l => !selectedSkills.includes(l.name)),
    [labels, selectedSkills]
  );

  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
      return;
    }

    if (initialized) return;

    if (editingEmployee) {
      const parent = getTeamParent(hierarchy, editingEmployee.team);
      const resolvedGroup = editingEmployee.group ?? parent?.group?.name ?? null;

      setSelectedDept(editingEmployee.dept);
      setSelectedWorkType(editingEmployee.workType || 'Full-Time');
      setPartTimePercentage(editingEmployee.partTimePercentage || 50);
      setHireDate(editingEmployee.joined ? new Date(editingEmployee.joined) : undefined);
      setDepartureDate(editingEmployee.departureDate ? new Date(editingEmployee.departureDate) : undefined);
      setSelectedSkills(editingEmployee.skills || []);

      const isDeptMgr = editingEmployee.managerLevel === 'department' ||
        hierarchy.some(d => d.departmentManagerId === editingEmployee.id);
      setIsDepartmentLevel(isDeptMgr);

      if (resolvedGroup) {
        setSelectedGroup(resolvedGroup);
        const isGroupMgr = editingEmployee.managerLevel === 'group' ||
          hierarchy.some(d =>
            d.groups.some(g => g.name === resolvedGroup && g.groupManagerId === editingEmployee.id)
          );
        setIsGroupLevel(isGroupMgr);
      } else {
        setSelectedGroup(null);
        setIsGroupLevel(editingEmployee.managerLevel === 'group');
      }

      setSelectedTeam(editingEmployee.team);
    } else if (prefill) {
      setSelectedDept(prefill.dept);
      setSelectedGroup(prefill.group ?? null);
      setIsDepartmentLevel(false);
      setIsGroupLevel(false);
      setSelectedTeam(prefill.team);
      setSelectedWorkType('Full-Time');
      setPartTimePercentage(50);
      setHireDate(undefined);
      setDepartureDate(undefined);
      setSelectedSkills([]);
    } else {
      const firstDept = DEPARTMENT_NAMES[0];
      setSelectedDept(firstDept);
      setSelectedGroup(null);
      setIsDepartmentLevel(false);
      setIsGroupLevel(false);
      setSelectedWorkType('Full-Time');
      setPartTimePercentage(50);
      setHireDate(undefined);
      setDepartureDate(undefined);
      setSelectedSkills([]);

      const firstDeptStructure = hierarchy.find(d => d.name === firstDept);
      if (firstDeptStructure) {
        if (firstDeptStructure.directTeams && firstDeptStructure.directTeams.length > 0) {
          setSelectedTeam(firstDeptStructure.directTeams[0]);
          setSelectedGroup(null);
        } else {
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
    setNewSkillInput('');
    setInitialized(true);
  }, [isOpen, editingEmployee, hierarchy, initialized, prefill]);

  const handleGroupChange = (newGroup: string | null) => {
    setSelectedGroup(newGroup);
    if (isDepartmentLevel || isGroupLevel) return;
    if (newGroup) {
      const group = deptStructure?.groups.find(g => g.name === newGroup);
      const groupTeams = group?.teams || [];
      if (groupTeams.length > 0 && !groupTeams.includes(selectedTeam)) {
        setSelectedTeam(groupTeams[0]);
      }
    } else {
      const directTeams = deptStructure?.directTeams || [];
      if (directTeams.length > 0) {
        setSelectedTeam(directTeams[0]);
      }
    }
  };

  const handleDeptChange = (newDept: string) => {
    setSelectedDept(newDept);
    const newDeptStructure = hierarchy.find(d => d.name === newDept);
    if (!newDeptStructure) return;
    setSelectedGroup(null);
    if (isDepartmentLevel || isGroupLevel) return;
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

  const handleAddSkill = (skillName: string) => {
    if (!selectedSkills.includes(skillName)) {
      setSelectedSkills(prev => [...prev, skillName]);
    }
  };

  const handleRemoveSkill = (skillName: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skillName));
  };

  const handleCreateAndAddSkill = async () => {
    const name = newSkillInput.trim();
    if (!name || !onCreateLabel) return;
    try {
      const label = await onCreateLabel(name);
      if (label) {
        handleAddSkill(label.name);
        setNewSkillInput('');
      }
    } catch (e) {
      // error already toasted
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    const formData = new FormData(e.currentTarget);
    const dept = selectedDept;
    
    let team: string;
    let group: string | undefined;
    
    if (isDepartmentLevel) {
      team = dept;
      group = undefined;
    } else if (isGroupLevel) {
      team = selectedGroup || dept;
      group = selectedGroup || undefined;
    } else {
      team = selectedTeam;
      group = selectedGroup || undefined;
    }
    
    let finalDepartureDate = departureDate;
    if (!finalDepartureDate && hireDate && !editingEmployee) {
      const defaultDeparture = new Date(hireDate);
      defaultDeparture.setFullYear(defaultDeparture.getFullYear() + 5);
      defaultDeparture.setMonth(defaultDeparture.getMonth() + 8);
      finalDepartureDate = defaultDeparture;
    }
    
    const employeeData: Omit<Employee, 'id'> = {
      name: formData.get('name') as string,
      dept: dept,
      team: team,
      group: group,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
      joined: hireDate ? format(hireDate, 'yyyy-MM-dd') : '',
      isPotential: formData.get('isPotential') === 'on',
      managerId: autoManager,
      managerLevel: isDepartmentLevel ? 'department' : isGroupLevel ? 'group' : undefined,
      workType: selectedWorkType,
      partTimePercentage: selectedWorkType === 'Part-Time' ? partTimePercentage : undefined,
      departureDate: finalDepartureDate ? format(finalDepartureDate, 'yyyy-MM-dd') : undefined,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal input-field ${!hireDate ? 'text-muted-foreground' : ''}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {hireDate ? format(hireDate, 'dd/MM/yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[110]" align="start">
                <Calendar
                  mode="single"
                  selected={hireDate}
                  onSelect={(date) => {
                    setHireDate(date);
                    if (date && !editingEmployee && !departureDate) {
                      const defaultDeparture = new Date(date);
                      defaultDeparture.setFullYear(defaultDeparture.getFullYear() + 5);
                      defaultDeparture.setMonth(defaultDeparture.getMonth() + 8);
                      setDepartureDate(defaultDeparture);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Departure Date */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Departure Date <span className="font-normal normal-case">(default: 5y 8m after hire)</span>
            </label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={`flex-1 justify-start text-left font-normal input-field ${!departureDate ? 'text-muted-foreground' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departureDate ? format(departureDate, 'dd/MM/yyyy') : 'No departure date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[110]" align="start">
                  <Calendar
                    mode="single"
                    selected={departureDate}
                    onSelect={setDepartureDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {departureDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDepartureDate(undefined)}
                  className="text-destructive hover:text-destructive h-auto px-2"
                >
                  <X size={14} />
                </Button>
              )}
            </div>
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
                </label>
              ))}
            </div>
          </div>

          {/* Part-Time Percentage Slider */}
          {selectedWorkType === 'Part-Time' && (
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-2 tracking-wider">
                Work Percentage
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="10"
                  value={partTimePercentage}
                  onChange={(e) => setPartTimePercentage(Number(e.target.value))}
                  className="flex-1 h-2 bg-amber-500/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-lg font-bold text-amber-500 w-14 text-right">
                  {partTimePercentage}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Capacity contribution: {partTimePercentage}% of full-time equivalent
              </p>
            </div>
          )}

          {/* Skills / Labels */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider flex items-center gap-1">
              <Tag size={12} />
              Skills
            </label>
            
            {/* Selected skills */}
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedSkills.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Available labels to add */}
            {availableLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {availableLabels.map(label => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleAddSkill(label.name)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={10} />
                    {label.name}
                  </button>
                ))}
              </div>
            )}

            {/* Create new label inline */}
            {onCreateLabel && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateAndAddSkill())}
                  placeholder="Add new skill..."
                  className="input-field flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateAndAddSkill}
                  disabled={!newSkillInput.trim()}
                  className="h-auto text-xs"
                >
                  <Plus size={12} className="mr-1" />
                  Add
                </Button>
              </div>
            )}
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
