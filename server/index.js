const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { readData, writeData } = require('./utils/data');
const { 
  initialHierarchy, 
  initialTeamStructures, 
  initialEmployees, 
  initialEvents, 
  initialScenarios 
} = require('./data/initial-data');

const authRoutes = require('./routes/auth');
const workforceRoutes = require('./routes/workforce');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize all data from the shared initial-data.js file
const initializeData = () => {
  // Employees
  const employees = readData('employees');
  if (!employees || employees.length === 0) {
    writeData('employees', initialEmployees);
    console.log(`✅ ${initialEmployees.length} employees initialized`);
  }

  // Events
  const events = readData('events');
  if (!events || events.length === 0) {
    writeData('events', initialEvents);
    console.log(`✅ ${initialEvents.length} events initialized`);
  }

  // Hierarchy
  const hierarchy = readData('hierarchy');
  if (!hierarchy || hierarchy.length === 0) {
    writeData('hierarchy', initialHierarchy);
    console.log(`✅ Hierarchy structure initialized`);
  }

  // Team Structures
  const teamStructures = readData('team-structures');
  if (!teamStructures || teamStructures.length === 0) {
    writeData('team-structures', initialTeamStructures);
    console.log(`✅ ${initialTeamStructures.length} team structures initialized`);
  }

  // Scenarios (empty by default)
  const scenarios = readData('scenarios');
  if (scenarios === null) {
    writeData('scenarios', initialScenarios);
    console.log(`✅ Scenarios initialized`);
  }
};

// Run initialization
initializeData();

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
