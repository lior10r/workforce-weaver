import { TrendingUp, Users, Calendar, UserCheck, ArrowRightLeft, BarChart3, ChevronDown, ChevronRight, FolderTree, Settings, ClipboardList, FileBarChart, UserX } from 'lucide-react';
import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { HierarchyStructure, GroupStructure } from '@/lib/workforce-data';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
  setScopeFilter: (filter: ScopeFilter | ((prev: ScopeFilter) => ScopeFilter)) => void;
  hierarchy: HierarchyStructure;
  showDeparted: boolean;
  setShowDeparted: (show: boolean) => void;
}

export const Sidebar = ({ 
  view, 
  setView, 
  scopeFilter, 
  setScopeFilter,
  hierarchy,
  showDeparted,
  setShowDeparted,
}: SidebarProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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

  const getDeptTeams = (dept: { name: string; groups: GroupStructure[]; directTeams?: string[] }): string[] => {
    const teams: string[] = [...(dept.directTeams || [])];
    dept.groups.forEach(g => teams.push(...g.teams));
    return teams;
  };

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
    const allGroupsChecked = deptGroups.every(g => newGroups.includes(g));
    const newDepts = allGroupsChecked 
      ? [...scopeFilter.departments.filter(d => d !== deptName), deptName]
      : scopeFilter.departments.filter(d => d !== deptName);
    setScopeFilter({ departments: newDepts, groups: newGroups, teams: newTeams });
  };

  const handleTeamCheckbox = (deptName: string, groupName: string | null, team: string, checked: boolean) => {
    const dept = hierarchy.find(d => d.name === deptName);
    if (!dept) return;
    let newTeams: string[];
    if (checked) {
      newTeams = [...scopeFilter.teams, team];
    } else {
      newTeams = scopeFilter.teams.filter(t => t !== team);
    }
    if (groupName) {
      const group = dept.groups.find(g => g.name === groupName);
      if (!group) return;
      const allTeamsInGroupChecked = group.teams.every(t => newTeams.includes(t));
      let newGroups = allTeamsInGroupChecked 
        ? [...scopeFilter.groups.filter(g => g !== groupName), groupName]
        : scopeFilter.groups.filter(g => g !== groupName);
      const deptGroups = getDeptGroups(dept);
      const allGroupsChecked = deptGroups.every(g => newGroups.includes(g));
      const newDepts = allGroupsChecked 
        ? [...scopeFilter.departments.filter(d => d !== deptName), deptName]
        : scopeFilter.departments.filter(d => d !== deptName);
      setScopeFilter({ departments: newDepts, groups: newGroups, teams: newTeams });
    } else {
      setScopeFilter(prev => ({ ...prev, teams: newTeams }));
    }
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
      if (d.directTeams) allTeams.push(...d.directTeams);
    });
    setScopeFilter({ departments: allDepts, groups: allGroups, teams: allTeams });
  };

  const clearAll = () => {
    setScopeFilter({ departments: [], groups: [], teams: [] });
  };


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
          icon={BarChart3} 
          label="Team Analytics" 
          active={view === 'analytics'} 
          onClick={() => setView('analytics')} 
        />
        <SidebarItem 
          icon={FileBarChart} 
          label="Reports" 
          active={view === 'reports'} 
          onClick={() => setView('reports')} 
        />
        
        {/* Admin-only items */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <SidebarItem 
              icon={ClipboardList} 
              label="Activity Log" 
              active={view === 'audit'} 
              onClick={() => setView('audit')} 
            />
            <SidebarItem 
              icon={Settings} 
              label="User Management" 
              active={false} 
              onClick={() => navigate('/users')} 
            />
          </div>
        )}
      </nav>

      {/* Show Departed */}
      <div className="mt-auto" />
      <div className="p-3 bg-accent/50 rounded-xl border border-border">
        <button
          onClick={() => setShowDeparted(!showDeparted)}
          className="flex items-center gap-2 w-full text-left"
        >
          <div className={`w-8 h-4 rounded-full transition-colors relative ${showDeparted ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-foreground transition-transform ${showDeparted ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <UserX size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Show departed</span>
        </button>
      </div>

      {/* Scope Filter */}
      <div className="mt-3 p-4 bg-accent/50 rounded-2xl border border-border max-h-80 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Scope Filter</p>
          <div className="flex gap-1">
            <button onClick={selectAll} className="text-[9px] text-primary hover:underline">All</button>
            <span className="text-muted-foreground text-[9px]">/</span>
            <button onClick={clearAll} className="text-[9px] text-muted-foreground hover:underline">None</button>
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
                <div className="flex items-center gap-2 py-1 px-1 hover:bg-accent/50 rounded-lg transition-colors">
                  <button onClick={() => toggleDeptExpanded(dept.name)} className="p-0.5 hover:bg-accent rounded transition-colors">
                    {isDeptExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <Checkbox 
                    id={`dept-${dept.name}`}
                    checked={isDeptChecked}
                    data-state={isIndeterminate ? 'indeterminate' : isDeptChecked ? 'checked' : 'unchecked'}
                    onCheckedChange={(checked) => handleDeptCheckbox(dept.name, checked as boolean)}
                    className="h-3.5 w-3.5"
                  />
                  <label htmlFor={`dept-${dept.name}`} className="text-xs font-semibold text-foreground cursor-pointer flex-1 truncate">
                    {dept.name}
                  </label>
                </div>

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
                          <div className="flex items-center gap-2 py-0.5 px-1 hover:bg-accent/30 rounded transition-colors">
                            <button onClick={() => toggleGroupExpanded(groupKey)} className="p-0.5 hover:bg-accent rounded transition-colors">
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
                            <label htmlFor={`group-${groupKey}`} className="text-[11px] text-muted-foreground cursor-pointer truncate flex-1 font-medium">
                              {group.name}
                            </label>
                          </div>

                          {isGroupExpanded && (
                            <div className="ml-6 space-y-0 animate-fade-in">
                              {group.teams.map(team => (
                                <div key={team} className="flex items-center gap-2 py-0.5 px-1 hover:bg-accent/20 rounded transition-colors">
                                  <Checkbox 
                                    id={`team-${team}`}
                                    checked={scopeFilter.teams.includes(team)}
                                    onCheckedChange={(checked) => handleTeamCheckbox(dept.name, group.name, team, checked as boolean)}
                                    className="h-2.5 w-2.5"
                                  />
                                  <Users size={8} className="text-muted-foreground/60" />
                                  <label htmlFor={`team-${team}`} className="text-[10px] text-muted-foreground/80 cursor-pointer truncate flex-1">
                                    {team}
                                  </label>
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
                    
                    {dept.directTeams && dept.directTeams.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-border/30">
                        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1 ml-1">Direct Teams</p>
                        {dept.directTeams.map(team => (
                          <div key={team} className="flex items-center gap-2 py-0.5 px-1 hover:bg-accent/20 rounded transition-colors">
                            <Checkbox 
                              id={`dteam-${team}`}
                              checked={scopeFilter.teams.includes(team)}
                              onCheckedChange={(checked) => handleTeamCheckbox(dept.name, null, team, checked as boolean)}
                              className="h-2.5 w-2.5"
                            />
                            <Users size={8} className="text-primary/60" />
                            <label htmlFor={`dteam-${team}`} className="text-[10px] text-muted-foreground/80 cursor-pointer truncate flex-1">
                              {team}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {dept.groups.length === 0 && (!dept.directTeams || dept.directTeams.length === 0) && (
                      <p className="text-[10px] text-muted-foreground/50 italic ml-4 py-1">No groups or teams</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
