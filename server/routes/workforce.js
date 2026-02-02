const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readData, writeData } = require('../utils/data');
const { authenticateToken } = require('../middleware/auth');
const { filterByPermission, canModifyEmployee } = require('../middleware/permissions');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============== EMPLOYEES ==============

// Get all employees (filtered by permission, except admin gets all for user management)
router.get('/employees', (req, res) => {
  try {
    const employees = readData('employees') || [];
    // Admin users get all employees (needed for user management linking)
    if (req.user.role === 'admin') {
      return res.json(employees);
    }
    const filteredEmployees = filterByPermission(req.user, employees, 'employees');
    res.json(filteredEmployees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

// Create employee
router.post('/employees', (req, res) => {
  try {
    const employees = readData('employees') || [];
    const newEmployee = {
      ...req.body,
      id: req.body.id || Date.now()
    };
    
    employees.push(newEmployee);
    writeData('employees', employees);
    
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee
router.put('/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    const employees = readData('employees') || [];
    const index = employees.findIndex(e => e.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check permission to modify
    if (!canModifyEmployee(req.user, employees[index])) {
      return res.status(403).json({ error: 'Not authorized to modify this employee' });
    }

    employees[index] = { ...employees[index], ...req.body, id: parseInt(id) };
    writeData('employees', employees);
    
    res.json(employees[index]);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee
router.delete('/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    const employees = readData('employees') || [];
    const employee = employees.find(e => e.id === parseInt(id));
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check permission to modify
    if (!canModifyEmployee(req.user, employee)) {
      return res.status(403).json({ error: 'Not authorized to delete this employee' });
    }

    const filteredEmployees = employees.filter(e => e.id !== parseInt(id));
    writeData('employees', filteredEmployees);
    
    // Also delete related events
    const events = readData('events') || [];
    const filteredEvents = events.filter(e => e.empId !== parseInt(id));
    writeData('events', filteredEvents);
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Bulk update employees (for imports)
router.post('/employees/bulk', (req, res) => {
  try {
    const { employees: newEmployees } = req.body;
    writeData('employees', newEmployees);
    res.json({ message: 'Employees updated successfully', count: newEmployees.length });
  } catch (error) {
    console.error('Bulk update employees error:', error);
    res.status(500).json({ error: 'Failed to bulk update employees' });
  }
});

// ============== EVENTS ==============

// Get all events (filtered by employee permission)
router.get('/events', (req, res) => {
  try {
    const events = readData('events') || [];
    const employees = readData('employees') || [];
    const filteredEmployees = filterByPermission(req.user, employees, 'employees');
    const allowedEmployeeIds = new Set(filteredEmployees.map(e => e.id));
    
    // Filter events to only those for visible employees
    const filteredEvents = events.filter(e => allowedEmployeeIds.has(e.empId));
    res.json(filteredEvents);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Create event
router.post('/events', (req, res) => {
  try {
    const events = readData('events') || [];
    const newEvent = {
      ...req.body,
      id: req.body.id || Date.now()
    };
    
    events.push(newEvent);
    writeData('events', events);
    
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const events = readData('events') || [];
    const index = events.findIndex(e => e.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }

    events[index] = { ...events[index], ...req.body, id: parseInt(id) };
    writeData('events', events);
    
    res.json(events[index]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const events = readData('events') || [];
    const filteredEvents = events.filter(e => e.id !== parseInt(id));
    writeData('events', filteredEvents);
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Bulk update events
router.post('/events/bulk', (req, res) => {
  try {
    const { events: newEvents } = req.body;
    writeData('events', newEvents);
    res.json({ message: 'Events updated successfully', count: newEvents.length });
  } catch (error) {
    console.error('Bulk update events error:', error);
    res.status(500).json({ error: 'Failed to bulk update events' });
  }
});

// ============== HIERARCHY ==============

// Get hierarchy
router.get('/hierarchy', (req, res) => {
  try {
    const hierarchy = readData('hierarchy') || [];
    res.json(hierarchy);
  } catch (error) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get hierarchy' });
  }
});

// Update hierarchy
router.put('/hierarchy', (req, res) => {
  try {
    const { hierarchy } = req.body;
    writeData('hierarchy', hierarchy);
    res.json({ message: 'Hierarchy updated successfully' });
  } catch (error) {
    console.error('Update hierarchy error:', error);
    res.status(500).json({ error: 'Failed to update hierarchy' });
  }
});

// ============== TEAM STRUCTURES ==============

// Get team structures
router.get('/team-structures', (req, res) => {
  try {
    const teamStructures = readData('team-structures') || [];
    res.json(teamStructures);
  } catch (error) {
    console.error('Get team structures error:', error);
    res.status(500).json({ error: 'Failed to get team structures' });
  }
});

// Update team structures
router.put('/team-structures', (req, res) => {
  try {
    const { teamStructures } = req.body;
    writeData('team-structures', teamStructures);
    res.json({ message: 'Team structures updated successfully' });
  } catch (error) {
    console.error('Update team structures error:', error);
    res.status(500).json({ error: 'Failed to update team structures' });
  }
});

// ============== SCENARIOS ==============

// Get scenarios
router.get('/scenarios', (req, res) => {
  try {
    const scenarios = readData('scenarios') || [];
    res.json(scenarios);
  } catch (error) {
    console.error('Get scenarios error:', error);
    res.status(500).json({ error: 'Failed to get scenarios' });
  }
});

// Update scenarios
router.put('/scenarios', (req, res) => {
  try {
    const { scenarios } = req.body;
    writeData('scenarios', scenarios);
    res.json({ message: 'Scenarios updated successfully' });
  } catch (error) {
    console.error('Update scenarios error:', error);
    res.status(500).json({ error: 'Failed to update scenarios' });
  }
});

// ============== BULK DATA ==============

// Get all data at once
router.get('/data', (req, res) => {
  try {
    const employees = readData('employees') || [];
    const events = readData('events') || [];
    const hierarchy = readData('hierarchy') || [];
    const teamStructures = readData('team-structures') || [];
    const scenarios = readData('scenarios') || [];

    // Filter employees by permission
    const filteredEmployees = filterByPermission(req.user, employees, 'employees');
    const allowedEmployeeIds = new Set(filteredEmployees.map(e => e.id));
    const filteredEvents = events.filter(e => allowedEmployeeIds.has(e.empId));

    res.json({
      employees: filteredEmployees,
      events: filteredEvents,
      hierarchy,
      teamStructures,
      scenarios
    });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({ error: 'Failed to get data' });
  }
});

// Update all data at once
router.put('/data', (req, res) => {
  try {
    const { employees, events, hierarchy, teamStructures, scenarios } = req.body;
    
    if (employees) writeData('employees', employees);
    if (events) writeData('events', events);
    if (hierarchy) writeData('hierarchy', hierarchy);
    if (teamStructures) writeData('team-structures', teamStructures);
    if (scenarios) writeData('scenarios', scenarios);

    res.json({ message: 'All data updated successfully' });
  } catch (error) {
    console.error('Update all data error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

module.exports = router;
