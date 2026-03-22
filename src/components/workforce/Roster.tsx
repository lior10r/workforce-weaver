import { useState, useMemo } from 'react';
import { Flag, Edit2, Settings, Users, ChevronDown, ChevronRight, AlertTriangle, Plus, Minus, Edit3, Crown, Building2, FolderTree, Trash2, GripVertical, UserPlus, Clock, GraduationCap } from 'lucide-react';
import { Employee, TeamStructure, getRoleColor, formatDate, DiffStatus, HierarchyStructure, getAllDeptTeams, WorkforceEvent, getCapacityWeight } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BulkActions } from './BulkActions';

interface RosterProps {
  employees: Employee[];
  events: WorkforceEvent[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
  onEditEmployee: (employee: Employee) => void;
  teamStructures: TeamStructure[];
  onConfigureTeam: (teamName: string, department: string) => void;
  employeeDiffMap?: Map<number, { status: DiffStatus; changes?: string[] }>;
  hierarchy: HierarchyStructure;
  onAddDepartment?: (name: string) => void;
  onAddGroup?: (dept: string, groupName: string) => void;
  onAddTeam?: (dept: string, groupName: string | null, teamName: string) => void;
  onDeleteDepartment?: (dept: string) => void;
  onDeleteGroup?: (dept: string, groupName: string) => void;
  onDeleteTeam?: (dept: string, groupName: string | null, teamName: string) => void;
  onBulkAssignManager?: (employeeIds: number[], managerId: number | null) => void;
  onMoveEmployeeToTeam?: (employeeId: number, teamName: string, dept: string, group?: string) => void;
  onHireForTeam?: (prefill: { dept: string; team: string; group?: string | null }) => void;
}

const getDiffStyles = (status?: DiffStatus) => {
  switch (status) {
    case 'added':
      return 'bg-emerald-500/10 border-l-4 border-l-emerald-500';
    case 'modified':
      return 'bg-amber-500/10 border-l-4 border-l-amber-500';
    case 'removed':
      return 'bg-destructive/10 border-l-4 border-l-destructive opacity-60';
    default:
      return '';
  }
};

const getDiffBadge = (status?: DiffStatus, changes?: string[]) => {
  if (!status || status === 'unchanged') return null;
  
  const config = {
    added: { icon: Plus, text: 'Added', className: 'bg-emerald-500/20 text-emerald-500' },
    modified: { icon: Edit3, text: 'Modified', className: 'bg-amber-500/20 text-amber-500' },
    removed: { icon: Minus, text: 'Removed', className: 'bg-destructive/20 text-destructive' }
  }[status];
  
  if (!config) return null;
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${config.className}`}>
        <Icon size={10} />
        {config.text}
      </span>
      {changes && changes.length > 0 && (
        <span className="text-[9px] text-muted-foreground italic">
          {changes.join(', ')}
        </span>
      )}
    </div>
  );
};

// Draggable employee component
const DraggableEmployee = ({ employee, children }: { employee: Employee; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `employee-${employee.id}`,
    data: { employee }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${isDragging ? 'opacity-50 z-50' : ''}`}
      {...attributes}
    >
      <div className="flex items-center">
        <button 
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical size={14} />
        </button>
        {children}
      </div>
    </div>
  );
};

// Droppable team component
const DroppableTeam = ({ teamName, dept, group, children, isOver }: { 
  teamName: string; 
  dept: string; 
  group?: string;
  children: React.ReactNode;
  isOver?: boolean;
}) => {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id: `team-${teamName}`,
    data: { teamName, dept, group }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`transition-colors ${(isOver || dropIsOver) ? 'bg-primary/10 ring-2 ring-primary/30' : ''}`}
    >
      {children}
    </div>
  );
};

export const Roster = ({ 
  employees, 
  events,
  openPlannerForUser, 
  onEditEmployee,
  teamStructures,
  onConfigureTeam,
  employeeDiffMap,
  hierarchy,
  onAddDepartment,
  onAddGroup,
  onAddTeam,
  onDeleteDepartment,
  onDeleteGroup,
  onDeleteTeam,
  onBulkAssignManager,
  onMoveEmployeeToTeam,
  onHireForTeam
}: RosterProps) => {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(hierarchy.map(d => d.name)));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  
  // Dialogs
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [showAddGroupDialog, setShowAddGroupDialog] = useState<string | null>(null);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState<{ dept: string; group: string | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'dept' | 'group' | 'team'; dept: string; group?: string | null; team?: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get all available teams for bulk move
  const availableTeams = useMemo(() => {
    const teams: { name: string; dept: string; group?: string }[] = [];
    hierarchy.forEach(dept => {
      dept.directTeams?.forEach(t => teams.push({ name: t, dept: dept.name }));
      dept.groups.forEach(g => {
        g.teams.forEach(t => teams.push({ name: t, dept: dept.name, group: g.name }));
      });
    });
    return teams;
  }, [hierarchy]);

  // Get available managers
  const availableManagers = useMemo(() => 
    employees.filter(e => !e.isPotential),
    [employees]
  );

  const toggleDept = (name: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTeam = (teamName: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamName)) next.delete(teamName);
      else next.add(teamName);
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddDept = () => {
    if (newName.trim() && onAddDepartment) {
      onAddDepartment(newName.trim());
      setNewName('');
      setShowAddDeptDialog(false);
    }
  };

  const handleAddGroup = (dept: string) => {
    if (newName.trim() && onAddGroup) {
      onAddGroup(dept, newName.trim());
      setNewName('');
      setShowAddGroupDialog(null);
    }
  };

  const handleAddTeam = (dept: string, group: string | null) => {
    if (newName.trim() && onAddTeam) {
      onAddTeam(dept, group, newName.trim());
      setNewName('');
      setShowAddTeamDialog(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const employee = event.active.data.current?.employee as Employee;
    if (employee) {
      setDraggedEmployee(employee);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedEmployee(null);
    
    if (!over || !onMoveEmployeeToTeam) return;
    
    const employee = active.data.current?.employee as Employee;
    const dropData = over.data.current as { teamName: string; dept: string; group?: string } | undefined;
    
    if (employee && dropData && employee.team !== dropData.teamName) {
      onMoveEmployeeToTeam(employee.id, dropData.teamName, dropData.dept, dropData.group);
    }
  };

  const handleBulkMoveToTeam = (employeeIds: number[], teamName: string, dept: string, group?: string) => {
    if (!onMoveEmployeeToTeam) return;
    employeeIds.forEach(id => onMoveEmployeeToTeam(id, teamName, dept, group));
  };

  // Check if an employee is currently active (hired, not departed, not in training)
  const isCurrentlyActive = (emp: Employee) => {
    const today = new Date();
    const joinDate = new Date(emp.joined);
    if (joinDate > today) return false; // Not yet started
    
    // Check departure date
    if (emp.departureDate && new Date(emp.departureDate) <= today) return false;
    
    // Check departure events
    const hasDeparted = events.some(ev => 
      ev.empId === emp.id && ev.type === 'Departure' && new Date(ev.date) <= today
    );
    if (hasDeparted) return false;
    
    return true;
  };

  // Check if employee is in training period (Junior Dev, first 6 months)
  const isInTrainingPeriod = (emp: Employee) => {
    const today = new Date();
    const joinDate = new Date(emp.joined);
    const monthsOfExperience = (today.getTime() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    return monthsOfExperience < 6 && emp.role === 'Junior Dev';
  };

  // Auto-detect manager helper: prioritize currently active non-training manager,
  // fall back to most experienced if multiple are simultaneously active
  const autoDetectManager = (level: 'department' | 'group' | 'team', filters: { dept?: string; group?: string; team?: string }) => {
    let candidates = employees.filter(e => !e.isPotential && e.managerLevel === level);
    if (filters.dept) candidates = candidates.filter(e => e.dept === filters.dept);
    if (filters.group) candidates = candidates.filter(e => e.group === filters.group);
    if (filters.team) candidates = candidates.filter(e => e.team === filters.team);
    
    if (candidates.length === 0) return { manager: null, duplicates: false };

    // Separate into active and non-active
    const activeCandidates = candidates.filter(c => isCurrentlyActive(c));
    const activeNonTraining = activeCandidates.filter(c => !isInTrainingPeriod(c));

    let chosen: Employee;
    if (activeNonTraining.length >= 1) {
      // Prefer active non-training managers; if multiple, pick most experienced
      activeNonTraining.sort((a, b) => new Date(a.joined).getTime() - new Date(b.joined).getTime());
      chosen = activeNonTraining[0];
    } else if (activeCandidates.length >= 1) {
      // All active ones are in training, pick most experienced
      activeCandidates.sort((a, b) => new Date(a.joined).getTime() - new Date(b.joined).getTime());
      chosen = activeCandidates[0];
    } else {
      // No active candidates, pick the next upcoming one
      candidates.sort((a, b) => new Date(a.joined).getTime() - new Date(b.joined).getTime());
      chosen = candidates[0];
    }
    
    return { 
      manager: chosen, 
      duplicates: activeCandidates.length > 1,
      count: activeCandidates.length || candidates.length
    };
  };

  // Auto-detect team leader with same active-first logic
  const autoDetectTeamLeader = (teamName: string) => {
    const candidates = employees.filter(e => 
      !e.isPotential && e.team === teamName && (e.managerLevel === 'team' || e.role === 'Team Lead')
    );
    if (candidates.length === 0) return { leader: null, duplicates: false };

    const activeCandidates = candidates.filter(c => isCurrentlyActive(c));
    const activeNonTraining = activeCandidates.filter(c => !isInTrainingPeriod(c));

    let chosen: Employee;
    if (activeNonTraining.length >= 1) {
      activeNonTraining.sort((a, b) => new Date(a.joined).getTime() - new Date(b.joined).getTime());
      chosen = activeNonTraining[0];
    } else if (activeCandidates.length >= 1) {
      activeCandidates.sort((a, b) => new Date(a.joined).getTime() - new Date(b.joined).getTime());
      chosen = activeCandidates[0];
    } else {
      candidates.sort((a, b) => new Date(a.joined).getTime() - new Date(b.joined).getTime());
      chosen = candidates[0];
    }

    return { leader: chosen, duplicates: activeCandidates.length > 1, count: activeCandidates.length || candidates.length };
  };

  // Warning badge for duplicate managers
  const renderDuplicateWarning = (count: number, label: string) => (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 uppercase flex items-center gap-1">
      <AlertTriangle size={10} />
      {count} {label}s found
    </span>
  );

  const renderEmployeeRow = (emp: Employee, isLeader = false, enableDrag = true) => {
    const manager = emp.managerId ? employees.find(e => e.id === emp.managerId) : undefined;
    const diffInfo = employeeDiffMap?.get(emp.id);
    const diffStatus = diffInfo?.status;
    const isSelected = selectedIds.has(emp.id);
    
    // Calculate if employee is in training period (first 6 months)
    const today = new Date();
    const joinDate = new Date(emp.joined);
    const monthsOfExperience = (today.getTime() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    const isInTraining = monthsOfExperience < 6 && emp.role === 'Junior Dev';
    
    // Check if part-time
    const isPartTime = emp.workType === 'Part-Time';
    const partTimePercent = emp.partTimePercentage || 50;
    
    // Get capacity for tooltip
    const capacity = getCapacityWeight(emp.role, emp.joined, today, emp.workType, emp.partTimePercentage);

    const content = (
      <div 
        className={`flex-1 flex items-center justify-between p-4 group hover:bg-secondary/20 transition-colors ${
          emp.isPotential ? 'opacity-70 bg-potential-color/5' : ''
        } ${getDiffStyles(diffStatus)} ${isSelected ? 'bg-primary/10' : ''}`}
      >
        <div className="flex items-center gap-4">
          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(emp.id)}
            onClick={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          
          {/* Avatar with role color */}
          <div className={`relative w-10 h-10 rounded-lg ${getRoleColor(emp.role)} bg-opacity-20 flex items-center justify-center`}>
            <span className="font-bold text-sm">
              {emp.name.split(' ').map(n => n[0]).join('')}
            </span>
            {isLeader && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <Crown size={8} className="text-white" />
              </div>
            )}
            {emp.isPotential && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-potential-color rounded-full flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">?</span>
              </div>
            )}
            {isInTraining && !emp.isPotential && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                <GraduationCap size={8} className="text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground">{emp.name}</h4>
              {isLeader && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-500 uppercase">
                  Team Lead
                </span>
              )}
              {emp.isPotential && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-potential-color/20 text-potential-color uppercase">
                  Potential
                </span>
              )}
              {isInTraining && !emp.isPotential && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 uppercase flex items-center gap-1 cursor-help">
                        <GraduationCap size={10} />
                        Training
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">In training period (first 6 months) - 0.3x capacity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isPartTime && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-chart-4/20 text-chart-4 uppercase flex items-center gap-1 cursor-help">
                        <Clock size={10} />
                        {partTimePercent}%
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Part-time ({partTimePercent}% FTE) - Capacity: {capacity.toFixed(2)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {getDiffBadge(diffStatus, diffInfo?.changes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {emp.role}
              {manager && (
                <span className="ml-2 text-primary">
                  → Reports to {manager.name}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status */}
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide
            ${emp.status === 'Active' 
              ? 'bg-role-junior/10 text-role-junior' 
              : emp.status === 'On Course'
              ? 'bg-role-lead/10 text-role-lead'
              : emp.status === 'Parental Leave'
              ? 'bg-status-leave/10 text-status-leave'
              : 'bg-destructive/10 text-destructive'
            }`}
          >
            {emp.status}
          </span>

          {/* Date */}
          <span className="text-muted-foreground font-mono text-[10px] hidden sm:block">
            Since {formatDate(emp.joined)}
          </span>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => openPlannerForUser(emp.id, true)} 
              className="p-2 hover:bg-flag/10 text-flag rounded-lg transition-colors"
              title="Add Flag"
            >
              <Flag size={14}/>
            </button>
            <button 
              onClick={() => onEditEmployee(emp)} 
              className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={14}/>
            </button>
          </div>
        </div>
      </div>
    );

    if (enableDrag && onMoveEmployeeToTeam) {
      return (
        <DraggableEmployee key={emp.id} employee={emp}>
          {content}
        </DraggableEmployee>
      );
    }

    return <div key={emp.id}>{content}</div>;
  };

  if (employees.length === 0 && hierarchy.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No employees match your filters</p>
        {onAddDepartment && (
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setShowAddDeptDialog(true)}
          >
            <Plus size={16} className="mr-2" />
            Add Department
          </Button>
        )}
        {/* Add Department Dialog (must be inside early return) */}
        <Dialog open={showAddDeptDialog} onOpenChange={setShowAddDeptDialog}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle>Add Department</DialogTitle>
              <DialogDescription>Create a new department in your organization.</DialogDescription>
            </DialogHeader>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Department name"
              onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setNewName(''); setShowAddDeptDialog(false); }}>Cancel</Button>
              <Button onClick={handleAddDept}>Add Department</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 animate-fade-in">
        {/* Bulk Actions Bar */}
        {onBulkAssignManager && (
          <BulkActions
            employees={employees}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={() => setSelectedIds(new Set(employees.map(e => e.id)))}
            onClearSelection={() => setSelectedIds(new Set())}
            onBulkAssignManager={onBulkAssignManager}
            onBulkMoveToTeam={handleBulkMoveToTeam}
            availableManagers={availableManagers}
            availableTeams={availableTeams}
          />
        )}

        {/* Drag hint */}
        {onMoveEmployeeToTeam && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 p-2 bg-accent/30 rounded-lg">
            <GripVertical size={14} />
            <span>Drag employees between teams to move them</span>
          </div>
        )}

        {/* Hierarchy View */}
        {hierarchy.map(dept => {
          const isDeptExpanded = expandedDepts.has(dept.name);
          const allDeptTeams = getAllDeptTeams(dept);
          const deptEmployees = employees.filter(e => allDeptTeams.includes(e.team) || e.dept === dept.name);
          
          // Auto-detect department manager
          const { manager: deptManager, duplicates: deptDuplicates, count: deptManagerCount } = autoDetectManager('department', { dept: dept.name });

          return (
            <div key={dept.name} className="glass-card overflow-hidden">
              {/* Department Header */}
              <div 
                className="flex items-center gap-3 p-4 bg-primary/5 border-b border-border cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => toggleDept(dept.name)}
              >
                <button className="p-1 hover:bg-accent rounded">
                  {isDeptExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold">{dept.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {deptEmployees.length} employees • {dept.groups.length} groups • {allDeptTeams.length} teams
                    </span>
                    {deptDuplicates && renderDuplicateWarning(deptManagerCount!, 'Dept Manager')}
                  </div>
                  {deptManager && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Crown size={12} className="text-purple-500" />
                      {deptManager.name} (Department Manager)
                    </p>
                  )}
                </div>
                
                {/* Department Actions */}
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {onHireForTeam && (
                    <button
                      onClick={() => onHireForTeam({ dept: dept.name, team: dept.name, group: null })}
                      className="p-1.5 hover:bg-primary/10 rounded-lg text-primary hover:text-primary"
                      title="Hire for department"
                    >
                      <UserPlus size={14} />
                    </button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAddGroupDialog(dept.name)}
                    className="h-7 text-xs"
                  >
                    <Plus size={12} className="mr-1" />
                    Group
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAddTeamDialog({ dept: dept.name, group: null })}
                    className="h-7 text-xs"
                  >
                    <Plus size={12} className="mr-1" />
                    Direct Team
                  </Button>
                  {onDeleteDepartment && (
                    deleteConfirm?.type === 'dept' && deleteConfirm.dept === dept.name ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { onDeleteDepartment(dept.name); setDeleteConfirm(null); }}>
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setDeleteConfirm({ type: 'dept', dept: dept.name })}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )
                  )}
                </div>
              </div>

              {isDeptExpanded && (
                <div className="p-4 space-y-4">
                  {/* Department Manager Card (auto-detected) */}
                  {deptManager && (
                    <div className="border-l-4 border-l-purple-500 rounded-r-lg overflow-hidden">
                      {renderEmployeeRow(deptManager, false, false)}
                    </div>
                  )}
                  {!deptManager && (
                    <div className="p-3 bg-accent/20 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                      <Crown size={14} className="text-purple-500" />
                      No Department Manager assigned — hire or edit an employee and check "Department Manager"
                    </div>
                  )}

                  {/* Direct Teams */}
                  {dept.directTeams && dept.directTeams.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Users size={14} />
                        Direct Teams
                      </h4>
                      {dept.directTeams.map(teamName => {
                        const isTeamExpanded = expandedTeams.has(teamName);
                        const teamMembers = employees.filter(e => e.team === teamName);
                        const { leader: teamLeader, duplicates: leaderDuplicates, count: leaderCount } = autoDetectTeamLeader(teamName);
                        const structure = teamStructures.find(s => s.teamName === teamName);

                        const filteredTeamMembers = teamMembers.filter(e => 
                          e.managerLevel !== 'department' && e.managerLevel !== 'group'
                        );

                        return (
                          <DroppableTeam key={teamName} teamName={teamName} dept={dept.name}>
                            <div className="border border-border rounded-xl overflow-hidden">
                              <div 
                                className="flex items-center justify-between p-3 bg-accent/20 cursor-pointer hover:bg-accent/30"
                                onClick={() => toggleTeam(teamName)}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button className="p-0.5 hover:bg-accent rounded">
                                    {isTeamExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                  <Users size={14} className="text-green-500" />
                                  <span className="font-medium">{teamName}</span>
                                   <span className="text-xs text-muted-foreground">
                                     ({filteredTeamMembers.length}{structure?.targetSize ? `/${structure.targetSize}` : ''})
                                   </span>
                                   {structure && Object.keys(structure.requiredRoles).length > 0 && (() => {
                                     const targetSize = structure.targetSize || Object.values(structure.requiredRoles).reduce((a, b) => a + b, 0);
                                     const count = filteredTeamMembers.length;
                                     const isUnder = count < targetSize;
                                     const isOver = count > targetSize;
                                     return (
                                       <>
                                         <span className="text-xs text-muted-foreground hidden sm:inline">
                                           • {Object.entries(structure.requiredRoles).map(([r, c]) => `${c}×${r}`).join(', ')}
                                         </span>
                                         {isUnder && (
                                           <TooltipProvider>
                                             <Tooltip>
                                               <TooltipTrigger asChild>
                                                 <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/20 text-destructive uppercase flex items-center gap-1 cursor-help">
                                                   <AlertTriangle size={10} />
                                                   Understaffed ({targetSize - count})
                                                 </span>
                                               </TooltipTrigger>
                                               <TooltipContent>
                                                 <p className="text-xs">Team has {count} members but needs {targetSize}</p>
                                               </TooltipContent>
                                             </Tooltip>
                                           </TooltipProvider>
                                         )}
                                         {isOver && (
                                           <TooltipProvider>
                                             <Tooltip>
                                               <TooltipTrigger asChild>
                                                 <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 uppercase flex items-center gap-1 cursor-help">
                                                   <AlertTriangle size={10} />
                                                   Overstaffed (+{count - targetSize})
                                                 </span>
                                               </TooltipTrigger>
                                               <TooltipContent>
                                                 <p className="text-xs">Team has {count} members but target is {targetSize}</p>
                                               </TooltipContent>
                                             </Tooltip>
                                           </TooltipProvider>
                                         )}
                                       </>
                                     );
                                   })()}
                                   {teamLeader && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      • <Crown size={10} className="text-green-500" /> {teamLeader.name}
                                    </span>
                                  )}
                                  {leaderDuplicates && renderDuplicateWarning(leaderCount!, 'Team Lead')}
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  {onHireForTeam && (
                                    <button
                                      onClick={() => onHireForTeam({ dept: dept.name, team: teamName, group: null })}
                                      className="p-1.5 hover:bg-primary/10 rounded-lg text-primary hover:text-primary"
                                      title="Hire for this team"
                                    >
                                      <UserPlus size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onConfigureTeam(teamName, dept.name)}
                                    className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground"
                                    title="Configure team"
                                  >
                                    <Settings size={14} />
                                  </button>
                                  {onDeleteTeam && (
                                    deleteConfirm?.type === 'team' && deleteConfirm.team === teamName ? (
                                      <div className="flex items-center gap-1">
                                        <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => { onDeleteTeam(dept.name, null, teamName); setDeleteConfirm(null); }}>Yes</Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setDeleteConfirm(null)}>No</Button>
                                      </div>
                                    ) : (
                                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'team', dept: dept.name, group: null, team: teamName })} className="h-6 text-destructive hover:text-destructive">
                                        <Trash2 size={12} />
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                              {isTeamExpanded && (
                                <div className="divide-y divide-border">
                                  {filteredTeamMembers.length > 0 ? (
                                    filteredTeamMembers.map(emp => renderEmployeeRow(emp, emp.id === teamLeader?.id))
                                  ) : (
                                    <p className="p-4 text-sm text-muted-foreground italic">No team members - drag employees here</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </DroppableTeam>
                        );
                      })}
                    </div>
                  )}

                  {/* Groups */}
                  {dept.groups.map(group => {
                    const groupKey = `${dept.name}-${group.name}`;
                    const isGroupExpanded = expandedGroups.has(groupKey);
                    const { manager: groupManager, duplicates: groupDuplicates, count: groupManagerCount } = autoDetectManager('group', { dept: dept.name, group: group.name });
                    const groupEmployees = employees.filter(e => group.teams.includes(e.team));

                    return (
                      <div key={group.name} className="border border-border rounded-xl overflow-hidden">
                        {/* Group Header */}
                        <div 
                          className="flex items-center gap-3 p-3 bg-accent/30 cursor-pointer hover:bg-accent/50"
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <button className="p-0.5 hover:bg-accent rounded">
                            {isGroupExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <FolderTree size={16} className="text-blue-500" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{group.name}</h4>
                              <span className="text-xs text-muted-foreground">
                                {groupEmployees.length} employees • {group.teams.length} teams
                              </span>
                              {groupDuplicates && renderDuplicateWarning(groupManagerCount!, 'Group Manager')}
                            </div>
                            {groupManager && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Crown size={10} className="text-blue-500" />
                                {groupManager.name} (Group Manager)
                              </p>
                            )}
                          </div>
                          
                          {/* Group Actions */}
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {onHireForTeam && (
                              <button
                                onClick={() => onHireForTeam({ dept: dept.name, team: group.name, group: group.name })}
                                className="p-1 hover:bg-primary/10 rounded text-primary hover:text-primary"
                                title="Hire for this group"
                              >
                                <UserPlus size={12} />
                              </button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setShowAddTeamDialog({ dept: dept.name, group: group.name })}
                              className="h-6 text-[10px]"
                            >
                              <Plus size={10} className="mr-1" />
                              Team
                            </Button>
                            {onDeleteGroup && (
                              deleteConfirm?.type === 'group' && deleteConfirm.group === group.name ? (
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => { onDeleteGroup(dept.name, group.name); setDeleteConfirm(null); }}>Yes</Button>
                                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setDeleteConfirm(null)}>No</Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'group', dept: dept.name, group: group.name })} className="h-6 text-destructive hover:text-destructive">
                                  <Trash2 size={10} />
                                </Button>
                              )
                            )}
                          </div>
                        </div>

                        {isGroupExpanded && (
                          <div className="p-3 space-y-3">
                            {/* Group Manager Card (auto-detected) */}
                            {groupManager && (
                              <div className="border-l-4 border-l-blue-500 rounded-r-lg overflow-hidden">
                                {renderEmployeeRow(groupManager, false, false)}
                              </div>
                            )}

                            {/* Teams */}
                            {group.teams.map(teamName => {
                              const isTeamExpanded = expandedTeams.has(teamName);
                              const teamMembers = employees.filter(e => 
                                e.team === teamName && 
                                e.managerLevel !== 'group' && 
                                e.managerLevel !== 'department'
                              );
                              const structure = teamStructures.find(s => s.teamName === teamName);
                              const { leader: teamLeader, duplicates: leaderDuplicates, count: leaderCount } = autoDetectTeamLeader(teamName);

                              return (
                                <DroppableTeam key={teamName} teamName={teamName} dept={dept.name} group={group.name}>
                                  <div className="border border-border rounded-lg overflow-hidden">
                                    <div 
                                      className="flex items-center justify-between p-2 bg-background/50 cursor-pointer hover:bg-accent/20"
                                      onClick={() => toggleTeam(teamName)}
                                    >
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button className="p-0.5 hover:bg-accent rounded">
                                          {isTeamExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        </button>
                                        <Users size={12} className="text-green-500" />
                                        <span className="text-sm font-medium">{teamName}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          ({teamMembers.length}{structure?.targetSize ? `/${structure.targetSize}` : ''})
                                        </span>
                                        {structure && Object.keys(structure.requiredRoles).length > 0 && (
                                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                            • {Object.entries(structure.requiredRoles).map(([r, c]) => `${c}×${r}`).join(', ')}
                                          </span>
                                        )}
                                        {teamLeader && (
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            • <Crown size={8} className="text-green-500" /> {teamLeader.name}
                                          </span>
                                        )}
                                        {leaderDuplicates && renderDuplicateWarning(leaderCount!, 'Team Lead')}
                                      </div>
                                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        {onHireForTeam && (
                                          <button
                                            onClick={() => onHireForTeam({ dept: dept.name, team: teamName, group: group.name })}
                                            className="p-1 hover:bg-primary/10 rounded text-primary hover:text-primary"
                                            title="Hire for this team"
                                          >
                                            <UserPlus size={12} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => onConfigureTeam(teamName, dept.name)}
                                          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                                          title="Configure team"
                                        >
                                          <Settings size={12} />
                                        </button>
                                        {onDeleteTeam && (
                                          deleteConfirm?.type === 'team' && deleteConfirm.team === teamName ? (
                                            <div className="flex items-center gap-1">
                                              <Button size="sm" variant="destructive" className="h-5 text-[9px] px-1" onClick={() => { onDeleteTeam(dept.name, group.name, teamName); setDeleteConfirm(null); }}>Yes</Button>
                                              <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1" onClick={() => setDeleteConfirm(null)}>No</Button>
                                            </div>
                                          ) : (
                                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'team', dept: dept.name, group: group.name, team: teamName })} className="h-5 px-1 text-destructive hover:text-destructive">
                                              <Trash2 size={10} />
                                            </Button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                    {isTeamExpanded && (
                                      <div className="divide-y divide-border">
                                        {teamMembers.length > 0 ? (
                                          teamMembers.map(emp => renderEmployeeRow(emp, emp.id === teamLeader?.id))
                                        ) : (
                                          <p className="p-3 text-sm text-muted-foreground italic">No team members - drag employees here</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </DroppableTeam>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Department Button */}
        {onAddDepartment && (
          <Button 
            variant="outline" 
            className="w-full border-dashed"
            onClick={() => setShowAddDeptDialog(true)}
          >
            <Plus size={16} className="mr-2" />
            Add Department
          </Button>
        )}

        {/* Diff Legend */}
        {employeeDiffMap && employeeDiffMap.size > 0 && (
          <div className="flex items-center gap-4 text-xs p-4 bg-accent/30 rounded-xl">
            <span className="font-medium text-muted-foreground">Comparison Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span>Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span>Modified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded" />
              <span>Removed</span>
            </div>
          </div>
        )}

        {/* Add Department Dialog */}
        <Dialog open={showAddDeptDialog} onOpenChange={setShowAddDeptDialog}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle>Add Department</DialogTitle>
              <DialogDescription>Create a new department in your organization.</DialogDescription>
            </DialogHeader>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Department name"
              onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setNewName(''); setShowAddDeptDialog(false); }}>Cancel</Button>
              <Button onClick={handleAddDept}>Add Department</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Group Dialog */}
        <Dialog open={!!showAddGroupDialog} onOpenChange={(open) => !open && setShowAddGroupDialog(null)}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle>Add Group</DialogTitle>
              <DialogDescription>Create a new group in {showAddGroupDialog}.</DialogDescription>
            </DialogHeader>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              onKeyDown={(e) => e.key === 'Enter' && showAddGroupDialog && handleAddGroup(showAddGroupDialog)}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setNewName(''); setShowAddGroupDialog(null); }}>Cancel</Button>
              <Button onClick={() => showAddGroupDialog && handleAddGroup(showAddGroupDialog)}>Add Group</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Team Dialog */}
        <Dialog open={!!showAddTeamDialog} onOpenChange={(open) => !open && setShowAddTeamDialog(null)}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle>Add Team</DialogTitle>
              <DialogDescription>
                Create a new team {showAddTeamDialog?.group ? `in ${showAddTeamDialog.group}` : `directly under ${showAddTeamDialog?.dept}`}.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Team name"
              onKeyDown={(e) => e.key === 'Enter' && showAddTeamDialog && handleAddTeam(showAddTeamDialog.dept, showAddTeamDialog.group)}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setNewName(''); setShowAddTeamDialog(null); }}>Cancel</Button>
              <Button onClick={() => showAddTeamDialog && handleAddTeam(showAddTeamDialog.dept, showAddTeamDialog.group)}>Add Team</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedEmployee && (
          <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-xl opacity-90">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold">
                {draggedEmployee.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-semibold text-sm">{draggedEmployee.name}</p>
                <p className="text-xs text-muted-foreground">{draggedEmployee.role}</p>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};