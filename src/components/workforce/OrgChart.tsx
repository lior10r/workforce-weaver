import { useState, useMemo, forwardRef } from 'react';
import { ChevronDown, ChevronRight, User, Users, Building2, AlertCircle } from 'lucide-react';
import { Employee, TeamStructure } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrgChartProps {
  employees: Employee[];
  teamStructures: TeamStructure[];
  departments: Record<string, string[]>;
  onEditEmployee?: (employee: Employee) => void;
}

interface OrgNode {
  employee: Employee;
  directReports: OrgNode[];
}

export const OrgChart = forwardRef<HTMLDivElement, OrgChartProps>(({ employees, teamStructures, departments, onEditEmployee }, ref) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'hierarchy' | 'department' | 'team'>('hierarchy');

  // Build org tree from manager relationships
  const orgTree = useMemo(() => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const childrenMap = new Map<number | null, Employee[]>();
    
    // Group employees by their manager
    employees.forEach(emp => {
      const managerId = emp.managerId || null;
      if (!childrenMap.has(managerId)) {
        childrenMap.set(managerId, []);
      }
      childrenMap.get(managerId)!.push(emp);
    });

    // Build tree recursively
    const buildNode = (employee: Employee): OrgNode => {
      const directReports = childrenMap.get(employee.id) || [];
      return {
        employee,
        directReports: directReports.map(buildNode).sort((a, b) => 
          a.employee.name.localeCompare(b.employee.name)
        )
      };
    };

    // Get root nodes (employees without managers)
    const rootEmployees = childrenMap.get(null) || [];
    return rootEmployees.map(buildNode).sort((a, b) => 
      a.employee.name.localeCompare(b.employee.name)
    );
  }, [employees]);

  // Group by department
  const departmentGroups = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    Object.keys(departments).forEach(dept => {
      groups[dept] = [];
    });
    
    employees.forEach(emp => {
      // Find which department this employee's team belongs to
      for (const [dept, teams] of Object.entries(departments)) {
        if (teams.includes(emp.team)) {
          if (!groups[dept]) groups[dept] = [];
          groups[dept].push(emp);
          break;
        }
      }
    });
    
    return groups;
  }, [employees, departments]);

  // Group by team
  const teamGroups = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    employees.forEach(emp => {
      if (!groups[emp.team]) groups[emp.team] = [];
      groups[emp.team].push(emp);
    });
    return groups;
  }, [employees]);

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(employees.map(e => e.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Course': return 'bg-emerald-500';
      case 'Training': return 'bg-amber-500';
      case 'Parental Leave': return 'bg-blue-500';
      case 'Notice': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const renderEmployeeCard = (employee: Employee, isLeader?: boolean) => {
    const manager = employee.managerId ? employees.find(e => e.id === employee.managerId) : null;
    
    return (
      <TooltipProvider key={employee.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                ${employee.isPotential 
                  ? 'bg-potential-color/10 border-potential-color/30 border-dashed' 
                  : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                }
                ${isLeader ? 'ring-2 ring-primary/30' : ''}
              `}
              onClick={() => onEditEmployee?.(employee)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${employee.isPotential ? 'bg-potential-color/20 text-potential-color' : 'bg-primary/10 text-primary'}`}>
                {employee.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{employee.name}</span>
                  {isLeader && (
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">
                      Lead
                    </span>
                  )}
                  {employee.isPotential && (
                    <span className="text-[9px] bg-potential-color/20 text-potential-color px-1.5 py-0.5 rounded-full font-bold">
                      Potential
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{employee.role}</div>
                <div className="text-[10px] text-muted-foreground/70">{employee.team}</div>
              </div>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(employee.status)}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{employee.name}</p>
              <p className="text-xs text-muted-foreground">{employee.role} • {employee.team}</p>
              <p className="text-xs">Joined: {new Date(employee.joined).toLocaleDateString()}</p>
              {manager && (
                <p className="text-xs text-primary">Reports to: {manager.name}</p>
              )}
              <p className="text-xs">Status: {employee.status}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderOrgNode = (node: OrgNode, depth: number = 0) => {
    const hasReports = node.directReports.length > 0;
    const isExpanded = expandedNodes.has(node.employee.id);

    return (
      <div key={node.employee.id} className="relative">
        <div className="flex items-start gap-2">
          {hasReports && (
            <button
              onClick={() => toggleNode(node.employee.id)}
              className="mt-3 p-1 hover:bg-accent rounded transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasReports && <div className="w-6" />}
          
          <div className="flex-1">
            {renderEmployeeCard(node.employee)}
          </div>
        </div>

        {hasReports && isExpanded && (
          <div className="ml-8 mt-2 pl-4 border-l-2 border-border space-y-2">
            {node.directReports.map(child => renderOrgNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderDepartmentView = () => (
    <div className="space-y-6">
      {Object.entries(departmentGroups).map(([dept, emps]) => {
        if (emps.length === 0) return null;
        
        const teamsByDept = departments[dept] || [];
        
        return (
          <div key={dept} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{dept}</h3>
                <p className="text-xs text-muted-foreground">{emps.length} employees • {teamsByDept.length} teams</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {emps.sort((a, b) => a.name.localeCompare(b.name)).map(emp => {
                const structure = teamStructures.find(s => s.teamName === emp.team);
                const isLeader = structure?.teamLeader === emp.id;
                return renderEmployeeCard(emp, isLeader);
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTeamView = () => (
    <div className="space-y-6">
      {Object.entries(teamGroups).map(([team, emps]) => {
        const structure = teamStructures.find(s => s.teamName === team);
        const leader = structure?.teamLeader ? employees.find(e => e.id === structure.teamLeader) : null;
        const missingRoles = structure?.requiredRoles 
          ? Object.entries(structure.requiredRoles).filter(
              ([role, count]) => emps.filter(e => e.role === role).length < count
            ).map(([role, count]) => ({ role, count: count as number }))
          : [];
        
        return (
          <div key={team} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{team}</h3>
                  <p className="text-xs text-muted-foreground">
                    {emps.length} members
                    {structure?.targetSize && ` / ${structure.targetSize} target`}
                    {leader && ` • Led by ${leader.name}`}
                  </p>
                </div>
              </div>
              
              {missingRoles.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1 text-status-warning text-xs">
                        <AlertCircle size={14} />
                        <span>{missingRoles.length} missing</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold text-xs">Missing Roles:</p>
                        {missingRoles.map((req, i) => (
                          <p key={i} className="text-xs">{req.role}: need {req.count - emps.filter(e => e.role === req.role).length} more</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {emps.sort((a, b) => {
                // Sort leader first
                if (structure?.teamLeader === a.id) return -1;
                if (structure?.teamLeader === b.id) return 1;
                return a.name.localeCompare(b.name);
              }).map(emp => {
                const isLeader = structure?.teamLeader === emp.id;
                return renderEmployeeCard(emp, isLeader);
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderHierarchyView = () => (
    <div className="space-y-4">
      {orgTree.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <User size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reporting Structure</h3>
          <p className="text-sm text-muted-foreground">
            Assign managers to employees to build the org chart hierarchy.
          </p>
        </div>
      ) : (
        orgTree.map(node => renderOrgNode(node))
      )}
      
      {/* Unassigned employees (those without managers who also have no reports) */}
      {employees.filter(e => !e.managerId && !employees.some(other => other.managerId === e.id)).length > 0 && orgTree.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Unassigned to Hierarchy
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {employees
              .filter(e => !e.managerId && !employees.some(other => other.managerId === e.id))
              .map(emp => renderEmployeeCard(emp))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={ref} className="space-y-6 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'hierarchy' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-accent hover:bg-accent/80 text-foreground'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Hierarchy
          </button>
          <button
            onClick={() => setViewMode('department')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'department' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-accent hover:bg-accent/80 text-foreground'
            }`}
          >
            <Building2 size={16} className="inline mr-2" />
            Departments
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'team' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-accent hover:bg-accent/80 text-foreground'
            }`}
          >
            <Users size={16} className="inline mr-2" />
            Teams
          </button>
        </div>

        {viewMode === 'hierarchy' && orgTree.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-primary">{employees.length}</p>
          <p className="text-xs text-muted-foreground">Total Employees</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-primary">{Object.keys(departments).length}</p>
          <p className="text-xs text-muted-foreground">Departments</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-primary">{Object.keys(teamGroups).length}</p>
          <p className="text-xs text-muted-foreground">Teams</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-primary">
            {employees.filter(e => employees.some(other => other.managerId === e.id)).length}
          </p>
          <p className="text-xs text-muted-foreground">Managers</p>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'hierarchy' && renderHierarchyView()}
      {viewMode === 'department' && renderDepartmentView()}
      {viewMode === 'team' && renderTeamView()}
    </div>
  );
});

OrgChart.displayName = 'OrgChart';
