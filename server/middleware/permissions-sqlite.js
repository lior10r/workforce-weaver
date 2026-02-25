const db = require('../utils/database');

// Get user's scope from their linked employee
const getUserScope = (userId, userRole) => {
  if (userRole === 'admin') return { level: 'admin', scope: null };

  const user = db.getUserById(userId);
  if (!user?.employeeId) return { level: 'none', scope: null };

  const employee = db.getEmployeeById(user.employeeId);
  if (!employee) return { level: 'none', scope: null };

  switch (employee.managerLevel) {
    case 'department':
      return { level: 'department', scope: { dept: employee.dept } };
    case 'group':
      return { level: 'group', scope: { dept: employee.dept, group: employee.group } };
    case 'team':
      return { level: 'team', scope: { dept: employee.dept, group: employee.group, team: employee.team } };
    default:
      return { level: 'team', scope: { dept: employee.dept, group: employee.group, team: employee.team } };
  }
};

const filterByPermission = (user, data, dataType) => {
  if (!user) return [];
  const { level, scope } = getUserScope(user.userId, user.role);
  if (level === 'admin') return data;
  if (level === 'none' || !scope) return [];

  if (dataType === 'employees') {
    return data.filter(employee => {
      switch (level) {
        case 'department': return employee.dept === scope.dept;
        case 'group': return employee.dept === scope.dept && (employee.group === scope.group || employee.team === scope.group);
        case 'team': return employee.dept === scope.dept && employee.group === scope.group && employee.team === scope.team;
        default: return false;
      }
    });
  }
  return data;
};

const canModifyEmployee = (user, employee) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'viewer') return false;

  const { level, scope } = getUserScope(user.userId, user.role);
  if (level === 'admin') return true;
  if (level === 'none' || !scope) return false;

  switch (level) {
    case 'department': return employee.dept === scope.dept;
    case 'group': return employee.dept === scope.dept && (employee.group === scope.group || employee.team === scope.group);
    case 'team': return employee.dept === scope.dept && employee.group === scope.group && employee.team === scope.team;
    default: return false;
  }
};

module.exports = { getUserScope, filterByPermission, canModifyEmployee };
