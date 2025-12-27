// Configuration & Constants - Hierarchy: Department → Teams

// Departments with their teams (4-8 teams per department, 6-7 people per team)
export const DEPARTMENTS: Record<string, string[]> = {
  'Engineering': ['Frontend Alpha', 'Frontend Beta', 'Backend Core', 'Backend API', 'Infrastructure', 'Mobile iOS', 'Mobile Android', 'Security'],
  'Product & Design': ['Product Core', 'Product Growth', 'UX Research', 'UX Design', 'Data Analytics'],
  'Operations': ['HR & People', 'Finance', 'Legal', 'Office Management']
};

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
  'Default': 'text-muted-foreground'
};

export const ROLES = Object.keys(ROLE_COLORS).filter(r => r !== 'Default');
export const STATUSES = ['Active', 'On Course', 'Parental Leave', 'Notice Period'] as const;
export const EVENT_TYPES = ['Team Swap', 'Promotion', 'Training', 'Course', 'Departure', 'New Joiner', 'Decision Flag'] as const;

// Timeline Range (Jan 2020 - Dec 2030) - Extended to show historical data
export const TIMELINE_START = new Date('2020-01-01');
export const TIMELINE_END = new Date('2030-12-31');

// Team Structure Definition
export interface TeamStructure {
  teamName: string;
  department: string;
  teamLeader?: number; // Employee ID of team leader
  requiredRoles: Record<string, number>; // Role name -> count required
  targetSize?: number; // Optional target team size
}

// Types
export interface Employee {
  id: number;
  name: string;
  dept: string;
  team: string;
  role: string;
  status: string;
  joined: string;
  isPotential?: boolean; // Uncertain hire - for planning purposes
  managerId?: number; // Direct manager (flexible hierarchy)
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
}

export interface Hierarchy {
  dept: string;
  team: string;
}

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

// Calculate capacity weight based on tenure and role
export const getCapacityWeight = (role: string, joined: string, asOfDate: Date = new Date()): number => {
  if (role === 'Team Lead') return 0; // Team leads don't count
  
  const joinDate = new Date(joined);
  const yearsOfExperience = (asOfDate.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  // Junior: 0.7x, Mid-level (after 1 year): 1x, Senior (after 3 years total): 1.5x
  if (yearsOfExperience >= 3) return 1.5; // Senior
  if (yearsOfExperience >= 1) return 1.0; // Mid-level
  return 0.7; // Junior
};

// Get effective role based on tenure
export const getEffectiveRole = (originalRole: string, joined: string, asOfDate: Date = new Date()): string => {
  if (originalRole === 'Team Lead' || originalRole === 'Architect' || originalRole === 'Engineering Manager' || originalRole === 'Product Manager') {
    return originalRole;
  }
  
  const joinDate = new Date(joined);
  const yearsOfExperience = (asOfDate.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  if (yearsOfExperience >= 3) return 'Senior Dev';
  if (yearsOfExperience >= 1) return 'Mid-Level Dev';
  return 'Junior Dev';
};

// Initial team structures
export const initialTeamStructures: TeamStructure[] = [
  { 
    teamName: 'Frontend Alpha', 
    department: 'Engineering', 
    teamLeader: 12,
    requiredRoles: { 'Senior Dev': 2, 'Mid-Level Dev': 2, 'Junior Dev': 2 }
  },
  { 
    teamName: 'Frontend Beta', 
    department: 'Engineering', 
    teamLeader: 16,
    requiredRoles: { 'Senior Dev': 1, 'Mid-Level Dev': 2, 'Junior Dev': 2 }
  },
  { 
    teamName: 'Backend Core', 
    department: 'Engineering', 
    teamLeader: 2,
    requiredRoles: { 'Senior Dev': 2, 'Mid-Level Dev': 1, 'Junior Dev': 1, 'QA Engineer': 1 }
  },
];

// Initial data - with new hierarchy structure
export const initialEmployees: Employee[] = [
  { id: 1, name: 'Alice Chen', dept: 'Engineering', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2023-01-15' },
  { id: 2, name: 'Bob Smith', dept: 'Engineering', team: 'Backend Core', role: 'Team Lead', status: 'Active', joined: '2022-05-10' },
  { id: 3, name: 'Charlie Day', dept: 'Engineering', team: 'Infrastructure', role: 'Junior Dev', status: 'On Course', joined: '2024-02-01' },
  { id: 4, name: 'Diana Ross', dept: 'Product & Design', team: 'Product Core', role: 'Product Manager', status: 'Active', joined: '2023-06-20' },
  { id: 5, name: 'Edward Kim', dept: 'Engineering', team: 'Security', role: 'Architect', status: 'Active', joined: '2021-09-01' },
  { id: 6, name: 'Fiona Walsh', dept: 'Engineering', team: 'Backend API', role: 'Senior Dev', status: 'Active', joined: '2023-03-15' },
  { id: 7, name: 'George Liu', dept: 'Operations', team: 'HR & People', role: 'Team Lead', status: 'Active', joined: '2022-11-01' },
  { id: 8, name: 'Hannah Moore', dept: 'Engineering', team: 'Mobile iOS', role: 'Junior Dev', status: 'Active', joined: '2024-06-01' },
  { id: 9, name: 'Ivan Petrov', dept: 'Product & Design', team: 'UX Design', role: 'Senior Dev', status: 'Parental Leave', joined: '2022-08-15' },
  { id: 10, name: 'Julia Santos', dept: 'Engineering', team: 'Backend Core', role: 'QA Engineer', status: 'Active', joined: '2023-09-01' },
  { id: 11, name: 'Kevin O\'Brien', dept: 'Operations', team: 'Finance', role: 'Team Lead', status: 'Active', joined: '2021-04-20' },
  { id: 12, name: 'Laura Martinez', dept: 'Engineering', team: 'Frontend Alpha', role: 'Engineering Manager', status: 'Active', joined: '2020-01-15' },
  { id: 13, name: 'Mike Johnson', dept: 'Engineering', team: 'Frontend Alpha', role: 'Mid-Level Dev', status: 'Active', joined: '2023-04-01' },
  { id: 14, name: 'Nina Patel', dept: 'Engineering', team: 'Frontend Alpha', role: 'Junior Dev', status: 'Active', joined: '2024-01-15' },
  { id: 15, name: 'Oscar Lee', dept: 'Engineering', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2021-06-01' },
  { id: 16, name: 'Paula Brown', dept: 'Engineering', team: 'Frontend Beta', role: 'Team Lead', status: 'Active', joined: '2021-03-01' },
  { id: 17, name: 'Quinn Davis', dept: 'Engineering', team: 'Frontend Beta', role: 'Mid-Level Dev', status: 'Active', joined: '2023-07-15' },
  { id: 18, name: 'Rachel Green', dept: 'Engineering', team: 'Backend Core', role: 'Senior Dev', status: 'Active', joined: '2022-02-01' },
  { id: 19, name: 'Steve Wilson', dept: 'Engineering', team: 'Backend API', role: 'Junior Dev', status: 'Active', joined: '2024-03-01' },
  { id: 20, name: 'Tina Turner', dept: 'Engineering', team: 'Mobile Android', role: 'Mid-Level Dev', status: 'Active', joined: '2023-01-10' },
  // Potential employee - uncertain hire
  { id: 21, name: 'Potential: Senior FE', dept: 'Engineering', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2025-06-01', isPotential: true },
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