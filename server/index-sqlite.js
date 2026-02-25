const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const db = require('./utils/database');
const {
  initialHierarchy,
  initialTeamStructures,
  initialEmployees,
  initialEvents,
  initialScenarios
} = require('./data/initial-data');

const authRoutes = require('./routes/auth-sqlite');
const workforceRoutes = require('./routes/workforce-sqlite');

const app = express();
const PORT = process.env.PORT || 3001;

// Seed database if empty
if (!db.isInitialized()) {
  console.log('🔧 Seeding database with initial data...');
  db.bulkReplaceEmployees(initialEmployees);
  console.log(`✅ ${initialEmployees.length} employees seeded`);
  db.bulkReplaceEvents(initialEvents);
  console.log(`✅ ${initialEvents.length} events seeded`);
  db.setHierarchy(initialHierarchy);
  console.log('✅ Hierarchy seeded');
  db.setTeamStructures(initialTeamStructures);
  console.log(`✅ ${initialTeamStructures.length} team structures seeded`);
  db.setScenarios(initialScenarios);
  console.log('✅ Scenarios seeded');
}

// Middleware
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173').split(',');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve static frontend files (production)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('📁 Serving static frontend from dist/');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), storage: 'sqlite' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', workforceRoutes);

// SPA fallback - serve index.html for non-API routes
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Workforce API server running on http://0.0.0.0:${PORT}`);
  console.log(`   Storage: SQLite (WAL mode)`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
