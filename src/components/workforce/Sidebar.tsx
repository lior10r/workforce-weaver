import { TrendingUp, Users, Calendar, UserCheck, ArrowRightLeft, LucideIcon } from 'lucide-react';
import { GROUPS, DEPARTMENTS, Hierarchy } from '@/lib/workforce-data';

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
}

export const Sidebar = ({ view, setView, hierarchy, setHierarchy }: SidebarProps) => {
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
      </nav>

      {/* Scope Filter */}
      <div className="mt-auto p-4 bg-accent/50 rounded-2xl border border-border">
        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-3 tracking-widest">Scope Filter</p>
        <div className="space-y-2">
          <select 
            className="select-field w-full text-xs"
            value={hierarchy.group}
            onChange={(e) => setHierarchy({ group: e.target.value, dept: 'All', team: 'All' })}
          >
            {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select 
            className="select-field w-full text-xs"
            value={hierarchy.dept}
            onChange={(e) => setHierarchy({ ...hierarchy, dept: e.target.value, team: 'All' })}
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS[hierarchy.group]?.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </aside>
  );
};
