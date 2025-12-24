import { TrendingUp, Users, Calendar, UserCheck, ArrowRightLeft, BarChart3, Plus } from 'lucide-react';
import { DEPARTMENTS, DEPARTMENT_NAMES, Hierarchy } from '@/lib/workforce-data';
import { useState } from 'react';
import { LucideIcon } from 'lucide-react';

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

interface SidebarProps {
  view: string;
  setView: (view: string) => void;
  hierarchy: Hierarchy;
  setHierarchy: (hierarchy: Hierarchy) => void;
  departments: Record<string, string[]>;
  onAddDepartment: (name: string) => void;
  onAddTeam: (dept: string, teamName: string) => void;
}

export const Sidebar = ({ 
  view, 
  setView, 
  hierarchy, 
  setHierarchy,
  departments,
  onAddDepartment,
  onAddTeam
}: SidebarProps) => {
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');

  const handleAddDept = () => {
    if (newDeptName.trim()) {
      onAddDepartment(newDeptName.trim());
      setNewDeptName('');
      setShowAddDept(false);
    }
  };

  const handleAddTeam = () => {
    if (newTeamName.trim() && hierarchy.dept !== 'All') {
      onAddTeam(hierarchy.dept, newTeamName.trim());
      setNewTeamName('');
      setShowAddTeam(false);
    }
  };

  const deptList = Object.keys(departments);

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
      </nav>

      {/* Scope Filter */}
      <div className="mt-auto p-4 bg-accent/50 rounded-2xl border border-border">
        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-3 tracking-widest">Scope Filter</p>
        <div className="space-y-2">
          {/* Department Select */}
          <div className="flex gap-1">
            <select 
              className="select-field flex-1 text-xs"
              value={hierarchy.dept}
              onChange={(e) => setHierarchy({ dept: e.target.value, team: 'All' })}
            >
              <option value="All">All Departments</option>
              {deptList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button 
              onClick={() => setShowAddDept(!showAddDept)}
              className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
              title="Add Department"
            >
              <Plus size={14} />
            </button>
          </div>
          
          {showAddDept && (
            <div className="flex gap-1 animate-fade-in">
              <input 
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Department name"
                className="input-field flex-1 text-xs py-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
              />
              <button onClick={handleAddDept} className="btn-primary py-1.5 px-2 text-xs">
                Add
              </button>
            </div>
          )}

          {/* Team Select */}
          <div className="flex gap-1">
            <select 
              className="select-field flex-1 text-xs"
              value={hierarchy.team}
              onChange={(e) => setHierarchy({ ...hierarchy, team: e.target.value })}
              disabled={hierarchy.dept === 'All'}
            >
              <option value="All">All Teams</option>
              {hierarchy.dept !== 'All' && departments[hierarchy.dept]?.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button 
              onClick={() => setShowAddTeam(!showAddTeam)}
              className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add Team"
              disabled={hierarchy.dept === 'All'}
            >
              <Plus size={14} />
            </button>
          </div>

          {showAddTeam && hierarchy.dept !== 'All' && (
            <div className="flex gap-1 animate-fade-in">
              <input 
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                className="input-field flex-1 text-xs py-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
              />
              <button onClick={handleAddTeam} className="btn-primary py-1.5 px-2 text-xs">
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
