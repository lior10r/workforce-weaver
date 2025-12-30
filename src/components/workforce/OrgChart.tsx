import { useState, useMemo, forwardRef } from 'react';
import { ChevronDown, ChevronRight, User, Users, Building2, FolderTree, Crown, Plus, Trash2, Settings } from 'lucide-react';
import { Employee, TeamStructure, HierarchyStructure, getAllDeptTeams } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface OrgChartProps {
  employees: Employee[];
  teamStructures: TeamStructure[];
  hierarchy: HierarchyStructure;
  onEditEmployee?: (employee: Employee) => void;
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

interface OrgNode {
  employee: Employee;
  directReports: OrgNode[];
}

export const OrgChart = forwardRef<HTMLDivElement, OrgChartProps>(({ 
  employees, 
  teamStructures, 
  hierarchy, 
  onEditEmployee,
  onAddDepartment,
  onAddGroup,
  onAddTeam,
  onDeleteDepartment,
  onDeleteGroup,
  onDeleteTeam,
  onSetDepartmentManager,
  onSetGroupManager,
  onSetTeamLeader
}, ref) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(hierarchy.map(d => d.name)));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'hierarchy' | 'structure' | 'team'>('structure');
  
  // Add dialogs state
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [showAddGroupDialog, setShowAddGroupDialog] = useState<string | null>(null);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState<{ dept: string; group: string | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'dept' | 'group' | 'team'; dept: string; group?: string | null; team?: string } | null>(null);

  // Build org tree from manager relationships
  const orgTree = useMemo(() => {
    const childrenMap = new Map<number | null, Employee[]>();
    
    employees.forEach(emp => {
      const managerId = emp.managerId || null;
      if (!childrenMap.has(managerId)) {
        childrenMap.set(managerId, []);
      }
      childrenMap.get(managerId)!.push(emp);
    });

    const buildNode = (employee: Employee): OrgNode => {
      const directReports = childrenMap.get(employee.id) || [];
      return {
        employee,
        directReports: directReports.map(buildNode).sort((a, b) => 
          a.employee.name.localeCompare(b.employee.name)
        )
      };
    };

    const rootEmployees = childrenMap.get(null) || [];
    return rootEmployees.map(buildNode).sort((a, b) => 
      a.employee.name.localeCompare(b.employee.name)
    );
  }, [employees]);

  // Group by team
  const teamGroups = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    employees.forEach(emp => {
      if (!groups[emp.team]) groups[emp.team] = [];
      groups[emp.team].push(emp);
    });
    return groups;
  }, [employees]);

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const expandAll = () => {
    setExpandedNodes(new Set(employees.map(e => e.id)));
    setExpandedDepts(new Set(hierarchy.map(d => d.name)));
    setExpandedGroups(new Set(hierarchy.flatMap(d => d.groups.map(g => `${d.name}-${g.name}`))));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
    setExpandedDepts(new Set());
    setExpandedGroups(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Course': return 'bg-emerald-500';
      case 'Training': return 'bg-amber-500';
      case 'Parental Leave': return 'bg-blue-500';
      case 'Notice Period': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getManagerBadge = (level: 'dept' | 'group' | 'team') => {
    const colors = {
      dept: 'bg-purple-500/20 text-purple-500',
      group: 'bg-blue-500/20 text-blue-500',
      team: 'bg-green-500/20 text-green-500'
    };
    const labels = {
      dept: 'Dept Manager',
      group: 'Group Manager',
      team: 'Team Lead'
    };
    return (
      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${colors[level]}`}>
        {labels[level]}
      </span>
    );
  };

  // Get employees eligible to be managers (for dropdowns)
  const getEligibleManagers = (deptName?: string, groupName?: string, teamName?: string) => {
    let eligible = employees.filter(e => !e.isPotential);
    if (deptName) {
      eligible = eligible.filter(e => e.dept === deptName);
    }
    if (groupName) {
      const dept = hierarchy.find(d => d.name === deptName);
      const group = dept?.groups.find(g => g.name === groupName);
      if (group) {
        eligible = eligible.filter(e => group.teams.includes(e.team));
      }
    }
    if (teamName) {
      eligible = eligible.filter(e => e.team === teamName);
    }
    return eligible;
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

  const renderEmployeeCard = (employee: Employee, managerLevel?: 'dept' | 'group' | 'team') => {
    const manager = employee.managerId ? employees.find(e => e.id === employee.managerId) : null;
    
    return (
      <TooltipProvider key={employee.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                ${employee.isPotential 
                  ? 'bg-potential-color/10 border-potential-color/30 border-dashed' 
                  : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                }
                ${managerLevel ? 'ring-2 ring-primary/20' : ''}
              `}
              onClick={() => onEditEmployee?.(employee)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${employee.isPotential ? 'bg-potential-color/20 text-potential-color' : 'bg-primary/10 text-primary'}`}>
                {employee.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{employee.name}</span>
                  {managerLevel && getManagerBadge(managerLevel)}
                  {employee.isPotential && (
                    <span className="text-[9px] bg-potential-color/20 text-potential-color px-1.5 py-0.5 rounded-full font-bold">
                      Potential
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{employee.role}</div>
                <div className="text-[10px] text-muted-foreground/70">{employee.team}</div>
              </div>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(employee.status)}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{employee.name}</p>
              <p className="text-xs text-muted-foreground">{employee.role} • {employee.team}</p>
              <p className="text-xs">Joined: {new Date(employee.joined).toLocaleDateString()}</p>
              {manager && (
                <p className="text-xs text-primary">Reports to: {manager.name}</p>
              )}
              <p className="text-xs">Status: {employee.status}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderOrgNode = (node: OrgNode, depth: number = 0) => {
    const hasReports = node.directReports.length > 0;
    const isExpanded = expandedNodes.has(node.employee.id);

    return (
      <div key={node.employee.id} className="relative">
        <div className="flex items-start gap-2">
          {hasReports && (
            <button
              onClick={() => toggleNode(node.employee.id)}
              className="mt-3 p-1 hover:bg-accent rounded transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasReports && <div className="w-6" />}
          
          <div className="flex-1">
            {renderEmployeeCard(node.employee)}
          </div>
        </div>

        {hasReports && isExpanded && (
          <div className="ml-8 mt-2 pl-4 border-l-2 border-border space-y-2">
            {node.directReports.map(child => renderOrgNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Manager assignment dropdown
  const renderManagerSelect = (
    label: string, 
    currentManagerId: number | undefined, 
    eligibleEmployees: Employee[], 
    onSelect: (id: number | null) => void
  ) => (
    <div className="flex items-center gap-2">
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

  // Structure View: Department → Group → Team with managers and management controls
  const renderStructureView = () => (
    <div className="space-y-6">
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
                  <div className="p-3 bg-accent/30 rounded-lg">
                    {renderManagerSelect('Department Manager', dept.departmentManagerId, eligibleDeptManagers, (id) => onSetDepartmentManager(dept.name, id))}
                  </div>
                )}

                {/* Department Manager Card */}
                {deptManager && (
                  <div className="mb-4">
                    {renderEmployeeCard(deptManager, 'dept')}
                  </div>
                )}

                {/* Direct Teams (under department) */}
                {dept.directTeams && dept.directTeams.length > 0 && (
                  <div className="mb-4 p-4 bg-accent/30 rounded-xl">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Users size={14} />
                      Direct Teams
                    </h4>
                    <div className="space-y-4">
                      {dept.directTeams.map(teamName => {
                        const teamMembers = employees.filter(e => e.team === teamName);
                        const structure = teamStructures.find(s => s.teamName === teamName);
                        const teamLeader = structure?.teamLeader ? employees.find(e => e.id === structure.teamLeader) : null;
                        const eligibleLeaders = getEligibleManagers(dept.name, undefined, teamName);

                        return (
                          <div key={teamName} className="bg-background/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Users size={12} className="text-primary" />
                                <span className="text-sm font-medium">{teamName}</span>
                                <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {onSetTeamLeader && renderManagerSelect('Team Lead', structure?.teamLeader, eligibleLeaders, (id) => onSetTeamLeader(teamName, id))}
                                {onDeleteTeam && (
                                  deleteConfirm?.type === 'team' && deleteConfirm.team === teamName ? (
                                    <div className="flex items-center gap-1">
                                      <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => { onDeleteTeam(dept.name, null, teamName); setDeleteConfirm(null); }}>
                                        Yes
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setDeleteConfirm(null)}>
                                        No
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setDeleteConfirm({ type: 'team', dept: dept.name, group: null, team: teamName })}
                                      className="h-6 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 size={10} />
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {teamLeader && renderEmployeeCard(teamLeader, 'team')}
                              {teamMembers.filter(m => m.id !== teamLeader?.id).map(emp => renderEmployeeCard(emp))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Groups */}
                {dept.groups.map(group => {
                  const groupKey = `${dept.name}-${group.name}`;
                  const isGroupExpanded = expandedGroups.has(groupKey);
                  const groupManager = group.groupManagerId ? employees.find(e => e.id === group.groupManagerId) : null;
                  const groupTeamMembers = employees.filter(e => group.teams.includes(e.team));
                  const eligibleGroupManagers = getEligibleManagers(dept.name, group.name);

                  return (
                    <div key={group.name} className="border border-border rounded-xl overflow-hidden">
                      {/* Group Header */}
                      <div 
                        className="flex items-center gap-3 p-3 bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors"
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
                              {groupTeamMembers.length} employees • {group.teams.length} teams
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
                                <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => { onDeleteGroup(dept.name, group.name); setDeleteConfirm(null); }}>
                                  Yes
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setDeleteConfirm(null)}>
                                  No
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteConfirm({ type: 'group', dept: dept.name, group: group.name })}
                                className="h-6 text-destructive hover:text-destructive"
                              >
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
                            <div className="p-2 bg-accent/20 rounded-lg">
                              {renderManagerSelect('Group Manager', group.groupManagerId, eligibleGroupManagers, (id) => onSetGroupManager(dept.name, group.name, id))}
                            </div>
                          )}

                          {/* Group Manager Card */}
                          {groupManager && (
                            <div className="mb-2">
                              {renderEmployeeCard(groupManager, 'group')}
                            </div>
                          )}

                          {/* Teams in Group */}
                          {group.teams.map(teamName => {
                            const teamMembers = employees.filter(e => e.team === teamName);
                            const structure = teamStructures.find(s => s.teamName === teamName);
                            const teamLeader = structure?.teamLeader ? employees.find(e => e.id === structure.teamLeader) : null;
                            const eligibleLeaders = getEligibleManagers(dept.name, group.name, teamName);

                            return (
                              <div key={teamName} className="bg-background/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Users size={12} className="text-green-500" />
                                    <span className="text-sm font-medium">{teamName}</span>
                                    <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                                    {teamLeader && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        • <Crown size={8} className="text-green-500" /> {teamLeader.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {onSetTeamLeader && renderManagerSelect('Team Lead', structure?.teamLeader, eligibleLeaders, (id) => onSetTeamLeader(teamName, id))}
                                    {onDeleteTeam && (
                                      deleteConfirm?.type === 'team' && deleteConfirm.team === teamName ? (
                                        <div className="flex items-center gap-1">
                                          <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => { onDeleteTeam(dept.name, group.name, teamName); setDeleteConfirm(null); }}>
                                            Yes
                                          </Button>
                                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setDeleteConfirm(null)}>
                                            No
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => setDeleteConfirm({ type: 'team', dept: dept.name, group: group.name, team: teamName })}
                                          className="h-6 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 size={10} />
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {teamLeader && renderEmployeeCard(teamLeader, 'team')}
                                  {teamMembers.filter(m => m.id !== teamLeader?.id).map(emp => renderEmployeeCard(emp))}
                                  {teamMembers.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic col-span-full">No team members</p>
                                  )}
                                </div>
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
    </div>
  );

  const renderTeamView = () => (
    <div className="space-y-6">
      {Object.entries(teamGroups).map(([team, emps]) => {
        const structure = teamStructures.find(s => s.teamName === team);
        const leader = structure?.teamLeader ? employees.find(e => e.id === structure.teamLeader) : null;
        
        return (
          <div key={team} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{team}</h3>
                <p className="text-xs text-muted-foreground">
                  {emps.length} members
                  {leader && ` • Led by ${leader.name}`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {emps.sort((a, b) => {
                if (structure?.teamLeader === a.id) return -1;
                if (structure?.teamLeader === b.id) return 1;
                return a.name.localeCompare(b.name);
              }).map(emp => {
                const isLeader = structure?.teamLeader === emp.id;
                return renderEmployeeCard(emp, isLeader ? 'team' : undefined);
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderHierarchyView = () => (
    <div className="space-y-4">
      {orgTree.length > 0 ? (
        orgTree.map(node => renderOrgNode(node))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No employees with defined reporting structure
        </div>
      )}
      
      {/* Unassigned employees */}
      {(() => {
        const assignedIds = new Set<number>();
        const collectIds = (nodes: OrgNode[]) => {
          nodes.forEach(n => {
            assignedIds.add(n.employee.id);
            collectIds(n.directReports);
          });
        };
        collectIds(orgTree);
        
        const unassigned = employees.filter(e => !assignedIds.has(e.id) && !e.managerId);
        if (unassigned.length === 0) return null;
        
        return (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Unassigned (No Manager)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {unassigned.map(emp => renderEmployeeCard(emp))}
            </div>
          </div>
        );
      })()}
    </div>
  );

  return (
    <div ref={ref} className="glass-card p-6 animate-fade-in">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">View:</span>
          <div className="flex bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('structure')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'structure' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 size={12} className="inline mr-1.5" />
              Structure
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'hierarchy' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={12} className="inline mr-1.5" />
              Reporting
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'team' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={12} className="inline mr-1.5" />
              Teams
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-primary" />
          <span className="text-sm font-medium">{employees.length} Employees</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-purple-500" />
          <span className="text-sm font-medium">{hierarchy.length} Departments</span>
        </div>
        <div className="flex items-center gap-2">
          <FolderTree size={14} className="text-blue-500" />
          <span className="text-sm font-medium">{hierarchy.reduce((sum, d) => sum + d.groups.length, 0)} Groups</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} className="text-green-500" />
          <span className="text-sm font-medium">{Object.keys(teamGroups).length} Teams</span>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'structure' && renderStructureView()}
      {viewMode === 'hierarchy' && renderHierarchyView()}
      {viewMode === 'team' && renderTeamView()}

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
});

OrgChart.displayName = 'OrgChart';
