import { useState, useMemo } from 'react';
import { Search, Users, Calendar, GitBranch, FolderTree, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { AuditEntry } from '@/lib/workforce-data';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AuditLogProps {
  auditLog: AuditEntry[];
}

const categoryConfig: Record<string, { icon: typeof Users; label: string; color: string }> = {
  employee: { icon: Users, label: 'Employee', color: 'bg-blue-500/10 text-blue-600' },
  event: { icon: Calendar, label: 'Event', color: 'bg-amber-500/10 text-amber-600' },
  structure: { icon: FolderTree, label: 'Structure', color: 'bg-purple-500/10 text-purple-600' },
  scenario: { icon: GitBranch, label: 'Scenario', color: 'bg-emerald-500/10 text-emerald-600' },
};

const actionColors: Record<string, string> = {
  added: 'border-l-green-500',
  modified: 'border-l-amber-500',
  removed: 'border-l-destructive',
  merged: 'border-l-blue-500',
  created: 'border-l-green-500',
  deleted: 'border-l-destructive',
  resolved: 'border-l-emerald-500',
};

const getActionBorderColor = (action: string): string => {
  for (const [key, color] of Object.entries(actionColors)) {
    if (action.toLowerCase().includes(key)) return color;
  }
  return 'border-l-muted-foreground';
};

const formatTimestamp = (ts: string): string => {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
};

type CategoryFilter = 'all' | 'employee' | 'event' | 'structure' | 'scenario';

export const AuditLog = ({ auditLog }: AuditLogProps) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let entries = [...auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (categoryFilter !== 'all') {
      entries = entries.filter(e => e.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.summary.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [auditLog, categoryFilter, search]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filters: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'employee', label: 'Employees' },
    { key: 'event', label: 'Events' },
    { key: 'structure', label: 'Structure' },
    { key: 'scenario', label: 'Scenarios' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(f => (
            <Button
              key={f.key}
              variant={categoryFilter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(f.key)}
              className="text-xs h-8"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Filter size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No activity entries found</p>
          </div>
        )}
        {filtered.map(entry => {
          const config = categoryConfig[entry.category] || categoryConfig.employee;
          const Icon = config.icon;
          const isExpanded = expandedIds.has(entry.id);
          const hasDetails = entry.details && Object.keys(entry.details).length > 0;

          return (
            <div
              key={entry.id}
              className={`border-l-4 ${getActionBorderColor(entry.action)} bg-card rounded-lg border border-border p-4 transition-colors hover:bg-accent/30`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-md ${config.color} shrink-0 mt-0.5`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-foreground">{entry.summary}</span>
                    <Badge variant="outline" className="text-[10px] h-5">{config.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatTimestamp(entry.timestamp)}</span>
                    <span>•</span>
                    <span className="font-medium">{entry.userName}</span>
                  </div>
                </div>
                {hasDetails && (
                  <button onClick={() => toggleExpand(entry.id)} className="p-1 hover:bg-accent rounded transition-colors shrink-0">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
              </div>
              {isExpanded && hasDetails && (
                <div className="mt-3 ml-9 space-y-1 animate-fade-in">
                  {Object.entries(entry.details!).map(([key, val]) => (
                    <div key={key} className="text-xs flex gap-2">
                      <span className="text-muted-foreground font-medium w-20 shrink-0">{key}:</span>
                      {val.before && <span className="line-through text-destructive/70">{val.before}</span>}
                      {val.before && val.after && <span className="text-muted-foreground">→</span>}
                      {val.after && <span className="text-green-600">{val.after}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
