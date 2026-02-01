const { readData } = require('../utils/data');

/**
 * Hierarchical Permission Filter
 * 
 * Permission levels based on user's position:
 * - Admin: See everything
 * - Department Manager: See all employees in their department
 * - Group Manager: See all employees in their group (all teams in the group)
 * - Team Lead: See all employees in their team
 * - Regular Employee: See only themselves + their team members
 * - Viewer (no employee link): Read-only access based on assigned scope
 */

// Get user's scope from their linked employee
const getUserScope = (userId, userRole) => {
  // Admins see everything
  if (userRole === 'admin') {
    return { level: 'admin', scope: null };
  }

  const users = readData('users') || [];
  const user = users.find(u => u.id === userId);
  
  if (!user?.employeeId) {
    // No linked employee - viewer with no data access
    return { level: 'none', scope: null };
  }

  const employees = readData('employees') || [];
  const employee = employees.find(e => e.id === user.employeeId);
  
  if (!employee) {
    return { level: 'none', scope: null };
  }

  // Determine scope based on managerLevel
  switch (employee.managerLevel) {
    case 'department':
      return {
        level: 'department',
        scope: {
          dept: employee.dept
        }
      };
    case 'group':
      return {
        level: 'group',
        scope: {
          dept: employee.dept,
          group: employee.group
        }
      };
    case 'team':
      return {
        level: 'team',
        scope: {
          dept: employee.dept,
          group: employee.group,
          team: employee.team
        }
      };
    default:
      // Regular employee - see their team
      return {
        level: 'team',
        scope: {
          dept: employee.dept,
          group: employee.group,
          team: employee.team
        }
      };
  }
};

// Filter employees based on user's permission scope
const filterByPermission = (user, data, dataType) => {
  if (!user) return [];

  const { level, scope } = getUserScope(user.userId, user.role);

  // Admin sees everything
  if (level === 'admin') {
    return data;
  }

  // No scope means no access
  if (level === 'none' || !scope) {
    return [];
  }

  if (dataType === 'employees') {
    return data.filter(employee => {
      switch (level) {
        case 'department':
          return employee.dept === scope.dept;
        case 'group':
          // Group manager sees all teams in their group
          return employee.dept === scope.dept && 
                 (employee.group === scope.group || employee.team === scope.group);
        case 'team':
          return employee.dept === scope.dept && 
                 employee.group === scope.group && 
                 employee.team === scope.team;
        default:
          return false;
      }
    });
  }

  return data;
};

// Check if user can modify a specific employee
const canModifyEmployee = (user, employee) => {
  if (!user) return false;

  // Admin can modify anyone
  if (user.role === 'admin') return true;

  // Viewer cannot modify
  if (user.role === 'viewer') return false;

  const { level, scope } = getUserScope(user.userId, user.role);

  if (level === 'admin') return true;
  if (level === 'none' || !scope) return false;

  // Check if employee is in user's scope
  switch (level) {
    case 'department':
      return employee.dept === scope.dept;
    case 'group':
      return employee.dept === scope.dept && 
             (employee.group === scope.group || employee.team === scope.group);
    case 'team':
      return employee.dept === scope.dept && 
             employee.group === scope.group && 
             employee.team === scope.team;
    default:
      return false;
  }
};

module.exports = {
  getUserScope,
  filterByPermission,
  canModifyEmployee
};
