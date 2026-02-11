import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import {
  Employee,
  WorkforceEvent,
  TeamStructure,
  Scenario,
  HierarchyStructure,
  getDepartmentsFlat,
  initialEmployees,
  initialEvents,
  initialTeamStructures,
  initialHierarchy,
} from '@/lib/workforce-data';

interface HistoryState {
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
  scenarios: Scenario[];
  hierarchy: HierarchyStructure;
}

interface UndoRedoState {
  past: HistoryState[];
  future: HistoryState[];
  currentIndex: number;
}

interface UseWorkforceDataOptions {
  isAuthenticated?: boolean;
}

export const useWorkforceData = (options: UseWorkforceDataOptions = {}) => {
  const { isAuthenticated = false } = options;
  
  const [masterEmployees, setMasterEmployees] = useState<Employee[]>([]);
  const [masterEvents, setMasterEvents] = useState<WorkforceEvent[]>([]);
  const [masterTeamStructures, setMasterTeamStructures] = useState<TeamStructure[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyStructure>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Refs to track current values for sync
  const dataRef = useRef({ masterEmployees, masterEvents, masterTeamStructures, hierarchy, scenarios });
  dataRef.current = { masterEmployees, masterEvents, masterTeamStructures, hierarchy, scenarios };

  // Derived flat departments for backwards compatibility
  const departments = useMemo(() => getDepartmentsFlat(hierarchy), [hierarchy]);

  // Undo/Redo state
  const [undoRedo, setUndoRedo] = useState<UndoRedoState>({
    past: [],
    future: [],
    currentIndex: -1,
  });

  // Load data from server when authenticated
  useEffect(() => {
    // Only load if authenticated and haven't loaded yet
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.getAllData();
        setMasterEmployees(data.employees || []);
        setMasterEvents(data.events || []);
        setMasterTeamStructures(data.teamStructures || []);
        setHierarchy(data.hierarchy || []);
        setScenarios(data.scenarios || []);
        setHasLoaded(true);
        console.log('Loaded workforce data from server:', {
          employees: data.employees?.length || 0,
          events: data.events?.length || 0,
          teams: data.teamStructures?.length || 0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data from server';
        console.error('Failed to load workforce data:', err);
        setError(message);
        toast.error('Failed to load data', { description: message });
        // Use fallback initial data only if we haven't loaded before
        if (!hasLoaded) {
          setMasterEmployees(initialEmployees);
          setMasterEvents(initialEvents);
          setMasterTeamStructures(initialTeamStructures);
          setHierarchy(initialHierarchy);
          setScenarios([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Sync data to server
  const syncToServer = useCallback(async (data: {
    employees?: Employee[];
    events?: WorkforceEvent[];
    hierarchy?: HierarchyStructure;
    teamStructures?: TeamStructure[];
    scenarios?: Scenario[];
  }) => {
    setIsSyncing(true);
    try {
      await apiClient.updateAllData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save data';
      console.error('Failed to sync data to server:', err);
      toast.error('Failed to save changes', { description: message });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Create a snapshot of current state
  const createSnapshot = useCallback((): HistoryState => ({
    employees: JSON.parse(JSON.stringify(dataRef.current.masterEmployees)),
    events: JSON.parse(JSON.stringify(dataRef.current.masterEvents)),
    teamStructures: JSON.parse(JSON.stringify(dataRef.current.masterTeamStructures)),
    scenarios: JSON.parse(JSON.stringify(dataRef.current.scenarios)),
    hierarchy: JSON.parse(JSON.stringify(dataRef.current.hierarchy)),
  }), []);

  // Push to history (call before making changes)
  const pushToHistory = useCallback(() => {
    const snapshot = createSnapshot();
    setUndoRedo(prev => ({
      past: [...prev.past, snapshot],
      future: [],
      currentIndex: prev.past.length,
    }));
  }, [createSnapshot]);

  // Undo
  const undo = useCallback(() => {
    const currentPast = undoRedo.past;
    if (currentPast.length === 0) return;
    
    const currentSnapshot = createSnapshot();
    const previousState = currentPast[currentPast.length - 1];
    
    // Restore previous state
    setMasterEmployees(previousState.employees);
    setMasterEvents(previousState.events);
    setMasterTeamStructures(previousState.teamStructures);
    setScenarios(previousState.scenarios);
    setHierarchy(previousState.hierarchy);
    
    setUndoRedo(prev => ({
      past: prev.past.slice(0, -1),
      future: [currentSnapshot, ...prev.future],
      currentIndex: prev.currentIndex - 1,
    }));
    
    // Sync to server
    syncToServer({
      employees: previousState.employees,
      events: previousState.events,
      teamStructures: previousState.teamStructures,
      scenarios: previousState.scenarios,
      hierarchy: previousState.hierarchy,
    });
  }, [undoRedo.past, createSnapshot, syncToServer]);

  // Redo
  const redo = useCallback(() => {
    const currentFuture = undoRedo.future;
    if (currentFuture.length === 0) return;
    
    const currentSnapshot = createSnapshot();
    const nextState = currentFuture[0];
    
    // Restore next state
    setMasterEmployees(nextState.employees);
    setMasterEvents(nextState.events);
    setMasterTeamStructures(nextState.teamStructures);
    setScenarios(nextState.scenarios);
    setHierarchy(nextState.hierarchy);
    
    setUndoRedo(prev => ({
      past: [...prev.past, currentSnapshot],
      future: prev.future.slice(1),
      currentIndex: prev.currentIndex + 1,
    }));
    
    // Sync to server
    syncToServer({
      employees: nextState.employees,
      events: nextState.events,
      teamStructures: nextState.teamStructures,
      scenarios: nextState.scenarios,
      hierarchy: nextState.hierarchy,
    });
  }, [undoRedo.future, createSnapshot, syncToServer]);

  // Jump to specific history index
  const jumpToHistory = useCallback((index: number) => {
    const allHistory = [...undoRedo.past, createSnapshot(), ...undoRedo.future];
    const targetState = allHistory[index];
    
    if (!targetState) return;
    
    setMasterEmployees(targetState.employees);
    setMasterEvents(targetState.events);
    setMasterTeamStructures(targetState.teamStructures);
    setScenarios(targetState.scenarios);
    setHierarchy(targetState.hierarchy);
    
    setUndoRedo({
      past: allHistory.slice(0, index),
      future: allHistory.slice(index + 1),
      currentIndex: index,
    });
    
    // Sync to server
    syncToServer({
      employees: targetState.employees,
      events: targetState.events,
      teamStructures: targetState.teamStructures,
      scenarios: targetState.scenarios,
      hierarchy: targetState.hierarchy,
    });
  }, [undoRedo, createSnapshot, syncToServer]);

  // Delete employee
  const deleteEmployee = useCallback((employeeId: number, activeScenarioId?: string | null) => {
    pushToHistory();
    
    if (activeScenarioId) {
      const updatedScenarios = dataRef.current.scenarios.map(s => {
        if (s.id !== activeScenarioId) return s;
        return {
          ...s,
          deletedEmployeeIds: [...s.deletedEmployeeIds, employeeId],
          proposedEmployees: s.proposedEmployees.filter(e => e.id !== employeeId),
        };
      });
      setScenarios(updatedScenarios);
      syncToServer({ scenarios: updatedScenarios });
    } else {
      const updatedEmployees = dataRef.current.masterEmployees.filter(e => e.id !== employeeId);
      const updatedEvents = dataRef.current.masterEvents.filter(e => e.empId !== employeeId);
      setMasterEmployees(updatedEmployees);
      setMasterEvents(updatedEvents);
      syncToServer({ employees: updatedEmployees, events: updatedEvents });
    }
  }, [pushToHistory, syncToServer]);

  // Delete event
  const deleteEvent = useCallback((eventId: number, activeScenarioId?: string | null) => {
    pushToHistory();
    
    if (activeScenarioId) {
      const updatedScenarios = dataRef.current.scenarios.map(s => {
        if (s.id !== activeScenarioId) return s;
        return {
          ...s,
          deletedEventIds: [...s.deletedEventIds, eventId],
          proposedEvents: s.proposedEvents.filter(e => e.id !== eventId),
        };
      });
      setScenarios(updatedScenarios);
      syncToServer({ scenarios: updatedScenarios });
    } else {
      const updatedEvents = dataRef.current.masterEvents.filter(e => e.id !== eventId);
      setMasterEvents(updatedEvents);
      syncToServer({ events: updatedEvents });
    }
  }, [pushToHistory, syncToServer]);

  // Delete team (from group or direct)
  const deleteTeam = useCallback((dept: string, groupName: string | null, teamName: string) => {
    pushToHistory();
    
    const updatedHierarchy = dataRef.current.hierarchy.map(d => {
      if (d.name !== dept) return d;
      
      if (groupName === null) {
        return {
          ...d,
          directTeams: (d.directTeams || []).filter(t => t !== teamName)
        };
      }
      
      return {
        ...d,
        groups: d.groups.map(g => {
          if (g.name !== groupName) return g;
          return {
            ...g,
            teams: g.teams.filter(t => t !== teamName)
          };
        }).filter(g => g.teams.length > 0)
      };
    });
    
    const updatedEmployees = dataRef.current.masterEmployees.map(e => 
      e.team === teamName ? { ...e, team: groupName || dept } : e
    );
    
    const updatedTeamStructures = dataRef.current.masterTeamStructures.filter(t => t.teamName !== teamName);
    
    setHierarchy(updatedHierarchy);
    setMasterEmployees(updatedEmployees);
    setMasterTeamStructures(updatedTeamStructures);
    
    syncToServer({
      hierarchy: updatedHierarchy,
      employees: updatedEmployees,
      teamStructures: updatedTeamStructures,
    });
  }, [pushToHistory, syncToServer]);

  // Delete group
  const deleteGroup = useCallback((dept: string, groupName: string) => {
    pushToHistory();
    
    const updatedHierarchy = dataRef.current.hierarchy.map(d => {
      if (d.name !== dept) return d;
      return {
        ...d,
        groups: d.groups.filter(g => g.name !== groupName)
      };
    });
    
    const updatedEmployees = dataRef.current.masterEmployees.filter(e => e.group !== groupName);
    
    const group = dataRef.current.hierarchy.find(d => d.name === dept)?.groups.find(g => g.name === groupName);
    const updatedTeamStructures = dataRef.current.masterTeamStructures.filter(t => !group?.teams.includes(t.teamName));
    
    setHierarchy(updatedHierarchy);
    setMasterEmployees(updatedEmployees);
    setMasterTeamStructures(updatedTeamStructures);
    
    syncToServer({
      hierarchy: updatedHierarchy,
      employees: updatedEmployees,
      teamStructures: updatedTeamStructures,
    });
  }, [pushToHistory, syncToServer]);

  // Delete department
  const deleteDepartment = useCallback((dept: string) => {
    pushToHistory();
    
    const updatedHierarchy = dataRef.current.hierarchy.filter(d => d.name !== dept);
    const deptEmployeeIds = dataRef.current.masterEmployees.filter(e => e.dept === dept).map(e => e.id);
    const updatedEmployees = dataRef.current.masterEmployees.filter(e => e.dept !== dept);
    const updatedEvents = dataRef.current.masterEvents.filter(e => !deptEmployeeIds.includes(e.empId));
    const updatedTeamStructures = dataRef.current.masterTeamStructures.filter(t => t.department !== dept);
    
    setHierarchy(updatedHierarchy);
    setMasterEmployees(updatedEmployees);
    setMasterEvents(updatedEvents);
    setMasterTeamStructures(updatedTeamStructures);
    
    syncToServer({
      hierarchy: updatedHierarchy,
      employees: updatedEmployees,
      events: updatedEvents,
      teamStructures: updatedTeamStructures,
    });
  }, [pushToHistory, syncToServer]);

  // Add department
  const addDepartment = useCallback((name: string) => {
    pushToHistory();
    const updatedHierarchy = [...dataRef.current.hierarchy, { name, groups: [], directTeams: [] }];
    setHierarchy(updatedHierarchy);
    syncToServer({ hierarchy: updatedHierarchy });
  }, [pushToHistory, syncToServer]);

  // Add group to department
  const addGroup = useCallback((dept: string, groupName: string) => {
    pushToHistory();
    const updatedHierarchy = dataRef.current.hierarchy.map(d => {
      if (d.name !== dept) return d;
      if (d.groups.some(g => g.name === groupName)) return d;
      return {
        ...d,
        groups: [...d.groups, { name: groupName, teams: [] }]
      };
    });
    setHierarchy(updatedHierarchy);
    syncToServer({ hierarchy: updatedHierarchy });
  }, [pushToHistory, syncToServer]);

  // Add team to group
  const addTeam = useCallback((dept: string, groupName: string | null, teamName: string) => {
    pushToHistory();
    const updatedHierarchy = dataRef.current.hierarchy.map(d => {
      if (d.name !== dept) return d;
      
      if (groupName === null) {
        if ((d.directTeams || []).includes(teamName)) return d;
        return {
          ...d,
          directTeams: [...(d.directTeams || []), teamName]
        };
      }
      
      return {
        ...d,
        groups: d.groups.map(g => {
          if (g.name !== groupName) return g;
          if (g.teams.includes(teamName)) return g;
          return {
            ...g,
            teams: [...g.teams, teamName]
          };
        })
      };
    });
    setHierarchy(updatedHierarchy);
    syncToServer({ hierarchy: updatedHierarchy });
  }, [pushToHistory, syncToServer]);

  // Add direct team to department (convenience method)
  const addDirectTeam = useCallback((dept: string, teamName: string) => {
    addTeam(dept, null, teamName);
  }, [addTeam]);

  // Clear all data and reset to initial
  const resetToInitial = useCallback(() => {
    pushToHistory();
    setMasterEmployees(initialEmployees);
    setMasterEvents(initialEvents);
    setMasterTeamStructures(initialTeamStructures);
    setHierarchy(initialHierarchy);
    setScenarios([]);
    
    syncToServer({
      employees: initialEmployees,
      events: initialEvents,
      teamStructures: initialTeamStructures,
      hierarchy: initialHierarchy,
      scenarios: [],
    });
  }, [pushToHistory, syncToServer]);

  // Wrapped setters that sync to server
  const setMasterEmployeesWithSync = useCallback((updater: Employee[] | ((prev: Employee[]) => Employee[])) => {
    pushToHistory();
    const updated = typeof updater === 'function' ? updater(dataRef.current.masterEmployees) : updater;
    setMasterEmployees(updated);
    syncToServer({ employees: updated });
  }, [pushToHistory, syncToServer]);

  const setMasterEventsWithSync = useCallback((updater: WorkforceEvent[] | ((prev: WorkforceEvent[]) => WorkforceEvent[])) => {
    pushToHistory();
    const updated = typeof updater === 'function' ? updater(dataRef.current.masterEvents) : updater;
    setMasterEvents(updated);
    syncToServer({ events: updated });
  }, [pushToHistory, syncToServer]);

  const setMasterTeamStructuresWithSync = useCallback((updater: TeamStructure[] | ((prev: TeamStructure[]) => TeamStructure[])) => {
    pushToHistory();
    const updated = typeof updater === 'function' ? updater(dataRef.current.masterTeamStructures) : updater;
    setMasterTeamStructures(updated);
    syncToServer({ teamStructures: updated });
  }, [pushToHistory, syncToServer]);

  const setHierarchyWithSync = useCallback((updater: HierarchyStructure | ((prev: HierarchyStructure) => HierarchyStructure)) => {
    pushToHistory();
    const updated = typeof updater === 'function' ? updater(dataRef.current.hierarchy) : updater;
    setHierarchy(updated);
    syncToServer({ hierarchy: updated });
  }, [pushToHistory, syncToServer]);

  const setScenariosWithSync = useCallback((updater: Scenario[] | ((prev: Scenario[]) => Scenario[])) => {
    const updated = typeof updater === 'function' ? updater(dataRef.current.scenarios) : updater;
    dataRef.current = { ...dataRef.current, scenarios: updated };
    setScenarios(updated);
    syncToServer({ scenarios: updated });
  }, [syncToServer]);

  // Direct setters that also sync (for bulk imports)
  const setMasterEmployeesDirect = useCallback((employees: Employee[]) => {
    setMasterEmployees(employees);
    syncToServer({ employees });
  }, [syncToServer]);

  const setMasterEventsDirect = useCallback((events: WorkforceEvent[]) => {
    setMasterEvents(events);
    syncToServer({ events });
  }, [syncToServer]);

  const setMasterTeamStructuresDirect = useCallback((teamStructures: TeamStructure[]) => {
    setMasterTeamStructures(teamStructures);
    syncToServer({ teamStructures });
  }, [syncToServer]);

  const setHierarchyDirect = useCallback((newHierarchy: HierarchyStructure) => {
    setHierarchy(newHierarchy);
    syncToServer({ hierarchy: newHierarchy });
  }, [syncToServer]);

  const canUndo = undoRedo.past.length > 0;
  const canRedo = undoRedo.future.length > 0;
  const historyLength = undoRedo.past.length + 1 + undoRedo.future.length;

  // Refresh from server
  const refreshFromServer = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getAllData();
      setMasterEmployees(data.employees || []);
      setMasterEvents(data.events || []);
      setMasterTeamStructures(data.teamStructures || []);
      setHierarchy(data.hierarchy || []);
      setScenarios(data.scenarios || []);
      toast.success('Data refreshed from server');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh data';
      toast.error('Failed to refresh', { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Loading/error state
    isLoading,
    error,
    isSyncing,
    // Data
    masterEmployees,
    masterEvents,
    masterTeamStructures,
    hierarchy,
    departments,
    scenarios,
    // Setters with history and sync
    setMasterEmployees: setMasterEmployeesWithSync,
    setMasterEvents: setMasterEventsWithSync,
    setMasterTeamStructures: setMasterTeamStructuresWithSync,
    setHierarchy: setHierarchyWithSync,
    setScenarios: setScenariosWithSync,
    // Direct setters (without history, for bulk imports)
    setMasterEmployeesDirect,
    setMasterEventsDirect,
    setMasterTeamStructuresDirect,
    setHierarchyDirect,
    // Operations
    deleteEmployee,
    deleteEvent,
    deleteTeam,
    deleteGroup,
    deleteDepartment,
    addDepartment,
    addGroup,
    addTeam,
    addDirectTeam,
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength,
    currentHistoryIndex: undoRedo.past.length,
    jumpToHistory,
    pushToHistory,
    // Reset
    resetToInitial,
    // Refresh from server
    refreshFromServer,
  };
};
