import { useMemo } from 'react';
import { Employee, HierarchyStructure, DepartmentStructure, GroupStructure } from '@/lib/workforce-data';

export type PermissionLevel = 'admin' | 'department' | 'group' | 'team';

export interface CurrentUser {
  id: number;
  name: string;
  level: PermissionLevel;
  // Scope identifiers
  departmentName?: string;
  groupName?: string;
  teamName?: string;
}

export interface PermissionScope {
  departments: string[];
  groups: string[];
  teams: string[];
}

// Find what a manager manages based on hierarchy
export const getManagerScope = (
  managerId: number,
  employees: Employee[],
  hierarchy: HierarchyStructure
): { level: PermissionLevel; scope: PermissionScope; departmentName?: string; groupName?: string; teamName?: string } => {
  // Check if they're a department manager
  for (const dept of hierarchy) {
    if (dept.departmentManagerId === managerId) {
      const groups: string[] = [];
      const teams: string[] = [...(dept.directTeams || [])];
      dept.groups.forEach(g => {
        groups.push(g.name);
        teams.push(...g.teams);
      });
      return {
        level: 'department',
        departmentName: dept.name,
        scope: { departments: [dept.name], groups, teams }
      };
    }
    
    // Check group managers
    for (const group of dept.groups) {
      if (group.groupManagerId === managerId) {
        return {
          level: 'group',
          departmentName: dept.name,
          groupName: group.name,
          scope: { departments: [dept.name], groups: [group.name], teams: [...group.teams] }
        };
      }
    }
  }
  
  // Check if they're a team leader (from hierarchy teamLeaderIds or employee's managerLevel)
  const employee = employees.find(e => e.id === managerId);
  if (employee?.managerLevel === 'team' || employee?.role === 'Team Lead') {
    // Find which team they lead
    const teamName = employee.team;
    for (const dept of hierarchy) {
      // Check direct teams
      if (dept.directTeams?.includes(teamName)) {
        return {
          level: 'team',
          departmentName: dept.name,
          teamName: teamName,
          scope: { departments: [dept.name], groups: [], teams: [teamName] }
        };
      }
      // Check group teams
      for (const group of dept.groups) {
        if (group.teams.includes(teamName)) {
          return {
            level: 'team',
            departmentName: dept.name,
            groupName: group.name,
            teamName: teamName,
            scope: { departments: [dept.name], groups: [group.name], teams: [teamName] }
          };
        }
      }
    }
  }
  
  // Default: no management scope (can only see themselves)
  return {
    level: 'team',
    scope: { departments: [], groups: [], teams: [] }
  };
};

// Get all managers from hierarchy and employees
export const getAllManagers = (
  employees: Employee[],
  hierarchy: HierarchyStructure
): CurrentUser[] => {
  const managers: CurrentUser[] = [];
  
  // Add admin option
  managers.push({
    id: 0,
    name: 'Admin (Full Access)',
    level: 'admin'
  });
  
  // Department managers
  for (const dept of hierarchy) {
    if (dept.departmentManagerId) {
      const emp = employees.find(e => e.id === dept.departmentManagerId);
      if (emp) {
        managers.push({
          id: emp.id,
          name: emp.name,
          level: 'department',
          departmentName: dept.name
        });
      }
    }
    
    // Group managers
    for (const group of dept.groups) {
      if (group.groupManagerId) {
        const emp = employees.find(e => e.id === group.groupManagerId);
        if (emp) {
          managers.push({
            id: emp.id,
            name: emp.name,
            level: 'group',
            departmentName: dept.name,
            groupName: group.name
          });
        }
      }
    }
  }
  
  // Team leaders (from employees with Team Lead role or managerLevel = 'team')
  employees.forEach(emp => {
    if ((emp.role === 'Team Lead' || emp.managerLevel === 'team') && !managers.some(m => m.id === emp.id)) {
      // Find team's location in hierarchy
      for (const dept of hierarchy) {
        if (dept.directTeams?.includes(emp.team)) {
          managers.push({
            id: emp.id,
            name: emp.name,
            level: 'team',
            departmentName: dept.name,
            teamName: emp.team
          });
          break;
        }
        for (const group of dept.groups) {
          if (group.teams.includes(emp.team)) {
            managers.push({
              id: emp.id,
              name: emp.name,
              level: 'team',
              departmentName: dept.name,
              groupName: group.name,
              teamName: emp.team
            });
            break;
          }
        }
      }
    }
  });
  
  return managers;
};

// Filter employees based on permission scope
export const filterEmployeesByPermission = (
  employees: Employee[],
  currentUser: CurrentUser | null,
  hierarchy: HierarchyStructure
): Employee[] => {
  if (!currentUser || currentUser.level === 'admin') {
    return employees; // Full access
  }
  
  const scope = getManagerScope(currentUser.id, employees, hierarchy).scope;
  
  return employees.filter(emp => {
    // Include if employee is in an allowed team
    if (scope.teams.includes(emp.team)) return true;
    
    // For department-level managers, also include group/dept level employees
    if (currentUser.level === 'department') {
      if (emp.dept === currentUser.departmentName) return true;
    }
    
    // For group managers, include group-level employees
    if (currentUser.level === 'group') {
      if (emp.group === currentUser.groupName) return true;
    }
    
    return false;
  });
};

// Get permission scope for filtering
export const getPermissionScopeFilter = (
  currentUser: CurrentUser | null,
  employees: Employee[],
  hierarchy: HierarchyStructure
): PermissionScope | null => {
  if (!currentUser || currentUser.level === 'admin') {
    return null; // No restriction
  }
  
  return getManagerScope(currentUser.id, employees, hierarchy).scope;
};

// Hook to manage permission-based filtering
export const usePermissionScope = (
  currentUser: CurrentUser | null,
  employees: Employee[],
  hierarchy: HierarchyStructure
) => {
  const permissionScope = useMemo(() => {
    return getPermissionScopeFilter(currentUser, employees, hierarchy);
  }, [currentUser, employees, hierarchy]);
  
  const filteredEmployees = useMemo(() => {
    return filterEmployeesByPermission(employees, currentUser, hierarchy);
  }, [employees, currentUser, hierarchy]);
  
  const canViewTeam = (teamName: string): boolean => {
    if (!permissionScope) return true;
    return permissionScope.teams.includes(teamName);
  };
  
  const canViewGroup = (groupName: string): boolean => {
    if (!permissionScope) return true;
    return permissionScope.groups.includes(groupName);
  };
  
  const canViewDepartment = (deptName: string): boolean => {
    if (!permissionScope) return true;
    return permissionScope.departments.includes(deptName);
  };
  
  return {
    permissionScope,
    filteredEmployees,
    canViewTeam,
    canViewGroup,
    canViewDepartment,
    isAdmin: !currentUser || currentUser.level === 'admin'
  };
};
