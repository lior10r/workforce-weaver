import { X } from 'lucide-react';
import { Employee, EVENT_TYPES } from '@/lib/workforce-data';
import { FormEvent } from 'react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: { empId: number; type: string; date: string; details: string; isFlag: boolean }) => void;
  employees: Employee[];
  prefill: { empId: number | string; isFlag: boolean };
}

export const EventModal = ({ isOpen, onClose, onSubmit, employees, prefill }: EventModalProps) => {
  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    
    onSubmit({
      empId: parseInt(formData.get('empId') as string),
      type,
      date: formData.get('date') as string,
      details: formData.get('details') as string,
      isFlag: type === 'Decision Flag',
    });
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-foreground">
            {prefill.isFlag ? 'Add Decision Flag' : 'Strategic Movement'}
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
              Target Personnel
            </label>
            <select 
              name="empId" 
              defaultValue={prefill.empId} 
              className="select-field w-full"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.dept})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Type
              </label>
              <select 
                name="type" 
                defaultValue={prefill.isFlag ? 'Decision Flag' : 'Promotion'} 
                className="select-field w-full"
              >
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Target Date
              </label>
              <input 
                type="date" 
                required 
                name="date" 
                className="input-field" 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Rationale / Context
            </label>
            <textarea 
              name="details" 
              placeholder="e.g. Succession planning, compliance requirement..." 
              className="input-field h-24 resize-none" 
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
              className={`flex-1 justify-center font-semibold px-5 py-2.5 rounded-xl transition-all
                ${prefill.isFlag 
                  ? 'bg-flag hover:bg-flag/90 text-foreground' 
                  : 'btn-primary'
                }`}
            >
              {prefill.isFlag ? 'Drop Flag' : 'Add to Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
