import { X, BookOpen, TrendingUp, CalendarIcon } from 'lucide-react';
import { Employee, EVENT_TYPES, formatDate, SENIORITY_LEVELS } from '@/lib/workforce-data';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: { empId: number; type: string; date: string; details: string; isFlag: boolean; targetTeam?: string; endDate?: string; newRole?: string }) => void;
  employees: Employee[];
  prefill: { empId: number | string; isFlag: boolean };
  departments: Record<string, string[]>;
}

export const EventModal = ({ isOpen, onClose, onSubmit, employees, prefill, departments }: EventModalProps) => {
  const [selectedType, setSelectedType] = useState(prefill.isFlag ? 'Decision Flag' : 'Promotion');
  const [selectedDept, setSelectedDept] = useState<string>(Object.keys(departments)[0] || '');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedEmpId, setSelectedEmpId] = useState<number | string>(prefill.empId);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('');

  // Sync modal defaults each time it opens (important for Decision Flag vs Movement)
  useEffect(() => {
    if (!isOpen) return;
    setSelectedType(prefill.isFlag ? 'Decision Flag' : 'Promotion');
    setSelectedEmpId(prefill.empId);
    setSelectedNewRole('');
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedDept(Object.keys(departments)[0] || '');
  }, [isOpen, prefill.empId, prefill.isFlag, departments]);

  // Get selected employee's current role for promotion options
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === Number(selectedEmpId));
  }, [employees, selectedEmpId]);
  
  // For promotions, determine available next roles
  const promotionOptions = useMemo(() => {
    const currentRole = selectedEmployee?.role;
    if (!currentRole) return [...SENIORITY_LEVELS];
    const currentIdx = SENIORITY_LEVELS.indexOf(currentRole as typeof SENIORITY_LEVELS[number]);
    if (currentIdx === -1) return [...SENIORITY_LEVELS];
    return SENIORITY_LEVELS.slice(currentIdx + 1) as unknown as string[];
  }, [selectedEmployee?.role]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    
    onSubmit({
      empId: parseInt(formData.get('empId') as string),
      type,
      date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
      details: formData.get('details') as string,
      isFlag: type === 'Decision Flag',
      targetTeam: type === 'Team Swap' ? formData.get('targetTeam') as string : undefined,
      endDate: (type === 'Training' || type === 'Course') && endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      newRole: type === 'Promotion' ? formData.get('newRole') as string : undefined,
    });
  };

  const allTeams = Object.values(departments).flat();
  const isTrainingType = selectedType === 'Training' || selectedType === 'Course';
  const isPromotion = selectedType === 'Promotion';

  // Use EVENT_TYPES directly (no duplicates)
  const eventTypes = [...EVENT_TYPES];

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
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="select-field w-full"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.team}) - {e.role}
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
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="select-field w-full"
              >
                {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                {isTrainingType ? 'Start Date' : 'Target Date'}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal input-field ${!startDate ? 'text-muted-foreground' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[110]" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* End Date for Training/Course */}
          {isTrainingType && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-start-2">
                <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full justify-start text-left font-normal input-field ${!endDate ? 'text-muted-foreground' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd/MM/yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[110]" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Target Team selector for Team Swap */}
          {selectedType === 'Team Swap' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                  Target Department
                </label>
                <select 
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="select-field w-full"
                >
                  {Object.keys(departments).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                  Target Team
                </label>
                <select 
                  name="targetTeam" 
                  required
                  className="select-field w-full"
                >
                  {(departments[selectedDept] || []).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* New Role selector for Promotion */}
          {isPromotion && (
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
                Promote To
              </label>
              {promotionOptions.length > 0 ? (
                <select 
                  name="newRole" 
                  required
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value)}
                  className="select-field w-full"
                >
                  <option value="">Select new role...</option>
                  {promotionOptions.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-muted/50 rounded-xl border border-border text-sm text-muted-foreground">
                  {selectedEmployee?.role} is already at the highest level
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-accent/50 rounded-xl border border-border mt-3">
                <TrendingUp size={16} className="text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Current role: <strong className="text-foreground">{selectedEmployee?.role || 'Unknown'}</strong>. 
                  Promotions update the employee's role and are tracked in the changelog.
                </p>
              </div>
            </div>
          )}

          {/* Training hint */}
          {isTrainingType && (
            <div className="flex items-start gap-3 p-3 bg-accent/50 rounded-xl border border-border">
              <BookOpen size={16} className="text-primary mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Training periods will be shown on the timeline with a striped pattern. The person remains on their team but is marked as "On Training".
              </p>
            </div>
          )}

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1.5 tracking-wider">
              Rationale / Context
            </label>
            <textarea 
              name="details" 
              placeholder={isTrainingType 
                ? "e.g. React Advanced Course, AWS Certification training..." 
                : "e.g. Succession planning, compliance requirement..."
              }
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
