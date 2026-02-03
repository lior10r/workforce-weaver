import { useState, useEffect, useCallback, useMemo } from 'react';
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

export const useWorkforceData = () => {
  const [masterEmployees, setMasterEmployees] = useState<Employee[]>([]);
  const [masterEvents, setMasterEvents] = useState<WorkforceEvent[]>([]);
  const [masterTeamStructures, setMasterTeamStructures] = useState<TeamStructure[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyStructure>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Derived flat departments for backwards compatibility
  const departments = useMemo(() => getDepartmentsFlat(hierarchy), [hierarchy]);

  // Undo/Redo state
  const [undoRedo, setUndoRedo] = useState<UndoRedoState>({
    past: [],
    future: [],
    currentIndex: -1,
  });

  // Load data from server on mount
  useEffect(() => {
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
        // Use fallback initial data
        setMasterEmployees(initialEmployees);
        setMasterEvents(initialEvents);
        setMasterTeamStructures(initialTeamStructures);
        setHierarchy(initialHierarchy);
        setScenarios([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync data to server (debounced save)
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
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Create a snapshot of current state
  const createSnapshot = useCallback((): HistoryState => ({
    employees: JSON.parse(JSON.stringify(masterEmployees)),
    events: JSON.parse(JSON.stringify(masterEvents)),
    teamStructures: JSON.parse(JSON.stringify(masterTeamStructures)),
    scenarios: JSON.parse(JSON.stringify(scenarios)),
    hierarchy: JSON.parse(JSON.stringify(hierarchy)),
  }), [masterEmployees, masterEvents, masterTeamStructures, scenarios, hierarchy]);

  // Push to history (call before making changes)
  const pushToHistory = useCallback(() => {
    const snapshot = createSnapshot();
    setUndoRedo(prev => ({
      past: [...prev.past, snapshot],
      future: [], // Clear future when new action is taken
      currentIndex: prev.past.length,
    }));
  }, [createSnapshot]);

  // Undo
  const undo = useCallback(() => {
    setUndoRedo(prev => {
      if (prev.past.length === 0) return prev;
      
      const currentSnapshot = createSnapshot();
      const previousState = prev.past[prev.past.length - 1];
      
      // Restore previous state
      setMasterEmployees(previousState.employees);
      setMasterEvents(previousState.events);
      setMasterTeamStructures(previousState.teamStructures);
      setScenarios(previousState.scenarios);
      setHierarchy(previousState.hierarchy);
      
      // Sync to server
      syncToServer({
        employees: previousState.employees,
        events: previousState.events,
        teamStructures: previousState.teamStructures,
        scenarios: previousState.scenarios,
        hierarchy: previousState.hierarchy,
      });
      
      return {
        past: prev.past.slice(0, -1),
        future: [currentSnapshot, ...prev.future],
        currentIndex: prev.currentIndex - 1,
      };
    });
  }, [createSnapshot, syncToServer]);

  // Redo
  const redo = useCallback(() => {
    setUndoRedo(prev => {
      if (prev.future.length === 0) return prev;
      
      const currentSnapshot = createSnapshot();
      const nextState = prev.future[0];
      
      // Restore next state
      setMasterEmployees(nextState.employees);
      setMasterEvents(nextState.events);
      setMasterTeamStructures(nextState.teamStructures);
      setScenarios(nextState.scenarios);
      setHierarchy(nextState.hierarchy);
      
      // Sync to server
      syncToServer({
        employees: nextState.employees,
        events: nextState.events,
        teamStructures: nextState.teamStructures,
        scenarios: nextState.scenarios,
        hierarchy: nextState.hierarchy,
      });
      
      return {
        past: [...prev.past, currentSnapshot],
        future: prev.future.slice(1),
        currentIndex: prev.currentIndex + 1,
      };
    });
  }, [createSnapshot, syncToServer]);

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
    
    // Sync to server
    syncToServer({
      employees: targetState.employees,
      events: targetState.events,
      teamStructures: targetState.teamStructures,
      scenarios: targetState.scenarios,
      hierarchy: targetState.hierarchy,
    });
    
    setUndoRedo({
      past: allHistory.slice(0, index),
      future: allHistory.slice(index + 1),
      currentIndex: index,
    });
  }, [undoRedo, createSnapshot, syncToServer]);

  // Delete employee
  const deleteEmployee = useCallback(async (employeeId: number, activeScenarioId?: string | null) => {
    pushToHistory();
    if (activeScenarioId) {
      setScenarios(prev => {
        const updated = prev.map(s => {
          if (s.id !== activeScenarioId) return s;
          return {
            ...s,
            deletedEmployeeIds: [...s.deletedEmployeeIds, employeeId],
            proposedEmployees: s.proposedEmployees.filter(e => e.id !== employeeId),
          };
        });
        syncToServer({ scenarios: updated });
        return updated;
      });
    } else {
      setMasterEmployees(prev => {
        const updated = prev.filter(e => e.id !== employeeId);
        syncToServer({ employees: updated });
        return updated;
      });
      // Also delete related events
      setMasterEvents(prev => {
        const updated = prev.filter(e => e.empId !== employeeId);
        syncToServer({ events: updated });
        return updated;
      });
    }
  }, [pushToHistory, syncToServer]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: number, activeScenarioId?: string | null) => {
    pushToHistory();
    if (activeScenarioId) {
      setScenarios(prev => {
        const updated = prev.map(s => {
          if (s.id !== activeScenarioId) return s;
          return {
            ...s,
            deletedEventIds: [...s.deletedEventIds, eventId],
            proposedEvents: s.proposedEvents.filter(e => e.id !== eventId),
          };
        });
        syncToServer({ scenarios: updated });
        return updated;
      });
    } else {
      setMasterEvents(prev => {
        const updated = prev.filter(e => e.id !== eventId);
        syncToServer({ events: updated });
        return updated;
      });
    }
  }, [pushToHistory, syncToServer]);

  // Delete team (from group or direct)
  const deleteTeam = useCallback(async (dept: string, groupName: string | null, teamName: string) => {
    pushToHistory();
    
    let updatedHierarchy: HierarchyStructure = [];
    setHierarchy(prev => {
      updatedHierarchy = prev.map(d => {
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
      return updatedHierarchy;
    });
    
    let updatedEmployees: Employee[] = [];
    setMasterEmployees(prev => {
      updatedEmployees = prev.map(e => 
        e.team === teamName ? { ...e, team: groupName || dept } : e
      );
      return updatedEmployees;
    });
    
    let updatedTeamStructures: TeamStructure[] = [];
    setMasterTeamStructures(prev => {
      updatedTeamStructures = prev.filter(t => t.teamName !== teamName);
      return updatedTeamStructures;
    });
    
    await syncToServer({
      hierarchy: updatedHierarchy,
      employees: updatedEmployees,
      teamStructures: updatedTeamStructures,
    });
  }, [pushToHistory, syncToServer]);

  // Delete group
  const deleteGroup = useCallback(async (dept: string, groupName: string) => {
    pushToHistory();
    
    let updatedHierarchy: HierarchyStructure = [];
    setHierarchy(prev => {
      updatedHierarchy = prev.map(d => {
        if (d.name !== dept) return d;
        return {
          ...d,
          groups: d.groups.filter(g => g.name !== groupName)
        };
      });
      return updatedHierarchy;
    });
    
    let updatedEmployees: Employee[] = [];
    setMasterEmployees(prev => {
      updatedEmployees = prev.filter(e => e.group !== groupName);
      return updatedEmployees;
    });
    
    const group = hierarchy.find(d => d.name === dept)?.groups.find(g => g.name === groupName);
    let updatedTeamStructures: TeamStructure[] = [];
    setMasterTeamStructures(prev => {
      updatedTeamStructures = prev.filter(t => !group?.teams.includes(t.teamName));
      return updatedTeamStructures;
    });
    
    await syncToServer({
      hierarchy: updatedHierarchy,
      employees: updatedEmployees,
      teamStructures: updatedTeamStructures,
    });
  }, [pushToHistory, hierarchy, syncToServer]);

  // Delete department
  const deleteDepartment = useCallback(async (dept: string) => {
    pushToHistory();
    
    let updatedHierarchy: HierarchyStructure = [];
    setHierarchy(prev => {
      updatedHierarchy = prev.filter(d => d.name !== dept);
      return updatedHierarchy;
    });
    
    const deptEmployeeIds = masterEmployees.filter(e => e.dept === dept).map(e => e.id);
    
    let updatedEmployees: Employee[] = [];
    setMasterEmployees(prev => {
      updatedEmployees = prev.filter(e => e.dept !== dept);
      return updatedEmployees;
    });
    
    let updatedEvents: WorkforceEvent[] = [];
    setMasterEvents(prev => {
      updatedEvents = prev.filter(e => !deptEmployeeIds.includes(e.empId));
      return updatedEvents;
    });
    
    let updatedTeamStructures: TeamStructure[] = [];
    setMasterTeamStructures(prev => {
      updatedTeamStructures = prev.filter(t => t.department !== dept);
      return updatedTeamStructures;
    });
    
    await syncToServer({
      hierarchy: updatedHierarchy,
      employees: updatedEmployees,
      events: updatedEvents,
      teamStructures: updatedTeamStructures,
    });
  }, [pushToHistory, masterEmployees, syncToServer]);

  // Add department
  const addDepartment = useCallback(async (name: string) => {
    pushToHistory();
    let updatedHierarchy: HierarchyStructure = [];
    setHierarchy(prev => {
      updatedHierarchy = [...prev, { name, groups: [], directTeams: [] }];
      return updatedHierarchy;
    });
    await syncToServer({ hierarchy: updatedHierarchy });
  }, [pushToHistory, syncToServer]);

  // Add group to department
  const addGroup = useCallback(async (dept: string, groupName: string) => {
    pushToHistory();
    let updatedHierarchy: HierarchyStructure = [];
    setHierarchy(prev => {
      updatedHierarchy = prev.map(d => {
        if (d.name !== dept) return d;
        if (d.groups.some(g => g.name === groupName)) return d;
        return {
          ...d,
          groups: [...d.groups, { name: groupName, teams: [] }]
        };
      });
      return updatedHierarchy;
    });
    await syncToServer({ hierarchy: updatedHierarchy });
  }, [pushToHistory, syncToServer]);

  // Add team to group
  const addTeam = useCallback(async (dept: string, groupName: string | null, teamName: string) => {
    pushToHistory();
    let updatedHierarchy: HierarchyStructure = [];
    setHierarchy(prev => {
      updatedHierarchy = prev.map(d => {
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
      return updatedHierarchy;
    });
    await syncToServer({ hierarchy: updatedHierarchy });
  }, [pushToHistory, syncToServer]);

  // Add direct team to department (convenience method)
  const addDirectTeam = useCallback(async (dept: string, teamName: string) => {
    await addTeam(dept, null, teamName);
  }, [addTeam]);

  // Clear all data and reset to initial
  const resetToInitial = useCallback(async () => {
    pushToHistory();
    setMasterEmployees(initialEmployees);
    setMasterEvents(initialEvents);
    setMasterTeamStructures(initialTeamStructures);
    setHierarchy(initialHierarchy);
    setScenarios([]);
    
    await syncToServer({
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
    setMasterEmployees(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      syncToServer({ employees: updated });
      return updated;
    });
  }, [pushToHistory, syncToServer]);

  const setMasterEventsWithSync = useCallback((updater: WorkforceEvent[] | ((prev: WorkforceEvent[]) => WorkforceEvent[])) => {
    pushToHistory();
    setMasterEvents(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      syncToServer({ events: updated });
      return updated;
    });
  }, [pushToHistory, syncToServer]);

  const setMasterTeamStructuresWithSync = useCallback((updater: TeamStructure[] | ((prev: TeamStructure[]) => TeamStructure[])) => {
    pushToHistory();
    setMasterTeamStructures(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      syncToServer({ teamStructures: updated });
      return updated;
    });
  }, [pushToHistory, syncToServer]);

  const setHierarchyWithSync = useCallback((updater: HierarchyStructure | ((prev: HierarchyStructure) => HierarchyStructure)) => {
    pushToHistory();
    setHierarchy(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      syncToServer({ hierarchy: updated });
      return updated;
    });
  }, [pushToHistory, syncToServer]);

  const setScenariosWithSync = useCallback((updater: Scenario[] | ((prev: Scenario[]) => Scenario[])) => {
    setScenarios(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      syncToServer({ scenarios: updated });
      return updated;
    });
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
    departments, // Derived flat structure for backwards compat
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
    refreshFromServer: async () => {
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
    },
  };
};
