import { useState } from 'react';
import { Settings, Clock, TrendingUp, GraduationCap, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export interface ProgressionMilestones {
  trainingMonths: number; // Default 6
  juniorToMidYears: number; // Default 1
  midToSeniorYears: number; // Default 3
}

export const DEFAULT_MILESTONES: ProgressionMilestones = {
  trainingMonths: 6,
  juniorToMidYears: 1,
  midToSeniorYears: 3,
};

interface ProgressionSettingsProps {
  milestones: ProgressionMilestones;
  onUpdate: (milestones: ProgressionMilestones) => void;
}

export const ProgressionSettings = ({ milestones, onUpdate }: ProgressionSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [localMilestones, setLocalMilestones] = useState(milestones);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalMilestones(milestones);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    onUpdate(localMilestones);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalMilestones(DEFAULT_MILESTONES);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings size={14} />
          <span className="hidden sm:inline">Progression Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Progression Milestones
          </DialogTitle>
          <DialogDescription>
            Customize when employees advance through seniority levels. These settings affect the timeline progression colors and capacity calculations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Training Period */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <GraduationCap size={14} className="text-amber-500" />
                Training Period
              </Label>
              <span className="text-sm font-mono text-primary">
                {localMilestones.trainingMonths} months
              </span>
            </div>
            <Slider
              value={[localMilestones.trainingMonths]}
              onValueChange={([value]) => setLocalMilestones(prev => ({ ...prev, trainingMonths: value }))}
              min={1}
              max={12}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              New hires operate at 30% capacity during training
            </p>
          </div>

          {/* Junior to Mid-Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock size={14} className="text-role-junior" />
                Junior → Mid-Level
              </Label>
              <span className="text-sm font-mono text-primary">
                {localMilestones.juniorToMidYears} year{localMilestones.juniorToMidYears !== 1 ? 's' : ''}
              </span>
            </div>
            <Slider
              value={[localMilestones.juniorToMidYears]}
              onValueChange={([value]) => setLocalMilestones(prev => ({ ...prev, juniorToMidYears: value }))}
              min={0.5}
              max={3}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              After training, juniors operate at 70% capacity until reaching mid-level
            </p>
          </div>

          {/* Mid-Level to Senior */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingUp size={14} className="text-role-senior" />
                Mid-Level → Senior
              </Label>
              <span className="text-sm font-mono text-primary">
                {localMilestones.midToSeniorYears} years total
              </span>
            </div>
            <Slider
              value={[localMilestones.midToSeniorYears]}
              onValueChange={([value]) => setLocalMilestones(prev => ({ ...prev, midToSeniorYears: value }))}
              min={1}
              max={7}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Mid-level employees operate at 100% capacity. Seniors reach 150% capacity.
            </p>
          </div>

          {/* Summary */}
          <div className="p-3 bg-accent/50 rounded-lg">
            <p className="text-xs font-medium text-foreground mb-2">Progression Timeline:</p>
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <span className="px-2 py-1 bg-amber-500/20 text-amber-600 rounded">
                0-{localMilestones.trainingMonths}mo Training
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="px-2 py-1 bg-role-junior/20 text-role-junior rounded">
                {localMilestones.trainingMonths}mo-{localMilestones.juniorToMidYears}yr Junior
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="px-2 py-1 bg-role-mid/20 text-role-mid rounded">
                {localMilestones.juniorToMidYears}-{localMilestones.midToSeniorYears}yr Mid
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="px-2 py-1 bg-role-senior/20 text-role-senior rounded">
                {localMilestones.midToSeniorYears}yr+ Senior
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw size={14} />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} size="sm" className="gap-1">
            <Save size={14} />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
