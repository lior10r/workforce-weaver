import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, UserPlus, ChevronRight, Lock, LogOut, Users, Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/workforce/Sidebar';
import { StatsCards } from '@/components/workforce/StatsCards';
import { Dashboard } from '@/components/workforce/Dashboard';
import { Timeline } from '@/components/workforce/Timeline';

import { Roster } from '@/components/workforce/Roster';
import { Planner } from '@/components/workforce/Planner';
import { TeamAnalytics } from '@/components/workforce/TeamAnalytics';

import { AuditLog } from '@/components/workforce/AuditLog';
import { Reports } from '@/components/workforce/Reports';
import { EmployeeModal } from '@/components/workforce/EmployeeModal';
import { EventModal } from '@/components/workforce/EventModal';
import { TeamStructureModal } from '@/components/workforce/TeamStructureModal';
import { ExportImport } from '@/components/workforce/ExportImport';
import { ScenarioManager } from '@/components/workforce/ScenarioManager';
import { DecisionFlagsPanel } from '@/components/workforce/DecisionFlagsPanel';

import { AlertsPanel } from '@/components/workforce/AlertsPanel';
import { useWorkforceData } from '@/hooks/use-workforce-data';
import { useLabels } from '@/hooks/use-labels';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Employee, 
  WorkforceEvent, 
  Hierarchy, 
  TeamStructure,
  Scenario,
  AuditEntry,
  DiffStatus,
  DEPARTMENTS,
  getScenarioEmployees,
  getScenarioEvents,
  getEmployeeDiffs,
  getEventDiffs,
  addScenarioChangelogEntry,
  createScenario,
  getTeamParent
} from '@/lib/workforce-data';

interface ScopeFilter {
  departments: string[];
  groups: string[];
  teams: string[];
}

const Index = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin, isBackendAvailable, linkedEmployee, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    isLoading: isDataLoading,
    error: dataError,
  } = useWorkforceData({ isAuthenticated });

  // Labels
  const { labels, createLabel, deleteLabel } = useLabels(isAuthenticated);

  // Scenario State
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [compareScenarioId, setCompareScenarioId] = useState<string | null>(null);
  
  // Audit log state
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  
  const addAuditEntry = useCallback((action: string, category: AuditEntry['category'], summary: string, details?: AuditEntry['details']) => {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'unknown',
      userName: user?.name || 'Unknown User',
      action,
      category,
      summary,
      details,
    };
    setAuditLog(prev => [...prev, entry]);
  }, [user]);



  // Helper: apply past Team Swap events so current-state views use the employee's real current team
  const getEffectiveEmployees = useCallback((emps: Employee[], evts: WorkforceEvent[]) => {
    const today = new Date();
    const latestPastSwapByEmployee = new Map<number, WorkforceEvent>();

    evts.forEach(event => {
      if (event.type !== 'Team Swap' || !event.targetTeam) return;
      const eventDate = new Date(event.date);
      if (Number.isNaN(eventDate.getTime()) || eventDate > today) return;

      const existing = latestPastSwapByEmployee.get(event.empId);
      if (!existing || new Date(existing.date) < eventDate) {
        latestPastSwapByEmployee.set(event.empId, event);
      }
    });

    return emps.map(emp => {
      const latestSwap = latestPastSwapByEmployee.get(emp.id);
      if (!latestSwap?.targetTeam || latestSwap.targetTeam === emp.team) return emp;

      const parent = getTeamParent(hierarchy, latestSwap.targetTeam);
      return {
        ...emp,
        team: latestSwap.targetTeam,
        dept: parent?.dept.name ?? emp.dept,
        group: parent?.group?.name,
      };
    });
  }, [hierarchy]);

  // Helper: clear teamLeader references where the leader is no longer on that team
  const cleanStaleTeamLeaders = useCallback((emps: Employee[], structures: TeamStructure[]) => {
    let changed = false;
    const cleaned = structures.map(s => {
      if (s.teamLeader) {
        const leaderOnTeam = emps.find(e => e.id === s.teamLeader && e.team === s.teamName && e.status !== 'Departed');
        if (!leaderOnTeam) {
          changed = true;
          return { ...s, teamLeader: undefined };
        }
      }
      return s;
    });
    return { cleaned, changed };
  }, []);

  // Proactively clean stale team leaders whenever master data changes
  useEffect(() => {
    const effectiveMasterEmployees = getEffectiveEmployees(masterEmployees, masterEvents);
    const { cleaned, changed } = cleanStaleTeamLeaders(effectiveMasterEmployees, masterTeamStructures);
    if (changed) {
      setMasterTeamStructuresDirect(cleaned);
    }
  }, [masterEmployees, masterEvents, masterTeamStructures, cleanStaleTeamLeaders, getEffectiveEmployees, setMasterTeamStructuresDirect]);


  // Get the active scenario if one is selected
  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  // Computed: get raw scenario/master data, then derive effective current employees from past transfers
  const rawEmployees = useMemo(() => {
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

  const employees = useMemo(() => getEffectiveEmployees(rawEmployees, events), [rawEmployees, events, getEffectiveEmployees]);

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
  const [showDeparted, setShowDeparted] = useState(false);
  
  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTeamStructureModalOpen, setIsTeamStructureModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingTeamStructure, setEditingTeamStructure] = useState<{ teamName: string; department: string } | null>(null);
  const [eventPrefill, setEventPrefill] = useState<{ empId: number | string; isFlag: boolean; date?: string }>({ empId: '', isFlag: false });
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

    setScopeFilter(prev => {
      // Initial load fix: when hierarchy was empty on first render, prev filter is empty.
      // Default to "show everything" once hierarchy arrives.
      const prevIsEmpty =
        prev.departments.length === 0 && prev.groups.length === 0 && prev.teams.length === 0;

      if (prevIsEmpty) {
        return { departments: allDepts, groups: allGroups, teams: allTeams };
      }

      return {
        departments: prev.departments.filter(d => allDepts.includes(d)),
        groups: prev.groups.filter(g => allGroups.includes(g)),
        teams: prev.teams.filter(t => allTeams.includes(t)),
      };
    });
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
  // Helper: check if employee has departed
  const isEmployeeDeparted = useCallback((emp: Employee) => {
    const today = new Date();
    if (emp.departureDate && new Date(emp.departureDate) <= today) return true;
    const hasDepartureEvent = events.some(ev => 
      ev.empId === emp.id && ev.type === 'Departure' && new Date(ev.date) <= today
    );
    return hasDepartureEvent;
  }, [events]);

  const matchesEmployeeFilters = useCallback((emp: Employee) => {
    const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTeam = scopeFilter.teams.includes(emp.team);
    const isDeptLevel = !allTeamsList.includes(emp.team);
    const matchDeptLevel = isDeptLevel && scopeFilter.departments.includes(emp.dept);
    const matchScope = matchTeam || matchDeptLevel;

    if (!showDeparted && isEmployeeDeparted(emp)) return false;

    return matchSearch && matchScope;
  }, [searchQuery, scopeFilter, allTeamsList, showDeparted, isEmployeeDeparted]);

  const filteredEmployees = useMemo(() => employees.filter(matchesEmployeeFilters), [employees, matchesEmployeeFilters]);
  const filteredTimelineEmployees = useMemo(() => rawEmployees.filter(matchesEmployeeFilters), [rawEmployees, matchesEmployeeFilters]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredEmployees.length,
    onCourse: filteredEmployees.filter(e => e.status === 'On Course' || e.status === 'Parental Leave').length,
    flags: events.filter(ev => ev.isFlag).length,
    upcomingChanges: events.filter(e => new Date(e.date) > new Date()).length
  }), [filteredEmployees, events]);

  // Compute uncovered replacement count for sidebar badge
  const uncoveredReplacementCount = useMemo(() => {
    const today = new Date();
    const windowEnd = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    let uncovered = 0;

    // Collect departing employees
    const departing = new Map<number, { team: string; role: string; date: number }>();
    employees.forEach(emp => {
      if (emp.departureDate) {
        const d = new Date(emp.departureDate);
        if (d >= today && d <= windowEnd) departing.set(emp.id, { team: emp.team, role: emp.role, date: d.getTime() });
      }
    });
    events.forEach(evt => {
      if (evt.type === 'Departure' && !departing.has(evt.empId)) {
        const d = new Date(evt.date);
        if (d >= today && d <= windowEnd) {
          const emp = employees.find(e => e.id === evt.empId);
          if (emp) departing.set(emp.id, { team: emp.team, role: emp.role, date: d.getTime() });
        }
      }
      if (evt.type === 'Team Swap' && evt.targetTeam) {
        const d = new Date(evt.date);
        if (d >= today && d <= windowEnd && !departing.has(evt.empId)) {
          const emp = employees.find(e => e.id === evt.empId);
          if (emp && evt.targetTeam !== emp.team) departing.set(emp.id, { team: emp.team, role: emp.role, date: d.getTime() });
        }
      }
    });

    departing.forEach(({ team, role, date }, empId) => {
      const hasPotentialHire = employees.some(e =>
        e.isPotential && e.id !== empId && e.team === team &&
        Math.abs(new Date(e.joined).getTime() - date) <= THIRTY_DAYS
      );
      if (hasPotentialHire) return;
      const hasIncomingSwap = events.some(evt =>
        evt.type === 'Team Swap' && evt.targetTeam === team &&
        new Date(evt.date) >= today &&
        Math.abs(new Date(evt.date).getTime() - date) <= THIRTY_DAYS
      );
      if (!hasIncomingSwap) uncovered++;
    });

    return uncovered;
  }, [employees, events]);

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
      hierarchy,
      undefined,
      user?.id
    );
    setScenarios(prev => [...prev, workingDraft]);
    setActiveScenarioId(workingDraft.id);
    toast.info('Created "Working Draft" scenario - Master Plan is read-only. Merge when ready.');
    return workingDraft.id;
  }, [activeScenarioId, masterEmployees, masterEvents, masterTeamStructures, hierarchy, setScenarios, user]);

  const handleDeleteEmployee = (employeeId: number) => {
    const scenarioId = ensureWorkingScenario();
    deleteEmployee(employeeId, scenarioId);
    const emp = employees.find(e => e.id === employeeId);
    addAuditEntry('employee_removed', 'employee', `Removed ${emp?.name || 'employee'} from roster`);
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
      
      // For new junior employees (not editing), add a 6-month training event
      if (!isEditing && newEmployee.role === 'Junior Dev') {
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
          updatedScenario = {
            ...updatedScenario,
            baseTeamStructures: updatedScenario.baseTeamStructures.map(structure =>
              structure.teamName === existingEmployee.team && structure.teamLeader === existingEmployee.id
                ? { ...structure, teamLeader: undefined }
                : structure
            )
          };
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
        isEditing ? `Modified employee details` : `Added new employee to ${newEmployee.team}${newEmployee.role === 'Junior Dev' ? ' (with 6-month training)' : ''}`,
        Object.keys(changeDetails).length > 0 ? changeDetails : undefined
      );
    }));
    
    addAuditEntry(
      isEditing ? 'employee_modified' : 'employee_added',
      'employee',
      isEditing ? `Modified ${newEmployee.name}` : `Added ${newEmployee.name} to ${newEmployee.team}`,
      isEditing && existingEmployee ? Object.fromEntries(
        Object.entries({
          Team: existingEmployee.team !== newEmployee.team ? { before: existingEmployee.team, after: newEmployee.team } : undefined,
          Role: existingEmployee.role !== newEmployee.role ? { before: existingEmployee.role, after: newEmployee.role } : undefined,
          Status: existingEmployee.status !== newEmployee.status ? { before: existingEmployee.status, after: newEmployee.status } : undefined,
        }).filter(([, v]) => v !== undefined)
      ) as Record<string, { before?: string; after?: string }> : undefined
    );
    
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
    addAuditEntry('event_added', 'event', `Added ${eventData.type} for ${emp?.name || 'Unknown'}${eventData.isFlag ? ' (Flag)' : ''}`);
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

  const openPlannerForUser = (empId: number, asFlag = false, date?: string) => {
    setEventPrefill({ empId, isFlag: asFlag, date });
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
    // Validate: if teamLeader is set, ensure they're actually on this team
    if (structure.teamLeader) {
      const leaderOnTeam = employees.find(e => e.id === structure.teamLeader && e.team === structure.teamName && e.status !== 'Departed');
      if (!leaderOnTeam) {
        structure = { ...structure, teamLeader: undefined };
      }
    }
    // Team structures always save to master (structural config, not scenario-specific)
    setMasterTeamStructures(prev => {
      const existing = prev.findIndex(s => s.teamName === structure.teamName);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = structure;
        return updated;
      }
      return [...prev, structure];
    });
    
    // Also update active scenario's baseTeamStructures so it's visible immediately
    if (activeScenarioId) {
      setScenarios(prev => prev.map(s => {
        if (s.id !== activeScenarioId) return s;
        const existing = s.baseTeamStructures.findIndex(ts => ts.teamName === structure.teamName);
        const updated = [...s.baseTeamStructures];
        if (existing >= 0) {
          updated[existing] = structure;
        } else {
          updated.push(structure);
        }
        return { ...s, baseTeamStructures: updated };
      }));
    }
    
    addAuditEntry('structure_updated', 'structure', `Updated team structure for ${structure.teamName}`);
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

  const handleMergeToMaster = (scenario: Scenario, selectedChangeIds?: string[]) => {
    pushToHistory();
    
    // If no specific changes selected, merge everything
    if (!selectedChangeIds || selectedChangeIds.length === scenario.changelog.length) {
      const finalEmployees = getScenarioEmployees(scenario);
      const finalEvents = getScenarioEvents(scenario);
      setMasterEmployeesDirect(finalEmployees);
      setMasterEventsDirect(finalEvents);
      // Clean stale team leaders after merge
      const { cleaned, changed } = cleanStaleTeamLeaders(finalEmployees, masterTeamStructures);
      if (changed) setMasterTeamStructuresDirect(cleaned);
      handleDeleteScenario(scenario.id);
      return;
    }

    // Selective merge: only apply selected changelog entries
    const selectedEntries = scenario.changelog.filter(c => selectedChangeIds.includes(c.id));
    
    let updatedEmployees = [...masterEmployees];
    let updatedEvents = [...masterEvents];

    selectedEntries.forEach(entry => {
      switch (entry.type) {
        case 'employee_added': {
          const newEmp = scenario.proposedEmployees.find(e => e.id === entry.entityId);
          if (newEmp) {
            updatedEmployees = [...updatedEmployees.filter(e => e.id !== newEmp.id), newEmp];
          }
          break;
        }
        case 'employee_removed': {
          updatedEmployees = updatedEmployees.filter(e => e.id !== entry.entityId);
          break;
        }
        case 'employee_modified': {
          const modifiedEmp = scenario.proposedEmployees.find(e => e.id === entry.entityId);
          if (modifiedEmp) {
            updatedEmployees = updatedEmployees.map(e => e.id === modifiedEmp.id ? modifiedEmp : e);
          }
          break;
        }
        case 'event_added': {
          const newEvt = scenario.proposedEvents.find(e => e.id === entry.entityId);
          if (newEvt) {
            updatedEvents = [...updatedEvents.filter(e => e.id !== newEvt.id), newEvt];
          }
          break;
        }
        case 'event_removed': {
          updatedEvents = updatedEvents.filter(e => e.id !== entry.entityId);
          break;
        }
      }
    });

    setMasterEmployeesDirect(updatedEmployees);
    setMasterEventsDirect(updatedEvents);
    // Clean stale team leaders after selective merge
    const { cleaned, changed } = cleanStaleTeamLeaders(updatedEmployees, masterTeamStructures);
    if (changed) setMasterTeamStructuresDirect(cleaned);

    // Remove merged entries from scenario, or delete scenario if all merged
    const remainingChangelog = scenario.changelog.filter(c => !selectedChangeIds.includes(c.id));
    if (remainingChangelog.length === 0) {
      handleDeleteScenario(scenario.id);
    } else {
      // Rebuild scenario without merged changes
      const remainingEntries = new Set(remainingChangelog.map(c => c.id));
      const keptProposedEmployees = scenario.proposedEmployees.filter(e => 
        remainingChangelog.some(c => c.entityId === e.id && (c.type === 'employee_added' || c.type === 'employee_modified'))
      );
      const keptDeletedIds = scenario.deletedEmployeeIds.filter(id =>
        remainingChangelog.some(c => c.entityId === id && c.type === 'employee_removed')
      );
      const keptProposedEvents = scenario.proposedEvents.filter(e =>
        remainingChangelog.some(c => c.entityId === e.id && (c.type === 'event_added'))
      );
      const keptDeletedEventIds = (scenario.deletedEventIds || []).filter(id =>
        remainingChangelog.some(c => c.entityId === id && c.type === 'event_removed')
      );

      setScenarios(prev => prev.map(s => s.id === scenario.id ? {
        ...s,
        changelog: remainingChangelog,
        proposedEmployees: keptProposedEmployees,
        deletedEmployeeIds: keptDeletedIds,
        proposedEvents: keptProposedEvents,
        deletedEventIds: keptDeletedEventIds,
      } : s));
    }
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

  // === Manager Assignment Handlers ===
  const handleSetDepartmentManager = useCallback((dept: string, id: number | null) => {
    const deptObj = hierarchy.find(d => d.name === dept);
    const oldManagerId = deptObj?.departmentManagerId;
    
    setHierarchy(prev => prev.map(d => d.name === dept ? { ...d, departmentManagerId: id || undefined } : d));
    
    setMasterEmployees(prev => prev.map(emp => {
      if (oldManagerId && emp.id === oldManagerId && emp.id !== id) {
        return { ...emp, managerLevel: undefined };
      }
      if (id && emp.id === id) {
        return { ...emp, dept, team: dept, group: undefined, managerLevel: 'department' as const, managerId: undefined };
      }
      return emp;
    }));
    
    const empName = id ? employees.find(e => e.id === id)?.name : null;
    addAuditEntry('structure_updated', 'structure', `Set ${empName || 'none'} as Department Manager of ${dept}`);
  }, [hierarchy, employees, setHierarchy, setMasterEmployees, addAuditEntry]);

  const handleSetGroupManager = useCallback((dept: string, groupName: string, id: number | null) => {
    const deptObj = hierarchy.find(d => d.name === dept);
    const groupObj = deptObj?.groups.find(g => g.name === groupName);
    const oldManagerId = groupObj?.groupManagerId;
    const deptManagerId = deptObj?.departmentManagerId;
    
    setHierarchy(prev => prev.map(d => d.name === dept ? { 
      ...d, groups: d.groups.map(g => g.name === groupName ? { ...g, groupManagerId: id || undefined } : g) 
    } : d));
    
    setMasterEmployees(prev => prev.map(emp => {
      if (oldManagerId && emp.id === oldManagerId && emp.id !== id) {
        return { ...emp, managerLevel: undefined };
      }
      if (id && emp.id === id) {
        return { ...emp, dept, group: groupName, team: groupName, managerLevel: 'group' as const, managerId: deptManagerId || undefined };
      }
      return emp;
    }));
    
    const empName = id ? employees.find(e => e.id === id)?.name : null;
    addAuditEntry('structure_updated', 'structure', `Set ${empName || 'none'} as Group Manager of ${groupName}`);
  }, [hierarchy, employees, setHierarchy, setMasterEmployees, addAuditEntry]);

  const handleSetTeamLeader = useCallback((teamName: string, id: number | null) => {
    const existingStructure = teamStructures.find(s => s.teamName === teamName);
    const oldLeaderId = existingStructure?.teamLeader;
    
    setMasterTeamStructures(prev => {
      const existing = prev.find(s => s.teamName === teamName);
      if (existing) {
        return prev.map(s => s.teamName === teamName ? { ...s, teamLeader: id || undefined } : s);
      }
      let teamDept = '';
      let teamGroup = '';
      for (const d of hierarchy) {
        if (d.directTeams?.includes(teamName)) { teamDept = d.name; break; }
        for (const g of d.groups) {
          if (g.teams.includes(teamName)) { teamDept = d.name; teamGroup = g.name; break; }
        }
        if (teamDept) break;
      }
      return [...prev, { teamName, department: teamDept, group: teamGroup, requiredRoles: {}, teamLeader: id || undefined }];
    });
    
    // Find reporting line
    let groupManagerId: number | undefined;
    let deptManagerId: number | undefined;
    for (const d of hierarchy) {
      if (d.directTeams?.includes(teamName)) { deptManagerId = d.departmentManagerId; break; }
      for (const g of d.groups) {
        if (g.teams.includes(teamName)) { deptManagerId = d.departmentManagerId; groupManagerId = g.groupManagerId; break; }
      }
      if (deptManagerId) break;
    }
    
    setMasterEmployees(prev => prev.map(emp => {
      if (id && emp.id === id) {
        return { ...emp, role: 'Team Lead', managerLevel: 'team' as const, managerId: groupManagerId || deptManagerId || undefined };
      }
      if (oldLeaderId && emp.id === oldLeaderId && emp.id !== id) {
        return { ...emp, role: 'Senior Dev', managerLevel: undefined };
      }
      return emp;
    }));
    
    const empName = id ? employees.find(e => e.id === id)?.name : null;
    addAuditEntry('structure_updated', 'structure', `Set ${empName || 'none'} as Team Leader of ${teamName}`);
  }, [hierarchy, teamStructures, employees, setMasterTeamStructures, setMasterEmployees, addAuditEntry]);

  const getViewTitle = () => {
    switch (view) {
      case 'dashboard': return 'Operations Center';
      case 'timeline': return 'Strategic Roadmap';
      case 'roster': return 'Department Directory';
      case 'planner': return 'Strategic Movements';
      case 'analytics': return 'Team Analytics';
      
      case 'audit': return 'Activity Log';
      case 'reports': return 'Reports';
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
        showDeparted={showDeparted}
        setShowDeparted={setShowDeparted}
        uncoveredReplacementCount={uncoveredReplacementCount}
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
                {(isAdmin || user?.role === 'manager') && (
                    <button 
                      onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }}
                      className="btn-primary whitespace-nowrap"
                    >
                      <UserPlus size={18} />
                      <span className="hidden sm:inline">Hire</span>
                    </button>
                )}
                {isAdmin && (
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
                      orgChartRef={undefined}
                    />
                )}
                
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg border border-border bg-accent/50 hover:bg-accent transition-colors"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun size={16} className="text-muted-foreground" /> : <Moon size={16} className="text-muted-foreground" />}
                </button>
                
                {/* Backend/Auth Status */}
                {!isBackendAvailable && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    Offline Mode
                  </Badge>
                )}
                
                {/* Login Button - show when backend is available but not authenticated */}
                {isBackendAvailable && !isAuthenticated && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                )}
                
                {/* User Menu - show when authenticated */}
                {isBackendAvailable && isAuthenticated && user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.username}</p>
                          <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'manager' ? 'default' : 'secondary'} className="w-fit mt-1">
                            {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </div>
                      </DropdownMenuLabel>
                      {linkedEmployee && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                            Linked to: {linkedEmployee.name} ({linkedEmployee.team})
                          </DropdownMenuLabel>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => navigate('/users')}>
                          <Users className="mr-2 h-4 w-4" />
                          Manage Users
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </header>

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Views */}
          {view === 'dashboard' && (
            <Dashboard 
              employees={filteredEmployees} 
              allEmployees={employees}
              events={events} 
              hierarchy={legacyHierarchy}
              setHierarchy={() => {}}
              departments={departments}
              teamStructures={teamStructures}
              fullHierarchy={hierarchy}
              onNavigateToTeam={(teamName) => {
                const dept = hierarchy.find(d => {
                  const allTeams = [...(d.directTeams || [])];
                  d.groups.forEach(g => allTeams.push(...g.teams));
                  return allTeams.includes(teamName);
                });
                if (dept) {
                  setScopeFilter(prev => ({
                    ...prev,
                    departments: [dept.name],
                    teams: [teamName],
                  }));
                }
                setView('timeline');
              }}
              onHireForTeam={(isAdmin || user?.role === 'manager') ? (prefill) => {
                setEmployeePrefill(prefill);
                setEditingEmployee(null);
                setIsEmployeeModalOpen(true);
              } : undefined}
            />
          )}

          {view === 'timeline' && (
            <div className="space-y-6">
              <Timeline
                employees={filteredTimelineEmployees} 
                events={events}
                openPlannerForUser={openPlannerForUser}
                allEmployees={rawEmployees}
                effectiveEmployees={filteredEmployees}
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
                onEditEmployee={handleEditEmployee}
                onUpdateEventDate={(eventId, newDate) => {
                  const event = events.find(e => e.id === eventId);
                  if (!event) return;
                  const scenarioId = ensureWorkingScenario();
                  setScenarios(prev => prev.map(s => {
                    if (s.id !== scenarioId) return s;
                    const inProposed = s.proposedEvents.find(e => e.id === eventId);
                    if (inProposed) {
                      return { ...s, proposedEvents: s.proposedEvents.map(e => e.id === eventId ? { ...e, date: newDate } : e) };
                    }
                    return { ...s, proposedEvents: [...s.proposedEvents, { ...event, date: newDate }] };
                  }));
                }}
              />
            </div>
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
              onAddDepartment={isAdmin ? handleAddDepartment : undefined}
              onAddGroup={isAdmin ? addGroup : undefined}
              onAddTeam={isAdmin ? handleAddTeamFull : undefined}
              onDeleteDepartment={isAdmin ? deleteDepartment : undefined}
              onDeleteGroup={isAdmin ? deleteGroup : undefined}
              onDeleteTeam={isAdmin ? deleteTeam : undefined}
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

                  const updatedTeamStructures = s.baseTeamStructures.map(structure =>
                    structure.teamName === emp.team && structure.teamLeader === employeeId
                      ? { ...structure, teamLeader: undefined }
                      : structure
                  );
                  
                  return addScenarioChangelogEntry(
                    { ...s, proposedEmployees: updatedEmployees, baseTeamStructures: updatedTeamStructures },
                    'employee_modified',
                    employeeId,
                    emp.name,
                    `Moved from ${emp.team} to ${teamName}`
                  );
                }));
              }}
              onHireForTeam={(isAdmin || user?.role === 'manager') ? (prefill) => {
                setEmployeePrefill(prefill);
                setEditingEmployee(null);
                setIsEmployeeModalOpen(true);
              } : undefined}
              labels={labels}
              onCreateLabel={async (name) => { try { return await createLabel(name); } catch { return undefined; } }}
              onDeleteLabel={isAdmin ? deleteLabel : undefined}
              isAdmin={isAdmin}
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


          {view === 'audit' && isAdmin && (
            <AuditLog auditLog={auditLog} />
          )}

          {view === 'reports' && (
            <Reports
              employees={filteredEmployees}
              events={events}
              teamStructures={teamStructures}
              hierarchy={hierarchy}
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
        teamStructures={teamStructures}
        prefill={employeePrefill}
        labels={labels}
        onCreateLabel={async (name) => { try { return await createLabel(name); } catch { return undefined; } }}
        isBackendAvailable={isBackendAvailable}
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
        labels={labels}
        onCreateLabel={async (name) => { try { return await createLabel(name); } catch { return undefined; } }}
        onDeleteLabel={isAdmin ? deleteLabel : undefined}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default Index;
