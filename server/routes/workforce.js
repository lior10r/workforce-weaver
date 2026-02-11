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
    // Check if user can create in this scope
    if (req.user.role !== 'admin') {
      const newEmp = req.body;
      if (!canModifyEmployee(req.user, newEmp)) {
        return res.status(403).json({ error: 'Not authorized to create employees in this scope' });
      }
    }
    
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

// Bulk update employees (admin only - for imports)
router.post('/employees/bulk', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can perform bulk updates' });
    }
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

// Bulk update events (admin only)
router.post('/events/bulk', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can perform bulk updates' });
    }
    const { events: newEvents } = req.body;
    writeData('events', newEvents);
    res.json({ message: 'Events updated successfully', count: newEvents.length });
  } catch (error) {
    console.error('Bulk update events error:', error);
    res.status(500).json({ error: 'Failed to bulk update events' });
  }
});

// ============== HIERARCHY ==============

// Get hierarchy (filtered by user scope for non-admins)
router.get('/hierarchy', (req, res) => {
  try {
    const hierarchy = readData('hierarchy') || [];
    
    if (req.user.role === 'admin') {
      return res.json(hierarchy);
    }
    
    // Filter hierarchy to user's scope
    const { getUserScope } = require('../middleware/permissions');
    const { level, scope } = getUserScope(req.user.userId, req.user.role);
    
    if (level === 'none' || !scope) {
      return res.json([]);
    }
    
    // Filter to only the user's department, then narrow groups/teams
    const filtered = hierarchy
      .filter(d => d.name === scope.dept)
      .map(d => {
        if (level === 'department') return d; // See whole department
        
        // Group or team level: filter groups
        const filteredGroups = d.groups
          .filter(g => level === 'group' ? g.name === scope.group : g.teams.includes(scope.team))
          .map(g => {
            if (level === 'team') {
              return { ...g, teams: g.teams.filter(t => t === scope.team) };
            }
            return g;
          });
        
        const filteredDirectTeams = (d.directTeams || []).filter(t => {
          if (level === 'group') return false; // Group managers see their group, not direct teams
          if (level === 'team') return t === scope.team;
          return true;
        });
        
        return { ...d, groups: filteredGroups, directTeams: filteredDirectTeams };
      });
    
    res.json(filtered);
  } catch (error) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get hierarchy' });
  }
});

// Update hierarchy (admin only)
router.put('/hierarchy', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can modify hierarchy' });
    }
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

// Update team structures (admin only)
router.put('/team-structures', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can modify team structures' });
    }
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

    // Filter hierarchy for non-admins
    let filteredHierarchy = hierarchy;
    if (req.user.role !== 'admin') {
      const { getUserScope } = require('../middleware/permissions');
      const { level, scope } = getUserScope(req.user.userId, req.user.role);
      
      if (level === 'none' || !scope) {
        filteredHierarchy = [];
      } else {
        filteredHierarchy = hierarchy
          .filter(d => d.name === scope.dept)
          .map(d => {
            if (level === 'department') return d;
            const filteredGroups = d.groups
              .filter(g => level === 'group' ? g.name === scope.group : g.teams.includes(scope.team))
              .map(g => level === 'team' ? { ...g, teams: g.teams.filter(t => t === scope.team) } : g);
            const filteredDirectTeams = (d.directTeams || []).filter(t => {
              if (level === 'group') return false;
              if (level === 'team') return t === scope.team;
              return true;
            });
            return { ...d, groups: filteredGroups, directTeams: filteredDirectTeams };
          });
      }
    }

    res.json({
      employees: filteredEmployees,
      events: filteredEvents,
      hierarchy: filteredHierarchy,
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
    const isAdmin = req.user.role === 'admin';
    
    if (employees) {
      if (isAdmin) {
        // Admin can overwrite everything
        writeData('employees', employees);
      } else {
        // Non-admin: merge only employees within their scope
        const allEmployees = readData('employees') || [];
        const { level, scope } = require('../middleware/permissions').getUserScope(req.user.userId, req.user.role);
        
        if (level !== 'none' && scope) {
          // Build a set of IDs the user is allowed to modify
          const allowedIds = new Set(
            filterByPermission(req.user, allEmployees, 'employees').map(e => e.id)
          );
          
          // Keep employees outside user's scope unchanged, replace those inside scope
          const outsideScope = allEmployees.filter(e => !allowedIds.has(e.id));
          const merged = [...outsideScope, ...employees.filter(e => allowedIds.has(e.id))];
          writeData('employees', merged);
        }
        // If level === 'none', don't write anything
      }
    }
    
    if (events) {
      if (isAdmin) {
        writeData('events', events);
      } else {
        // Non-admin: merge only events for employees in their scope
        const allEvents = readData('events') || [];
        const allEmployees = readData('employees') || [];
        const allowedEmpIds = new Set(
          filterByPermission(req.user, allEmployees, 'employees').map(e => e.id)
        );
        const outsideScope = allEvents.filter(e => !allowedEmpIds.has(e.empId));
        const merged = [...outsideScope, ...events.filter(e => allowedEmpIds.has(e.empId))];
        writeData('events', merged);
      }
    }
    
    // Only admins can modify hierarchy and team structures
    if (hierarchy) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can modify hierarchy' });
      }
      writeData('hierarchy', hierarchy);
    }
    if (teamStructures) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can modify team structures' });
      }
      writeData('team-structures', teamStructures);
    }
    
    if (scenarios) writeData('scenarios', scenarios);

    res.json({ message: 'All data updated successfully' });
  } catch (error) {
    console.error('Update all data error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

module.exports = router;
