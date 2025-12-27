import { X, Building2 } from 'lucide-react';
import { Employee, DEPARTMENT_NAMES, ROLES, STATUSES, Hierarchy } from '@/lib/workforce-data';
import { FormEvent, useState, useEffect } from 'react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, 'id'>, id?: number) => void;
  editingEmployee: Employee | null;
  hierarchy: Hierarchy;
  departments: Record<string, string[]>;
  employees: Employee[];
}

export const EmployeeModal = ({ isOpen, onClose, onSubmit, editingEmployee, hierarchy, departments, employees }: EmployeeModalProps) => {
  const [selectedDept, setSelectedDept] = useState(hierarchy.dept === 'All' ? DEPARTMENT_NAMES[0] : hierarchy.dept);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isDepartmentLevel, setIsDepartmentLevel] = useState(false);

  useEffect(() => {
    if (editingEmployee) {
      setSelectedDept(editingEmployee.dept);
      setSelectedTeam(editingEmployee.team);
      // Check if this is a department-level manager (team same as dept or not in team list)
      const teamList = departments[editingEmployee.dept] || [];
      setIsDepartmentLevel(!teamList.includes(editingEmployee.team));
    } else {
      setSelectedDept(hierarchy.dept === 'All' ? DEPARTMENT_NAMES[0] : hierarchy.dept);
      setSelectedTeam('');
      setIsDepartmentLevel(false);
    }
  }, [editingEmployee, hierarchy.dept, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const managerValue = formData.get('managerId') as string;
    const dept = formData.get('dept') as string;
    
    // If department-level, use department name as team
    const team = isDepartmentLevel ? dept : (formData.get('team') as string);
    
    const employeeData = {
      name: formData.get('name') as string,
      dept: dept,
      team: team,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
      joined: formData.get('joined') as string,
      isPotential: formData.get('isPotential') === 'on',
      managerId: managerValue ? Number(managerValue) : undefined,
    };

    onSubmit(employeeData, editingEmployee?.id);
  };

  const deptList = Object.keys(departments);
  const teamList = departments[selectedDept] || [];
  
  // Potential managers - anyone in same department or higher level
  const potentialManagers = employees.filter(emp => 
    emp.id !== editingEmployee?.id && 
    (emp.dept === selectedDept || !teamList.includes(emp.team))
  );

  // Manager roles that typically don't belong to specific teams
  const managerRoles = ['Engineering Manager', 'Product Manager', 'Architect'];
  const selectedRole = editingEmployee?.role || ROLES[0];
  const isManagerRole = managerRoles.includes(selectedRole);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-foreground">
            {editingEmployee ? 'Edit Personnel' : 'Personnel Intake'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Full Name
            </label>
            <input 
              required 
              name="name" 
              defaultValue={editingEmployee?.name} 
              placeholder="Enter full name" 
              className="input-field" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Department
              </label>
              <select 
                name="dept" 
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedTeam('');
                }}
                className="select-field w-full"
              >
                {deptList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Team
              </label>
              {isDepartmentLevel ? (
                <div className="input-field bg-accent/50 flex items-center gap-2 text-muted-foreground">
                  <Building2 size={14} />
                  <span>Department Level</span>
                </div>
              ) : (
                <select 
                  name="team" 
                  value={selectedTeam || editingEmployee?.team || teamList[0] || ''}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="select-field w-full"
                >
                  {teamList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Department-level Manager Toggle */}
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <input 
              type="checkbox" 
              id="isDepartmentLevel"
              checked={isDepartmentLevel}
              onChange={(e) => setIsDepartmentLevel(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <label htmlFor="isDepartmentLevel" className="text-sm text-muted-foreground cursor-pointer flex-1">
              <span className="font-medium text-foreground">Department/Group Manager</span>
              <p className="text-xs mt-0.5">Not assigned to a specific team (e.g., VP, Department Head, Group Manager)</p>
            </label>
          </div>

          {/* Manager Selection */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Reports To (Manager)
            </label>
            <select 
              name="managerId" 
              defaultValue={editingEmployee?.managerId || ''}
              className="select-field w-full"
            >
              <option value="">No manager (Top-level)</option>
              {potentialManagers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role}{!teamList.includes(m.team) ? ' - Dept Level' : ` - ${m.team}`})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Role
              </label>
              <select 
                name="role" 
                defaultValue={editingEmployee?.role} 
                className="select-field w-full"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Status
              </label>
              <select 
                name="status" 
                defaultValue={editingEmployee?.status || 'Active'} 
                className="select-field w-full"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Hire Date
            </label>
            <input 
              type="date" 
              required 
              name="joined" 
              defaultValue={editingEmployee?.joined} 
              className="input-field" 
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl border border-border">
            <input 
              type="checkbox" 
              name="isPotential" 
              id="isPotential"
              defaultChecked={editingEmployee?.isPotential}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="isPotential" className="text-sm text-muted-foreground cursor-pointer">
              <span className="font-medium text-foreground">Potential hire</span> — uncertain/planning only
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary flex-1 justify-center"
            >
              {editingEmployee ? 'Save Changes' : 'Confirm Hire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};