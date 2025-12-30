import { TrendingUp, Users, Calendar, UserCheck, ArrowRightLeft, BarChart3, Plus, ChevronDown, ChevronRight, GitBranch, Trash2, FolderTree } from 'lucide-react';
import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { HierarchyStructure, GroupStructure } from '@/lib/workforce-data';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

interface ScopeFilter {
  departments: string[];
  groups: string[];
  teams: string[];
}

interface SidebarProps {
  view: string;
  setView: (view: string) => void;
  scopeFilter: ScopeFilter;
  setScopeFilter: (filter: ScopeFilter) => void;
  hierarchy: HierarchyStructure;
  onAddDepartment: (name: string) => void;
  onAddGroup: (dept: string, groupName: string) => void;
  onAddTeam: (dept: string, groupName: string, teamName: string) => void;
  onDeleteDepartment?: (dept: string) => void;
  onDeleteGroup?: (dept: string, groupName: string) => void;
  onDeleteTeam?: (dept: string, groupName: string, teamName: string) => void;
}

export const Sidebar = ({ 
  view, 
  setView, 
  scopeFilter, 
  setScopeFilter,
  hierarchy,
  onAddDepartment,
  onAddGroup,
  onAddTeam,
  onDeleteDepartment,
  onDeleteGroup,
  onDeleteTeam
}: SidebarProps) => {
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState<string | null>(null);
  const [showAddTeam, setShowAddTeam] = useState<{ dept: string; group: string } | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'dept' | 'group' | 'team'; dept: string; group?: string; team?: string } | null>(null);

  const handleAddDept = () => {
    if (newDeptName.trim()) {
      onAddDepartment(newDeptName.trim());
      setNewDeptName('');
      setShowAddDept(false);
    }
  };

  const handleAddGroup = (dept: string) => {
    if (newGroupName.trim()) {
      onAddGroup(dept, newGroupName.trim());
      setNewGroupName('');
      setShowAddGroup(null);
    }
  };

  const handleAddTeam = (dept: string, group: string) => {
    if (newTeamName.trim()) {
      onAddTeam(dept, group, newTeamName.trim());
      setNewTeamName('');
      setShowAddTeam(null);
    }
  };

  const toggleDeptExpanded = (dept: string) => {
    setExpandedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) ? prev.filter(g => g !== groupKey) : [...prev, groupKey]
    );
  };

  // Get all teams in a department
  const getDeptTeams = (dept: { name: string; groups: GroupStructure[] }): string[] => {
    const teams: string[] = [];
    dept.groups.forEach(g => teams.push(...g.teams));
    return teams;
  };

  // Get all groups in a department
  const getDeptGroups = (dept: { name: string; groups: GroupStructure[] }): string[] => {
    return dept.groups.map(g => g.name);
  };

  const handleDeptCheckbox = (deptName: string, checked: boolean) => {
    const dept = hierarchy.find(d => d.name === deptName);
    if (!dept) return;
    
    const deptTeams = getDeptTeams(dept);
    const deptGroups = getDeptGroups(dept);
    
    if (checked) {
      setScopeFilter({
        departments: [...scopeFilter.departments.filter(d => d !== deptName), deptName],
        groups: [...scopeFilter.groups.filter(g => !deptGroups.includes(g)), ...deptGroups],
        teams: [...scopeFilter.teams.filter(t => !deptTeams.includes(t)), ...deptTeams]
      });
    } else {
      setScopeFilter({
        departments: scopeFilter.departments.filter(d => d !== deptName),
        groups: scopeFilter.groups.filter(g => !deptGroups.includes(g)),
        teams: scopeFilter.teams.filter(t => !deptTeams.includes(t))
      });
    }
  };

  const handleGroupCheckbox = (deptName: string, groupName: string, checked: boolean) => {
    const dept = hierarchy.find(d => d.name === deptName);
    const group = dept?.groups.find(g => g.name === groupName);
    if (!group) return;
    
    const groupTeams = group.teams;
    const deptGroups = getDeptGroups(dept!);
    
    let newTeams: string[];
    let newGroups: string[];
    
    if (checked) {
      newTeams = [...scopeFilter.teams.filter(t => !groupTeams.includes(t)), ...groupTeams];
      newGroups = [...scopeFilter.groups.filter(g => g !== groupName), groupName];
    } else {
      newTeams = scopeFilter.teams.filter(t => !groupTeams.includes(t));
      newGroups = scopeFilter.groups.filter(g => g !== groupName);
    }
    
    // Update dept checkbox state
    const allGroupsChecked = deptGroups.every(g => newGroups.includes(g));
    const newDepts = allGroupsChecked 
      ? [...scopeFilter.departments.filter(d => d !== deptName), deptName]
      : scopeFilter.departments.filter(d => d !== deptName);
    
    setScopeFilter({ departments: newDepts, groups: newGroups, teams: newTeams });
  };

  const handleTeamCheckbox = (deptName: string, groupName: string, team: string, checked: boolean) => {
    const dept = hierarchy.find(d => d.name === deptName);
    const group = dept?.groups.find(g => g.name === groupName);
    if (!group) return;
    
    let newTeams: string[];
    
    if (checked) {
      newTeams = [...scopeFilter.teams, team];
    } else {
      newTeams = scopeFilter.teams.filter(t => t !== team);
    }
    
    // Update group checkbox state
    const allTeamsInGroupChecked = group.teams.every(t => newTeams.includes(t));
    let newGroups = allTeamsInGroupChecked 
      ? [...scopeFilter.groups.filter(g => g !== groupName), groupName]
      : scopeFilter.groups.filter(g => g !== groupName);
    
    // Update dept checkbox state
    const deptGroups = getDeptGroups(dept!);
    const allGroupsChecked = deptGroups.every(g => newGroups.includes(g));
    const newDepts = allGroupsChecked 
      ? [...scopeFilter.departments.filter(d => d !== deptName), deptName]
      : scopeFilter.departments.filter(d => d !== deptName);

    setScopeFilter({ departments: newDepts, groups: newGroups, teams: newTeams });
  };

  const selectAll = () => {
    const allDepts = hierarchy.map(d => d.name);
    const allGroups: string[] = [];
    const allTeams: string[] = [];
    hierarchy.forEach(d => {
      d.groups.forEach(g => {
        allGroups.push(g.name);
        allTeams.push(...g.teams);
      });
    });
    setScopeFilter({ departments: allDepts, groups: allGroups, teams: allTeams });
  };

  const clearAll = () => {
    setScopeFilter({ departments: [], groups: [], teams: [] });
  };

  const allSelected = hierarchy.every(d => scopeFilter.departments.includes(d.name));

  return (
    <aside className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="bg-gradient-to-br from-primary to-primary/70 p-2.5 rounded-xl shadow-lg shadow-primary/20">
          <TrendingUp size={22} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">WORKFORCE</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Strategy Planner</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <SidebarItem 
          icon={Users} 
          label="Operations Center" 
          active={view === 'dashboard'} 
          onClick={() => setView('dashboard')} 
        />
        <SidebarItem 
          icon={Calendar} 
          label="Strategic Timeline" 
          active={view === 'timeline'} 
          onClick={() => setView('timeline')} 
        />
        <SidebarItem 
          icon={UserCheck} 
          label="Team Roster" 
          active={view === 'roster'} 
          onClick={() => setView('roster')} 
        />
        <SidebarItem 
          icon={ArrowRightLeft} 
          label="Movement Planner" 
          active={view === 'planner'} 
          onClick={() => setView('planner')} 
        />
        <SidebarItem 
          icon={GitBranch} 
          label="Org Chart" 
          active={view === 'orgchart'} 
          onClick={() => setView('orgchart')} 
        />
        <SidebarItem 
          icon={BarChart3} 
          label="Team Analytics" 
          active={view === 'analytics'} 
          onClick={() => setView('analytics')} 
        />
      </nav>

      {/* Scope Filter - 3-Level Hierarchy */}
      <div className="mt-auto p-4 bg-accent/50 rounded-2xl border border-border max-h-80 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Scope Filter</p>
          <div className="flex gap-1">
            <button 
              onClick={selectAll}
              className="text-[9px] text-primary hover:underline"
            >
              All
            </button>
            <span className="text-muted-foreground text-[9px]">/</span>
            <button 
              onClick={clearAll}
              className="text-[9px] text-muted-foreground hover:underline"
            >
              None
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {hierarchy.map(dept => {
            const isDeptExpanded = expandedDepts.includes(dept.name);
            const isDeptChecked = scopeFilter.departments.includes(dept.name);
            const deptTeams = getDeptTeams(dept);
            const someTeamsChecked = deptTeams.some(t => scopeFilter.teams.includes(t));
            const isIndeterminate = someTeamsChecked && !isDeptChecked;

            return (
              <div key={dept.name} className="space-y-1">
                {/* Department Row */}
                <div className="flex items-center gap-2 py-1 px-1 hover:bg-accent/50 rounded-lg transition-colors group">
                  <button
                    onClick={() => toggleDeptExpanded(dept.name)}
                    className="p-0.5 hover:bg-accent rounded transition-colors"
                  >
                    {isDeptExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <Checkbox 
                    id={`dept-${dept.name}`}
                    checked={isDeptChecked}
                    data-state={isIndeterminate ? 'indeterminate' : isDeptChecked ? 'checked' : 'unchecked'}
                    onCheckedChange={(checked) => handleDeptCheckbox(dept.name, checked as boolean)}
                    className="h-3.5 w-3.5"
                  />
                  <label 
                    htmlFor={`dept-${dept.name}`}
                    className="text-xs font-semibold text-foreground cursor-pointer flex-1 truncate"
                  >
                    {dept.name}
                  </label>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddGroup(showAddGroup === dept.name ? null : dept.name);
                      }}
                      className="p-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                      title="Add Group"
                    >
                      <Plus size={10} />
                    </button>
                    {onDeleteDepartment && (
                      deleteConfirm?.type === 'dept' && deleteConfirm.dept === dept.name ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDepartment(dept.name);
                              setDeleteConfirm(null);
                            }}
                            className="p-1 bg-destructive text-destructive-foreground rounded text-[9px] font-bold"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(null);
                            }}
                            className="p-1 bg-muted text-muted-foreground rounded text-[9px]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ type: 'dept', dept: dept.name });
                          }}
                          className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                          title="Delete Department"
                        >
                          <Trash2 size={10} />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Add Group Input */}
                {showAddGroup === dept.name && (
                  <div className="flex gap-1 ml-5 mt-1 animate-fade-in">
                    <input 
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      className="input-field flex-1 text-[10px] py-1 px-2"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddGroup(dept.name)}
                      autoFocus
                    />
                    <button onClick={() => handleAddGroup(dept.name)} className="btn-primary py-1 px-2 text-[10px]">
                      Add
                    </button>
                  </div>
                )}

                {/* Groups */}
                {isDeptExpanded && (
                  <div className="ml-5 space-y-0.5 animate-fade-in">
                    {dept.groups.map(group => {
                      const groupKey = `${dept.name}-${group.name}`;
                      const isGroupExpanded = expandedGroups.includes(groupKey);
                      const isGroupChecked = scopeFilter.groups.includes(group.name);
                      const someGroupTeamsChecked = group.teams.some(t => scopeFilter.teams.includes(t));
                      const isGroupIndeterminate = someGroupTeamsChecked && !isGroupChecked;

                      return (
                        <div key={group.name} className="space-y-0.5">
                          {/* Group Row */}
                          <div className="flex items-center gap-2 py-0.5 px-1 hover:bg-accent/30 rounded transition-colors group/group">
                            <button
                              onClick={() => toggleGroupExpanded(groupKey)}
                              className="p-0.5 hover:bg-accent rounded transition-colors"
                            >
                              {isGroupExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            </button>
                            <Checkbox 
                              id={`group-${groupKey}`}
                              checked={isGroupChecked}
                              data-state={isGroupIndeterminate ? 'indeterminate' : isGroupChecked ? 'checked' : 'unchecked'}
                              onCheckedChange={(checked) => handleGroupCheckbox(dept.name, group.name, checked as boolean)}
                              className="h-3 w-3"
                            />
                            <FolderTree size={10} className="text-muted-foreground" />
                            <label 
                              htmlFor={`group-${groupKey}`}
                              className="text-[11px] text-muted-foreground cursor-pointer truncate flex-1 font-medium"
                            >
                              {group.name}
                            </label>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/group:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAddTeam(showAddTeam?.dept === dept.name && showAddTeam?.group === group.name ? null : { dept: dept.name, group: group.name });
                                }}
                                className="p-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                                title="Add Team"
                              >
                                <Plus size={8} />
                              </button>
                              {onDeleteGroup && (
                                deleteConfirm?.type === 'group' && deleteConfirm.dept === dept.name && deleteConfirm.group === group.name ? (
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteGroup(dept.name, group.name);
                                        setDeleteConfirm(null);
                                      }}
                                      className="p-0.5 bg-destructive text-destructive-foreground rounded text-[8px] font-bold"
                                    >
                                      Yes
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm(null);
                                      }}
                                      className="p-0.5 bg-muted text-muted-foreground rounded text-[8px]"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm({ type: 'group', dept: dept.name, group: group.name });
                                    }}
                                    className="p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-all"
                                    title="Delete Group"
                                  >
                                    <Trash2 size={8} />
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Add Team Input */}
                          {showAddTeam?.dept === dept.name && showAddTeam?.group === group.name && (
                            <div className="flex gap-1 ml-6 mt-0.5 animate-fade-in">
                              <input 
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                placeholder="Team name"
                                className="input-field flex-1 text-[9px] py-0.5 px-1.5"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam(dept.name, group.name)}
                                autoFocus
                              />
                              <button onClick={() => handleAddTeam(dept.name, group.name)} className="btn-primary py-0.5 px-1.5 text-[9px]">
                                Add
                              </button>
                            </div>
                          )}

                          {/* Teams */}
                          {isGroupExpanded && (
                            <div className="ml-6 space-y-0 animate-fade-in">
                              {group.teams.map(team => (
                                <div key={team} className="flex items-center gap-2 py-0.5 px-1 hover:bg-accent/20 rounded transition-colors group/team">
                                  <Checkbox 
                                    id={`team-${team}`}
                                    checked={scopeFilter.teams.includes(team)}
                                    onCheckedChange={(checked) => handleTeamCheckbox(dept.name, group.name, team, checked as boolean)}
                                    className="h-2.5 w-2.5"
                                  />
                                  <Users size={8} className="text-muted-foreground/60" />
                                  <label 
                                    htmlFor={`team-${team}`}
                                    className="text-[10px] text-muted-foreground/80 cursor-pointer truncate flex-1"
                                  >
                                    {team}
                                  </label>
                                  {onDeleteTeam && (
                                    deleteConfirm?.type === 'team' && deleteConfirm.dept === dept.name && deleteConfirm.group === group.name && deleteConfirm.team === team ? (
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteTeam(dept.name, group.name, team);
                                            setDeleteConfirm(null);
                                          }}
                                          className="p-0.5 bg-destructive text-destructive-foreground rounded text-[7px] font-bold"
                                        >
                                          Yes
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm(null);
                                          }}
                                          className="p-0.5 bg-muted text-muted-foreground rounded text-[7px]"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirm({ type: 'team', dept: dept.name, group: group.name, team });
                                        }}
                                        className="p-0.5 opacity-0 group-hover/team:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-all"
                                        title="Delete Team"
                                      >
                                        <Trash2 size={8} />
                                      </button>
                                    )
                                  )}
                                </div>
                              ))}
                              {group.teams.length === 0 && (
                                <p className="text-[9px] text-muted-foreground/50 italic ml-4 py-1">No teams</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dept.groups.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/50 italic ml-4 py-1">No groups</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Department */}
        <div className="mt-3 pt-3 border-t border-border">
          {showAddDept ? (
            <div className="flex gap-1 animate-fade-in">
              <input 
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Department name"
                className="input-field flex-1 text-xs py-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
                autoFocus
              />
              <button onClick={handleAddDept} className="btn-primary py-1.5 px-2 text-xs">
                Add
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAddDept(true)}
              className="flex items-center gap-2 text-xs text-primary hover:underline w-full"
            >
              <Plus size={12} />
              Add Department
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
