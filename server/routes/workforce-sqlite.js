const express = require('express');
const db = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { filterByPermission, canModifyEmployee } = require('../middleware/permissions-sqlite');

const router = express.Router();

router.use(authenticateToken);

// ============== EMPLOYEES ==============

router.get('/employees', (req, res) => {
  try {
    const employees = db.getEmployees();
    if (req.user.role === 'admin') return res.json(employees);
    res.json(filterByPermission(req.user, employees, 'employees'));
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

router.post('/employees', (req, res) => {
  try {
    if (req.user.role !== 'admin' && !canModifyEmployee(req.user, req.body)) {
      return res.status(403).json({ error: 'Not authorized to create employees in this scope' });
    }
    const newEmployee = db.createEmployee(req.body);
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/employees/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.getEmployeeById(id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    if (!canModifyEmployee(req.user, existing)) {
      return res.status(403).json({ error: 'Not authorized to modify this employee' });
    }
    const updated = db.updateEmployee(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/employees/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.getEmployeeById(id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    if (!canModifyEmployee(req.user, existing)) {
      return res.status(403).json({ error: 'Not authorized to delete this employee' });
    }
    db.deleteEmployee(id);
    db.deleteEventsByEmployeeId(id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

router.post('/employees/bulk', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can perform bulk updates' });
    }
    db.bulkReplaceEmployees(req.body.employees);
    res.json({ message: 'Employees updated successfully', count: req.body.employees.length });
  } catch (error) {
    console.error('Bulk update employees error:', error);
    res.status(500).json({ error: 'Failed to bulk update employees' });
  }
});

// ============== EVENTS ==============

router.get('/events', (req, res) => {
  try {
    const events = db.getEvents();
    const employees = db.getEmployees();
    const filteredEmployees = filterByPermission(req.user, employees, 'employees');
    const allowedIds = new Set(filteredEmployees.map(e => e.id));
    res.json(events.filter(e => allowedIds.has(e.empId)));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

router.post('/events', (req, res) => {
  try {
    const newEvent = db.createEvent(req.body);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/events/:id', (req, res) => {
  try {
    const updated = db.updateEvent(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/events/:id', (req, res) => {
  try {
    db.deleteEvent(parseInt(req.params.id));
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

router.post('/events/bulk', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can perform bulk updates' });
    }
    db.bulkReplaceEvents(req.body.events);
    res.json({ message: 'Events updated successfully', count: req.body.events.length });
  } catch (error) {
    console.error('Bulk update events error:', error);
    res.status(500).json({ error: 'Failed to bulk update events' });
  }
});

// ============== HIERARCHY ==============

router.get('/hierarchy', (req, res) => {
  try {
    const hierarchy = db.getHierarchy();
    if (req.user.role === 'admin') return res.json(hierarchy);

    const { getUserScope } = require('../middleware/permissions-sqlite');
    const { level, scope } = getUserScope(req.user.userId, req.user.role);
    if (level === 'none' || !scope) return res.json([]);

    const filtered = hierarchy
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
    res.json(filtered);
  } catch (error) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get hierarchy' });
  }
});

router.put('/hierarchy', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can modify hierarchy' });
    db.setHierarchy(req.body.hierarchy);
    res.json({ message: 'Hierarchy updated successfully' });
  } catch (error) {
    console.error('Update hierarchy error:', error);
    res.status(500).json({ error: 'Failed to update hierarchy' });
  }
});

// ============== TEAM STRUCTURES ==============

router.get('/team-structures', (req, res) => {
  try { res.json(db.getTeamStructures()); }
  catch (error) { res.status(500).json({ error: 'Failed to get team structures' }); }
});

router.put('/team-structures', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can modify team structures' });
    db.setTeamStructures(req.body.teamStructures);
    res.json({ message: 'Team structures updated successfully' });
  } catch (error) { res.status(500).json({ error: 'Failed to update team structures' }); }
});

// ============== SCENARIOS ==============

router.get('/scenarios', (req, res) => {
  try { res.json(db.getScenarios()); }
  catch (error) { res.status(500).json({ error: 'Failed to get scenarios' }); }
});

router.put('/scenarios', (req, res) => {
  try {
    db.setScenarios(req.body.scenarios);
    res.json({ message: 'Scenarios updated successfully' });
  } catch (error) { res.status(500).json({ error: 'Failed to update scenarios' }); }
});

// ============== BULK DATA ==============

router.get('/data', (req, res) => {
  try {
    const employees = db.getEmployees();
    const events = db.getEvents();
    const hierarchy = db.getHierarchy();
    const teamStructures = db.getTeamStructures();
    const scenarios = db.getScenarios();

    const filteredEmployees = filterByPermission(req.user, employees, 'employees');
    const allowedIds = new Set(filteredEmployees.map(e => e.id));
    const filteredEvents = events.filter(e => allowedIds.has(e.empId));

    let filteredHierarchy = hierarchy;
    if (req.user.role !== 'admin') {
      const { getUserScope } = require('../middleware/permissions-sqlite');
      const { level, scope } = getUserScope(req.user.userId, req.user.role);
      if (level === 'none' || !scope) {
        filteredHierarchy = [];
      } else {
        filteredHierarchy = hierarchy
          .filter(d => d.name === scope.dept)
          .map(d => {
            if (level === 'department') return d;
            const fg = d.groups
              .filter(g => level === 'group' ? g.name === scope.group : g.teams.includes(scope.team))
              .map(g => level === 'team' ? { ...g, teams: g.teams.filter(t => t === scope.team) } : g);
            const fdt = (d.directTeams || []).filter(t => {
              if (level === 'group') return false;
              if (level === 'team') return t === scope.team;
              return true;
            });
            return { ...d, groups: fg, directTeams: fdt };
          });
      }
    }

    res.json({ employees: filteredEmployees, events: filteredEvents, hierarchy: filteredHierarchy, teamStructures, scenarios });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({ error: 'Failed to get data' });
  }
});

router.put('/data', (req, res) => {
  try {
    const { employees, events, hierarchy, teamStructures, scenarios } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (employees) {
      if (isAdmin) {
        db.bulkReplaceEmployees(employees);
      } else {
        const allEmployees = db.getEmployees();
        const allowed = new Set(filterByPermission(req.user, allEmployees, 'employees').map(e => e.id));
        const outside = allEmployees.filter(e => !allowed.has(e.id));
        const merged = [...outside, ...employees.filter(e => allowed.has(e.id))];
        db.bulkReplaceEmployees(merged);
      }
    }

    if (events) {
      if (isAdmin) {
        db.bulkReplaceEvents(events);
      } else {
        const allEvents = db.getEvents();
        const allEmployees = db.getEmployees();
        const allowedEmpIds = new Set(filterByPermission(req.user, allEmployees, 'employees').map(e => e.id));
        const outside = allEvents.filter(e => !allowedEmpIds.has(e.empId));
        const merged = [...outside, ...events.filter(e => allowedEmpIds.has(e.empId))];
        db.bulkReplaceEvents(merged);
      }
    }

    if (hierarchy) {
      if (!isAdmin) return res.status(403).json({ error: 'Only admins can modify hierarchy' });
      db.setHierarchy(hierarchy);
    }
    if (teamStructures) {
      if (!isAdmin) return res.status(403).json({ error: 'Only admins can modify team structures' });
      db.setTeamStructures(teamStructures);
    }
    if (scenarios) db.setScenarios(scenarios);

    res.json({ message: 'All data updated successfully' });
  } catch (error) {
    console.error('Update all data error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

// ============== LABELS ==============

router.get('/labels', (req, res) => {
  try {
    res.json(db.getLabels());
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Failed to get labels' });
  }
});

router.post('/labels', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Label name is required' });
    }
    const label = db.createLabel({ name: name.trim(), color, createdBy: req.user.userId });
    res.status(201).json(label);
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Label already exists' });
    }
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

router.delete('/labels/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete labels' });
    }
    db.deleteLabel(parseInt(req.params.id));
    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

module.exports = router;
