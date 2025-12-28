import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Employee,
  WorkforceEvent,
  TeamStructure,
  Scenario,
  DEPARTMENTS,
  initialEmployees,
  initialEvents,
  initialTeamStructures,
} from '@/lib/workforce-data';

const STORAGE_KEY = 'workforce-planner-data';

interface WorkforceData {
  masterEmployees: Employee[];
  masterEvents: WorkforceEvent[];
  masterTeamStructures: TeamStructure[];
  departments: Record<string, string[]>;
  scenarios: Scenario[];
}

interface HistoryState {
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
  scenarios: Scenario[];
  departments: Record<string, string[]>;
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
          departments: parsed.departments || DEPARTMENTS,
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
      departments: DEPARTMENTS,
      scenarios: [],
    };
  };

  const [masterEmployees, setMasterEmployees] = useState<Employee[]>(() => loadInitialData().masterEmployees);
  const [masterEvents, setMasterEvents] = useState<WorkforceEvent[]>(() => loadInitialData().masterEvents);
  const [masterTeamStructures, setMasterTeamStructures] = useState<TeamStructure[]>(() => loadInitialData().masterTeamStructures);
  const [departments, setDepartments] = useState<Record<string, string[]>>(() => loadInitialData().departments);
  const [scenarios, setScenarios] = useState<Scenario[]>(() => loadInitialData().scenarios);

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
      departments,
      scenarios,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save workforce data to localStorage:', e);
    }
  }, [masterEmployees, masterEvents, masterTeamStructures, departments, scenarios]);

  // Create a snapshot of current state
  const createSnapshot = useCallback((): HistoryState => ({
    employees: JSON.parse(JSON.stringify(masterEmployees)),
    events: JSON.parse(JSON.stringify(masterEvents)),
    teamStructures: JSON.parse(JSON.stringify(masterTeamStructures)),
    scenarios: JSON.parse(JSON.stringify(scenarios)),
    departments: JSON.parse(JSON.stringify(departments)),
  }), [masterEmployees, masterEvents, masterTeamStructures, scenarios, departments]);

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
      setDepartments(previousState.departments);
      
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
      setDepartments(nextState.departments);
      
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
    setDepartments(targetState.departments);
    
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
  const deleteTeam = useCallback((dept: string, teamName: string) => {
    pushToHistory();
    setDepartments(prev => ({
      ...prev,
      [dept]: prev[dept].filter(t => t !== teamName),
    }));
    // Move employees from deleted team to department level
    setMasterEmployees(prev => prev.map(e => 
      e.team === teamName ? { ...e, team: dept } : e
    ));
    // Remove team structure
    setMasterTeamStructures(prev => prev.filter(t => t.teamName !== teamName));
  }, [pushToHistory]);

  // Delete department
  const deleteDepartment = useCallback((dept: string) => {
    pushToHistory();
    // Get teams in this department
    const deptTeams = departments[dept] || [];
    
    // Remove department and its teams
    setDepartments(prev => {
      const updated = { ...prev };
      delete updated[dept];
      return updated;
    });
    
    // Delete all employees in this department
    setMasterEmployees(prev => prev.filter(e => e.dept !== dept));
    
    // Delete all events for employees in this department
    const deptEmployeeIds = masterEmployees.filter(e => e.dept === dept).map(e => e.id);
    setMasterEvents(prev => prev.filter(e => !deptEmployeeIds.includes(e.empId)));
    
    // Remove team structures
    setMasterTeamStructures(prev => prev.filter(t => t.department !== dept));
  }, [pushToHistory, departments, masterEmployees]);

  // Clear all data and reset to initial
  const resetToInitial = useCallback(() => {
    pushToHistory();
    setMasterEmployees(initialEmployees);
    setMasterEvents(initialEvents);
    setMasterTeamStructures(initialTeamStructures);
    setDepartments(DEPARTMENTS);
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
    departments,
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
    setDepartments: useCallback((updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => {
      pushToHistory();
      setDepartments(updater);
    }, [pushToHistory]),
    setScenarios,
    // Direct setters (without history for bulk imports)
    setMasterEmployeesDirect: setMasterEmployees,
    setMasterEventsDirect: setMasterEvents,
    setMasterTeamStructuresDirect: setMasterTeamStructures,
    setDepartmentsDirect: setDepartments,
    // Delete operations
    deleteEmployee,
    deleteEvent,
    deleteTeam,
    deleteDepartment,
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
