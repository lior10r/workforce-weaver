import { Users, GraduationCap, Flag, Calendar, LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }: StatCardProps) => (
  <div className="stat-card animate-slide-up">
    <div className="flex justify-between items-center mb-4">
      <div className={`p-3 rounded-xl ${bgClass}`}>
        <Icon size={22} className={colorClass} />
      </div>
    </div>
    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{label}</p>
    <h3 className="text-3xl font-bold mt-1 text-foreground">{value}</h3>
  </div>
);

interface Stats {
  total: number;
  onCourse: number;
  flags: number;
  upcomingChanges: number;
}

interface StatsCardsProps {
  stats: Stats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const statItems = [
    { 
      label: 'Headcount', 
      value: stats.total, 
      icon: Users, 
      colorClass: 'text-primary', 
      bgClass: 'bg-primary/10' 
    },
    { 
      label: 'Out of Office', 
      value: stats.onCourse, 
      icon: GraduationCap, 
      colorClass: 'text-role-lead', 
      bgClass: 'bg-role-lead/10' 
    },
    { 
      label: 'Decision Flags', 
      value: stats.flags, 
      icon: Flag, 
      colorClass: 'text-flag', 
      bgClass: 'bg-flag/10' 
    },
    { 
      label: 'Transitions', 
      value: stats.upcomingChanges, 
      icon: Calendar, 
      colorClass: 'text-role-junior', 
      bgClass: 'bg-role-junior/10' 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {statItems.map((stat, i) => (
        <StatCard 
          key={stat.label} 
          {...stat}
        />
      ))}
    </div>
  );
};
