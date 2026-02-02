const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { readData, writeData } = require('./utils/data');

const authRoutes = require('./routes/auth');
const workforceRoutes = require('./routes/workforce');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize sample employees if none exist (synced with client-side initialEmployees)
const initializeSampleEmployees = () => {
  const employees = readData('employees');
  if (!employees || employees.length === 0) {
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
    writeData('employees', initialEmployees);
    console.log(`✅ ${initialEmployees.length} employees initialized`);
  }
};

// Initialize sample events if none exist
const initializeSampleEvents = () => {
  const events = readData('events');
  if (!events || events.length === 0) {
    const initialEvents = [
      { id: 1, empId: 1, type: 'Promotion', date: '2025-03-01', details: 'Moving to Team Lead', isFlag: false },
      { id: 2, empId: 3, type: 'Decision Flag', date: '2025-06-15', details: 'Decide on AWS Certification path', isFlag: true },
      { id: 3, empId: 5, type: 'Decision Flag', date: '2025-02-28', details: 'Succession planning required', isFlag: true },
      { id: 4, empId: 2, type: 'Team Swap', date: '2025-08-01', details: 'Moving to Infrastructure team', isFlag: false, targetTeam: 'Infrastructure' },
      { id: 5, empId: 8, type: 'Course Start', date: '2025-04-15', details: 'React Advanced Training', isFlag: false },
      { id: 6, empId: 13, type: 'Team Swap', date: '2025-09-15', details: 'Transferring to Backend Core', isFlag: false, targetTeam: 'Backend Core' },
      { id: 101, empId: 1, type: 'Departure', date: '2029-01-15', details: 'End of rotation cycle', isFlag: false },
      { id: 102, empId: 2, type: 'Departure', date: '2028-05-10', details: 'End of rotation cycle', isFlag: false },
      { id: 103, empId: 3, type: 'Departure', date: '2030-02-01', details: 'End of rotation cycle', isFlag: false },
      { id: 104, empId: 4, type: 'Departure', date: '2029-06-20', details: 'End of rotation cycle', isFlag: false },
      { id: 105, empId: 5, type: 'Departure', date: '2027-09-01', details: 'End of rotation cycle', isFlag: false },
      { id: 106, empId: 12, type: 'Departure', date: '2026-01-15', details: 'End of rotation cycle', isFlag: false },
    ];
    writeData('events', initialEvents);
    console.log(`✅ ${initialEvents.length} events initialized`);
  }
};

// Run initialization
initializeSampleEmployees();
initializeSampleEvents();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health check (public - no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
app.use('/api/auth', authRoutes);
app.use('/api', workforceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Workforce API server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
