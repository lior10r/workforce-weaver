// Configuration & Constants
export const GROUPS = ['Engineering', 'Product & Design', 'Operations'] as const;

export const DEPARTMENTS: Record<string, string[]> = {
  'Engineering': ['Frontend', 'Backend', 'Infrastructure', 'Mobile', 'Security', 'DevOps'],
  'Product & Design': ['Product Management', 'UX Design', 'Data Science'],
  'Operations': ['HR', 'Finance', 'Legal']
};

export const ROLE_COLORS: Record<string, string> = {
  'Junior Dev': 'role-junior',
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
export const EVENT_TYPES = ['Team Swap', 'Promotion', 'Course Start', 'Course End', 'Departure', 'New Joiner', 'Decision Flag'] as const;

// Timeline Range (Jan 2025 - Dec 2030)
export const TIMELINE_START = new Date('2025-01-01');
export const TIMELINE_END = new Date('2030-12-31');

// Types
export interface Employee {
  id: number;
  name: string;
  group: string;
  dept: string;
  role: string;
  status: string;
  joined: string;
}

export interface WorkforceEvent {
  id: number;
  empId: number;
  type: string;
  date: string;
  details: string;
  isFlag: boolean;
}

export interface Hierarchy {
  group: string;
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

// Initial data
export const initialEmployees: Employee[] = [
  { id: 1, name: 'Alice Chen', group: 'Engineering', dept: 'Frontend', role: 'Senior Dev', status: 'Active', joined: '2023-01-15' },
  { id: 2, name: 'Bob Smith', group: 'Engineering', dept: 'Backend', role: 'Team Lead', status: 'Active', joined: '2022-05-10' },
  { id: 3, name: 'Charlie Day', group: 'Engineering', dept: 'Infrastructure', role: 'Junior Dev', status: 'On Course', joined: '2024-02-01' },
  { id: 4, name: 'Diana Ross', group: 'Product & Design', dept: 'Product Management', role: 'Product Manager', status: 'Active', joined: '2023-06-20' },
  { id: 5, name: 'Edward Kim', group: 'Engineering', dept: 'Security', role: 'Architect', status: 'Active', joined: '2021-09-01' },
  { id: 6, name: 'Fiona Walsh', group: 'Engineering', dept: 'DevOps', role: 'Senior Dev', status: 'Active', joined: '2023-03-15' },
  { id: 7, name: 'George Liu', group: 'Operations', dept: 'HR', role: 'Team Lead', status: 'Active', joined: '2022-11-01' },
  { id: 8, name: 'Hannah Moore', group: 'Engineering', dept: 'Mobile', role: 'Junior Dev', status: 'Active', joined: '2024-06-01' },
  { id: 9, name: 'Ivan Petrov', group: 'Product & Design', dept: 'UX Design', role: 'Senior Dev', status: 'Parental Leave', joined: '2022-08-15' },
  { id: 10, name: 'Julia Santos', group: 'Engineering', dept: 'Backend', role: 'QA Engineer', status: 'Active', joined: '2023-09-01' },
  { id: 11, name: 'Kevin O\'Brien', group: 'Operations', dept: 'Finance', role: 'Team Lead', status: 'Active', joined: '2021-04-20' },
  { id: 12, name: 'Laura Martinez', group: 'Engineering', dept: 'Frontend', role: 'Engineering Manager', status: 'Active', joined: '2020-01-15' },
];

export const initialEvents: WorkforceEvent[] = [
  { id: 1, empId: 1, type: 'Promotion', date: '2025-03-01', details: 'Moving to Team Lead', isFlag: false },
  { id: 2, empId: 3, type: 'Decision Flag', date: '2025-06-15', details: 'Decide on AWS Certification path', isFlag: true },
  { id: 3, empId: 5, type: 'Decision Flag', date: '2025-02-28', details: 'Succession planning required', isFlag: true },
  { id: 4, empId: 2, type: 'Team Swap', date: '2025-08-01', details: 'Moving to Infrastructure team', isFlag: false },
  { id: 5, empId: 8, type: 'Course Start', date: '2025-04-15', details: 'React Advanced Training', isFlag: false },
  // Departure events (6-year rule)
  { id: 101, empId: 1, type: 'Departure', date: '2029-01-15', details: 'End of rotation cycle', isFlag: false },
  { id: 102, empId: 2, type: 'Departure', date: '2028-05-10', details: 'End of rotation cycle', isFlag: false },
  { id: 103, empId: 3, type: 'Departure', date: '2030-02-01', details: 'End of rotation cycle', isFlag: false },
  { id: 104, empId: 4, type: 'Departure', date: '2029-06-20', details: 'End of rotation cycle', isFlag: false },
  { id: 105, empId: 5, type: 'Departure', date: '2027-09-01', details: 'End of rotation cycle', isFlag: false },
  { id: 106, empId: 12, type: 'Departure', date: '2026-01-15', details: 'End of rotation cycle', isFlag: false },
];
