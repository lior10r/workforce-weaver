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
  targetSize?: number; // Optional target team size
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

// Check if role is a developer role (eligible for progression-based capacity)
export const isDeveloperRole = (role: string): boolean => {
  const devRoles = ['Junior Dev', 'Mid-Level Dev', 'Senior Dev'];
  return devRoles.includes(role);
};

// Calculate capacity weight based on tenure, role, and work type
export const getCapacityWeight = (
  role: string, 
  joined: string, 
  asOfDate: Date = new Date(), 
  workType: WorkType = 'Full-Time',
  partTimePercentage: number = 50
): number => {
  if (role === 'Team Lead') return 0; // Team leads don't count
  
  // Non-developers get full capacity (1.0) - no training period or progression
  if (!isDeveloperRole(role)) {
    const workTypeMultiplier = workType === 'Part-Time' ? (partTimePercentage / 100) : 1;
    return 1.0 * workTypeMultiplier;
  }
  
  const joinDate = new Date(joined);
  const monthsOfExperience = (asOfDate.getTime() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
  const yearsOfExperience = monthsOfExperience / 12;
  
  // Training period (0.3x) only applies to Junior Dev in first 6 months
  // Junior: 0.7x, Mid-level: 1x, Senior: 1.5x
  let baseWeight: number;
  if (role === 'Junior Dev' && monthsOfExperience < 6) {
    baseWeight = 0.3; // Training period for juniors only
  } else if (role === 'Junior Dev') {
    baseWeight = 0.7;
  } else if (role === 'Senior Dev' || yearsOfExperience >= 3) {
    baseWeight = 1.5;
  } else {
    baseWeight = 1.0; // Mid-level
  }
  
  // Part-time employees contribute based on their configured percentage
  if (workType === 'Part-Time') {
    const percentage = Math.max(10, Math.min(90, partTimePercentage)) / 100;
    return baseWeight * percentage;
  }
  return baseWeight;
};

// Get effective role based on tenure
export const getEffectiveRole = (originalRole: string, joined: string, asOfDate: Date = new Date()): string => {
  if (originalRole === 'Team Lead' || originalRole === 'Architect' || originalRole === 'Engineering Manager' || originalRole === 'Product Manager' || originalRole === 'Group Manager' || originalRole === 'Department Manager') {
    return originalRole;
  }
  
  const joinDate = new Date(joined);
  const yearsOfExperience = (asOfDate.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  if (yearsOfExperience >= 3) return 'Senior Dev';
  if (yearsOfExperience >= 1) return 'Mid-Level Dev';
  return 'Junior Dev';
};

// Determine employee's manager level
export const getManagerLevel = (employee: Employee, hierarchy: HierarchyStructure): ManagerLevel => {
  // Check if dept manager
  const dept = hierarchy.find(d => d.departmentManagerId === employee.id);
  if (dept) return 'department';
  
  // Check if group manager
  for (const d of hierarchy) {
    const group = d.groups.find(g => g.groupManagerId === employee.id);
    if (group) return 'group';
  }
  
  // Check if team lead (by role)
  if (employee.role === 'Team Lead') return 'team';
  
  return 'none';
};

// Initial team structures
export const initialTeamStructures: TeamStructure[] = [
  { 
    teamName: 'Frontend Alpha', 
    department: 'Engineering', 
    group: 'Frontend',
    teamLeader: 12,
    requiredRoles: { 'Senior Dev': 2, 'Mid-Level Dev': 2, 'Junior Dev': 2 }
  },
  { 
    teamName: 'Frontend Beta', 
    department: 'Engineering', 
    group: 'Frontend',
    teamLeader: 16,
    requiredRoles: { 'Senior Dev': 1, 'Mid-Level Dev': 2, 'Junior Dev': 2 }
  },
  { 
    teamName: 'Backend Core', 
    department: 'Engineering', 
    group: 'Backend',
    teamLeader: 2,
    requiredRoles: { 'Senior Dev': 2, 'Mid-Level Dev': 1, 'Junior Dev': 1, 'QA Engineer': 1 }
  },
  {
    teamName: 'Backend API',
    department: 'Engineering',
    group: 'Backend',
    teamLeader: 24,
    requiredRoles: { 'Senior Dev': 1, 'Mid-Level Dev': 1, 'Junior Dev': 1 }
  },
  {
    teamName: 'Infrastructure',
    department: 'Engineering',
    group: 'Platform',
    teamLeader: 25,
    requiredRoles: { 'Senior Dev': 2, 'Mid-Level Dev': 1 }
  },
  {
    teamName: 'Security',
    department: 'Engineering',
    group: 'Platform',
    teamLeader: 5,
    requiredRoles: { 'Architect': 1, 'Senior Dev': 2 }
  }
];

// Initial data - with proper hierarchy structure
// Hierarchy: Department Manager -> Group Manager -> Team Lead -> Developers
export const initialEmployees: Employee[] = [
  // === ENGINEERING DEPARTMENT ===
  // Department Manager
  { id: 100, name: 'Victoria Palmer', dept: 'Engineering', team: 'Engineering', role: 'Engineering Manager', status: 'Active', joined: '2019-03-01', managerLevel: 'department' },
  
  // Group Manager - Frontend
  { id: 101, name: 'Marcus Webb', dept: 'Engineering', group: 'Frontend', team: 'Frontend', role: 'Engineering Manager', status: 'Active', joined: '2020-06-15', managerId: 100, managerLevel: 'group' },
  
  // Frontend Alpha Team
  { id: 12, name: 'Laura Martinez', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Team Lead', status: 'Active', joined: '2020-01-15', managerId: 101, managerLevel: 'team' },
  { id: 1, name: 'Alice Chen', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2023-01-15', managerId: 12 },
  { id: 15, name: 'Oscar Lee', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2021-06-01', managerId: 12 },
  { id: 13, name: 'Mike Johnson', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Mid-Level Dev', status: 'Active', joined: '2023-04-01', managerId: 12 },
  { id: 14, name: 'Nina Patel', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Junior Dev', status: 'Active', joined: '2024-01-15', managerId: 12 },
  
  // Frontend Beta Team
  { id: 16, name: 'Paula Brown', dept: 'Engineering', group: 'Frontend', team: 'Frontend Beta', role: 'Team Lead', status: 'Active', joined: '2021-03-01', managerId: 101, managerLevel: 'team' },
  { id: 17, name: 'Quinn Davis', dept: 'Engineering', group: 'Frontend', team: 'Frontend Beta', role: 'Mid-Level Dev', status: 'Active', joined: '2023-07-15', managerId: 16 },
  { id: 22, name: 'Ryan Foster', dept: 'Engineering', group: 'Frontend', team: 'Frontend Beta', role: 'Junior Dev', status: 'Active', joined: '2024-02-01', managerId: 16 },
  
  // Group Manager - Backend
  { id: 102, name: 'Sandra Hughes', dept: 'Engineering', group: 'Backend', team: 'Backend', role: 'Engineering Manager', status: 'Active', joined: '2020-04-10', managerId: 100, managerLevel: 'group' },
  
  // Backend Core Team
  { id: 2, name: 'Bob Smith', dept: 'Engineering', group: 'Backend', team: 'Backend Core', role: 'Team Lead', status: 'Active', joined: '2022-05-10', managerId: 102, managerLevel: 'team' },
  { id: 18, name: 'Rachel Green', dept: 'Engineering', group: 'Backend', team: 'Backend Core', role: 'Senior Dev', status: 'Active', joined: '2022-02-01', managerId: 2 },
  { id: 10, name: 'Julia Santos', dept: 'Engineering', group: 'Backend', team: 'Backend Core', role: 'QA Engineer', status: 'Active', joined: '2023-09-01', managerId: 2 },
  { id: 23, name: 'Tom Bradley', dept: 'Engineering', group: 'Backend', team: 'Backend Core', role: 'Mid-Level Dev', status: 'Active', joined: '2023-05-15', managerId: 2 },
  
  // Backend API Team
  { id: 24, name: 'Uma Krishnan', dept: 'Engineering', group: 'Backend', team: 'Backend API', role: 'Team Lead', status: 'Active', joined: '2021-08-01', managerId: 102, managerLevel: 'team' },
  { id: 6, name: 'Fiona Walsh', dept: 'Engineering', group: 'Backend', team: 'Backend API', role: 'Senior Dev', status: 'Active', joined: '2023-03-15', managerId: 24 },
  { id: 19, name: 'Steve Wilson', dept: 'Engineering', group: 'Backend', team: 'Backend API', role: 'Junior Dev', status: 'Active', joined: '2024-03-01', managerId: 24 },
  
  // Platform Group (no dedicated group manager - reports to dept manager)
  // Infrastructure Team
  { id: 25, name: 'Walter Chang', dept: 'Engineering', group: 'Platform', team: 'Infrastructure', role: 'Team Lead', status: 'Active', joined: '2020-11-01', managerId: 100, managerLevel: 'team' },
  { id: 3, name: 'Charlie Day', dept: 'Engineering', group: 'Platform', team: 'Infrastructure', role: 'Junior Dev', status: 'On Course', joined: '2024-02-01', managerId: 25 },
  { id: 26, name: 'Xavier Moore', dept: 'Engineering', group: 'Platform', team: 'Infrastructure', role: 'Senior Dev', status: 'Active', joined: '2021-07-15', managerId: 25 },
  
  // Security Team
  { id: 5, name: 'Edward Kim', dept: 'Engineering', group: 'Platform', team: 'Security', role: 'Architect', status: 'Active', joined: '2021-09-01', managerId: 100, managerLevel: 'team' },
  { id: 27, name: 'Yuki Tanaka', dept: 'Engineering', group: 'Platform', team: 'Security', role: 'Senior Dev', status: 'Active', joined: '2022-03-01', managerId: 5 },
  
  // Mobile Group (no dedicated group manager)
  { id: 28, name: 'Zara Ahmed', dept: 'Engineering', group: 'Mobile', team: 'Mobile iOS', role: 'Team Lead', status: 'Active', joined: '2021-05-01', managerId: 100, managerLevel: 'team' },
  { id: 8, name: 'Hannah Moore', dept: 'Engineering', group: 'Mobile', team: 'Mobile iOS', role: 'Junior Dev', status: 'Active', joined: '2024-06-01', managerId: 28 },
  { id: 20, name: 'Tina Turner', dept: 'Engineering', group: 'Mobile', team: 'Mobile Android', role: 'Mid-Level Dev', status: 'Active', joined: '2023-01-10', managerId: 100 },
  
  // === PRODUCT & DESIGN DEPARTMENT ===
  // Department Manager
  { id: 200, name: 'Patricia Stone', dept: 'Product & Design', team: 'Product & Design', role: 'Product Manager', status: 'Active', joined: '2019-08-01', managerLevel: 'department' },
  
  // Product Core Team
  { id: 4, name: 'Diana Ross', dept: 'Product & Design', group: 'Product', team: 'Product Core', role: 'Product Manager', status: 'Active', joined: '2023-06-20', managerId: 200 },
  
  // UX Design Team
  { id: 201, name: 'Gregory Ellis', dept: 'Product & Design', group: 'Design & Research', team: 'UX Design', role: 'Team Lead', status: 'Active', joined: '2020-09-01', managerId: 200, managerLevel: 'team' },
  { id: 9, name: 'Ivan Petrov', dept: 'Product & Design', group: 'Design & Research', team: 'UX Design', role: 'Senior Dev', status: 'Parental Leave', joined: '2022-08-15', managerId: 201 },
  
  // === OPERATIONS DEPARTMENT ===
  // Department Manager
  { id: 300, name: 'Robert Kane', dept: 'Operations', team: 'Operations', role: 'Engineering Manager', status: 'Active', joined: '2019-01-15', managerLevel: 'department' },
  
  // HR & People Team
  { id: 7, name: 'George Liu', dept: 'Operations', group: 'People & Culture', team: 'HR & People', role: 'Team Lead', status: 'Active', joined: '2022-11-01', managerId: 300, managerLevel: 'team' },
  
  // Finance Team
  { id: 11, name: 'Kevin O\'Brien', dept: 'Operations', group: 'Business Operations', team: 'Finance', role: 'Team Lead', status: 'Active', joined: '2021-04-20', managerId: 300, managerLevel: 'team' },
  
  // Potential employee - uncertain hire
  { id: 21, name: 'Potential: Senior FE', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2025-06-01', isPotential: true, managerId: 12 },
];

export const initialEvents: WorkforceEvent[] = [
  { id: 1, empId: 1, type: 'Promotion', date: '2025-03-01', details: 'Moving to Team Lead', isFlag: false },
  { id: 2, empId: 3, type: 'Decision Flag', date: '2025-06-15', details: 'Decide on AWS Certification path', isFlag: true },
  { id: 3, empId: 5, type: 'Decision Flag', date: '2025-02-28', details: 'Succession planning required', isFlag: true },
  { id: 4, empId: 2, type: 'Team Swap', date: '2025-08-01', details: 'Moving to Infrastructure team', isFlag: false, targetTeam: 'Infrastructure' },
  { id: 5, empId: 8, type: 'Course Start', date: '2025-04-15', details: 'React Advanced Training', isFlag: false },
  { id: 6, empId: 13, type: 'Team Swap', date: '2025-09-15', details: 'Transferring to Backend Core', isFlag: false, targetTeam: 'Backend Core' },
  // Departure events (6-year rule)
  { id: 101, empId: 1, type: 'Departure', date: '2029-01-15', details: 'End of rotation cycle', isFlag: false },
  { id: 102, empId: 2, type: 'Departure', date: '2028-05-10', details: 'End of rotation cycle', isFlag: false },
  { id: 103, empId: 3, type: 'Departure', date: '2030-02-01', details: 'End of rotation cycle', isFlag: false },
  { id: 104, empId: 4, type: 'Departure', date: '2029-06-20', details: 'End of rotation cycle', isFlag: false },
  { id: 105, empId: 5, type: 'Departure', date: '2027-09-01', details: 'End of rotation cycle', isFlag: false },
  { id: 106, empId: 12, type: 'Departure', date: '2026-01-15', details: 'End of rotation cycle', isFlag: false },
];
