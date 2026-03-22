// Configuration & Constants - Hierarchy: Department → Group → Team
// Each level has a required manager: Department Manager, Group Manager, Team Leader
// Teams can be under groups OR directly under departments

// Team structure with leader
export interface TeamInfo {
  name: string;
  teamLeaderId?: number; // Employee ID of team leader
}

// Group structure with teams
export interface GroupStructure {
  name: string;
  teams: string[]; // Team names within this group
  groupManagerId?: number; // Employee ID of group manager
}

// Department structure - can have groups AND direct teams
export interface DepartmentStructure {
  name: string;
  groups: GroupStructure[]; // Groups with their teams
  directTeams: string[]; // Teams directly under department (no group)
  departmentManagerId?: number; // Employee ID of department manager
}

// Full hierarchy structure
export type HierarchyStructure = DepartmentStructure[];

// Legacy flat structure for backwards compatibility (derived from hierarchy)
export const getDepartmentsFlat = (hierarchy: HierarchyStructure): Record<string, string[]> => {
  const flat: Record<string, string[]> = {};
  hierarchy.forEach(dept => {
    const allTeams: string[] = [...(dept.directTeams || [])];
    dept.groups.forEach(group => {
      allTeams.push(...group.teams);
    });
    flat[dept.name] = allTeams;
  });
  return flat;
};

// Get all teams in a department (both direct and under groups)
export const getAllDeptTeams = (dept: DepartmentStructure): string[] => {
  const teams: string[] = [...(dept.directTeams || [])];
  dept.groups.forEach(g => teams.push(...g.teams));
  return teams;
};

// Get groups for a department
export const getGroupsForDepartment = (hierarchy: HierarchyStructure, deptName: string): GroupStructure[] => {
  const dept = hierarchy.find(d => d.name === deptName);
  return dept?.groups || [];
};

// Get team's parent (either group or direct under department)
export const getTeamParent = (hierarchy: HierarchyStructure, teamName: string): { dept: DepartmentStructure; group: GroupStructure | null } | null => {
  for (const dept of hierarchy) {
    // Check direct teams first
    if (dept.directTeams?.includes(teamName)) {
      return { dept, group: null };
    }
    // Check groups
    for (const group of dept.groups) {
      if (group.teams.includes(teamName)) {
        return { dept, group };
      }
    }
  }
  return null;
};

// Legacy: Get team's parent group (for backwards compatibility)
export const getTeamGroup = (hierarchy: HierarchyStructure, teamName: string): { dept: DepartmentStructure; group: GroupStructure } | null => {
  const parent = getTeamParent(hierarchy, teamName);
  if (parent && parent.group) {
    return { dept: parent.dept, group: parent.group };
  }
  return null;
};

// Initial hierarchy structure
export const initialHierarchy: HierarchyStructure = [
  {
    name: 'Engineering',
    departmentManagerId: 100, // Victoria Palmer
    directTeams: [], // Teams directly under department
    groups: [
      {
        name: 'Frontend',
        groupManagerId: 101, // Marcus Webb
        teams: ['Frontend Alpha', 'Frontend Beta']
      },
      {
        name: 'Backend',
        groupManagerId: 102, // Sandra Hughes
        teams: ['Backend Core', 'Backend API']
      },
      {
        name: 'Platform',
        teams: ['Infrastructure', 'Security']
      },
      {
        name: 'Mobile',
        teams: ['Mobile iOS', 'Mobile Android']
      }
    ]
  },
  {
    name: 'Product & Design',
    departmentManagerId: 200, // Patricia Stone
    directTeams: [],
    groups: [
      {
        name: 'Product',
        teams: ['Product Core', 'Product Growth']
      },
      {
        name: 'Design & Research',
        teams: ['UX Research', 'UX Design', 'Data Analytics']
      }
    ]
  },
  {
    name: 'Operations',
    departmentManagerId: 300, // Robert Kane
    directTeams: ['Executive Office'], // Example direct team
    groups: [
      {
        name: 'People & Culture',
        teams: ['HR & People', 'Office Management']
      },
      {
        name: 'Business Operations',
        teams: ['Finance', 'Legal']
      }
    ]
  }
];

// Legacy DEPARTMENTS for backwards compatibility
export const DEPARTMENTS: Record<string, string[]> = getDepartmentsFlat(initialHierarchy);
export const DEPARTMENT_NAMES = Object.keys(DEPARTMENTS);

export const ROLE_COLORS: Record<string, string> = {
  'Junior Dev': 'role-junior',
  'Mid-Level Dev': 'role-mid',
  'Senior Dev': 'role-senior',
  'Team Lead': 'role-lead',
  'Architect': 'role-architect',
  'Product Manager': 'role-pm',
  'QA Engineer': 'role-qa',
  'Engineering Manager': 'role-manager',
  'Group Manager': 'role-manager',
  'Department Manager': 'role-manager',
  'Default': 'role-default'
};

export const ROLE_TEXT_COLORS: Record<string, string> = {
  'Junior Dev': 'text-role-junior',
  'Mid-Level Dev': 'text-role-mid',
  'Senior Dev': 'text-role-senior',
  'Team Lead': 'text-role-lead',
  'Architect': 'text-role-architect',
  'Product Manager': 'text-role-pm',
  'QA Engineer': 'text-role-qa',
  'Engineering Manager': 'text-role-manager',
  'Group Manager': 'text-role-manager',
  'Department Manager': 'text-role-manager',
  'Default': 'text-muted-foreground'
};

export const ROLES = Object.keys(ROLE_COLORS).filter(r => r !== 'Default');
export const STATUSES = ['Active', 'On Course', 'Parental Leave', 'Notice Period'] as const;
// Promotion is for role advancement within team, Decision Flag for other decisions
export const EVENT_TYPES = ['Team Swap', 'Promotion', 'Training', 'Course', 'Departure', 'New Joiner', 'Decision Flag'] as const;

// Promotion levels for automatic advancement
export const SENIORITY_LEVELS = ['Junior Dev', 'Mid-Level Dev', 'Senior Dev', 'Team Lead'] as const;
export type SeniorityLevel = typeof SENIORITY_LEVELS[number];

// Manager level types
export type ManagerLevel = 'department' | 'group' | 'team' | 'none';

// Timeline Range (Jan 2020 - Dec 2030) - Extended to show historical data
export const TIMELINE_START = new Date('2020-01-01');
export const TIMELINE_END = new Date('2030-12-31');

// Team Structure Definition
export interface TeamStructure {
  teamName: string;
  department: string;
  group: string; // Parent group name
  teamLeader?: number; // Employee ID of team leader
  requiredRoles: Record<string, number>; // Role name -> count required
  requiredSkills?: string[]; // Label names the team needs at least one member to have
  targetSize?: number; // Optional target team size
}

// Label for skills tracking
export interface Label {
  id: number;
  name: string;
  color?: string;
  created_by?: string;
}

// Work types for capacity calculation
export const WORK_TYPES = ['Full-Time', 'Part-Time'] as const;
export type WorkType = typeof WORK_TYPES[number];

// Types
export interface Employee {
  id: number;
  name: string;
  dept: string;
  group?: string; // Group name (for group managers or team members)
  team: string; // Team name, or group name for group managers, or dept name for dept managers
  role: string;
  status: string;
  joined: string;
  isPotential?: boolean; // Uncertain hire - for planning purposes
  managerId?: number; // Direct manager
  managerLevel?: ManagerLevel; // What level of management is this person
  workType?: WorkType; // Full-Time (default) or Part-Time
  partTimePercentage?: number; // 10-90% for part-time employees (default 50)
  departureDate?: string; // Optional planned departure date
  skills?: string[]; // Label names assigned to this employee
}

export interface WorkforceEvent {
  id: number;
  empId: number;
  type: string;
  date: string;
  details: string;
  isFlag: boolean;
  targetTeam?: string; // For Team Swap events
  endDate?: string; // For Training/Course events
  isResolved?: boolean; // For decision flags - whether it's been resolved
  resolutionNote?: string; // Short description of the decision/resolution
}

export interface Hierarchy {
  dept: string;
  team: string;
}

// Audit log entry for tracking all changes
export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'employee' | 'event' | 'structure' | 'scenario';
  summary: string;
  details?: Record<string, { before?: string; after?: string }>;
}

// Changelog entry for tracking scenario changes
export interface ScenarioChangelogEntry {
  id: string;
  timestamp: string;
  type: 'employee_added' | 'employee_modified' | 'employee_removed' | 'event_added' | 'event_modified' | 'event_removed';
  entityId: number;
  entityName: string;
  description: string;
  details?: Record<string, { before?: string; after?: string }>;
}

// Strategic Scenario for what-if planning
export interface Scenario {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User ID of the creator
  parentScenarioId?: string; // For duplicated scenarios
  // Snapshot of data when scenario was created
  baseEmployees: Employee[];
  baseEvents: WorkforceEvent[];
  baseTeamStructures: TeamStructure[];
  baseHierarchy: HierarchyStructure;
  // Proposed changes within this scenario
  proposedEmployees: Employee[]; // New hires or modified employees
  proposedEvents: WorkforceEvent[]; // Proposed movements
  // Track which items are scenario-specific
  deletedEmployeeIds: number[]; // Employees "removed" in this scenario
  deletedEventIds: number[]; // Events "removed" in this scenario
  // Changelog for tracking all changes
  changelog: ScenarioChangelogEntry[];
}

export const createScenario = (
  name: string,
  description: string,
  employees: Employee[],
  events: WorkforceEvent[],
  teamStructures: TeamStructure[],
  hierarchy: HierarchyStructure,
  parentScenarioId?: string,
  createdBy?: string
): Scenario => ({
  id: `scenario-${Date.now()}`,
  name,
  description,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy,
  parentScenarioId,
  baseEmployees: JSON.parse(JSON.stringify(employees)),
  baseEvents: JSON.parse(JSON.stringify(events)),
  baseTeamStructures: JSON.parse(JSON.stringify(teamStructures)),
  baseHierarchy: JSON.parse(JSON.stringify(hierarchy)),
  proposedEmployees: [],
  proposedEvents: [],
  deletedEmployeeIds: [],
  deletedEventIds: [],
  changelog: []
});

export const duplicateScenario = (
  scenario: Scenario,
  newName: string,
  createdBy?: string
): Scenario => ({
  id: `scenario-${Date.now()}`,
  name: newName,
  description: `Duplicated from "${scenario.name}"`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: createdBy || scenario.createdBy,
  parentScenarioId: scenario.id,
  baseEmployees: JSON.parse(JSON.stringify(scenario.baseEmployees)),
  baseEvents: JSON.parse(JSON.stringify(scenario.baseEvents)),
  baseTeamStructures: JSON.parse(JSON.stringify(scenario.baseTeamStructures)),
  baseHierarchy: JSON.parse(JSON.stringify(scenario.baseHierarchy)),
  proposedEmployees: JSON.parse(JSON.stringify(scenario.proposedEmployees)),
  proposedEvents: JSON.parse(JSON.stringify(scenario.proposedEvents)),
  deletedEmployeeIds: [...scenario.deletedEmployeeIds],
  deletedEventIds: [...scenario.deletedEventIds],
  changelog: JSON.parse(JSON.stringify(scenario.changelog))
});

export const addScenarioChangelogEntry = (
  scenario: Scenario,
  type: ScenarioChangelogEntry['type'],
  entityId: number,
  entityName: string,
  description: string,
  details?: Record<string, { before?: string; after?: string }>
): Scenario => ({
  ...scenario,
  updatedAt: new Date().toISOString(),
  changelog: [
    ...scenario.changelog,
    {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      entityId,
      entityName,
      description,
      details
    }
  ]
});

// Diff types for scenario comparison
export type DiffStatus = 'added' | 'modified' | 'removed' | 'unchanged';

export interface EmployeeDiff {
  employee: Employee;
  status: DiffStatus;
  changes?: string[];
}

export interface EventDiff {
  event: WorkforceEvent;
  status: DiffStatus;
  changes?: string[];
}

// Calculate employee diffs between master and scenario
export const getEmployeeDiffs = (
  masterEmployees: Employee[],
  scenario: Scenario
): EmployeeDiff[] => {
  const scenarioEmployees = getScenarioEmployees(scenario);
  const masterIds = new Set(masterEmployees.map(e => e.id));
  const scenarioIds = new Set(scenarioEmployees.map(e => e.id));
  const proposedIds = new Set(scenario.proposedEmployees.map(e => e.id));
  
  const diffs: EmployeeDiff[] = [];
  
  // Check all scenario employees
  scenarioEmployees.forEach(emp => {
    if (!masterIds.has(emp.id)) {
      // Added in scenario
      diffs.push({ employee: emp, status: 'added' });
    } else if (proposedIds.has(emp.id)) {
      // Modified in scenario
      const masterEmp = masterEmployees.find(e => e.id === emp.id)!;
      const changes: string[] = [];
      if (masterEmp.team !== emp.team) changes.push(`Team: ${masterEmp.team} → ${emp.team}`);
      if (masterEmp.role !== emp.role) changes.push(`Role: ${masterEmp.role} → ${emp.role}`);
      if (masterEmp.status !== emp.status) changes.push(`Status: ${masterEmp.status} → ${emp.status}`);
      if (masterEmp.managerId !== emp.managerId) changes.push(`Manager changed`);
      diffs.push({ employee: emp, status: 'modified', changes });
    } else {
      diffs.push({ employee: emp, status: 'unchanged' });
    }
  });
  
  // Check for removed employees
  scenario.deletedEmployeeIds.forEach(id => {
    const emp = masterEmployees.find(e => e.id === id);
    if (emp) {
      diffs.push({ employee: emp, status: 'removed' });
    }
  });
  
  return diffs;
};

// Calculate event diffs between master and scenario
export const getEventDiffs = (
  masterEvents: WorkforceEvent[],
  scenario: Scenario
): EventDiff[] => {
  const scenarioEvents = getScenarioEvents(scenario);
  const masterIds = new Set(masterEvents.map(e => e.id));
  const proposedIds = new Set(scenario.proposedEvents.map(e => e.id));
  
  const diffs: EventDiff[] = [];
  
  scenarioEvents.forEach(event => {
    if (!masterIds.has(event.id)) {
      diffs.push({ event, status: 'added' });
    } else if (proposedIds.has(event.id)) {
      diffs.push({ event, status: 'modified' });
    } else {
      diffs.push({ event, status: 'unchanged' });
    }
  });
  
  scenario.deletedEventIds.forEach(id => {
    const event = masterEvents.find(e => e.id === id);
    if (event) {
      diffs.push({ event, status: 'removed' });
    }
  });
  
  return diffs;
};

// Get effective data for a scenario (base + proposed - deleted)
export const getScenarioEmployees = (scenario: Scenario): Employee[] => {
  const baseFiltered = scenario.baseEmployees.filter(
    e => !scenario.deletedEmployeeIds.includes(e.id)
  );
  // Merge: proposed employees override base employees with same ID
  const proposedIds = new Set(scenario.proposedEmployees.map(e => e.id));
  const merged = baseFiltered.filter(e => !proposedIds.has(e.id));
  return [...merged, ...scenario.proposedEmployees];
};

export const getScenarioEvents = (scenario: Scenario): WorkforceEvent[] => {
  const baseFiltered = scenario.baseEvents.filter(
    e => !scenario.deletedEventIds.includes(e.id)
  );
  const proposedIds = new Set(scenario.proposedEvents.map(e => e.id));
  const merged = baseFiltered.filter(e => !proposedIds.has(e.id));
  return [...merged, ...scenario.proposedEvents];
};

// Helper functions
export const getRoleColor = (role: string): string => ROLE_COLORS[role] || ROLE_COLORS['Default'];
export const getRoleTextColor = (role: string): string => ROLE_TEXT_COLORS[role] || ROLE_TEXT_COLORS['Default'];

export const getTimelinePosition = (dateStr: string): number => {
  const date = new Date(dateStr);
  const totalDuration = TIMELINE_END.getTime() - TIMELINE_START.getTime();
  const elapsed = date.getTime() - TIMELINE_START.getTime();
  return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
};

export const getTimelinePositionInRange = (dateStr: string, rangeStart: Date, rangeEnd: Date): number => {
  const date = new Date(dateStr);
  const totalDuration = rangeEnd.getTime() - rangeStart.getTime();
  const elapsed = date.getTime() - rangeStart.getTime();
  return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Active': return 'status-active';
    case 'On Course': return 'status-course';
    case 'Parental Leave': return 'status-leave';
    case 'Notice Period': return 'status-notice';
    default: return 'role-default';
  }
};

// Format date as dd/mm/yyyy
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Capacity weights for different roles
export const getCapacityWeight = (
  role: string,
  joinedDate: string,
  currentDate: Date = new Date(),
  workType?: WorkType,
  partTimePercentage?: number
): number => {
  const joined = new Date(joinedDate);
  const monthsOfExperience = (currentDate.getTime() - joined.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
  
  // Training period (first 6 months for Junior Dev) = 0.3
  if (monthsOfExperience < 6 && role === 'Junior Dev') {
    const base = 0.3;
    return workType === 'Part-Time' ? base * ((partTimePercentage || 50) / 100) : base;
  }
  
  // Full capacity = 1.0 (adjusted for part-time)
  const base = 1.0;
  return workType === 'Part-Time' ? base * ((partTimePercentage || 50) / 100) : base;
};

// ============== INITIAL DATA ==============
// (keeping for offline mode fallback)

export const initialEmployees: Employee[] = [];
export const initialEvents: WorkforceEvent[] = [];
export const initialTeamStructures: TeamStructure[] = [];
