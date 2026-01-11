import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, UserPlus, ChevronRight, Lock } from 'lucide-react';
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
import { DecisionFlagsPanel } from '@/components/workforce/DecisionFlagsPanel';
import { useWorkforceData } from '@/hooks/use-workforce-data';
import { toast } from 'sonner';
import { 
  Employee, 
  WorkforceEvent, 
  Hierarchy, 
  TeamStructure,
  Scenario,
  DiffStatus,
  DEPARTMENTS,
  getScenarioEmployees,
  getScenarioEvents,
  getEmployeeDiffs,
  getEventDiffs,
  addScenarioChangelogEntry,
  createScenario
} from '@/lib/workforce-data';

interface ScopeFilter {
  departments: string[];
  groups: string[];
  teams: string[];
}

const Index = () => {
  // Use the workforce data hook for persistence and undo/redo
  const {
    masterEmployees,
    masterEvents,
    masterTeamStructures,
    hierarchy,
    departments,
    scenarios,
    setMasterEmployees,
    setMasterEvents,
    setMasterTeamStructures,
    setHierarchy,
    setScenarios,
    setMasterEmployeesDirect,
    setMasterEventsDirect,
    setMasterTeamStructuresDirect,
    setHierarchyDirect,
    deleteEmployee,
    deleteEvent,
    deleteTeam,
    deleteGroup,
    deleteDepartment,
    addDepartment,
    addGroup,
    addTeam,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength,
    currentHistoryIndex,
    jumpToHistory,
    pushToHistory,
    resetToInitial,
  } = useWorkforceData();

  // Scenario State
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

  // Compute diff maps when in comparison mode
  const compareScenario = scenarios.find(s => s.id === compareScenarioId);
  
  const employeeDiffMap = useMemo(() => {
    if (!compareScenario) return undefined;
    const diffs = getEmployeeDiffs(masterEmployees, compareScenario);
    const map = new Map<number, { status: DiffStatus; changes?: string[] }>();
    diffs.forEach(d => map.set(d.employee.id, { status: d.status, changes: d.changes }));
    return map;
  }, [compareScenario, masterEmployees]);

  const eventDiffMap = useMemo(() => {
    if (!compareScenario) return undefined;
    const diffs = getEventDiffs(masterEvents, compareScenario);
    const map = new Map<number, { status: DiffStatus }>();
    diffs.forEach(d => map.set(d.event.id, { status: d.status }));
    return map;
  }, [compareScenario, masterEvents]);

  // Other state
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(() => {
    const allDepts = hierarchy.map(d => d.name);
    const allGroups: string[] = [];
    const allTeams: string[] = [];
    hierarchy.forEach(d => {
      d.groups.forEach(g => {
        allGroups.push(g.name);
        allTeams.push(...g.teams);
      });
      if (d.directTeams && d.directTeams.length > 0) {
        allTeams.push(...d.directTeams);
      }
    });
    return { departments: allDepts, groups: allGroups, teams: allTeams };
  });
  const [view, setView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const orgChartRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTeamStructureModalOpen, setIsTeamStructureModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingTeamStructure, setEditingTeamStructure] = useState<{ teamName: string; department: string } | null>(null);
  const [eventPrefill, setEventPrefill] = useState<{ empId: number | string; isFlag: boolean }>({ empId: '', isFlag: false });
  const [employeePrefill, setEmployeePrefill] = useState<{ dept: string; team: string; group?: string | null } | undefined>(undefined);

  // Update scope filter when hierarchy changes
  useEffect(() => {
    const allDepts = hierarchy.map(d => d.name);
    const allGroups: string[] = [];
    const allTeams: string[] = [];
    hierarchy.forEach(d => {
      d.groups.forEach(g => {
        allGroups.push(g.name);
        allTeams.push(...g.teams);
      });
      if (d.directTeams && d.directTeams.length > 0) {
        allTeams.push(...d.directTeams);
      }
    });
    setScopeFilter(prev => ({
      departments: prev.departments.filter(d => allDepts.includes(d)),
      groups: prev.groups.filter(g => allGroups.includes(g)),
      teams: prev.teams.filter(t => allTeams.includes(t))
    }));
  }, [hierarchy]);

  // Legacy hierarchy for compatibility with some components
  const legacyHierarchy: Hierarchy = useMemo(() => {
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
  const allTeamsList = Object.values(departments).flat();
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTeam = scopeFilter.teams.includes(e.team);
      const isDeptLevel = !allTeamsList.includes(e.team);
      const matchDeptLevel = isDeptLevel && scopeFilter.departments.includes(e.dept);
      return matchSearch && (matchTeam || matchDeptLevel);
    });
  }, [employees, searchQuery, scopeFilter, allTeamsList]);

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
      addDepartment(name);
    }
  };

  const handleAddTeamFull = (dept: string, groupName: string | null, teamName: string) => {
    addTeam(dept, groupName, teamName);
    setScopeFilter(prev => ({
      ...prev,
      teams: [...prev.teams, teamName]
    }));
  };

  // Auto-create scenario helper for Master Plan protection
  const ensureWorkingScenario = useCallback((): string | null => {
    if (activeScenarioId) {
      return activeScenarioId;
    }
    // Create a working draft scenario automatically
    const workingDraft = createScenario(
      'Working Draft',
      'Auto-created for changes',
      masterEmployees,
      masterEvents,
      masterTeamStructures,
      hierarchy
    );
    setScenarios(prev => [...prev, workingDraft]);
    setActiveScenarioId(workingDraft.id);
    toast.info('Created "Working Draft" scenario - Master Plan is read-only. Merge when ready.');
    return workingDraft.id;
  }, [activeScenarioId, masterEmployees, masterEvents, masterTeamStructures, hierarchy, setScenarios]);

  const handleDeleteEmployee = (employeeId: number) => {
    const scenarioId = ensureWorkingScenario();
    deleteEmployee(employeeId, scenarioId);
  };

  const handleAddEmployee = (employeeData: Omit<Employee, 'id'>, id?: number) => {
    const newId = id || Date.now();
    const newEmployee = { ...employeeData, id: newId };
    const isEditing = !!id;
    const existingEmployee = isEditing ? employees.find(e => e.id === id) : null;
    
    // Always work in a scenario - auto-create if needed
    const scenarioId = ensureWorkingScenario();
    
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      
      let updatedScenario = { ...s };
      const existingIdx = s.proposedEmployees.findIndex(e => e.id === newId);
      
      if (existingIdx >= 0) {
        const updated = [...s.proposedEmployees];
        updated[existingIdx] = newEmployee;
        updatedScenario = { ...updatedScenario, proposedEmployees: updated };
      } else {
        updatedScenario = { 
          ...updatedScenario, 
          proposedEmployees: [...s.proposedEmployees, newEmployee]
        };
      }
      
      // For new employees (not editing), add a 6-month training event
      if (!isEditing) {
        const joinDate = new Date(newEmployee.joined);
        const trainingEndDate = new Date(joinDate);
        trainingEndDate.setMonth(trainingEndDate.getMonth() + 6);
        
        const trainingEvent = {
          id: Date.now() + 1,
          empId: newId,
          type: 'Training',
          date: newEmployee.joined,
          endDate: trainingEndDate.toISOString().split('T')[0],
          details: 'Onboarding & Training Period (6 months)',
          isFlag: false
        };
        
        updatedScenario = {
          ...updatedScenario,
          proposedEvents: [...updatedScenario.proposedEvents, trainingEvent]
        };
      }
      
      const changeDetails: Record<string, { before?: string; after?: string }> = {};
      if (isEditing && existingEmployee) {
        if (existingEmployee.team !== newEmployee.team) {
          changeDetails['Team'] = { before: existingEmployee.team, after: newEmployee.team };
        }
        if (existingEmployee.role !== newEmployee.role) {
          changeDetails['Role'] = { before: existingEmployee.role, after: newEmployee.role };
        }
        if (existingEmployee.status !== newEmployee.status) {
          changeDetails['Status'] = { before: existingEmployee.status, after: newEmployee.status };
        }
      }
      
      return addScenarioChangelogEntry(
        updatedScenario,
        isEditing ? 'employee_modified' : 'employee_added',
        newId,
        newEmployee.name,
        isEditing ? `Modified employee details` : `Added new employee to ${newEmployee.team} (with 6-month training)`,
        Object.keys(changeDetails).length > 0 ? changeDetails : undefined
      );
    }));
    
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const handleAddEvent = (eventData: { empId: number; type: string; date: string; details: string; isFlag: boolean; targetTeam?: string; endDate?: string; newRole?: string }) => {
    const newEvent = { ...eventData, id: Date.now() };
    const emp = employees.find(e => e.id === eventData.empId);
    
    // Always work in a scenario
    const scenarioId = ensureWorkingScenario();
    
    // For promotions, also update the employee's role
    if (eventData.type === 'Promotion' && eventData.newRole) {
      setScenarios(prev => prev.map(s => {
        if (s.id !== scenarioId) return s;
        
        const existingEmpIdx = s.proposedEmployees.findIndex(e => e.id === eventData.empId);
        const empToUpdate = existingEmpIdx >= 0 ? s.proposedEmployees[existingEmpIdx] : emp;
        
        if (!empToUpdate) return s;
        
        const updatedEmp = { ...empToUpdate, role: eventData.newRole! };
        let updatedEmployees: Employee[];
        if (existingEmpIdx >= 0) {
          updatedEmployees = [...s.proposedEmployees];
          updatedEmployees[existingEmpIdx] = updatedEmp;
        } else {
          updatedEmployees = [...s.proposedEmployees, updatedEmp];
        }
        
        const updatedScenario = { 
          ...s, 
          proposedEvents: [...s.proposedEvents, newEvent],
          proposedEmployees: updatedEmployees
        };
        
        return addScenarioChangelogEntry(
          updatedScenario,
          'event_added',
          newEvent.id,
          emp?.name || `Employee #${eventData.empId}`,
          `Promoted to ${eventData.newRole}: ${eventData.details}`,
          { Role: { before: empToUpdate.role, after: eventData.newRole! } }
        );
      }));
    } else {
      setScenarios(prev => prev.map(s => {
        if (s.id !== scenarioId) return s;
        const updatedScenario = { 
          ...s, 
          proposedEvents: [...s.proposedEvents, newEvent]
        };
        
        return addScenarioChangelogEntry(
          updatedScenario,
          'event_added',
          newEvent.id,
          emp?.name || `Employee #${eventData.empId}`,
          `Added ${eventData.type}${eventData.isFlag ? ' (Flag)' : ''}: ${eventData.details}`,
          eventData.targetTeam ? { 'Target Team': { after: eventData.targetTeam } } : undefined
        );
      }));
    }
    setIsEventModalOpen(false);
  };

  const handleDeleteEvent = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    const emp = event ? employees.find(e => e.id === event.empId) : null;
    
    // Always work in a scenario
    const scenarioId = ensureWorkingScenario();
    
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      
      // Check if it's a proposed event or base event
      const isProposed = s.proposedEvents.some(e => e.id === eventId);
      
      let updatedScenario = { ...s };
      if (isProposed) {
        updatedScenario = { ...updatedScenario, proposedEvents: s.proposedEvents.filter(e => e.id !== eventId) };
      } else {
        updatedScenario = { ...updatedScenario, deletedEventIds: [...s.deletedEventIds, eventId] };
      }
      
      return addScenarioChangelogEntry(
        updatedScenario,
        'event_removed',
        eventId,
        emp?.name || 'Unknown',
        `Removed ${event?.type || 'event'}${event?.isFlag ? ' (Flag)' : ''}`
      );
    }));
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
    pushToHistory();
    const finalEmployees = getScenarioEmployees(scenario);
    const finalEvents = getScenarioEvents(scenario);
    
    setMasterEmployeesDirect(finalEmployees);
    setMasterEventsDirect(finalEvents);
    
    handleDeleteScenario(scenario.id);
  };

  // Handle discarding specific changes from a scenario
  const handleDiscardChanges = (scenarioId: string, changeIds: string[]) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      
      // Find which changelog entries are being discarded
      const discardedEntries = s.changelog.filter(c => changeIds.includes(c.id));
      
      let updatedScenario = { ...s };
      
      discardedEntries.forEach(entry => {
        switch (entry.type) {
          case 'employee_added':
            // Remove from proposedEmployees
            updatedScenario = {
              ...updatedScenario,
              proposedEmployees: updatedScenario.proposedEmployees.filter(e => e.id !== entry.entityId)
            };
            break;
          case 'employee_removed':
            // Remove from deletedEmployeeIds
            updatedScenario = {
              ...updatedScenario,
              deletedEmployeeIds: updatedScenario.deletedEmployeeIds.filter(id => id !== entry.entityId)
            };
            break;
          case 'employee_modified':
            // Remove from proposedEmployees (will fall back to base)
            updatedScenario = {
              ...updatedScenario,
              proposedEmployees: updatedScenario.proposedEmployees.filter(e => e.id !== entry.entityId)
            };
            break;
          case 'event_added':
            // Remove from proposedEvents
            updatedScenario = {
              ...updatedScenario,
              proposedEvents: updatedScenario.proposedEvents.filter(e => e.id !== entry.entityId)
            };
            break;
          case 'event_removed':
            // Remove from deletedEventIds
            updatedScenario = {
              ...updatedScenario,
              deletedEventIds: updatedScenario.deletedEventIds.filter(id => id !== entry.entityId)
            };
            break;
        }
      });
      
      // Remove the discarded changelog entries
      updatedScenario = {
        ...updatedScenario,
        changelog: updatedScenario.changelog.filter(c => !changeIds.includes(c.id)),
        updatedAt: new Date().toISOString()
      };
      
      return updatedScenario;
    }));
  };

  // Import handlers (always affect master)
  const handleImportEmployees = (importedEmployees: Employee[]) => {
    setMasterEmployeesDirect(importedEmployees);
  };

  const handleImportEvents = (importedEvents: WorkforceEvent[]) => {
    setMasterEventsDirect(importedEvents);
  };

  const handleImportTeamStructures = (importedStructures: TeamStructure[]) => {
    setMasterTeamStructuresDirect(importedStructures);
  };

  const handleImportDepartments = (importedDepartments: Record<string, string[]>) => {
    // For imports, we'll rebuild the hierarchy from flat departments
    // This is a simplified approach - imported data uses legacy format
    console.warn('Department import uses legacy format - hierarchy will be simplified');
    const allTeams = Object.values(importedDepartments).flat();
    setScopeFilter({
      departments: Object.keys(importedDepartments),
      groups: [],
      teams: allTeams
    });
  };

  const handleImportAll = (data: {
    employees?: Employee[];
    events?: WorkforceEvent[];
    teamStructures?: TeamStructure[];
    departments?: Record<string, string[]>;
    hierarchy?: import('@/lib/workforce-data').HierarchyStructure;
  }) => {
    if (data.employees) setMasterEmployeesDirect(data.employees);
    if (data.events) setMasterEventsDirect(data.events);
    if (data.teamStructures) setMasterTeamStructuresDirect(data.teamStructures);
    if (data.hierarchy) {
      setHierarchyDirect(data.hierarchy);
      // Update scope filter to match new hierarchy
      const allDepts = data.hierarchy.map(d => d.name);
      const allGroups: string[] = [];
      const allTeams: string[] = [];
      data.hierarchy.forEach(d => {
        d.groups.forEach(g => {
          allGroups.push(g.name);
          allTeams.push(...g.teams);
        });
        if (d.directTeams && d.directTeams.length > 0) {
          allTeams.push(...d.directTeams);
        }
      });
      setScopeFilter({ departments: allDepts, groups: allGroups, teams: allTeams });
    } else if (data.departments) {
      // Legacy format fallback
      const allTeams = Object.values(data.departments).flat();
      setScopeFilter({
        departments: Object.keys(data.departments),
        groups: [],
        teams: allTeams
      });
    }
  };

  const handleImportHierarchy = (importedHierarchy: import('@/lib/workforce-data').HierarchyStructure) => {
    setHierarchyDirect(importedHierarchy);
    const allDepts = importedHierarchy.map(d => d.name);
    const allGroups: string[] = [];
    const allTeams: string[] = [];
    importedHierarchy.forEach(d => {
      d.groups.forEach(g => {
        allGroups.push(g.name);
        allTeams.push(...g.teams);
      });
      if (d.directTeams && d.directTeams.length > 0) {
        allTeams.push(...d.directTeams);
      }
    });
    setScopeFilter({ departments: allDepts, groups: allGroups, teams: allTeams });
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
        hierarchy={hierarchy}
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
          masterHierarchy={hierarchy}
          onCreateScenario={handleCreateScenario}
          onUpdateScenario={handleUpdateScenario}
          onDeleteScenario={handleDeleteScenario}
          onSetActiveScenario={setActiveScenarioId}
          onSetCompareScenario={setCompareScenarioId}
          onMergeToMaster={handleMergeToMaster}
          onDiscardChanges={handleDiscardChanges}
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
              
              <div className="flex gap-3 w-full lg:w-auto items-center">
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
                  hierarchy={hierarchy}
                  onImportEmployees={handleImportEmployees}
                  onImportEvents={handleImportEvents}
                  onImportTeamStructures={handleImportTeamStructures}
                  onImportDepartments={handleImportDepartments}
                  onImportHierarchy={handleImportHierarchy}
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
              hierarchy={legacyHierarchy}
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
                selectedTeam={legacyHierarchy.team}
                selectedDept={legacyHierarchy.dept}
                teamStructures={teamStructures}
                employeeDiffMap={employeeDiffMap}
                eventDiffMap={eventDiffMap}
                hierarchy={hierarchy}
                onResolveFlag={(eventId, resolutionNote) => {
                  const event = events.find(e => e.id === eventId);
                  if (event) {
                    const resolvedEvent = { 
                      ...event, 
                      isResolved: true, 
                      resolutionNote 
                    };
                    const scenarioId = ensureWorkingScenario();
                    setScenarios(prev => prev.map(s => {
                      if (s.id !== scenarioId) return s;
                      const isProposed = s.proposedEvents.some(e => e.id === eventId);
                      if (isProposed) {
                        return { ...s, proposedEvents: s.proposedEvents.map(e => e.id === eventId ? resolvedEvent : e) };
                      } else {
                        return { ...s, proposedEvents: [...s.proposedEvents, resolvedEvent] };
                      }
                    }));
                  }
                }}
                onDeleteEvent={handleDeleteEvent}
              />
          )}

          {view === 'roster' && (
            <Roster 
              employees={filteredEmployees}
              events={events}
              openPlannerForUser={openPlannerForUser}
              onEditEmployee={handleEditEmployee}
              teamStructures={teamStructures}
              onConfigureTeam={handleConfigureTeam}
              employeeDiffMap={employeeDiffMap}
              hierarchy={hierarchy}
              onAddDepartment={handleAddDepartment}
              onAddGroup={addGroup}
              onAddTeam={handleAddTeamFull}
              onDeleteDepartment={deleteDepartment}
              onDeleteGroup={deleteGroup}
              onDeleteTeam={deleteTeam}
              onSetDepartmentManager={(dept, id) => {
                setHierarchy(prev => prev.map(d => d.name === dept ? { ...d, departmentManagerId: id || undefined } : d));
              }}
              onSetGroupManager={(dept, groupName, id) => {
                setHierarchy(prev => prev.map(d => d.name === dept ? { ...d, groups: d.groups.map(g => g.name === groupName ? { ...g, groupManagerId: id || undefined } : g) } : d));
              }}
              onSetTeamLeader={(teamName, id) => {
                setMasterTeamStructures(prev => {
                  const existing = prev.find(s => s.teamName === teamName);
                  if (existing) {
                    return prev.map(s => s.teamName === teamName ? { ...s, teamLeader: id || undefined } : s);
                  }
                  let teamDept = '';
                  let teamGroup = '';
                  for (const dept of hierarchy) {
                    if (dept.directTeams?.includes(teamName)) {
                      teamDept = dept.name;
                      break;
                    }
                    for (const group of dept.groups) {
                      if (group.teams.includes(teamName)) {
                        teamDept = dept.name;
                        teamGroup = group.name;
                        break;
                      }
                    }
                  }
                  return [...prev, { teamName, department: teamDept, group: teamGroup, requiredRoles: {}, teamLeader: id || undefined }];
                });
              }}
              onBulkAssignManager={(employeeIds, managerId) => {
                const scenarioId = ensureWorkingScenario();
                setScenarios(prev => prev.map(s => {
                  if (s.id !== scenarioId) return s;
                  const updatedEmployees = [...s.proposedEmployees];
                  employeeIds.forEach(empId => {
                    const existing = updatedEmployees.findIndex(e => e.id === empId);
                    const emp = employees.find(e => e.id === empId);
                    if (emp) {
                      const updated = { ...emp, managerId: managerId || undefined };
                      if (existing >= 0) {
                        updatedEmployees[existing] = updated;
                      } else {
                        updatedEmployees.push(updated);
                      }
                    }
                  });
                  return { ...s, proposedEmployees: updatedEmployees };
                }));
              }}
              onMoveEmployeeToTeam={(employeeId, teamName, dept, group) => {
                const scenarioId = ensureWorkingScenario();
                setScenarios(prev => prev.map(s => {
                  if (s.id !== scenarioId) return s;
                  const emp = employees.find(e => e.id === employeeId);
                  if (!emp) return s;
                  
                  const updated = { ...emp, team: teamName, dept, group };
                  const existingIdx = s.proposedEmployees.findIndex(e => e.id === employeeId);
                  
                  let updatedEmployees: Employee[];
                  if (existingIdx >= 0) {
                    updatedEmployees = [...s.proposedEmployees];
                    updatedEmployees[existingIdx] = updated;
                  } else {
                    updatedEmployees = [...s.proposedEmployees, updated];
                  }
                  
                  return addScenarioChangelogEntry(
                    { ...s, proposedEmployees: updatedEmployees },
                    'employee_modified',
                    employeeId,
                    emp.name,
                    `Moved from ${emp.team} to ${teamName}`
                  );
                }));
              }}
              onHireForTeam={(prefill) => {
                setEmployeePrefill(prefill);
                setEditingEmployee(null);
                setIsEmployeeModalOpen(true);
              }}
            />
          )}

          {view === 'planner' && (
            <div className="space-y-6">
              <DecisionFlagsPanel
                employees={employees}
                events={events}
                departments={departments}
                onResolveFlag={(eventId, resolutionNote) => {
                  // Resolve flag with note
                  const event = events.find(e => e.id === eventId);
                  if (event) {
                    const resolvedEvent = { 
                      ...event, 
                      isResolved: true, 
                      resolutionNote 
                    };
                    const scenarioId = ensureWorkingScenario();
                    setScenarios(prev => prev.map(s => {
                      if (s.id !== scenarioId) return s;
                      const isProposed = s.proposedEvents.some(e => e.id === eventId);
                      if (isProposed) {
                        return { ...s, proposedEvents: s.proposedEvents.map(e => e.id === eventId ? resolvedEvent : e) };
                      } else {
                        return { ...s, proposedEvents: [...s.proposedEvents, resolvedEvent] };
                      }
                    }));
                  }
                }}
                onDeleteFlag={handleDeleteEvent}
              />
              <Planner 
                employees={employees}
                events={events}
                onAddMovement={() => {
                  setEventPrefill({ empId: employees[0]?.id || '', isFlag: false });
                  setIsEventModalOpen(true);
                }}
                onDeleteEvent={handleDeleteEvent}
              />
            </div>
          )}

          {view === 'analytics' && (
            <TeamAnalytics
              employees={employees}
              events={events}
              selectedTeams={scopeFilter.teams}
              departments={departments}
              teamStructures={teamStructures}
            />
          )}

          {view === 'orgchart' && (
            <OrgChart
              ref={orgChartRef}
              employees={filteredEmployees}
              teamStructures={teamStructures}
              hierarchy={hierarchy}
              onEditEmployee={handleEditEmployee}
              onAddDepartment={handleAddDepartment}
              onAddGroup={addGroup}
              onAddTeam={handleAddTeamFull}
              onDeleteDepartment={deleteDepartment}
              onDeleteGroup={deleteGroup}
              onDeleteTeam={deleteTeam}
              onSetDepartmentManager={(dept, id) => {
                setHierarchy(prev => prev.map(d => d.name === dept ? { ...d, departmentManagerId: id || undefined } : d));
              }}
              onSetGroupManager={(dept, groupName, id) => {
                setHierarchy(prev => prev.map(d => d.name === dept ? { ...d, groups: d.groups.map(g => g.name === groupName ? { ...g, groupManagerId: id || undefined } : g) } : d));
              }}
              onSetTeamLeader={(teamName, id) => {
                setMasterTeamStructures(prev => {
                  const existing = prev.find(s => s.teamName === teamName);
                  if (existing) {
                    return prev.map(s => s.teamName === teamName ? { ...s, teamLeader: id || undefined } : s);
                  }
                  // Find the team's parent info from hierarchy
                  let teamDept = '';
                  let teamGroup = '';
                  for (const dept of hierarchy) {
                    if (dept.directTeams?.includes(teamName)) {
                      teamDept = dept.name;
                      break;
                    }
                    for (const group of dept.groups) {
                      if (group.teams.includes(teamName)) {
                        teamDept = dept.name;
                        teamGroup = group.name;
                        break;
                      }
                    }
                  }
                  return [...prev, { teamName, department: teamDept, group: teamGroup, requiredRoles: {}, teamLeader: id || undefined }];
                });
              }}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => { setIsEmployeeModalOpen(false); setEditingEmployee(null); setEmployeePrefill(undefined); }}
        onSubmit={handleAddEmployee}
        onDelete={handleDeleteEmployee}
        editingEmployee={editingEmployee}
        hierarchy={hierarchy}
        departments={departments}
        employees={employees}
        prefill={employeePrefill}
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
