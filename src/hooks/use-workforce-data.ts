import { useState, useEffect, useCallback, useMemo } from 'react';
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

const STORAGE_KEY = 'workforce-planner-data';

interface WorkforceData {
  masterEmployees: Employee[];
  masterEvents: WorkforceEvent[];
  masterTeamStructures: TeamStructure[];
  hierarchy: HierarchyStructure;
  scenarios: Scenario[];
}

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
  // Load initial data from localStorage or use defaults
  const loadInitialData = (): WorkforceData => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          masterEmployees: parsed.masterEmployees || initialEmployees,
          masterEvents: parsed.masterEvents || initialEvents,
          masterTeamStructures: parsed.masterTeamStructures || initialTeamStructures,
          hierarchy: parsed.hierarchy || initialHierarchy,
          scenarios: parsed.scenarios || [],
        };
      }
    } catch (e) {
      console.error('Failed to load workforce data from localStorage:', e);
    }
    return {
      masterEmployees: initialEmployees,
      masterEvents: initialEvents,
      masterTeamStructures: initialTeamStructures,
      hierarchy: initialHierarchy,
      scenarios: [],
    };
  };

  const [masterEmployees, setMasterEmployees] = useState<Employee[]>(() => loadInitialData().masterEmployees);
  const [masterEvents, setMasterEvents] = useState<WorkforceEvent[]>(() => loadInitialData().masterEvents);
  const [masterTeamStructures, setMasterTeamStructures] = useState<TeamStructure[]>(() => loadInitialData().masterTeamStructures);
  const [hierarchy, setHierarchy] = useState<HierarchyStructure>(() => loadInitialData().hierarchy);
  const [scenarios, setScenarios] = useState<Scenario[]>(() => loadInitialData().scenarios);

  // Derived flat departments for backwards compatibility
  const departments = useMemo(() => getDepartmentsFlat(hierarchy), [hierarchy]);

  // Undo/Redo state
  const [undoRedo, setUndoRedo] = useState<UndoRedoState>({
    past: [],
    future: [],
    currentIndex: -1,
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    const data: WorkforceData = {
      masterEmployees,
      masterEvents,
      masterTeamStructures,
      hierarchy,
      scenarios,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save workforce data to localStorage:', e);
    }
  }, [masterEmployees, masterEvents, masterTeamStructures, hierarchy, scenarios]);

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
      
      return {
        past: prev.past.slice(0, -1),
        future: [currentSnapshot, ...prev.future],
        currentIndex: prev.currentIndex - 1,
      };
    });
  }, [createSnapshot]);

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
      
      return {
        past: [...prev.past, currentSnapshot],
        future: prev.future.slice(1),
        currentIndex: prev.currentIndex + 1,
      };
    });
  }, [createSnapshot]);

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
  }, [undoRedo, createSnapshot]);

  // Delete employee
  const deleteEmployee = useCallback((employeeId: number, activeScenarioId?: string | null) => {
    pushToHistory();
    if (activeScenarioId) {
      setScenarios(prev => prev.map(s => {
        if (s.id !== activeScenarioId) return s;
        return {
          ...s,
          deletedEmployeeIds: [...s.deletedEmployeeIds, employeeId],
          proposedEmployees: s.proposedEmployees.filter(e => e.id !== employeeId),
        };
      }));
    } else {
      setMasterEmployees(prev => prev.filter(e => e.id !== employeeId));
      // Also delete related events
      setMasterEvents(prev => prev.filter(e => e.empId !== employeeId));
    }
  }, [pushToHistory]);

  // Delete event
  const deleteEvent = useCallback((eventId: number, activeScenarioId?: string | null) => {
    pushToHistory();
    if (activeScenarioId) {
      setScenarios(prev => prev.map(s => {
        if (s.id !== activeScenarioId) return s;
        return {
          ...s,
          deletedEventIds: [...s.deletedEventIds, eventId],
          proposedEvents: s.proposedEvents.filter(e => e.id !== eventId),
        };
      }));
    } else {
      setMasterEvents(prev => prev.filter(e => e.id !== eventId));
    }
  }, [pushToHistory]);

  // Delete team
  const deleteTeam = useCallback((dept: string, groupName: string, teamName: string) => {
    pushToHistory();
    setHierarchy(prev => prev.map(d => {
      if (d.name !== dept) return d;
      return {
        ...d,
        groups: d.groups.map(g => {
          if (g.name !== groupName) return g;
          return {
            ...g,
            teams: g.teams.filter(t => t !== teamName)
          };
        }).filter(g => g.teams.length > 0) // Remove empty groups
      };
    }));
    // Move employees from deleted team to group level
    setMasterEmployees(prev => prev.map(e => 
      e.team === teamName ? { ...e, team: groupName } : e
    ));
    // Remove team structure
    setMasterTeamStructures(prev => prev.filter(t => t.teamName !== teamName));
  }, [pushToHistory]);

  // Delete group
  const deleteGroup = useCallback((dept: string, groupName: string) => {
    pushToHistory();
    setHierarchy(prev => prev.map(d => {
      if (d.name !== dept) return d;
      return {
        ...d,
        groups: d.groups.filter(g => g.name !== groupName)
      };
    }));
    // Delete all employees in this group
    setMasterEmployees(prev => prev.filter(e => e.group !== groupName));
    // Delete team structures
    setMasterTeamStructures(prev => prev.filter(t => {
      const group = hierarchy.find(d => d.name === dept)?.groups.find(g => g.name === groupName);
      return !group?.teams.includes(t.teamName);
    }));
  }, [pushToHistory, hierarchy]);

  // Delete department
  const deleteDepartment = useCallback((dept: string) => {
    pushToHistory();
    setHierarchy(prev => prev.filter(d => d.name !== dept));
    
    // Delete all employees in this department
    setMasterEmployees(prev => prev.filter(e => e.dept !== dept));
    
    // Delete all events for employees in this department
    const deptEmployeeIds = masterEmployees.filter(e => e.dept === dept).map(e => e.id);
    setMasterEvents(prev => prev.filter(e => !deptEmployeeIds.includes(e.empId)));
    
    // Remove team structures
    setMasterTeamStructures(prev => prev.filter(t => t.department !== dept));
  }, [pushToHistory, masterEmployees]);

  // Add department
  const addDepartment = useCallback((name: string) => {
    pushToHistory();
    setHierarchy(prev => [...prev, { name, groups: [] }]);
  }, [pushToHistory]);

  // Add group to department
  const addGroup = useCallback((dept: string, groupName: string) => {
    pushToHistory();
    setHierarchy(prev => prev.map(d => {
      if (d.name !== dept) return d;
      if (d.groups.some(g => g.name === groupName)) return d;
      return {
        ...d,
        groups: [...d.groups, { name: groupName, teams: [] }]
      };
    }));
  }, [pushToHistory]);

  // Add team to group
  const addTeam = useCallback((dept: string, groupName: string, teamName: string) => {
    pushToHistory();
    setHierarchy(prev => prev.map(d => {
      if (d.name !== dept) return d;
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
    }));
  }, [pushToHistory]);

  // Clear all data and reset to initial
  const resetToInitial = useCallback(() => {
    pushToHistory();
    setMasterEmployees(initialEmployees);
    setMasterEvents(initialEvents);
    setMasterTeamStructures(initialTeamStructures);
    setHierarchy(initialHierarchy);
    setScenarios([]);
  }, [pushToHistory]);

  const canUndo = undoRedo.past.length > 0;
  const canRedo = undoRedo.future.length > 0;
  const historyLength = undoRedo.past.length + 1 + undoRedo.future.length;

  return {
    // Data
    masterEmployees,
    masterEvents,
    masterTeamStructures,
    hierarchy,
    departments, // Derived flat structure for backwards compat
    scenarios,
    // Setters with history
    setMasterEmployees: useCallback((updater: Employee[] | ((prev: Employee[]) => Employee[])) => {
      pushToHistory();
      setMasterEmployees(updater);
    }, [pushToHistory]),
    setMasterEvents: useCallback((updater: WorkforceEvent[] | ((prev: WorkforceEvent[]) => WorkforceEvent[])) => {
      pushToHistory();
      setMasterEvents(updater);
    }, [pushToHistory]),
    setMasterTeamStructures: useCallback((updater: TeamStructure[] | ((prev: TeamStructure[]) => TeamStructure[])) => {
      pushToHistory();
      setMasterTeamStructures(updater);
    }, [pushToHistory]),
    setHierarchy: useCallback((updater: HierarchyStructure | ((prev: HierarchyStructure) => HierarchyStructure)) => {
      pushToHistory();
      setHierarchy(updater);
    }, [pushToHistory]),
    setScenarios,
    // Direct setters (without history for bulk imports)
    setMasterEmployeesDirect: setMasterEmployees,
    setMasterEventsDirect: setMasterEvents,
    setMasterTeamStructuresDirect: setMasterTeamStructures,
    setHierarchyDirect: setHierarchy,
    // Operations
    deleteEmployee,
    deleteEvent,
    deleteTeam,
    deleteGroup,
    deleteDepartment,
    addDepartment,
    addGroup,
    addTeam,
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
  };
};
