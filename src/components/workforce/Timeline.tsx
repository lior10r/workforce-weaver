import { useState } from 'react';
import { Flag, Clock, ArrowRightLeft, ArrowRight, UserPlus, BookOpen, AlertTriangle, HelpCircle, Plus, Minus, Edit3, Building2, Users, FolderTree, Crown } from 'lucide-react';
import { Employee, WorkforceEvent, TeamStructure, getRoleColor, getTimelinePosition, formatDate, DiffStatus, HierarchyStructure, getAllDeptTeams, getDepartmentsFlat } from '@/lib/workforce-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type GroupingMode = 'team' | 'hierarchy';

interface TimelineProps {
  employees: Employee[];
  events: WorkforceEvent[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
  allEmployees?: Employee[];
  selectedTeam?: string;
  selectedDept?: string;
  teamStructures?: TeamStructure[];
  employeeDiffMap?: Map<number, { status: DiffStatus; changes?: string[] }>;
  eventDiffMap?: Map<number, { status: DiffStatus }>;
  hierarchy?: HierarchyStructure;
}

interface TrainingPeriod {
  startDate: string;
  endDate: string;
  details: string;
}

interface TransferInfo {
  fromTeam: string;
  transferDate: string;
}

const getDiffBorderColor = (status?: DiffStatus) => {
  switch (status) {
    case 'added': return 'border-l-4 border-l-emerald-500';
    case 'modified': return 'border-l-4 border-l-amber-500';
    case 'removed': return 'border-l-4 border-l-destructive opacity-60';
    default: return '';
  }
};

const getDiffBgColor = (status?: DiffStatus) => {
  switch (status) {
    case 'added': return 'bg-emerald-500/5';
    case 'modified': return 'bg-amber-500/5';
    case 'removed': return 'bg-destructive/5';
    default: return '';
  }
};

export const Timeline = ({ 
  employees, 
  events, 
  openPlannerForUser, 
  allEmployees = [], 
  selectedTeam = 'All', 
  selectedDept = 'All',
  teamStructures = [],
  employeeDiffMap,
  eventDiffMap,
  hierarchy = []
}: TimelineProps) => {
  const departments = getDepartmentsFlat(hierarchy);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('team');
  
  const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];
  const currentDate = new Date();
  const currentDatePos = getTimelinePosition(currentDate.toISOString().split('T')[0]);

  // Get all unique teams from employees for grouping
  const getTeamsFromEmployees = (emps: Employee[]): string[] => {
    const teams = new Set<string>();
    emps.forEach(emp => teams.add(emp.team));
    return Array.from(teams).sort();
  };

  // Get training periods for an employee
  const getTrainingPeriods = (empId: number): TrainingPeriod[] => {
    return events
      .filter(e => e.empId === empId && (e.type === 'Training' || e.type === 'Course') && e.endDate)
      .map(e => ({
        startDate: e.date,
        endDate: e.endDate!,
        details: e.details
      }));
  };

  // Get transfer info for an employee who transferred to a team
  const getTransferInfo = (empId: number, targetTeam: string): TransferInfo | null => {
    const swap = events.find(e => e.empId === empId && e.type === 'Team Swap' && e.targetTeam === targetTeam);
    if (swap) {
      const emp = allEmployees.find(e => e.id === empId);
      return { fromTeam: emp?.team || 'Unknown', transferDate: swap.date };
    }
    return null;
  };

  // Check what roles are missing in a team
  const getMissingRoles = (teamName: string, teamEmployees: Employee[]): { role: string; missing: number }[] => {
    const structure = teamStructures.find(t => t.teamName === teamName);
    if (!structure) return [];

    const missing: { role: string; missing: number }[] = [];
    const roleCounts: Record<string, number> = {};
    
    teamEmployees.forEach(emp => {
      if (!emp.isPotential) {
        roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
      }
    });

    Object.entries(structure.requiredRoles).forEach(([role, required]) => {
      const actual = roleCounts[role] || 0;
      if (actual < required) {
        missing.push({ role, missing: required - actual });
      }
    });

    return missing;
  };

  // Build map of employees who transferred INTO each team
  const getEmployeesInTeam = (teamName: string) => {
    const directMembers = employees.filter(e => e.team === teamName);
    
    // Find employees who transferred INTO this team
    const transfersIn = events
      .filter(ev => ev.type === 'Team Swap' && ev.targetTeam === teamName)
      .map(mov => {
        const emp = allEmployees.find(e => e.id === mov.empId);
        return emp ? { employee: emp, movement: mov } : null;
      })
      .filter((item): item is { employee: Employee; movement: WorkforceEvent } => item !== null);
    
    // Create combined list - include transfers as regular members
    const allTeamMembers: { 
      employee: Employee; 
      transferInfo?: TransferInfo;
      isTransfer: boolean;
    }[] = [];

    // Add direct members (not transferred out)
    directMembers.forEach(emp => {
      const hasTransferOut = events.find(e => e.empId === emp.id && e.type === 'Team Swap');
      if (!hasTransferOut) {
        allTeamMembers.push({ employee: emp, isTransfer: false });
      }
    });

    // Add transferred in members
    transfersIn.forEach(({ employee, movement }) => {
      if (!directMembers.some(e => e.id === employee.id)) {
        allTeamMembers.push({ 
          employee: { ...employee, team: teamName, dept: employee.dept },
          transferInfo: { fromTeam: employee.team, transferDate: movement.date },
          isTransfer: true
        });
      }
    });

    return allTeamMembers;
  };

  // Determine if we should group by team
  const shouldGroupByTeam = selectedDept !== 'All' || selectedTeam === 'All';
  const teams = shouldGroupByTeam ? getTeamsFromEmployees(employees) : [];

  const renderEmployeeRow = (
    emp: Employee, 
    transferInfo?: TransferInfo,
    isTransfer = false,
    isManagerRow = false,
    managerLevel?: 'dept' | 'group'
  ) => {
    const empEvents = events.filter(e => e.empId === emp.id);
    const departureEvent = empEvents.find(e => e.type === 'Departure');
    const teamSwapEvent = empEvents.find(e => e.type === 'Team Swap');
    const trainingPeriods = getTrainingPeriods(emp.id);
    
    // Calculate bar positions
    let barStartDate = emp.joined;
    let barEndDate = departureEvent?.date || null;
    
    if (isTransfer && transferInfo) {
      // For transfers, bar starts at transfer date
      barStartDate = transferInfo.transferDate;
    } else if (teamSwapEvent) {
      // Employee is transferring OUT - bar ends at swap date
      barEndDate = teamSwapEvent.date;
    }
    
    const joinedPos = getTimelinePosition(barStartDate);
    const departurePos = barEndDate ? getTimelinePosition(barEndDate) : 100;
    const durationWidth = Math.max(0, departurePos - joinedPos);

    const isPotential = emp.isPotential;
    const diffInfo = employeeDiffMap?.get(emp.id);
    const diffStatus = diffInfo?.status;

    // Manager badge colors
    const managerBadgeColors = {
      dept: 'bg-purple-500/20 text-purple-500',
      group: 'bg-blue-500/20 text-blue-500'
    };

    return (
      <div key={isTransfer ? `transfer-${emp.id}` : `${isManagerRow ? 'mgr-' : ''}${emp.id}`} className={`flex items-center group py-1.5 ${isPotential ? 'opacity-60' : ''} ${getDiffBorderColor(diffStatus)} ${getDiffBgColor(diffStatus)} ${isManagerRow ? 'bg-accent/20' : ''}`}>
        {/* Name & Quick Actions */}
        <div className="w-72 pr-6 flex justify-between items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <div className="flex items-center gap-2">
                  {isPotential && <HelpCircle size={12} className="text-potential" />}
                  <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                  {managerLevel && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${managerBadgeColors[managerLevel]}`}>
                      {managerLevel === 'dept' ? 'Dept Mgr' : 'Group Mgr'}
                    </span>
                  )}
                  {diffStatus && diffStatus !== 'unchanged' && (
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                      diffStatus === 'added' ? 'bg-emerald-500/20 text-emerald-500' :
                      diffStatus === 'modified' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-destructive/20 text-destructive'
                    }`}>
                      {diffStatus === 'added' ? <Plus size={8} /> : diffStatus === 'modified' ? <Edit3 size={8} /> : <Minus size={8} />}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${getRoleColor(emp.role)}`} />
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                    {emp.role}
                  </p>
                </div>
                {isTransfer && transferInfo && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <ArrowRight size={10} className="text-accent-blue" />
                    <p className="text-[9px] text-accent-blue font-medium">
                      From {transferInfo.fromTeam}
                    </p>
                  </div>
                )}
                {isPotential && (
                  <p className="text-[9px] text-potential font-medium mt-0.5">
                    Potential hire
                  </p>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border border-border p-3 rounded-xl">
              <div className="space-y-2 text-sm">
                <p className="font-bold text-foreground">{emp.name}</p>
                {isPotential && (
                  <p className="text-potential text-xs font-medium">⚠ Potential / Uncertain hire</p>
                )}
                {diffInfo?.changes && diffInfo.changes.length > 0 && (
                  <div className="text-amber-500 text-xs">
                    <p className="font-medium">Changes:</p>
                    {diffInfo.changes.map((change, i) => (
                      <p key={i}>• {change}</p>
                    ))}
                  </div>
                )}
                <div className="text-muted-foreground">
                  <p><span className="text-primary font-medium">Hired:</span> {formatDate(emp.joined)}</p>
                  {isTransfer && transferInfo && (
                    <p><span className="text-accent-blue font-medium">Joined team:</span> {formatDate(transferInfo.transferDate)}</p>
                  )}
                  {departureEvent && (
                    <p><span className="text-destructive font-medium">Departure:</span> {formatDate(departureEvent.date)}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{emp.team} • {emp.dept}</p>
              </div>
            </TooltipContent>
          </Tooltip>
          {!isPotential && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button 
                onClick={() => openPlannerForUser(emp.id, true)}
                title="Add Decision Flag"
                className="p-1.5 bg-flag/10 text-flag hover:bg-flag hover:text-foreground rounded-lg transition-all"
              >
                <Flag size={14} />
              </button>
              <button 
                onClick={() => openPlannerForUser(emp.id, false)}
                title="Schedule Movement"
                className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all"
              >
                <ArrowRightLeft size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Gantt Area */}
        <div className={`flex-1 h-10 relative bg-secondary/30 rounded-lg border border-border/50`}>
          {/* Year grid lines */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
            {years.map((year, i) => (
              <div 
                key={i} 
                className={`border-l first:border-l-0 ${
                  year === '2025' ? 'border-primary/30' : 'border-border/30'
                }`} 
              />
            ))}
          </div>

          {/* Current Date Marker */}
          <div 
            style={{ left: `${currentDatePos}%` }}
            className="absolute inset-y-0 w-0.5 bg-destructive z-30"
          />

          {/* The Tenure Bar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                style={{ left: `${joinedPos}%`, width: `${durationWidth}%` }}
                className={`absolute inset-y-2 rounded-md cursor-help ${
                  isPotential 
                    ? 'potential-stripe' 
                    : `${getRoleColor(emp.role)} opacity-40 border border-foreground/10`
                }`}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
              <div className="space-y-1 text-sm">
                <p className="font-bold text-foreground">{emp.name}</p>
                {isPotential && (
                  <p className="text-potential text-xs font-medium">Potential / Uncertain</p>
                )}
                <p className="text-muted-foreground">
                  <span className="text-primary font-medium">Hired:</span> {formatDate(emp.joined)}
                </p>
                {isTransfer && transferInfo && (
                  <p className="text-muted-foreground">
                    <span className="text-accent-blue font-medium">Joined team:</span> {formatDate(transferInfo.transferDate)}
                  </p>
                )}
                {teamSwapEvent && !isTransfer && (
                  <p className="text-muted-foreground">
                    <span className="text-accent-blue font-medium">Transfer out:</span> {formatDate(teamSwapEvent.date)}
                  </p>
                )}
                {departureEvent && (
                  <p className="text-muted-foreground">
                    <span className="text-destructive font-medium">Departure:</span> {formatDate(departureEvent.date)}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Training Period Overlays */}
          {!isPotential && trainingPeriods.map((training, idx) => {
            const trainStart = getTimelinePosition(training.startDate);
            const trainEnd = getTimelinePosition(training.endDate);
            const trainWidth = Math.max(0, trainEnd - trainStart);
            
            return (
              <Tooltip key={`training-${idx}`}>
                <TooltipTrigger asChild>
                  <div 
                    style={{ left: `${trainStart}%`, width: `${trainWidth}%` }}
                    className="absolute inset-y-2 rounded-md training-stripe cursor-help z-10"
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-status-course" />
                      <p className="font-bold text-foreground">Training Period</p>
                    </div>
                    <p className="text-muted-foreground">{training.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(training.startDate)} - {formatDate(training.endDate)}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Event Markers */}
          {!isPotential && empEvents.map(ev => {
            const pos = getTimelinePosition(ev.date);
            if (ev.type === 'Departure') return null;

            const isTeamSwap = ev.type === 'Team Swap';
            const evDiffStatus = eventDiffMap?.get(ev.id)?.status;

            return (
              <div 
                key={ev.id}
                style={{ left: `${pos}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker z-20"
              >
                <div className={`p-1.5 rounded-full cursor-help shadow-lg transition-transform hover:scale-110
                  ${ev.isFlag ? 'bg-flag' : isTeamSwap ? 'bg-accent-blue' : 'bg-foreground'}
                  ${evDiffStatus === 'added' ? 'ring-2 ring-emerald-500' : ''}
                  ${evDiffStatus === 'modified' ? 'ring-2 ring-amber-500' : ''}
                `}
                >
                  {ev.isFlag 
                    ? <Flag size={10} className="text-foreground" /> 
                    : isTeamSwap
                    ? <ArrowRight size={10} className="text-foreground" />
                    : <Clock size={10} className="text-background" />
                  }
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/marker:block 
                  w-52 bg-popover border border-border p-3 rounded-xl text-xs shadow-xl z-50">
                  <p className={`font-bold uppercase mb-1.5 ${ev.isFlag ? 'text-flag' : isTeamSwap ? 'text-accent-blue' : 'text-primary'}`}>
                    {ev.type}
                  </p>
                  <p className="text-foreground font-medium">{ev.details}</p>
                  {isTeamSwap && ev.targetTeam && (
                    <p className="text-accent-blue mt-1 flex items-center gap-1">
                      <ArrowRight size={12} /> {ev.targetTeam}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1.5 font-mono text-[10px]">{formatDate(ev.date)}</p>
                  {evDiffStatus && evDiffStatus !== 'unchanged' && (
                    <p className={`mt-1 font-bold text-[10px] ${
                      evDiffStatus === 'added' ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {evDiffStatus === 'added' ? '+ New in scenario' : '~ Modified'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* End Marker (Departure or Transfer) */}
          {barEndDate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ left: `${departurePos}%` }}
                  className={`absolute inset-y-0 w-px border-r border-dashed cursor-help ${
                    teamSwapEvent && !isTransfer ? 'bg-accent-blue/50 border-accent-blue/30' : 'bg-destructive/50 border-destructive/30'
                  }`}
                >
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 text-[9px] font-bold mt-1 uppercase whitespace-nowrap ${
                    teamSwapEvent && !isTransfer ? 'text-accent-blue' : 'text-destructive'
                  }`}>
                    {teamSwapEvent && !isTransfer ? 'Transfer' : 'Exit'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-2 rounded-lg">
                <p className={`text-xs font-medium ${teamSwapEvent && !isTransfer ? 'text-accent-blue' : 'text-destructive'}`}>
                  {teamSwapEvent && !isTransfer 
                    ? `Transfer to ${teamSwapEvent.targetTeam}: ${formatDate(teamSwapEvent.date)}`
                    : `Departure: ${formatDate(barEndDate)}`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Start Marker for transfers */}
          {isTransfer && transferInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ left: `${joinedPos}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-help"
                >
                  <div className="p-1.5 rounded-full bg-accent-blue shadow-lg">
                    <UserPlus size={10} className="text-foreground" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-accent-blue">Transferred from {transferInfo.fromTeam}</p>
                  <p className="text-foreground">{emp.name}</p>
                  <p className="text-primary font-mono text-xs">{formatDate(transferInfo.transferDate)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Hire Start Marker - only for non-transfers */}
          {!isTransfer && (
            <div 
              style={{ left: `${getTimelinePosition(emp.joined)}%` }}
              className="absolute inset-y-0 w-px bg-role-junior/50"
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 text-[9px] text-role-junior font-bold mb-1 uppercase whitespace-nowrap">
                Hire
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeamSection = (teamName: string) => {
    const teamMembers = getEmployeesInTeam(teamName);
    const directEmployees = employees.filter(e => e.team === teamName);
    const missingRoles = getMissingRoles(teamName, directEmployees);

    // Check if any team members have diffs
    const hasDiffs = teamMembers.some(({ employee }) => {
      const diff = employeeDiffMap?.get(employee.id);
      return diff && diff.status !== 'unchanged';
    });

    return (
      <div key={teamName} className="mb-8">
        <div className={`flex items-center gap-3 mb-4 pb-2 border-b border-border/50 ${hasDiffs ? 'border-b-amber-500/50' : ''}`}>
          <div className={`w-2 h-2 rounded-full ${hasDiffs ? 'bg-amber-500' : 'bg-primary'}`} />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{teamName}</h3>
          <span className="text-xs text-muted-foreground">({teamMembers.length} members)</span>
          {hasDiffs && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500">
              HAS CHANGES
            </span>
          )}
          {missingRoles.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded-full cursor-help">
                  <AlertTriangle size={12} />
                  <span className="text-[10px] font-bold">Missing roles</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-3 rounded-xl">
                <div className="space-y-1">
                  <p className="font-bold text-destructive text-sm">Missing Roles</p>
                  {missingRoles.map(({ role, missing }) => (
                    <p key={role} className="text-xs text-muted-foreground">
                      {role}: <span className="text-destructive font-medium">{missing} needed</span>
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="space-y-3">
          {teamMembers.map(({ employee, transferInfo, isTransfer }) => 
            renderEmployeeRow(employee, transferInfo, isTransfer)
          )}
        </div>
      </div>
    );
  };

  // Build full hierarchy structure: Department → Group → Team with managers on their own lines
  const renderHierarchySection = () => {
    // Get all teams from hierarchy to identify team members vs managers
    const allTeams = hierarchy.flatMap(d => [...getAllDeptTeams(d)]);
    
    return hierarchy.map(dept => {
      const deptManager = dept.departmentManagerId ? allEmployees.find(e => e.id === dept.departmentManagerId) : null;
      const allDeptTeams = getAllDeptTeams(dept);
      const deptEmployees = employees.filter(e => allDeptTeams.includes(e.team) || e.dept === dept.name);
      
      if (deptEmployees.length === 0 && !deptManager) return null;

      return (
        <div key={dept.name} className="mb-10">
          {/* Department Header */}
          <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-primary/30">
            <Building2 size={18} className="text-primary" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-primary uppercase tracking-wide">{dept.name}</h2>
                <span className="text-xs text-muted-foreground">
                  ({deptEmployees.length} employees • {dept.groups.length} groups • {allDeptTeams.length} teams)
                </span>
              </div>
            </div>
          </div>

          {/* Department Manager - on their own line, not in any team */}
          {deptManager && (
            <div className="mb-4 ml-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={12} className="text-purple-500" />
                <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Department Manager</span>
              </div>
              <div className="space-y-3">
                {renderEmployeeRow(deptManager, undefined, false, true, 'dept')}
              </div>
            </div>
          )}

          {/* Direct Teams (under department, no group) */}
          {dept.directTeams && dept.directTeams.length > 0 && (
            <div className="ml-4 mb-6">
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-border/50">
                <Users size={12} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Direct Teams</h3>
              </div>
              {dept.directTeams.map(teamName => {
                const teamMembers = employees.filter(e => e.team === teamName);
                if (teamMembers.length === 0) return null;
                
                const structure = teamStructures.find(s => s.teamName === teamName);
                const teamLeader = structure?.teamLeader ? allEmployees.find(e => e.id === structure.teamLeader) : null;

                return (
                  <div key={teamName} className="mb-4 ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-foreground">{teamName}</span>
                      <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                      {teamLeader && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          • <Crown size={8} className="text-green-500" /> {teamLeader.name}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 ml-3">
                      {teamMembers.map(emp => renderEmployeeRow(emp))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Groups */}
          {dept.groups.map(group => {
            const groupManager = group.groupManagerId ? allEmployees.find(e => e.id === group.groupManagerId) : null;
            const groupEmployees = employees.filter(e => group.teams.includes(e.team));
            
            if (groupEmployees.length === 0 && !groupManager) return null;

            return (
              <div key={group.name} className="ml-4 mb-6">
                {/* Group Header */}
                <div className="flex items-center gap-3 mb-3 pb-1 border-b border-border/50">
                  <FolderTree size={14} className="text-blue-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                      <span className="text-[10px] text-muted-foreground">
                        ({groupEmployees.length} employees • {group.teams.length} teams)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group Manager - on their own line, not in any team */}
                {groupManager && (
                  <div className="mb-4 ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown size={10} className="text-blue-500" />
                      <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Group Manager</span>
                    </div>
                    <div className="space-y-3">
                      {renderEmployeeRow(groupManager, undefined, false, true, 'group')}
                    </div>
                  </div>
                )}

                {/* Teams in Group */}
                {group.teams.map(teamName => {
                  // Filter out group manager from team members
                  const teamMembers = employees.filter(e => e.team === teamName && e.id !== groupManager?.id);
                  if (teamMembers.length === 0) return null;

                  const structure = teamStructures.find(s => s.teamName === teamName);
                  const teamLeader = structure?.teamLeader ? allEmployees.find(e => e.id === structure.teamLeader) : null;

                  return (
                    <div key={teamName} className="mb-4 ml-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-xs font-medium text-foreground">{teamName}</span>
                        <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                        {teamLeader && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            • <Crown size={8} className="text-green-500" /> {teamLeader.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3 ml-3">
                        {teamMembers.map(emp => renderEmployeeRow(emp))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="glass-card p-8 overflow-x-auto animate-fade-in">
      {/* Grouping Mode Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Group by:</span>
        <div className="flex bg-secondary/50 rounded-lg p-1">
          <button
            onClick={() => setGroupingMode('team')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              groupingMode === 'team' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={12} className="inline mr-1.5" />
            Team
          </button>
          <button
            onClick={() => setGroupingMode('hierarchy')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              groupingMode === 'hierarchy' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 size={12} className="inline mr-1.5" />
            Hierarchy
          </button>
        </div>
      </div>

      <div className="min-w-[1800px]">
        {/* Header Rulers */}
        <div className="flex border-b border-border pb-4 mb-6">
          <div className="w-72 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Strategic Unit
          </div>
          <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
            {years.map(year => (
              <div 
                key={year} 
                className={`text-center border-l border-border text-[10px] font-bold ${
                  year === '2025' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {year}
              </div>
            ))}
            {/* Current date marker in header */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ left: `${currentDatePos}%` }}
                  className="absolute -bottom-2 w-0 h-0 cursor-help"
                >
                  <div className="absolute -left-1.5 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border border-border p-2 rounded-lg">
                <p className="text-xs font-medium text-destructive">Today: {formatDate(currentDate.toISOString().split('T')[0])}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Timeline Content */}
        <TooltipProvider>
          {groupingMode === 'hierarchy' ? (
            renderHierarchySection()
          ) : shouldGroupByTeam && teams.length > 0 ? (
            // Group by team
            teams.map(teamName => renderTeamSection(teamName))
          ) : (
            // Single team view or flat list
            <div className="space-y-3">
              {employees.map(emp => renderEmployeeRow(emp))}
            </div>
          )}
        </TooltipProvider>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-destructive rounded" />
            <span className="text-muted-foreground">Current Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-flag" />
            <span className="text-muted-foreground">Decision Flag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-blue" />
            <span className="text-muted-foreground">Team Transfer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-foreground" />
            <span className="text-muted-foreground">Other Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 bg-role-senior/40 rounded" />
            <span className="text-muted-foreground">Tenure Period</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 training-stripe rounded" />
            <span className="text-muted-foreground">Training Period</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 potential-stripe rounded" />
            <span className="text-muted-foreground">Potential Hire</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-500 rounded text-[9px] font-bold">Dept Mgr</span>
            <span className="text-muted-foreground">Department Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded text-[9px] font-bold">Group Mgr</span>
            <span className="text-muted-foreground">Group Manager</span>
          </div>
          {(employeeDiffMap || eventDiffMap) && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-muted-foreground">Added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span className="text-muted-foreground">Modified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded" />
                <span className="text-muted-foreground">Removed</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
