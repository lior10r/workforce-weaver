import { useState, useMemo, useRef } from 'react';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { Sidebar } from '@/components/workforce/Sidebar';
import { StatsCards } from '@/components/workforce/StatsCards';
import { Dashboard } from '@/components/workforce/Dashboard';
import { Timeline } from '@/components/workforce/Timeline';
import { Roster } from '@/components/workforce/Roster';
import { Planner } from '@/components/workforce/Planner';
import { TeamAnalytics } from '@/components/workforce/TeamAnalytics';
import { OrgChart } from '@/components/workforce/OrgChart';
import { EmployeeModal } from '@/components/workforce/EmployeeModal';
import { EventModal } from '@/components/workforce/EventModal';
import { TeamStructureModal } from '@/components/workforce/TeamStructureModal';
import { ExportImport } from '@/components/workforce/ExportImport';
import { ScenarioManager } from '@/components/workforce/ScenarioManager';
import { 
  Employee, 
  WorkforceEvent, 
  Hierarchy, 
  TeamStructure,
  Scenario,
  initialEmployees, 
  initialEvents,
  initialTeamStructures,
  DEPARTMENTS,
  getScenarioEmployees,
  getScenarioEvents
} from '@/lib/workforce-data';

interface ScopeFilter {
  departments: string[];
  teams: string[];
}

const Index = () => {
  // Master Plan State (source of truth)
  const [masterEmployees, setMasterEmployees] = useState<Employee[]>(initialEmployees);
  const [masterEvents, setMasterEvents] = useState<WorkforceEvent[]>(initialEvents);
  const [masterTeamStructures, setMasterTeamStructures] = useState<TeamStructure[]>(initialTeamStructures);
  
  // Scenario State
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [compareScenarioId, setCompareScenarioId] = useState<string | null>(null);

  // Get the active scenario if one is selected
  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  // Computed: Get effective employees/events based on active scenario or master
  const employees = useMemo(() => {
    if (activeScenario) {
      return getScenarioEmployees(activeScenario);
    }
    return masterEmployees;
  }, [activeScenario, masterEmployees]);

  const events = useMemo(() => {
    if (activeScenario) {
      return getScenarioEvents(activeScenario);
    }
    return masterEvents;
  }, [activeScenario, masterEvents]);

  const teamStructures = useMemo(() => {
    if (activeScenario) {
      return activeScenario.baseTeamStructures;
    }
    return masterTeamStructures;
  }, [activeScenario, masterTeamStructures]);

  // Other state
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(() => {
    const allDepts = Object.keys(DEPARTMENTS);
    const allTeams = Object.values(DEPARTMENTS).flat();
    return { departments: allDepts, teams: allTeams };
  });
  const [view, setView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const orgChartRef = useRef<HTMLDivElement>(null);
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
      setScopeFilter(prev => ({
        ...prev,
        teams: [...prev.teams, teamName]
      }));
    }
  };

  const handleAddEmployee = (employeeData: Omit<Employee, 'id'>, id?: number) => {
    const newId = id || Date.now();
    const newEmployee = { ...employeeData, id: newId };
    
    if (activeScenario) {
      // Add to scenario's proposed employees
      setScenarios(prev => prev.map(s => {
        if (s.id !== activeScenarioId) return s;
        const existingIdx = s.proposedEmployees.findIndex(e => e.id === newId);
        if (existingIdx >= 0) {
          const updated = [...s.proposedEmployees];
          updated[existingIdx] = newEmployee;
          return { ...s, proposedEmployees: updated, updatedAt: new Date().toISOString() };
        }
        return { 
          ...s, 
          proposedEmployees: [...s.proposedEmployees, newEmployee],
          updatedAt: new Date().toISOString()
        };
      }));
    } else {
      // Add to master
      if (id) {
        setMasterEmployees(prev => prev.map(emp => 
          emp.id === id ? newEmployee : emp
        ));
      } else {
        const departureDate = new Date(employeeData.joined);
        departureDate.setFullYear(departureDate.getFullYear() + 6);
        
        setMasterEmployees(prev => [...prev, newEmployee]);
        setMasterEvents(prev => [...prev, {
          id: Date.now() + 1,
          empId: newId,
          type: 'Departure',
          date: departureDate.toISOString().split('T')[0],
          details: 'Standard 6-year rotation cycle',
          isFlag: false
        }]);
      }
    }
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const handleAddEvent = (eventData: { empId: number; type: string; date: string; details: string; isFlag: boolean; targetTeam?: string; endDate?: string }) => {
    const newEvent = { ...eventData, id: Date.now() };
    
    if (activeScenario) {
      setScenarios(prev => prev.map(s => {
        if (s.id !== activeScenarioId) return s;
        return { 
          ...s, 
          proposedEvents: [...s.proposedEvents, newEvent],
          updatedAt: new Date().toISOString()
        };
      }));
    } else {
      setMasterEvents(prev => [...prev, newEvent]);
    }
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
    if (activeScenario) {
      // For now, team structures are read-only in scenarios
      // Could be extended to support scenario-specific team structures
    } else {
      setMasterTeamStructures(prev => {
        const existing = prev.findIndex(s => s.teamName === structure.teamName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = structure;
          return updated;
        }
        return [...prev, structure];
      });
    }
    setIsTeamStructureModalOpen(false);
    setEditingTeamStructure(null);
  };

  // Scenario handlers
  const handleCreateScenario = (scenario: Scenario) => {
    setScenarios(prev => [...prev, scenario]);
    setActiveScenarioId(scenario.id);
  };

  const handleUpdateScenario = (scenario: Scenario) => {
    setScenarios(prev => prev.map(s => s.id === scenario.id ? scenario : s));
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(null);
    }
    if (compareScenarioId === id) {
      setCompareScenarioId(null);
    }
  };

  const handleMergeToMaster = (scenario: Scenario) => {
    // Apply proposed employees (merge with base, respecting deletions)
    const finalEmployees = getScenarioEmployees(scenario);
    const finalEvents = getScenarioEvents(scenario);
    
    setMasterEmployees(finalEmployees);
    setMasterEvents(finalEvents);
    
    // Delete the scenario after merge
    handleDeleteScenario(scenario.id);
  };

  // Import handlers (always affect master)
  const handleImportEmployees = (importedEmployees: Employee[]) => {
    setMasterEmployees(importedEmployees);
  };

  const handleImportEvents = (importedEvents: WorkforceEvent[]) => {
    setMasterEvents(importedEvents);
  };

  const handleImportTeamStructures = (importedStructures: TeamStructure[]) => {
    setMasterTeamStructures(importedStructures);
  };

  const handleImportDepartments = (importedDepartments: Record<string, string[]>) => {
    setDepartments(importedDepartments);
    const allTeams = Object.values(importedDepartments).flat();
    setScopeFilter({
      departments: Object.keys(importedDepartments),
      teams: allTeams
    });
  };

  const handleImportAll = (data: {
    employees?: Employee[];
    events?: WorkforceEvent[];
    teamStructures?: TeamStructure[];
    departments?: Record<string, string[]>;
  }) => {
    if (data.employees) setMasterEmployees(data.employees);
    if (data.events) setMasterEvents(data.events);
    if (data.teamStructures) setMasterTeamStructures(data.teamStructures);
    if (data.departments) {
      setDepartments(data.departments);
      const allTeams = Object.values(data.departments).flat();
      setScopeFilter({
        departments: Object.keys(data.departments),
        teams: allTeams
      });
    }
  };

  const getViewTitle = () => {
    switch (view) {
      case 'dashboard': return 'Operations Center';
      case 'timeline': return 'Strategic Roadmap';
      case 'roster': return 'Department Directory';
      case 'planner': return 'Strategic Movements';
      case 'analytics': return 'Team Analytics';
      case 'orgchart': return 'Organization Chart';
      default: return 'Operations Center';
    }
  };

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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scenario Manager */}
        <ScenarioManager
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          compareScenarioId={compareScenarioId}
          masterEmployees={masterEmployees}
          masterEvents={masterEvents}
          masterTeamStructures={masterTeamStructures}
          onCreateScenario={handleCreateScenario}
          onUpdateScenario={handleUpdateScenario}
          onDeleteScenario={handleDeleteScenario}
          onSetActiveScenario={setActiveScenarioId}
          onSetCompareScenario={setCompareScenarioId}
          onMergeToMaster={handleMergeToMaster}
        />

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
                <ExportImport
                  employees={masterEmployees}
                  events={masterEvents}
                  teamStructures={masterTeamStructures}
                  departments={departments}
                  onImportEmployees={handleImportEmployees}
                  onImportEvents={handleImportEvents}
                  onImportTeamStructures={handleImportTeamStructures}
                  onImportDepartments={handleImportDepartments}
                  onImportAll={handleImportAll}
                  orgChartRef={view === 'orgchart' ? orgChartRef : undefined}
                />
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

          {view === 'orgchart' && (
            <OrgChart
              ref={orgChartRef}
              employees={filteredEmployees}
              teamStructures={teamStructures}
              departments={departments}
              onEditEmployee={handleEditEmployee}
            />
          )}
        </main>
      </div>

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
