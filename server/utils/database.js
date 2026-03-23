const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'workforce.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create and configure database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read/write performance
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    employee_id INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT NOT NULL,
    "group" TEXT,
    team TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    joined TEXT NOT NULL,
    manager_id INTEGER,
    manager_level TEXT,
    is_potential INTEGER DEFAULT 0,
    departure_date TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    emp_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    details TEXT,
    is_flag INTEGER DEFAULT 0,
    target_team TEXT,
    FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS hierarchy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT,
    created_by TEXT
  );

  CREATE TABLE IF NOT EXISTS employee_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Add skills column to employees if not exists
try {
  db.exec(`ALTER TABLE employees ADD COLUMN skills TEXT DEFAULT '[]'`);
} catch (e) {
  // Column already exists
}

// ============== USER OPERATIONS ==============

const getUsers = () => {
  return db.prepare('SELECT * FROM users').all().map(rowToUser);
};

const getUserById = (id) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return row ? rowToUser(row) : null;
};

const getUserByUsername = (username) => {
  const row = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username);
  return row ? rowToUser(row) : null;
};

const createUser = (user) => {
  db.prepare(`
    INSERT INTO users (id, username, password_hash, name, role, employee_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, user.username, user.passwordHash, user.name, user.role, user.employeeId, user.createdAt);
  return user;
};

const updateUser = (id, updates) => {
  const fields = [];
  const values = [];
  if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
  if (updates.passwordHash !== undefined) { fields.push('password_hash = ?'); values.push(updates.passwordHash); }
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
  if (updates.employeeId !== undefined) { fields.push('employee_id = ?'); values.push(updates.employeeId); }
  if (fields.length === 0) return getUserById(id);
  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUserById(id);
};

const deleteUser = (id) => {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
};

const countAdmins = () => {
  return db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
};

// Row to user object mapper
const rowToUser = (row) => ({
  id: row.id,
  username: row.username,
  passwordHash: row.password_hash,
  name: row.name,
  role: row.role,
  employeeId: row.employee_id,
  createdAt: row.created_at
});

// ============== EMPLOYEE OPERATIONS ==============

const getEmployees = () => {
  return db.prepare('SELECT * FROM employees').all().map(rowToEmployee);
};

const getEmployeeById = (id) => {
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  return row ? rowToEmployee(row) : null;
};

const createEmployee = (emp) => {
  const id = emp.id || Date.now();
  db.prepare(`
    INSERT OR REPLACE INTO employees (id, name, dept, "group", team, role, status, joined, manager_id, manager_level, is_potential, departure_date, skills)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, emp.name, emp.dept, emp.group || null, emp.team, emp.role, emp.status || 'Active', emp.joined, emp.managerId || null, emp.managerLevel || null, emp.isPotential ? 1 : 0, emp.departureDate || null, JSON.stringify(emp.skills || []));
  return { ...emp, id };
};

const updateEmployee = (id, updates) => {
  const existing = getEmployeeById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, id };
  db.prepare(`
    UPDATE employees SET name=?, dept=?, "group"=?, team=?, role=?, status=?, joined=?, manager_id=?, manager_level=?, is_potential=?, departure_date=?, skills=?
    WHERE id=?
  `).run(merged.name, merged.dept, merged.group || null, merged.team, merged.role, merged.status, merged.joined, merged.managerId || null, merged.managerLevel || null, merged.isPotential ? 1 : 0, merged.departureDate || null, JSON.stringify(merged.skills || []), id);
  return getEmployeeById(id);
};

const deleteEmployee = (id) => {
  return db.prepare('DELETE FROM employees WHERE id = ?').run(id);
};

const bulkReplaceEmployees = (employees) => {
  const transaction = db.transaction((emps) => {
    db.prepare('DELETE FROM employees').run();
    const stmt = db.prepare(`
      INSERT INTO employees (id, name, dept, "group", team, role, status, joined, manager_id, manager_level, is_potential, departure_date, skills)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const emp of emps) {
      stmt.run(emp.id, emp.name, emp.dept, emp.group || null, emp.team, emp.role, emp.status || 'Active', emp.joined, emp.managerId || null, emp.managerLevel || null, emp.isPotential ? 1 : 0, emp.departureDate || null, JSON.stringify(emp.skills || []));
    }
  });
  transaction(employees);
};

const rowToEmployee = (row) => {
  const emp = {
    id: row.id,
    name: row.name,
    dept: row.dept,
    team: row.team,
    role: row.role,
    status: row.status,
    joined: row.joined,
  };
  if (row.group) emp.group = row.group;
  if (row.manager_id) emp.managerId = row.manager_id;
  if (row.manager_level) emp.managerLevel = row.manager_level;
  if (row.is_potential) emp.isPotential = true;
  if (row.departure_date) emp.departureDate = row.departure_date;
  try {
    const skills = JSON.parse(row.skills || '[]');
    if (skills.length > 0) emp.skills = skills;
  } catch (e) {}
  return emp;
};

// ============== EVENT OPERATIONS ==============

const getEvents = () => {
  return db.prepare('SELECT * FROM events').all().map(rowToEvent);
};

const createEvent = (evt) => {
  const id = evt.id || Date.now();
  db.prepare(`
    INSERT OR REPLACE INTO events (id, emp_id, type, date, details, is_flag, target_team)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, evt.empId, evt.type, evt.date, evt.details || null, evt.isFlag ? 1 : 0, evt.targetTeam || null);
  return { ...evt, id };
};

const updateEvent = (id, updates) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!existing) return null;
  const merged = { ...rowToEvent(existing), ...updates, id };
  db.prepare(`
    UPDATE events SET emp_id=?, type=?, date=?, details=?, is_flag=?, target_team=? WHERE id=?
  `).run(merged.empId, merged.type, merged.date, merged.details || null, merged.isFlag ? 1 : 0, merged.targetTeam || null, id);
  return merged;
};

const deleteEvent = (id) => {
  return db.prepare('DELETE FROM events WHERE id = ?').run(id);
};

const deleteEventsByEmployeeId = (empId) => {
  return db.prepare('DELETE FROM events WHERE emp_id = ?').run(empId);
};

const bulkReplaceEvents = (events) => {
  const transaction = db.transaction((evts) => {
    db.prepare('DELETE FROM events').run();
    const stmt = db.prepare(`
      INSERT INTO events (id, emp_id, type, date, details, is_flag, target_team)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const evt of evts) {
      stmt.run(evt.id, evt.empId, evt.type, evt.date, evt.details || null, evt.isFlag ? 1 : 0, evt.targetTeam || null);
    }
  });
  transaction(events);
};

const rowToEvent = (row) => {
  const evt = {
    id: row.id,
    empId: row.emp_id,
    type: row.type,
    date: row.date,
    details: row.details,
    isFlag: !!row.is_flag,
  };
  if (row.target_team) evt.targetTeam = row.target_team;
  return evt;
};

// ============== JSON BLOB OPERATIONS (hierarchy, team structures, scenarios) ==============

const getJsonData = (tableName) => {
  const row = db.prepare(`SELECT data FROM ${tableName} WHERE id = 1`).get();
  return row ? JSON.parse(row.data) : null;
};

const setJsonData = (tableName, data) => {
  const json = JSON.stringify(data);
  const existing = db.prepare(`SELECT id FROM ${tableName} WHERE id = 1`).get();
  if (existing) {
    db.prepare(`UPDATE ${tableName} SET data = ? WHERE id = 1`).run(json);
  } else {
    db.prepare(`INSERT INTO ${tableName} (id, data) VALUES (1, ?)`).run(json);
  }
};

const getHierarchy = () => getJsonData('hierarchy') || [];
const setHierarchy = (data) => setJsonData('hierarchy', data);

const getTeamStructures = () => getJsonData('team_structures') || [];
const setTeamStructures = (data) => setJsonData('team_structures', data);

const getScenarios = () => getJsonData('scenarios') || [];
const setScenarios = (data) => setJsonData('scenarios', data);

// ============== LABEL OPERATIONS ==============

const getLabels = () => {
  return db.prepare('SELECT * FROM labels ORDER BY name').all();
};

const createLabel = (label) => {
  const result = db.prepare(`
    INSERT INTO labels (name, color, created_by) VALUES (?, ?, ?)
  `).run(label.name, label.color || null, label.createdBy || null);
  return { id: result.lastInsertRowid, name: label.name, color: label.color || null, created_by: label.createdBy || null };
};

const deleteLabel = (id) => {
  return db.prepare('DELETE FROM labels WHERE id = ?').run(id);
};

// ============== EMPLOYEE NOTES OPERATIONS ==============

const getNotesByEmployee = (employeeId) => {
  return db.prepare('SELECT * FROM employee_notes WHERE employee_id = ? ORDER BY created_at DESC').all(employeeId).map(rowToNote);
};

const createNote = (note) => {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO employee_notes (employee_id, author_id, author_name, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(note.employeeId, note.authorId, note.authorName, note.content, now, now);
  return { id: result.lastInsertRowid, ...note, createdAt: now, updatedAt: now };
};

const updateNote = (id, content) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE employee_notes SET content = ?, updated_at = ? WHERE id = ?').run(content, now, id);
  return db.prepare('SELECT * FROM employee_notes WHERE id = ?').get(id);
};

const deleteNote = (id) => {
  return db.prepare('DELETE FROM employee_notes WHERE id = ?').run(id);
};

const getNoteById = (id) => {
  const row = db.prepare('SELECT * FROM employee_notes WHERE id = ?').get(id);
  return row ? rowToNote(row) : null;
};

const rowToNote = (row) => ({
  id: row.id,
  employeeId: row.employee_id,
  authorId: row.author_id,
  authorName: row.author_name,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ============== INITIALIZATION ==============

const isInitialized = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  return count > 0;
};

module.exports = {
  db,
  // Users
  getUsers, getUserById, getUserByUsername, createUser, updateUser, deleteUser, countAdmins,
  // Employees
  getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee, bulkReplaceEmployees,
  // Events
  getEvents, createEvent, updateEvent, deleteEvent, deleteEventsByEmployeeId, bulkReplaceEvents,
  // Hierarchy / Team Structures / Scenarios
  getHierarchy, setHierarchy,
  getTeamStructures, setTeamStructures,
  getScenarios, setScenarios,
  // Labels
  getLabels, createLabel, deleteLabel,
  // Notes
  getNotesByEmployee, createNote, updateNote, deleteNote, getNoteById,
  // Init
  isInitialized,
};
