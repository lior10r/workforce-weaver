import { useState, useMemo } from 'react';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { Sidebar } from '@/components/workforce/Sidebar';
import { StatsCards } from '@/components/workforce/StatsCards';
import { Dashboard } from '@/components/workforce/Dashboard';
import { Timeline } from '@/components/workforce/Timeline';
import { Roster } from '@/components/workforce/Roster';
import { Planner } from '@/components/workforce/Planner';
import { TeamAnalytics } from '@/components/workforce/TeamAnalytics';
import { EmployeeModal } from '@/components/workforce/EmployeeModal';
import { EventModal } from '@/components/workforce/EventModal';
import { TeamStructureModal } from '@/components/workforce/TeamStructureModal';
import { 
  Employee, 
  WorkforceEvent, 
  Hierarchy, 
  TeamStructure,
  initialEmployees, 
  initialEvents,
  initialTeamStructures,
  DEPARTMENTS
} from '@/lib/workforce-data';

interface ScopeFilter {
  departments: string[];
  teams: string[];
}

const Index = () => {
  // State
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(() => {
    const allDepts = Object.keys(DEPARTMENTS);
    const allTeams = Object.values(DEPARTMENTS).flat();
    return { departments: allDepts, teams: allTeams };
  });
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [events, setEvents] = useState<WorkforceEvent[]>(initialEvents);
  const [teamStructures, setTeamStructures] = useState<TeamStructure[]>(initialTeamStructures);
  const [view, setView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<Record<string, string[]>>(DEPARTMENTS);
  
  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTeamStructureModalOpen, setIsTeamStructureModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingTeamStructure, setEditingTeamStructure] = useState<{ teamName: string; department: string } | null>(null);
  const [eventPrefill, setEventPrefill] = useState<{ empId: number | string; isFlag: boolean }>({ empId: '', isFlag: false });

  // Legacy hierarchy for compatibility with some components
  const hierarchy: Hierarchy = useMemo(() => {
    const selectedDepts = scopeFilter.departments;
    const selectedTeams = scopeFilter.teams;
    
    if (selectedDepts.length === Object.keys(departments).length) {
      return { dept: 'All', team: 'All' };
    } else if (selectedDepts.length === 1) {
      const dept = selectedDepts[0];
      const deptTeams = departments[dept] || [];
      const selectedDeptTeams = selectedTeams.filter(t => deptTeams.includes(t));
      if (selectedDeptTeams.length === deptTeams.length) {
        return { dept, team: 'All' };
      } else if (selectedDeptTeams.length === 1) {
        return { dept, team: selectedDeptTeams[0] };
      }
      return { dept, team: 'All' };
    }
    return { dept: 'All', team: 'All' };
  }, [scopeFilter, departments]);

  // Filtered employees based on scope filter
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTeam = scopeFilter.teams.includes(e.team);
      return matchSearch && matchTeam;
    });
  }, [employees, searchQuery, scopeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredEmployees.length,
    onCourse: filteredEmployees.filter(e => e.status === 'On Course' || e.status === 'Parental Leave').length,
    flags: events.filter(ev => ev.isFlag).length,
    upcomingChanges: events.filter(e => new Date(e.date) > new Date()).length
  }), [filteredEmployees, events]);

  // Handlers
  const handleAddDepartment = (name: string) => {
    if (!departments[name]) {
      setDepartments(prev => ({ ...prev, [name]: [] }));
    }
  };

  const handleAddTeam = (dept: string, teamName: string) => {
    if (departments[dept] && !departments[dept].includes(teamName)) {
      setDepartments(prev => ({
        ...prev,
        [dept]: [...prev[dept], teamName]
      }));
      // Auto-select new team
      setScopeFilter(prev => ({
        ...prev,
        teams: [...prev.teams, teamName]
      }));
    }
  };

  const handleAddEmployee = (employeeData: Omit<Employee, 'id'>, id?: number) => {
    if (id) {
      // Edit existing
      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...employeeData, id } : emp
      ));
    } else {
      // Add new
      const newId = Date.now();
      const departureDate = new Date(employeeData.joined);
      departureDate.setFullYear(departureDate.getFullYear() + 6);
      
      setEmployees(prev => [...prev, { ...employeeData, id: newId }]);
      
      // Auto-create 6-year departure event
      setEvents(prev => [...prev, {
        id: Date.now() + 1,
        empId: newId,
        type: 'Departure',
        date: departureDate.toISOString().split('T')[0],
        details: 'Standard 6-year rotation cycle',
        isFlag: false
      }]);
    }
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const handleAddEvent = (eventData: { empId: number; type: string; date: string; details: string; isFlag: boolean; targetTeam?: string; endDate?: string }) => {
    setEvents(prev => [...prev, { ...eventData, id: Date.now() }]);
    setIsEventModalOpen(false);
  };

  const openPlannerForUser = (empId: number, asFlag = false) => {
    setEventPrefill({ empId, isFlag: asFlag });
    setIsEventModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEmployeeModalOpen(true);
  };

  const handleConfigureTeam = (teamName: string, department: string) => {
    setEditingTeamStructure({ teamName, department });
    setIsTeamStructureModalOpen(true);
  };

  const handleSaveTeamStructure = (structure: TeamStructure) => {
    setTeamStructures(prev => {
      const existing = prev.findIndex(s => s.teamName === structure.teamName);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = structure;
        return updated;
      }
      return [...prev, structure];
    });
    setIsTeamStructureModalOpen(false);
    setEditingTeamStructure(null);
  };

  const getViewTitle = () => {
    switch (view) {
      case 'dashboard': return 'Operations Center';
      case 'timeline': return 'Strategic Roadmap';
      case 'roster': return 'Department Directory';
      case 'planner': return 'Strategic Movements';
      case 'analytics': return 'Team Analytics';
      default: return 'Operations Center';
    }
  };

  // Get display text for scope
  const getScopeDisplay = () => {
    const selectedDeptCount = scopeFilter.departments.length;
    const totalDepts = Object.keys(departments).length;
    
    if (selectedDeptCount === totalDepts) {
      return 'All Departments';
    } else if (selectedDeptCount === 1) {
      return scopeFilter.departments[0];
    } else if (selectedDeptCount > 1) {
      return `${selectedDeptCount} Departments`;
    }
    return 'No Selection';
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        view={view} 
        setView={setView} 
        scopeFilter={scopeFilter}
        setScopeFilter={setScopeFilter}
        departments={departments}
        onAddDepartment={handleAddDepartment}
        onAddTeam={handleAddTeam}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin p-8 lg:p-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-2">
            <span>{getScopeDisplay()}</span>
            {scopeFilter.teams.length < Object.values(departments).flat().length && (
              <>
                <ChevronRight size={10} />
                <span>{scopeFilter.teams.length} Teams</span>
              </>
            )}
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {getViewTitle()}
            </h2>
            
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Search personnel..." 
                  className="input-field pl-10 w-full lg:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }}
                className="btn-primary whitespace-nowrap"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Hire</span>
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Views */}
        {view === 'dashboard' && (
          <Dashboard 
            employees={filteredEmployees} 
            events={events} 
            hierarchy={hierarchy}
            setHierarchy={() => {}}
            departments={departments}
          />
        )}

        {view === 'timeline' && (
          <Timeline 
            employees={filteredEmployees} 
            events={events}
            openPlannerForUser={openPlannerForUser}
            allEmployees={employees}
            selectedTeam={hierarchy.team}
            selectedDept={hierarchy.dept}
            teamStructures={teamStructures}
          />
        )}

        {view === 'roster' && (
          <Roster 
            employees={filteredEmployees}
            openPlannerForUser={openPlannerForUser}
            onEditEmployee={handleEditEmployee}
            teamStructures={teamStructures}
            onConfigureTeam={handleConfigureTeam}
          />
        )}

        {view === 'planner' && (
          <Planner 
            employees={employees}
            events={events}
            onAddMovement={() => {
              setEventPrefill({ empId: employees[0]?.id || '', isFlag: false });
              setIsEventModalOpen(true);
            }}
          />
        )}

        {view === 'analytics' && (
          <TeamAnalytics
            employees={employees}
            events={events}
            selectedTeam={hierarchy.team}
            departments={departments}
          />
        )}
      </main>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => { setIsEmployeeModalOpen(false); setEditingEmployee(null); }}
        onSubmit={handleAddEmployee}
        editingEmployee={editingEmployee}
        hierarchy={hierarchy}
        departments={departments}
        employees={employees}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={handleAddEvent}
        employees={employees}
        prefill={eventPrefill}
        departments={departments}
      />

      <TeamStructureModal
        isOpen={isTeamStructureModalOpen}
        onClose={() => { setIsTeamStructureModalOpen(false); setEditingTeamStructure(null); }}
        onSubmit={handleSaveTeamStructure}
        teamStructure={teamStructures.find(s => s.teamName === editingTeamStructure?.teamName)}
        teamName={editingTeamStructure?.teamName || ''}
        department={editingTeamStructure?.department || ''}
        employees={employees}
      />
    </div>
  );
};

export default Index;
