import { X } from 'lucide-react';
import { Employee, GROUPS, DEPARTMENTS, ROLES, STATUSES, Hierarchy } from '@/lib/workforce-data';
import { FormEvent, useState, useEffect } from 'react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, 'id'>, id?: number) => void;
  editingEmployee: Employee | null;
  hierarchy: Hierarchy;
}

export const EmployeeModal = ({ isOpen, onClose, onSubmit, editingEmployee, hierarchy }: EmployeeModalProps) => {
  const [selectedGroup, setSelectedGroup] = useState(hierarchy.group);

  useEffect(() => {
    if (editingEmployee) {
      setSelectedGroup(editingEmployee.group);
    } else {
      setSelectedGroup(hierarchy.group);
    }
  }, [editingEmployee, hierarchy.group, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const employeeData = {
      name: formData.get('name') as string,
      group: formData.get('group') as string,
      dept: formData.get('dept') as string,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
      joined: formData.get('joined') as string,
    };

    onSubmit(employeeData, editingEmployee?.id);
  };

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
                Group
              </label>
              <select 
                name="group" 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="select-field w-full"
              >
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Department
              </label>
              <select 
                name="dept" 
                defaultValue={editingEmployee?.dept} 
                className="select-field w-full"
              >
                {DEPARTMENTS[selectedGroup]?.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
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
