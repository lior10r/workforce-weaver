import { useState, useMemo } from 'react';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { Sidebar } from '@/components/workforce/Sidebar';
import { StatsCards } from '@/components/workforce/StatsCards';
import { Dashboard } from '@/components/workforce/Dashboard';
import { Timeline } from '@/components/workforce/Timeline';
import { Roster } from '@/components/workforce/Roster';
import { Planner } from '@/components/workforce/Planner';
import { TeamAnalytics } from '@/components/workforce/TeamAnalytics';
import { EmployeeModal } from '@/components/workforce/EmployeeModal';
import { EventModal } from '@/components/workforce/EventModal';
import { 
  Employee, 
  WorkforceEvent, 
  Hierarchy, 
  initialEmployees, 
  initialEvents,
  DEPARTMENTS
} from '@/lib/workforce-data';

const Index = () => {
  // State
  const [hierarchy, setHierarchy] = useState<Hierarchy>({ dept: 'Engineering', team: 'All' });
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [events, setEvents] = useState<WorkforceEvent[]>(initialEvents);
  const [view, setView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<Record<string, string[]>>(DEPARTMENTS);
  
  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [eventPrefill, setEventPrefill] = useState<{ empId: number | string; isFlag: boolean }>({ empId: '', isFlag: false });

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = hierarchy.dept === 'All' || e.dept === hierarchy.dept;
      const matchTeam = hierarchy.team === 'All' || e.team === hierarchy.team;
      return matchSearch && matchDept && matchTeam;
    });
  }, [employees, searchQuery, hierarchy]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredEmployees.length,
    onCourse: filteredEmployees.filter(e => e.status === 'On Course' || e.status === 'Parental Leave').length,
    flags: events.filter(ev => ev.isFlag).length,
    upcomingChanges: events.filter(e => new Date(e.date) > new Date()).length
  }), [filteredEmployees, events]);

  // Handlers
  const handleAddDepartment = (name: string) => {
    if (!departments[name]) {
      setDepartments(prev => ({ ...prev, [name]: [] }));
    }
  };

  const handleAddTeam = (dept: string, teamName: string) => {
    if (departments[dept] && !departments[dept].includes(teamName)) {
      setDepartments(prev => ({
        ...prev,
        [dept]: [...prev[dept], teamName]
      }));
    }
  };

  const handleAddEmployee = (employeeData: Omit<Employee, 'id'>, id?: number) => {
    if (id) {
      // Edit existing
      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...employeeData, id } : emp
      ));
    } else {
      // Add new
      const newId = Date.now();
      const departureDate = new Date(employeeData.joined);
      departureDate.setFullYear(departureDate.getFullYear() + 6);
      
      setEmployees(prev => [...prev, { ...employeeData, id: newId }]);
      
      // Auto-create 6-year departure event
      setEvents(prev => [...prev, {
        id: Date.now() + 1,
        empId: newId,
        type: 'Departure',
        date: departureDate.toISOString().split('T')[0],
        details: 'Standard 6-year rotation cycle',
        isFlag: false
      }]);
    }
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const handleAddEvent = (eventData: { empId: number; type: string; date: string; details: string; isFlag: boolean; targetTeam?: string }) => {
    setEvents(prev => [...prev, { ...eventData, id: Date.now() }]);
    setIsEventModalOpen(false);
  };

  const openPlannerForUser = (empId: number, asFlag = false) => {
    setEventPrefill({ empId, isFlag: asFlag });
    setIsEventModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEmployeeModalOpen(true);
  };

  const getViewTitle = () => {
    switch (view) {
      case 'dashboard': return 'Operations Center';
      case 'timeline': return 'Strategic Roadmap';
      case 'roster': return 'Department Directory';
      case 'planner': return 'Strategic Movements';
      case 'analytics': return 'Team Analytics';
      default: return 'Operations Center';
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        view={view} 
        setView={setView} 
        hierarchy={hierarchy} 
        setHierarchy={setHierarchy}
        departments={departments}
        onAddDepartment={handleAddDepartment}
        onAddTeam={handleAddTeam}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin p-8 lg:p-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-2">
            <span>{hierarchy.dept}</span>
            {hierarchy.team !== 'All' && (
              <>
                <ChevronRight size={10} />
                <span>{hierarchy.team}</span>
              </>
            )}
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {getViewTitle()}
            </h2>
            
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Search personnel..." 
                  className="input-field pl-10 w-full lg:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }}
                className="btn-primary whitespace-nowrap"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Hire</span>
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Views */}
        {view === 'dashboard' && (
          <Dashboard 
            employees={filteredEmployees} 
            events={events} 
            hierarchy={hierarchy}
            setHierarchy={setHierarchy}
            departments={departments}
          />
        )}

        {view === 'timeline' && (
          <Timeline 
            employees={filteredEmployees} 
            events={events}
            openPlannerForUser={openPlannerForUser}
            allEmployees={employees}
            selectedTeam={hierarchy.team}
            selectedDept={hierarchy.dept}
          />
        )}

        {view === 'roster' && (
          <Roster 
            employees={filteredEmployees}
            openPlannerForUser={openPlannerForUser}
            onEditEmployee={handleEditEmployee}
          />
        )}

        {view === 'planner' && (
          <Planner 
            employees={employees}
            events={events}
            onAddMovement={() => {
              setEventPrefill({ empId: employees[0]?.id || '', isFlag: false });
              setIsEventModalOpen(true);
            }}
          />
        )}

        {view === 'analytics' && (
          <TeamAnalytics
            employees={employees}
            events={events}
            selectedTeam={hierarchy.team}
            departments={departments}
          />
        )}
      </main>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => { setIsEmployeeModalOpen(false); setEditingEmployee(null); }}
        onSubmit={handleAddEmployee}
        editingEmployee={editingEmployee}
        hierarchy={hierarchy}
        departments={departments}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={handleAddEvent}
        employees={employees}
        prefill={eventPrefill}
        departments={departments}
      />
    </div>
  );
};

export default Index;
