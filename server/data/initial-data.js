// Initial data - synced with src/lib/workforce-data.ts
// This is the single source of truth for server-side initialization

const initialHierarchy = [
  {
    name: 'Engineering',
    departmentManagerId: 100,
    directTeams: [],
    groups: [
      {
        name: 'Frontend',
        groupManagerId: 101,
        teams: ['Frontend Alpha', 'Frontend Beta']
      },
      {
        name: 'Backend',
        groupManagerId: 102,
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
    departmentManagerId: 200,
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
    departmentManagerId: 300,
    directTeams: ['Executive Office'],
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

const initialTeamStructures = [
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

const initialEmployees = [
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
  
  // Platform Group
  // Infrastructure Team
  { id: 25, name: 'Walter Chang', dept: 'Engineering', group: 'Platform', team: 'Infrastructure', role: 'Team Lead', status: 'Active', joined: '2020-11-01', managerId: 100, managerLevel: 'team' },
  { id: 3, name: 'Charlie Day', dept: 'Engineering', group: 'Platform', team: 'Infrastructure', role: 'Junior Dev', status: 'On Course', joined: '2024-02-01', managerId: 25 },
  { id: 26, name: 'Xavier Moore', dept: 'Engineering', group: 'Platform', team: 'Infrastructure', role: 'Senior Dev', status: 'Active', joined: '2021-07-15', managerId: 25 },
  
  // Security Team
  { id: 5, name: 'Edward Kim', dept: 'Engineering', group: 'Platform', team: 'Security', role: 'Architect', status: 'Active', joined: '2021-09-01', managerId: 100, managerLevel: 'team' },
  { id: 27, name: 'Yuki Tanaka', dept: 'Engineering', group: 'Platform', team: 'Security', role: 'Senior Dev', status: 'Active', joined: '2022-03-01', managerId: 5 },
  
  // Mobile Group
  { id: 28, name: 'Zara Ahmed', dept: 'Engineering', group: 'Mobile', team: 'Mobile iOS', role: 'Team Lead', status: 'Active', joined: '2021-05-01', managerId: 100, managerLevel: 'team' },
  { id: 8, name: 'Hannah Moore', dept: 'Engineering', group: 'Mobile', team: 'Mobile iOS', role: 'Junior Dev', status: 'Active', joined: '2024-06-01', managerId: 28 },
  { id: 20, name: 'Tina Turner', dept: 'Engineering', group: 'Mobile', team: 'Mobile Android', role: 'Mid-Level Dev', status: 'Active', joined: '2023-01-10', managerId: 100 },
  
  // === PRODUCT & DESIGN DEPARTMENT ===
  { id: 200, name: 'Patricia Stone', dept: 'Product & Design', team: 'Product & Design', role: 'Product Manager', status: 'Active', joined: '2019-08-01', managerLevel: 'department' },
  { id: 4, name: 'Diana Ross', dept: 'Product & Design', group: 'Product', team: 'Product Core', role: 'Product Manager', status: 'Active', joined: '2023-06-20', managerId: 200 },
  { id: 201, name: 'Gregory Ellis', dept: 'Product & Design', group: 'Design & Research', team: 'UX Design', role: 'Team Lead', status: 'Active', joined: '2020-09-01', managerId: 200, managerLevel: 'team' },
  { id: 9, name: 'Ivan Petrov', dept: 'Product & Design', group: 'Design & Research', team: 'UX Design', role: 'Senior Dev', status: 'Parental Leave', joined: '2022-08-15', managerId: 201 },
  
  // === OPERATIONS DEPARTMENT ===
  { id: 300, name: 'Robert Kane', dept: 'Operations', team: 'Operations', role: 'Engineering Manager', status: 'Active', joined: '2019-01-15', managerLevel: 'department' },
  { id: 7, name: 'George Liu', dept: 'Operations', group: 'People & Culture', team: 'HR & People', role: 'Team Lead', status: 'Active', joined: '2022-11-01', managerId: 300, managerLevel: 'team' },
  { id: 11, name: "Kevin O'Brien", dept: 'Operations', group: 'Business Operations', team: 'Finance', role: 'Team Lead', status: 'Active', joined: '2021-04-20', managerId: 300, managerLevel: 'team' },
  
  // Potential employee
  { id: 21, name: 'Potential: Senior FE', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2025-06-01', isPotential: true, managerId: 12 },
];

const initialEvents = [
  { id: 1, empId: 1, type: 'Promotion', date: '2025-03-01', details: 'Moving to Team Lead', isFlag: false },
  { id: 2, empId: 3, type: 'Decision Flag', date: '2025-06-15', details: 'Decide on AWS Certification path', isFlag: true },
  { id: 3, empId: 5, type: 'Decision Flag', date: '2025-02-28', details: 'Succession planning required', isFlag: true },
  { id: 4, empId: 2, type: 'Team Swap', date: '2025-08-01', details: 'Moving to Infrastructure team', isFlag: false, targetTeam: 'Infrastructure' },
  { id: 5, empId: 8, type: 'Course Start', date: '2025-04-15', details: 'React Advanced Training', isFlag: false },
  { id: 6, empId: 13, type: 'Team Swap', date: '2025-09-15', details: 'Transferring to Backend Core', isFlag: false, targetTeam: 'Backend Core' },
  // Team leader replacement example: Zara Ahmed (Mobile iOS lead) moved to Frontend Beta 2 months ago
  { id: 7, empId: 28, type: 'Team Swap', date: '2025-01-15', details: 'Team leader moving to Frontend Beta', isFlag: false, targetTeam: 'Frontend Beta' },
  // New leader replacing Zara in Mobile iOS
  { id: 8, empId: 29, type: 'New Joiner', date: '2025-02-01', details: 'Hired as new Mobile iOS team leader, replacing Zara Ahmed', isFlag: false },
  // Departure events (6-year rule)
  { id: 101, empId: 1, type: 'Departure', date: '2029-01-15', details: 'End of rotation cycle', isFlag: false },
  { id: 102, empId: 2, type: 'Departure', date: '2028-05-10', details: 'End of rotation cycle', isFlag: false },
  { id: 103, empId: 3, type: 'Departure', date: '2030-02-01', details: 'End of rotation cycle', isFlag: false },
  { id: 104, empId: 4, type: 'Departure', date: '2029-06-20', details: 'End of rotation cycle', isFlag: false },
  { id: 105, empId: 5, type: 'Departure', date: '2027-09-01', details: 'End of rotation cycle', isFlag: false },
  { id: 106, empId: 12, type: 'Departure', date: '2026-01-15', details: 'End of rotation cycle', isFlag: false },
];

// Empty scenarios array - scenarios are created by users
const initialScenarios = [];

module.exports = {
  initialHierarchy,
  initialTeamStructures,
  initialEmployees,
  initialEvents,
  initialScenarios
};
