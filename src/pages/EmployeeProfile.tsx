import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Flag, Plus, Calendar, Users, ChevronRight, Check, Trash2, MessageSquare, Clock, Crown, GraduationCap, Tag, Briefcase, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkforceData } from '@/hooks/use-workforce-data';
import { Employee, WorkforceEvent, getRoleColor, formatDate, getTeamParent, getCapacityWeight, getScenarioEmployees, getScenarioEvents } from '@/lib/workforce-data';
import { PersonalTimeline } from '@/components/workforce/PersonalTimeline';
import { EmployeeNotes } from '@/components/workforce/EmployeeNotes';
import { EmployeeModal } from '@/components/workforce/EmployeeModal';
import { EventModal } from '@/components/workforce/EventModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createScenario, addScenarioChangelogEntry } from '@/lib/workforce-data';

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isBackendAvailable, isAdmin } = useAuth();

  const {
    masterEmployees,
    masterEvents,
    masterTeamStructures,
    hierarchy,
    scenarios,
    setMasterEmployees,
    setMasterEvents,
    setScenarios,
    isLoading,
  } = useWorkforceData({ isAuthenticated });

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventPrefill, setEventPrefill] = useState<{ empId: number | string; isFlag: boolean; date?: string }>({ empId: '', isFlag: false });
  const [resolvingFlagId, setResolvingFlagId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  const rawEmployees = useMemo(() => {
    if (activeScenario) return getScenarioEmployees(activeScenario);
    return masterEmployees;
  }, [activeScenario, masterEmployees]);

  const events = useMemo(() => {
    if (activeScenario) return getScenarioEvents(activeScenario);
    return masterEvents;
  }, [activeScenario, masterEvents]);

  // Derive effective employees by applying past Team Swap events
  const employees = useMemo(() => {
    const today = new Date();
    const latestPastSwapByEmployee = new Map<number, WorkforceEvent>();

    events.forEach(event => {
      if (event.type !== 'Team Swap' || !event.targetTeam) return;
      const eventDate = new Date(event.date);
      if (Number.isNaN(eventDate.getTime()) || eventDate > today) return;
      const existing = latestPastSwapByEmployee.get(event.empId);
      if (!existing || new Date(existing.date) < eventDate) {
        latestPastSwapByEmployee.set(event.empId, event);
      }
    });

    return rawEmployees.map(emp => {
      const latestSwap = latestPastSwapByEmployee.get(emp.id);
      if (!latestSwap?.targetTeam || latestSwap.targetTeam === emp.team) return emp;
      const parent = getTeamParent(hierarchy, latestSwap.targetTeam);
      return {
        ...emp,
        team: latestSwap.targetTeam,
        dept: parent?.dept.name ?? emp.dept,
        group: parent?.group?.name,
      };
    });
  }, [rawEmployees, events, hierarchy]);

  const empId = id ? parseInt(id, 10) : null;
  const employee = empId ? employees.find(e => e.id === empId) : null;
  // Keep raw employee for timeline (shows original team history)
  const rawEmployee = empId ? rawEmployees.find(e => e.id === empId) : null;

  const empEvents = useMemo(() => {
    if (!empId) return [];
    return events.filter(e => e.empId === empId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, empId]);

  const flags = useMemo(() => empEvents.filter(e => e.isFlag), [empEvents]);
  const nonFlagEvents = useMemo(() => empEvents.filter(e => !e.isFlag), [empEvents]);

  const teamParent = employee ? getTeamParent(hierarchy, employee.team) : null;
  const manager = employee?.managerId ? employees.find(e => e.id === employee.managerId) : null;
  const teammates = employee ? employees.filter(e => e.team === employee.team && e.id !== employee.id && !e.isPotential) : [];
  const teamStructure = employee ? masterTeamStructures.find(ts => ts.teamName === employee.team) : null;

  const today = new Date();
  const capacity = employee ? getCapacityWeight(employee.role, employee.joined, today, employee.workType, employee.partTimePercentage) : 1;

  const ensureWorkingScenario = (): string | null => {
    if (activeScenarioId) return activeScenarioId;
    const workingDraft = createScenario('Working Draft', 'Auto-created for changes', masterEmployees, masterEvents, masterTeamStructures, hierarchy, undefined, user?.id);
    setScenarios(prev => [...prev, workingDraft]);
    setActiveScenarioId(workingDraft.id);
    toast.info('Created "Working Draft" scenario');
    return workingDraft.id;
  };

  const handleResolveFlag = (eventId: number, note: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const resolvedEvent = { ...event, isResolved: true, resolutionNote: note };
    const scenarioId = ensureWorkingScenario();
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      const isProposed = s.proposedEvents.some(e => e.id === eventId);
      if (isProposed) {
        return { ...s, proposedEvents: s.proposedEvents.map(e => e.id === eventId ? resolvedEvent : e) };
      }
      return { ...s, proposedEvents: [...s.proposedEvents, resolvedEvent] };
    }));
  };

  const handleDeleteEvent = (eventId: number) => {
    const scenarioId = ensureWorkingScenario();
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      const isProposed = s.proposedEvents.some(e => e.id === eventId);
      if (isProposed) {
        return { ...s, proposedEvents: s.proposedEvents.filter(e => e.id !== eventId) };
      }
      return { ...s, deletedEventIds: [...s.deletedEventIds, eventId] };
    }));
  };

  const handleAddEvent = (eventData: { empId: number; type: string; date: string; details: string; isFlag: boolean; targetTeam?: string; endDate?: string; newRole?: string }) => {
    const newEvent = { ...eventData, id: Date.now() };
    const scenarioId = ensureWorkingScenario();
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      return addScenarioChangelogEntry(
        { ...s, proposedEvents: [...s.proposedEvents, newEvent] },
        'event_added', newEvent.id, employee?.name || 'Unknown',
        `Added ${eventData.type}${eventData.isFlag ? ' (Flag)' : ''}: ${eventData.details}`
      );
    }));
    setIsEventModalOpen(false);
  };

  const handleEditEmployee = (employeeData: Omit<Employee, 'id'>, id?: number) => {
    if (!id) return;
    const updated = { ...employeeData, id };
    const scenarioId = ensureWorkingScenario();
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      const existingIdx = s.proposedEmployees.findIndex(e => e.id === id);
      const proposedEmployees = existingIdx >= 0
        ? s.proposedEmployees.map((e, i) => i === existingIdx ? updated : e)
        : [...s.proposedEmployees, updated];
      return addScenarioChangelogEntry(
        { ...s, proposedEmployees }, 'employee_modified', id, updated.name, 'Modified employee details'
      );
    }));
    setIsEmployeeModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Employee not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const statusColor = employee.status === 'Active' ? 'bg-emerald-500' : employee.status === 'On Course' ? 'bg-purple-500' : employee.status === 'Parental Leave' ? 'bg-amber-500' : 'bg-destructive';
  const joinDate = new Date(employee.joined);
  const monthsOfExperience = (today.getTime() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
  const isInTraining = monthsOfExperience < 6 && employee.role === 'Junior Dev';

  const EVENT_ICON_MAP: Record<string, typeof Flag> = {
    'Team Swap': Users,
    'Promotion': Crown,
    'Training': GraduationCap,
    'Course': GraduationCap,
    'Departure': Calendar,
    'New Joiner': Plus,
    'Decision Flag': Flag,
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Back button */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Operations Center</span>
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl ${getRoleColor(employee.role)} bg-opacity-20 flex items-center justify-center`}>
                <span className="font-bold text-xl">{employee.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                  <span className="text-xs font-bold uppercase text-muted-foreground">{employee.status}</span>
                  {employee.isPotential && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">Potential</Badge>
                  )}
                </div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {teamParent?.dept && <span>{teamParent.dept.name}</span>}
                  {teamParent?.group && <><ChevronRight size={12} /><span>{teamParent.group.name}</span></>}
                  <ChevronRight size={12} />
                  <span className="text-foreground font-medium">{employee.team}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${getRoleColor(employee.role)} mr-1.5`} />
                  {employee.role}
                  {employee.managerLevel && employee.managerLevel !== 'none' && (
                    <span className="ml-2 text-primary font-medium">({employee.managerLevel} manager)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEventPrefill({ empId: employee.id, isFlag: true }); setIsEventModalOpen(true); }}>
                <Flag size={14} className="mr-1.5" /> Add Flag
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEventPrefill({ empId: employee.id, isFlag: false }); setIsEventModalOpen(true); }}>
                <Plus size={14} className="mr-1.5" /> Add Event
              </Button>
              <Button size="sm" onClick={() => setIsEmployeeModalOpen(true)}>
                <Edit2 size={14} className="mr-1.5" /> Edit
              </Button>
            </div>
          </div>

          {/* Personal Timeline */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={16} className="text-primary" /> Career Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PersonalTimeline
                employee={rawEmployee || employee}
                allEmployees={employees}
                events={events}
                onResolveFlag={(eventId, note) => handleResolveFlag(eventId, note)}
                onDeleteEvent={handleDeleteEvent}
                onAddTimelineNote={(empId, date, note) => {
                  handleAddEvent({
                    empId,
                    type: 'Timeline Note',
                    date,
                    details: note,
                    isFlag: false,
                  });
                }}
                onUpdateEventDate={(eventId, newDate) => {
                  const scenarioId = ensureWorkingScenario();
                  setScenarios(prev => prev.map(s => {
                    if (s.id !== scenarioId) return s;
                    const inProposed = s.proposedEvents.find(e => e.id === eventId);
                    if (inProposed) {
                      return { ...s, proposedEvents: s.proposedEvents.map(e => e.id === eventId ? { ...e, date: newDate } : e) };
                    }
                    // Event is in master — copy to proposed with new date
                    const masterEvent = events.find(e => e.id === eventId);
                    if (masterEvent) {
                      return { ...s, proposedEvents: [...s.proposedEvents, { ...masterEvent, date: newDate }] };
                    }
                    return s;
                  }));
                }}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal & Role Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User size={16} className="text-primary" /> Personal & Role Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide mb-1">Hire Date</p>
                    <p className="text-foreground">{formatDate(employee.joined)}</p>
                  </div>
                  {employee.departureDate && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide mb-1">Departure Date</p>
                      <p className="text-destructive font-medium">{formatDate(employee.departureDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide mb-1">Work Type</p>
                    <p className="text-foreground">{employee.workType || 'Full-Time'}{employee.workType === 'Part-Time' && ` (${employee.partTimePercentage || 50}%)`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide mb-1">Capacity</p>
                    <p className="text-foreground font-medium">{capacity.toFixed(2)}x</p>
                    {isInTraining && <p className="text-xs text-amber-500">In training (first 6 months)</p>}
                  </div>
                  {manager && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide mb-1">Reports To</p>
                      <button onClick={() => navigate(`/employee/${manager.id}`)} className="text-primary hover:underline">{manager.name}</button>
                    </div>
                  )}
                  {employee.skills && employee.skills.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {employee.skills.map(skill => (
                          <span key={skill} className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Decision Flags */}
              <Card className="border-flag/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Flag size={16} className="text-flag" /> Decision Flags
                      <span className="text-xs font-normal text-muted-foreground">({flags.length})</span>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {flags.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No decision flags</p>
                  ) : (
                    <div className="space-y-2">
                      {flags.map(flag => (
                        <div key={flag.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${flag.isResolved ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-flag/5 border-flag/20'}`}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-1.5 rounded-full ${flag.isResolved ? 'bg-emerald-500/20' : 'bg-flag/20'}`}>
                              {flag.isResolved ? <Check size={14} className="text-emerald-500" /> : <Flag size={14} className="text-flag" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{flag.details}</p>
                              {flag.isResolved && flag.resolutionNote && (
                                <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                                  <MessageSquare size={10} /> {flag.resolutionNote}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{formatDate(flag.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button onClick={() => { setResolvingFlagId(flag.id); setResolutionNote(flag.resolutionNote || ''); }}
                              className={`p-1.5 rounded-lg transition-colors ${flag.isResolved ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}>
                              {flag.isResolved ? <MessageSquare size={14} /> : <Check size={14} />}
                            </button>
                            <button onClick={() => handleDeleteEvent(flag.id)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar size={16} className="text-primary" /> Event History
                    <span className="text-xs font-normal text-muted-foreground">({nonFlagEvents.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nonFlagEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No events recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {nonFlagEvents.map(evt => {
                        const Icon = EVENT_ICON_MAP[evt.type] || Clock;
                        const isSwap = evt.type === 'Team Swap';
                        return (
                          <div key={evt.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                            <div className={`p-1.5 rounded-full mt-0.5 ${isSwap ? 'bg-accent/50 text-primary' : 'bg-primary/10 text-primary'}`}>
                              <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase text-muted-foreground">{evt.type}</span>
                                {isSwap && evt.targetTeam && (
                                  <span className="text-xs text-primary">→ {evt.targetTeam}</span>
                                )}
                              </div>
                              <p className="text-sm text-foreground mt-0.5">{evt.details}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                <span className="font-mono">{formatDate(evt.date)}</span>
                                {evt.endDate && <span>— {formatDate(evt.endDate)}</span>}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteEvent(evt.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmployeeNotes employeeId={employee.id} employeeName={employee.name} isBackendAvailable={isBackendAvailable} />
                </CardContent>
              </Card>

              {/* Team Context */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users size={16} className="text-primary" /> Team Context
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teamStructure?.targetSize && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Team size</span>
                        <span className="font-medium text-foreground">{teammates.length + 1} / {teamStructure.targetSize}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase font-bold text-muted-foreground tracking-wide mb-2">Teammates</p>
                      {teammates.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No teammates</p>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {teammates.map(t => (
                            <button
                              key={t.id}
                              onClick={() => navigate(`/employee/${t.id}`)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                            >
                              <div className={`w-7 h-7 rounded-lg ${getRoleColor(t.role)} bg-opacity-20 flex items-center justify-center`}>
                                <span className="text-[10px] font-bold">{t.name.split(' ').map(n => n[0]).join('')}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{t.name}</p>
                                <p className="text-[10px] text-muted-foreground">{t.role}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Resolve Flag Dialog */}
        <Dialog open={resolvingFlagId !== null} onOpenChange={(open) => { if (!open) { setResolvingFlagId(null); setResolutionNote(''); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" /> Resolve Decision Flag
              </DialogTitle>
              <DialogDescription>Add a short description of the decision or resolution.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {resolvingFlagId && (() => {
                const flag = events.find(e => e.id === resolvingFlagId);
                return flag ? (
                  <div className="p-3 rounded-lg bg-accent/50">
                    <p className="text-xs text-muted-foreground">{flag.details}</p>
                  </div>
                ) : null;
              })()}
              <Textarea placeholder="Describe the decision made..." value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} className="min-h-[100px]" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setResolvingFlagId(null); setResolutionNote(''); }}>Cancel</Button>
              <Button onClick={() => { if (resolvingFlagId) { handleResolveFlag(resolvingFlagId, resolutionNote); setResolvingFlagId(null); setResolutionNote(''); } }} className="bg-emerald-600 hover:bg-emerald-700">
                <Check size={16} className="mr-2" />
                {events.find(e => e.id === resolvingFlagId)?.isResolved ? 'Update' : 'Resolve'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Employee Modal */}
        {isEmployeeModalOpen && (
          <EmployeeModal
            isOpen={isEmployeeModalOpen}
            onClose={() => setIsEmployeeModalOpen(false)}
            onSubmit={handleEditEmployee}
            editingEmployee={employee}
            employees={employees}
            departments={{}}
            hierarchy={hierarchy}
            teamStructures={masterTeamStructures}
          />
        )}

        {/* Event Modal */}
        {isEventModalOpen && (
          <EventModal
            isOpen={isEventModalOpen}
            onClose={() => setIsEventModalOpen(false)}
            onSubmit={handleAddEvent}
            employees={employees}
            prefill={eventPrefill}
            departments={{}}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default EmployeeProfile;
