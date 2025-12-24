import { Flag, Edit2 } from 'lucide-react';
import { Employee, getRoleColor, formatDate } from '@/lib/workforce-data';

interface RosterProps {
  employees: Employee[];
  openPlannerForUser: (empId: number, asFlag?: boolean) => void;
  onEditEmployee: (employee: Employee) => void;
}

export const Roster = ({ employees, openPlannerForUser, onEditEmployee }: RosterProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
      {employees.map((emp, index) => (
        <div 
          key={emp.id} 
          className="glass-card p-5 group relative overflow-hidden transition-all hover:border-primary/30"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Role color accent bar */}
          <div className={`absolute top-0 left-0 w-full h-1 ${getRoleColor(emp.role)}`} />
          
          {/* Header with avatar and actions */}
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-lg text-primary">
              {emp.name.split(' ').map(n => n[0]).join('')}
            </div>
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
          
          {/* Employee info */}
          <h4 className="font-bold text-lg text-foreground">{emp.name}</h4>
          <p className="text-xs text-muted-foreground mb-4">{emp.role} • {emp.team}</p>
          
          {/* Footer with status and date */}
          <div className="flex justify-between items-center">
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
            <span className="text-muted-foreground font-mono text-[10px]">
              Since {formatDate(emp.joined)}
            </span>
          </div>
        </div>
      ))}
      
      {employees.length === 0 && (
        <div className="col-span-full text-center py-16">
          <p className="text-muted-foreground">No employees match your filters</p>
        </div>
      )}
    </div>
  );
};
