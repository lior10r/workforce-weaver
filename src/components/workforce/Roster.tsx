import { useState } from 'react';
import { Flag, Edit2, Settings, Users, ChevronDown, ChevronRight, AlertTriangle, Plus, Minus, Edit3 } from 'lucide-react';
import { Employee, TeamStructure, getRoleColor, formatDate, DEPARTMENTS, DiffStatus } from '@/lib/workforce-data';

interface RosterProps {
  employees: Employee[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
  onEditEmployee: (employee: Employee) => void;
  teamStructures: TeamStructure[];
  onConfigureTeam: (teamName: string, department: string) => void;
  employeeDiffMap?: Map<number, { status: DiffStatus; changes?: string[] }>;
}

interface TeamGroup {
  teamName: string;
  department: string;
  employees: Employee[];
  structure?: TeamStructure;
}

const getDiffStyles = (status?: DiffStatus) => {
  switch (status) {
    case 'added':
      return 'bg-emerald-500/10 border-l-4 border-l-emerald-500';
    case 'modified':
      return 'bg-amber-500/10 border-l-4 border-l-amber-500';
    case 'removed':
      return 'bg-destructive/10 border-l-4 border-l-destructive opacity-60';
    default:
      return '';
  }
};

const getDiffBadge = (status?: DiffStatus, changes?: string[]) => {
  if (!status || status === 'unchanged') return null;
  
  const config = {
    added: { icon: Plus, text: 'Added', className: 'bg-emerald-500/20 text-emerald-500' },
    modified: { icon: Edit3, text: 'Modified', className: 'bg-amber-500/20 text-amber-500' },
    removed: { icon: Minus, text: 'Removed', className: 'bg-destructive/20 text-destructive' }
  }[status];
  
  if (!config) return null;
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${config.className}`}>
        <Icon size={10} />
        {config.text}
      </span>
      {changes && changes.length > 0 && (
        <span className="text-[9px] text-muted-foreground italic">
          {changes.join(', ')}
        </span>
      )}
    </div>
  );
};

export const Roster = ({ 
  employees, 
  openPlannerForUser, 
  onEditEmployee,
  teamStructures,
  onConfigureTeam,
  employeeDiffMap
}: RosterProps) => {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Group employees by team
  const teamGroups: TeamGroup[] = [];
  const teamMap = new Map<string, Employee[]>();
  
  // Also track "non-team" managers (those with team same as department name like "Engineering")
  const nonTeamEmployees: Employee[] = [];
  const allTeams = Object.values(DEPARTMENTS).flat();
  
  employees.forEach(emp => {
    // Check if employee's team is an actual team or just a department placeholder
    if (allTeams.includes(emp.team)) {
      if (!teamMap.has(emp.team)) {
        teamMap.set(emp.team, []);
      }
      teamMap.get(emp.team)!.push(emp);
    } else {
      // This is a non-team manager (department or group level)
      nonTeamEmployees.push(emp);
    }
  });

  // Convert to array with structure info
  teamMap.forEach((emps, teamName) => {
    const dept = emps[0]?.dept || '';
    const structure = teamStructures.find(s => s.teamName === teamName);
    teamGroups.push({
      teamName,
      department: dept,
      employees: emps,
      structure
    });
  });

  // Sort by department then team name
  teamGroups.sort((a, b) => {
    if (a.department !== b.department) {
      return a.department.localeCompare(b.department);
    }
    return a.teamName.localeCompare(b.teamName);
  });

  const toggleTeam = (teamName: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
      } else {
        next.add(teamName);
      }
      return next;
    });
  };

  // Check if a team has missing roles
  const getMissingRoles = (group: TeamGroup): { role: string; missing: number }[] => {
    if (!group.structure?.requiredRoles) return [];
    
    const roleCounts: Record<string, number> = {};
    group.employees.filter(e => !e.isPotential).forEach(emp => {
      roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
    });

    const missing: { role: string; missing: number }[] = [];
    Object.entries(group.structure.requiredRoles).forEach(([role, required]) => {
      const current = roleCounts[role] || 0;
      if (current < required) {
        missing.push({ role, missing: required - current });
      }
    });
    return missing;
  };

  // Get manager info for an employee
  const getManager = (emp: Employee): Employee | undefined => {
    if (!emp.managerId) return undefined;
    return employees.find(e => e.id === emp.managerId);
  };

  // Get team leader
  const getTeamLeader = (group: TeamGroup): Employee | undefined => {
    if (!group.structure?.teamLeader) return undefined;
    return employees.find(e => e.id === group.structure?.teamLeader);
  };

  // Sort employees: leader first, then by manager hierarchy, then by role seniority
  const sortEmployees = (emps: Employee[], leaderId?: number): Employee[] => {
    const roleOrder: Record<string, number> = {
      'Engineering Manager': 0,
      'Architect': 1,
      'Team Lead': 2,
      'Product Manager': 3,
      'Senior Dev': 4,
      'Mid-Level Dev': 5,
      'Junior Dev': 6,
      'QA Engineer': 7
    };

    return [...emps].sort((a, b) => {
      // Leader always first
      if (a.id === leaderId) return -1;
      if (b.id === leaderId) return 1;
      
      // Then by role seniority
      const aOrder = roleOrder[a.role] ?? 99;
      const bOrder = roleOrder[b.role] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      return a.name.localeCompare(b.name);
    });
  };

  const renderEmployeeRow = (emp: Employee, group?: TeamGroup) => {
    const manager = getManager(emp);
    const isLeader = emp.id === group?.structure?.teamLeader;
    const diffInfo = employeeDiffMap?.get(emp.id);
    const diffStatus = diffInfo?.status;

    return (
      <div 
        key={emp.id}
        className={`flex items-center justify-between p-4 group hover:bg-secondary/20 transition-colors ${
          emp.isPotential ? 'opacity-70 bg-potential-color/5' : ''
        } ${getDiffStyles(diffStatus)}`}
      >
        <div className="flex items-center gap-4">
          {/* Avatar with role color */}
          <div className={`relative w-10 h-10 rounded-lg ${getRoleColor(emp.role)} bg-opacity-20 flex items-center justify-center`}>
            <span className="font-bold text-sm">
              {emp.name.split(' ').map(n => n[0]).join('')}
            </span>
            {isLeader && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-[8px] text-primary-foreground font-bold">L</span>
              </div>
            )}
            {emp.isPotential && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-potential-color rounded-full flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">?</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground">{emp.name}</h4>
              {emp.isPotential && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-potential-color/20 text-potential-color uppercase">
                  Potential
                </span>
              )}
              {getDiffBadge(diffStatus, diffInfo?.changes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {emp.role}
              {manager && (
                <span className="ml-2 text-primary">
                  → Reports to {manager.name}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status */}
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide
            ${emp.status === 'Active' 
              ? 'bg-role-junior/10 text-role-junior' 
              : emp.status === 'On Course'
              ? 'bg-role-lead/10 text-role-lead'
              : emp.status === 'Parental Leave'
              ? 'bg-status-leave/10 text-status-leave'
              : 'bg-destructive/10 text-destructive'
            }`}
          >
            {emp.status}
          </span>

          {/* Date */}
          <span className="text-muted-foreground font-mono text-[10px] hidden sm:block">
            Since {formatDate(emp.joined)}
          </span>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => openPlannerForUser(emp.id, true)} 
              className="p-2 hover:bg-flag/10 text-flag rounded-lg transition-colors"
              title="Add Flag"
            >
              <Flag size={14}/>
            </button>
            <button 
              onClick={() => onEditEmployee(emp)} 
              className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={14}/>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No employees match your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Non-team Managers Section */}
      {nonTeamEmployees.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <h3 className="font-bold text-lg">Department & Group Managers</h3>
              <span className="text-xs text-muted-foreground">({nonTeamEmployees.length})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Managers overseeing multiple teams or departments</p>
          </div>
          <div className="divide-y divide-border">
            {sortEmployees(nonTeamEmployees).map((emp) => renderEmployeeRow(emp))}
          </div>
        </div>
      )}

      {/* Team Groups */}
      {teamGroups.map((group) => {
        const isExpanded = expandedTeams.has(group.teamName);
        const missingRoles = getMissingRoles(group);
        const leader = getTeamLeader(group);
        const sortedEmployees = sortEmployees(group.employees, group.structure?.teamLeader);
        const actualCount = group.employees.filter(e => !e.isPotential).length;
        const potentialCount = group.employees.filter(e => e.isPotential).length;

        // Check if any team members have diffs
        const hasDiffs = group.employees.some(e => {
          const diff = employeeDiffMap?.get(e.id);
          return diff && diff.status !== 'unchanged';
        });

        return (
          <div key={group.teamName} className={`glass-card overflow-hidden ${hasDiffs ? 'ring-1 ring-amber-500/30' : ''}`}>
            {/* Team Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => toggleTeam(group.teamName)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{group.teamName}</h3>
                    {missingRoles.length > 0 && (
                      <span className="text-status-warning" title="Missing roles">
                        <AlertTriangle size={16} />
                      </span>
                    )}
                    {hasDiffs && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500">
                        HAS CHANGES
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{group.department}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {actualCount} members
                      {potentialCount > 0 && (
                        <span className="text-potential-color">+{potentialCount} potential</span>
                      )}
                    </span>
                    {leader && (
                      <>
                        <span>•</span>
                        <span>Lead: {leader.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigureTeam(group.teamName, group.department);
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                title="Configure team structure"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Team Structure Summary */}
            {isExpanded && group.structure && (
              <div className="px-4 pb-3 border-b border-border">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(group.structure.requiredRoles).map(([role, count]) => {
                    const current = group.employees.filter(e => e.role === role && !e.isPotential).length;
                    const isMissing = current < count;
                    return (
                      <span 
                        key={role}
                        className={`px-2 py-1 rounded text-[10px] font-medium ${
                          isMissing 
                            ? 'bg-destructive/10 text-destructive' 
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {role}: {current}/{count}
                      </span>
                    );
                  })}
                  {group.structure.targetSize && (
                    <span className={`px-2 py-1 rounded text-[10px] font-medium ${
                      actualCount < group.structure.targetSize
                        ? 'bg-status-warning/10 text-status-warning'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      Size: {actualCount}/{group.structure.targetSize}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Employee List */}
            {isExpanded && (
              <div className="divide-y divide-border">
                {sortedEmployees.map((emp) => renderEmployeeRow(emp, group))}
              </div>
            )}
          </div>
        );
      })}

      {/* Diff Legend */}
      {employeeDiffMap && employeeDiffMap.size > 0 && (
        <div className="flex items-center gap-4 text-xs p-4 bg-accent/30 rounded-xl">
          <span className="font-medium text-muted-foreground">Comparison Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded" />
            <span>Added</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span>Modified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded" />
            <span>Removed</span>
          </div>
        </div>
      )}
    </div>
  );
};