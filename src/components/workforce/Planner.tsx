import { Plus, Flag } from 'lucide-react';
import { Employee, WorkforceEvent, formatDate } from '@/lib/workforce-data';

interface PlannerProps {
  employees: Employee[];
  events: WorkforceEvent[];
  onAddMovement: () => void;
}

export const Planner = ({ employees, events, onAddMovement }: PlannerProps) => {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-8 border-b border-border flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-foreground">Strategic Change Log</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Scheduled transitions and decision points
          </p>
        </div>
        <button 
          onClick={onAddMovement}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>Add Movement</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 text-muted-foreground text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-8 py-4 font-bold">Individual</th>
              <th className="px-8 py-4 font-bold">Type</th>
              <th className="px-8 py-4 font-bold">Effective Date</th>
              <th className="px-8 py-4 font-bold">Strategic Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedEvents.map(ev => {
              const employee = employees.find(e => e.id === ev.empId);
              
              return (
                <tr key={ev.id} className="hover:bg-accent/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-primary">
                        {employee?.name.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <span className="font-semibold text-foreground">
                        {employee?.name || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wide
                      ${ev.isFlag 
                        ? 'bg-flag/10 text-flag border border-flag/20' 
                        : ev.type === 'Departure'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                      }`}
                    >
                      {ev.isFlag && <Flag size={10} />}
                      {ev.type}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-foreground font-mono text-sm">{formatDate(ev.date)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-muted-foreground">{ev.details}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No events scheduled yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
