import { TrendingUp, Users, Calendar, UserCheck, ArrowRightLeft, BarChart3, Plus, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { DEPARTMENTS, DEPARTMENT_NAMES } from '@/lib/workforce-data';
import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
  teams: string[];
}

interface SidebarProps {
  view: string;
  setView: (view: string) => void;
  scopeFilter: ScopeFilter;
  setScopeFilter: (filter: ScopeFilter) => void;
  departments: Record<string, string[]>;
  onAddDepartment: (name: string) => void;
  onAddTeam: (dept: string, teamName: string) => void;
}

export const Sidebar = ({ 
  view, 
  setView, 
  scopeFilter, 
  setScopeFilter,
  departments,
  onAddDepartment,
  onAddTeam
}: SidebarProps) => {
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

  const handleAddDept = () => {
    if (newDeptName.trim()) {
      onAddDepartment(newDeptName.trim());
      setNewDeptName('');
      setShowAddDept(false);
    }
  };

  const handleAddTeam = (dept: string) => {
    if (newTeamName.trim()) {
      onAddTeam(dept, newTeamName.trim());
      setNewTeamName('');
      setShowAddTeam(null);
    }
  };

  const toggleDeptExpanded = (dept: string) => {
    setExpandedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleDeptCheckbox = (dept: string, checked: boolean) => {
    const deptTeams = departments[dept] || [];
    if (checked) {
      setScopeFilter({
        departments: [...scopeFilter.departments, dept],
        teams: [...scopeFilter.teams, ...deptTeams.filter(t => !scopeFilter.teams.includes(t))]
      });
    } else {
      setScopeFilter({
        departments: scopeFilter.departments.filter(d => d !== dept),
        teams: scopeFilter.teams.filter(t => !deptTeams.includes(t))
      });
    }
  };

  const handleTeamCheckbox = (dept: string, team: string, checked: boolean) => {
    const deptTeams = departments[dept] || [];
    let newTeams: string[];
    let newDepts: string[];

    if (checked) {
      newTeams = [...scopeFilter.teams, team];
      // If all teams in dept are now checked, add dept
      const allTeamsChecked = deptTeams.every(t => newTeams.includes(t));
      newDepts = allTeamsChecked 
        ? [...scopeFilter.departments.filter(d => d !== dept), dept]
        : scopeFilter.departments.filter(d => d !== dept);
    } else {
      newTeams = scopeFilter.teams.filter(t => t !== team);
      // Remove dept from checked
      newDepts = scopeFilter.departments.filter(d => d !== dept);
    }

    setScopeFilter({ departments: newDepts, teams: newTeams });
  };

  const selectAll = () => {
    const allDepts = Object.keys(departments);
    const allTeams = Object.values(departments).flat();
    setScopeFilter({ departments: allDepts, teams: allTeams });
  };

  const clearAll = () => {
    setScopeFilter({ departments: [], teams: [] });
  };

  const deptList = Object.keys(departments);
  const allSelected = deptList.every(d => scopeFilter.departments.includes(d));

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

      {/* Scope Filter - Checkbox based */}
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
          {deptList.map(dept => {
            const deptTeams = departments[dept] || [];
            const isExpanded = expandedDepts.includes(dept);
            const isDeptChecked = scopeFilter.departments.includes(dept);
            const someTeamsChecked = deptTeams.some(t => scopeFilter.teams.includes(t));
            const isIndeterminate = someTeamsChecked && !isDeptChecked;

            return (
              <div key={dept} className="space-y-1">
                {/* Department Row */}
                <div className="flex items-center gap-2 py-1 px-1 hover:bg-accent/50 rounded-lg transition-colors">
                  <button
                    onClick={() => toggleDeptExpanded(dept)}
                    className="p-0.5 hover:bg-accent rounded transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <Checkbox 
                    id={`dept-${dept}`}
                    checked={isDeptChecked}
                    data-state={isIndeterminate ? 'indeterminate' : isDeptChecked ? 'checked' : 'unchecked'}
                    onCheckedChange={(checked) => handleDeptCheckbox(dept, checked as boolean)}
                    className="h-3.5 w-3.5"
                  />
                  <label 
                    htmlFor={`dept-${dept}`}
                    className="text-xs font-semibold text-foreground cursor-pointer flex-1 truncate"
                  >
                    {dept}
                  </label>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddTeam(showAddTeam === dept ? null : dept);
                    }}
                    className="p-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Add Team"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                {/* Teams */}
                {isExpanded && (
                  <div className="ml-5 space-y-0.5 animate-fade-in">
                    {deptTeams.map(team => (
                      <div key={team} className="flex items-center gap-2 py-0.5 px-1 hover:bg-accent/30 rounded transition-colors">
                        <Checkbox 
                          id={`team-${team}`}
                          checked={scopeFilter.teams.includes(team)}
                          onCheckedChange={(checked) => handleTeamCheckbox(dept, team, checked as boolean)}
                          className="h-3 w-3"
                        />
                        <label 
                          htmlFor={`team-${team}`}
                          className="text-[11px] text-muted-foreground cursor-pointer truncate flex-1"
                        >
                          {team}
                        </label>
                      </div>
                    ))}
                    
                    {/* Add Team Input */}
                    {showAddTeam === dept && (
                      <div className="flex gap-1 mt-1 animate-fade-in">
                        <input 
                          type="text"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="Team name"
                          className="input-field flex-1 text-[10px] py-1 px-2"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTeam(dept)}
                          autoFocus
                        />
                        <button onClick={() => handleAddTeam(dept)} className="btn-primary py-1 px-2 text-[10px]">
                          Add
                        </button>
                      </div>
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
