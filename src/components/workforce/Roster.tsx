import { useState } from 'react';
import { Flag, Edit2, Settings, Users, ChevronDown, ChevronRight, AlertTriangle, Plus, Minus, Edit3, Crown, Building2, FolderTree, Trash2 } from 'lucide-react';
import { Employee, TeamStructure, getRoleColor, formatDate, DiffStatus, HierarchyStructure, getAllDeptTeams } from '@/lib/workforce-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RosterProps {
  employees: Employee[];
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
  onSetDepartmentManager?: (dept: string, managerId: number | null) => void;
  onSetGroupManager?: (dept: string, groupName: string, managerId: number | null) => void;
  onSetTeamLeader?: (teamName: string, leaderId: number | null) => void;
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

export const Roster = ({ 
  employees, 
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
  onSetDepartmentManager,
  onSetGroupManager,
  onSetTeamLeader
}: RosterProps) => {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(hierarchy.map(d => d.name)));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [showAddGroupDialog, setShowAddGroupDialog] = useState<string | null>(null);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState<{ dept: string; group: string | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'dept' | 'group' | 'team'; dept: string; group?: string | null; team?: string } | null>(null);

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

  // Get employees eligible to be managers
  const getEligibleManagers = (deptName?: string, groupTeams?: string[], teamName?: string) => {
    let eligible = employees.filter(e => !e.isPotential);
    if (deptName) {
      eligible = eligible.filter(e => e.dept === deptName);
    }
    if (groupTeams) {
      eligible = eligible.filter(e => groupTeams.includes(e.team));
    }
    if (teamName) {
      eligible = eligible.filter(e => e.team === teamName);
    }
    return eligible;
  };

  // Manager assignment dropdown
  const renderManagerSelect = (
    label: string, 
    currentManagerId: number | undefined, 
    eligibleEmployees: Employee[], 
    onSelect: (id: number | null) => void
  ) => (
    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
      <Crown size={12} className="text-muted-foreground" />
      <Select
        value={currentManagerId?.toString() || 'none'}
        onValueChange={(val) => onSelect(val === 'none' ? null : parseInt(val))}
      >
        <SelectTrigger className="h-7 text-xs w-48">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border z-50">
          <SelectItem value="none">No {label}</SelectItem>
          {eligibleEmployees.map(emp => (
            <SelectItem key={emp.id} value={emp.id.toString()}>
              {emp.name} - {emp.role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderEmployeeRow = (emp: Employee, isLeader = false) => {
    const manager = emp.managerId ? employees.find(e => e.id === emp.managerId) : undefined;
    const diffInfo = employeeDiffMap?.get(emp.id);
    const diffStatus = diffInfo?.status;

    return (
      <div 
        key={emp.id}
        className={`flex items-center justify-between p-4 group hover:bg-secondary/20 transition-colors ${
          emp.isPotential ? 'opacity-70 bg-potential-color/5' : ''
        } ${getDiffStyles(diffStatus)}`}
      >
        <div className="flex items-center gap-4">
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
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
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
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Hierarchy View */}
      {hierarchy.map(dept => {
        const isDeptExpanded = expandedDepts.has(dept.name);
        const deptManager = dept.departmentManagerId ? employees.find(e => e.id === dept.departmentManagerId) : null;
        const allDeptTeams = getAllDeptTeams(dept);
        const deptEmployees = employees.filter(e => allDeptTeams.includes(e.team) || e.dept === dept.name);
        const eligibleDeptManagers = getEligibleManagers(dept.name);

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
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{dept.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {deptEmployees.length} employees • {dept.groups.length} groups • {allDeptTeams.length} teams
                  </span>
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
                {/* Department Manager Selector */}
                {onSetDepartmentManager && (
                  <div className="p-3 bg-accent/30 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Department Manager</span>
                    {renderManagerSelect('Manager', dept.departmentManagerId, eligibleDeptManagers, (id) => onSetDepartmentManager(dept.name, id))}
                  </div>
                )}

                {/* Department Manager Card */}
                {deptManager && (
                  <div className="border-l-4 border-l-purple-500 rounded-r-lg overflow-hidden">
                    {renderEmployeeRow(deptManager)}
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
                      const structure = teamStructures.find(s => s.teamName === teamName);
                      const teamLeader = structure?.teamLeader ? employees.find(e => e.id === structure.teamLeader) : null;
                      const eligibleLeaders = getEligibleManagers(dept.name, undefined, teamName);

                      return (
                        <div key={teamName} className="border border-border rounded-xl overflow-hidden">
                          <div 
                            className="flex items-center justify-between p-3 bg-accent/20 cursor-pointer hover:bg-accent/30"
                            onClick={() => toggleTeam(teamName)}
                          >
                            <div className="flex items-center gap-2">
                              <button className="p-0.5 hover:bg-accent rounded">
                                {isTeamExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              <Users size={14} className="text-green-500" />
                              <span className="font-medium">{teamName}</span>
                              <span className="text-xs text-muted-foreground">({teamMembers.length})</span>
                              {teamLeader && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  • <Crown size={10} className="text-green-500" /> {teamLeader.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              {onSetTeamLeader && renderManagerSelect('Lead', structure?.teamLeader, eligibleLeaders, (id) => onSetTeamLeader(teamName, id))}
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
                              {teamMembers.length > 0 ? (
                                teamMembers.map(emp => renderEmployeeRow(emp, emp.id === structure?.teamLeader))
                              ) : (
                                <p className="p-4 text-sm text-muted-foreground italic">No team members</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Groups */}
                {dept.groups.map(group => {
                  const groupKey = `${dept.name}-${group.name}`;
                  const isGroupExpanded = expandedGroups.has(groupKey);
                  const groupManager = group.groupManagerId ? employees.find(e => e.id === group.groupManagerId) : null;
                  const groupEmployees = employees.filter(e => group.teams.includes(e.team));
                  const eligibleGroupManagers = getEligibleManagers(dept.name, group.teams);

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
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{group.name}</h4>
                            <span className="text-xs text-muted-foreground">
                              {groupEmployees.length} employees • {group.teams.length} teams
                            </span>
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
                          {/* Group Manager Selector */}
                          {onSetGroupManager && (
                            <div className="p-2 bg-accent/20 rounded-lg flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">Group Manager</span>
                              {renderManagerSelect('Manager', group.groupManagerId, eligibleGroupManagers, (id) => onSetGroupManager(dept.name, group.name, id))}
                            </div>
                          )}

                          {/* Group Manager Card */}
                          {groupManager && (
                            <div className="border-l-4 border-l-blue-500 rounded-r-lg overflow-hidden">
                              {renderEmployeeRow(groupManager)}
                            </div>
                          )}

                          {/* Teams */}
                          {group.teams.map(teamName => {
                            const isTeamExpanded = expandedTeams.has(teamName);
                            const teamMembers = employees.filter(e => e.team === teamName);
                            const structure = teamStructures.find(s => s.teamName === teamName);
                            const teamLeader = structure?.teamLeader ? employees.find(e => e.id === structure.teamLeader) : null;
                            const eligibleLeaders = getEligibleManagers(dept.name, group.teams, teamName);

                            return (
                              <div key={teamName} className="border border-border rounded-lg overflow-hidden">
                                <div 
                                  className="flex items-center justify-between p-2 bg-background/50 cursor-pointer hover:bg-accent/20"
                                  onClick={() => toggleTeam(teamName)}
                                >
                                  <div className="flex items-center gap-2">
                                    <button className="p-0.5 hover:bg-accent rounded">
                                      {isTeamExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </button>
                                    <Users size={12} className="text-green-500" />
                                    <span className="text-sm font-medium">{teamName}</span>
                                    <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                                    {teamLeader && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        • <Crown size={8} className="text-green-500" /> {teamLeader.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {onSetTeamLeader && renderManagerSelect('Lead', structure?.teamLeader, eligibleLeaders, (id) => onSetTeamLeader(teamName, id))}
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
                                      teamMembers.map(emp => renderEmployeeRow(emp, emp.id === structure?.teamLeader))
                                    ) : (
                                      <p className="p-3 text-sm text-muted-foreground italic">No team members</p>
                                    )}
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
  );
};
