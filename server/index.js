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

// Initialize sample employees if none exist
const initializeSampleEmployees = () => {
  const employees = readData('employees');
  if (!employees || employees.length === 0) {
    const sampleEmployees = [
      // Department Managers
      { id: 100, name: 'Victoria Palmer', dept: 'Engineering', team: 'Engineering', role: 'Engineering Manager', status: 'Active', joined: '2019-03-01', managerLevel: 'department' },
      { id: 200, name: 'Patricia Stone', dept: 'Product & Design', team: 'Product & Design', role: 'Product Manager', status: 'Active', joined: '2019-08-01', managerLevel: 'department' },
      { id: 300, name: 'Robert Kane', dept: 'Operations', team: 'Operations', role: 'Engineering Manager', status: 'Active', joined: '2019-01-15', managerLevel: 'department' },
      
      // Group Managers
      { id: 101, name: 'Marcus Webb', dept: 'Engineering', group: 'Frontend', team: 'Frontend', role: 'Engineering Manager', status: 'Active', joined: '2020-06-15', managerId: 100, managerLevel: 'group' },
      { id: 102, name: 'Sandra Hughes', dept: 'Engineering', group: 'Backend', team: 'Backend', role: 'Engineering Manager', status: 'Active', joined: '2020-04-10', managerId: 100, managerLevel: 'group' },
      
      // Team Leads
      { id: 12, name: 'Laura Martinez', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Team Lead', status: 'Active', joined: '2020-01-15', managerId: 101, managerLevel: 'team' },
      { id: 16, name: 'Paula Brown', dept: 'Engineering', group: 'Frontend', team: 'Frontend Beta', role: 'Team Lead', status: 'Active', joined: '2021-03-01', managerId: 101, managerLevel: 'team' },
      { id: 2, name: 'Bob Smith', dept: 'Engineering', group: 'Backend', team: 'Backend Core', role: 'Team Lead', status: 'Active', joined: '2022-05-10', managerId: 102, managerLevel: 'team' },
      
      // Developers
      { id: 1, name: 'Alice Chen', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Senior Dev', status: 'Active', joined: '2023-01-15', managerId: 12 },
      { id: 13, name: 'Mike Johnson', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Mid-Level Dev', status: 'Active', joined: '2023-04-01', managerId: 12 },
      { id: 14, name: 'Nina Patel', dept: 'Engineering', group: 'Frontend', team: 'Frontend Alpha', role: 'Junior Dev', status: 'Active', joined: '2024-01-15', managerId: 12 },
      { id: 17, name: 'Quinn Davis', dept: 'Engineering', group: 'Frontend', team: 'Frontend Beta', role: 'Mid-Level Dev', status: 'Active', joined: '2023-07-15', managerId: 16 },
      { id: 18, name: 'Rachel Green', dept: 'Engineering', group: 'Backend', team: 'Backend Core', role: 'Senior Dev', status: 'Active', joined: '2022-02-01', managerId: 2 },
      { id: 23, name: 'Tom Bradley', dept: 'Engineering', group: 'Backend', team: 'Backend Core', role: 'Mid-Level Dev', status: 'Active', joined: '2023-05-15', managerId: 2 },
    ];
    writeData('employees', sampleEmployees);
    console.log('✅ Sample employees initialized');
  }
};

// Run initialization
initializeSampleEmployees();

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
