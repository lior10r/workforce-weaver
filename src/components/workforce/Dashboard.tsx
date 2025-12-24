import { Flag, Users, AlertCircle } from 'lucide-react';
import { Employee, WorkforceEvent, Hierarchy, formatDate } from '@/lib/workforce-data';

interface DashboardProps {
  employees: Employee[];
  events: WorkforceEvent[];
  hierarchy: Hierarchy;
  setHierarchy: (hierarchy: Hierarchy) => void;
  departments: Record<string, string[]>;
}

export const Dashboard = ({ employees, events, hierarchy, setHierarchy, departments }: DashboardProps) => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const upcomingFlags = events
    .filter(e => e.isFlag && new Date(e.date) > today && new Date(e.date) <= thirtyDaysFromNow)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const allFlags = events.filter(e => e.isFlag);

  // Get teams for current department
  const currentTeams = hierarchy.dept === 'All' 
    ? Object.values(departments).flat() 
    : departments[hierarchy.dept] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Team Distribution */}
      <div className="lg:col-span-2 space-y-8">
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold mb-6 text-foreground">
            {hierarchy.dept === 'All' ? 'Department' : 'Team'} Distribution
          </h3>
          <div className="space-y-5">
            {hierarchy.dept === 'All' ? (
              // Show departments when "All" is selected
              Object.keys(departments).map(dept => {
                const count = employees.filter(e => e.dept === dept).length;
                const percentage = employees.length > 0 ? (count / employees.length) * 100 : 0;
                
                return (
                  <div 
                    key={dept} 
                    className="group cursor-pointer" 
                    onClick={() => setHierarchy({ dept, team: 'All' })}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {dept}
                      </span>
                      <span className="text-sm text-muted-foreground">{count} members</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 group-hover:from-primary group-hover:to-primary/90" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              // Show teams when a department is selected
              currentTeams.map(team => {
                const count = employees.filter(e => e.team === team).length;
                const percentage = employees.length > 0 ? (count / employees.length) * 100 : 0;
                
                return (
                  <div 
                    key={team} 
                    className="group cursor-pointer" 
                    onClick={() => setHierarchy({ ...hierarchy, team })}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {team}
                      </span>
                      <span className="text-sm text-muted-foreground">{count} members</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 group-hover:from-primary group-hover:to-primary/90" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-role-junior/10 rounded-lg">
                <Users size={18} className="text-role-junior" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Active Staff</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {employees.filter(e => e.status === 'Active').length}
            </p>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-role-lead/10 rounded-lg">
                <AlertCircle size={18} className="text-role-lead" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">On Leave</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {employees.filter(e => e.status === 'Parental Leave' || e.status === 'On Course').length}
            </p>
          </div>
        </div>
      </div>

      {/* Decision Queue */}
      <div className="glass-card p-8">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-foreground">
          <Flag size={20} className="text-flag" />
          <span>Strategic Decisions</span>
        </h3>
        <p className="text-xs text-muted-foreground mb-6">
          {upcomingFlags.length > 0 ? `${upcomingFlags.length} pending in next 30 days` : 'No immediate decisions pending'}
        </p>
        
        <div className="space-y-4">
          {allFlags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No decision flags set</p>
            </div>
          ) : (
            allFlags.map(event => {
              const employee = employees.find(e => e.id === event.empId);
              const isUrgent = new Date(event.date) <= thirtyDaysFromNow;
              
              return (
                <div 
                  key={event.id} 
                  className={`p-4 rounded-xl relative overflow-hidden group transition-all
                    ${isUrgent 
                      ? 'bg-flag/5 border border-flag/20 hover:border-flag/40' 
                      : 'bg-secondary/50 border border-border hover:border-border/80'
                    }`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${isUrgent ? 'bg-flag' : 'bg-muted-foreground'}`} />
                  <p className={`text-[10px] font-bold uppercase mb-1.5 tracking-wider ${isUrgent ? 'text-flag' : 'text-muted-foreground'}`}>
                    {formatDate(event.date)}
                    {isUrgent && <span className="ml-2 px-1.5 py-0.5 bg-flag/20 rounded text-flag">Urgent</span>}
                  </p>
                  <p className="font-semibold text-sm text-foreground">{event.details}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Users size={12} className="text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {employee?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
