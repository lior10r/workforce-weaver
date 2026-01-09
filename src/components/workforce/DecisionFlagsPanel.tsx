import { useState, useMemo } from 'react';
import { Flag, Filter, Check, Trash2, Calendar, Users, X, MessageSquare } from 'lucide-react';
import { Employee, WorkforceEvent, formatDate } from '@/lib/workforce-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DecisionFlagsPanelProps {
  employees: Employee[];
  events: WorkforceEvent[];
  departments: Record<string, string[]>;
  onResolveFlag: (eventId: number, resolutionNote: string) => void;
  onDeleteFlag: (eventId: number) => void;
}

export const DecisionFlagsPanel = ({
  employees,
  events,
  departments,
  onResolveFlag,
  onDeleteFlag
}: DecisionFlagsPanelProps) => {
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'past' | 'upcoming' | 'thisMonth'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  
  // Resolution dialog state
  const [resolvingFlagId, setResolvingFlagId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Get all flags from events
  const allFlags = useMemo(() => {
    return events.filter(e => e.isFlag);
  }, [events]);

  // Get all unique teams for filter
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    Object.values(departments).flat().forEach(t => teams.add(t));
    return Array.from(teams).sort();
  }, [departments]);

  // Apply filters
  const filteredFlags = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return allFlags.filter(flag => {
      const emp = employees.find(e => e.id === flag.empId);
      const flagDate = new Date(flag.date);

      // Team filter
      if (teamFilter !== 'all' && emp?.team !== teamFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === 'past' && flagDate >= now) return false;
      if (dateFilter === 'upcoming' && flagDate < now) return false;
      if (dateFilter === 'thisMonth' && (flagDate < thisMonth || flagDate >= nextMonth)) return false;

      // Status filter - now uses isResolved flag
      if (statusFilter === 'pending' && flag.isResolved) return false;
      if (statusFilter === 'resolved' && !flag.isResolved) return false;

      return true;
    }).sort((a, b) => {
      // Sort resolved flags to the bottom, then by date
      if (a.isResolved !== b.isResolved) {
        return a.isResolved ? 1 : -1;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [allFlags, teamFilter, dateFilter, statusFilter, employees]);

  const getEmployee = (empId: number) => employees.find(e => e.id === empId);
  
  const handleOpenResolveDialog = (flagId: number) => {
    const flag = events.find(e => e.id === flagId);
    setResolvingFlagId(flagId);
    setResolutionNote(flag?.resolutionNote || '');
  };
  
  const handleResolve = () => {
    if (resolvingFlagId) {
      onResolveFlag(resolvingFlagId, resolutionNote);
      setResolvingFlagId(null);
      setResolutionNote('');
    }
  };

  return (
    <>
      <Card className="border-flag/20 bg-flag/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-flag">
              <Flag size={20} />
              Decision Flags ({allFlags.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Showing {filteredFlags.length} of {allFlags.length}
              </span>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <Users size={12} className="mr-1" />
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {allTeams.map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <Calendar size={12} className="mr-1" />
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            {(teamFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setTeamFilter('all');
                  setDateFilter('all');
                  setStatusFilter('all');
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
                Clear filters
              </button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {filteredFlags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No decision flags match your filters</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {filteredFlags.map(flag => {
                const emp = getEmployee(flag.empId);
                const isResolved = flag.isResolved;
                
                return (
                  <div
                    key={flag.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isResolved 
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-background border-flag/20 hover:border-flag/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-full ${isResolved ? 'bg-emerald-500/20' : 'bg-flag/20'}`}>
                        {isResolved ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Flag size={14} className="text-flag" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{emp?.name || 'Unknown'}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                            {emp?.team}
                          </span>
                          {isResolved && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-medium">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{flag.details}</p>
                        {isResolved && flag.resolutionNote && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <MessageSquare size={10} />
                            {flag.resolutionNote}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{formatDate(flag.date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleOpenResolveDialog(flag.id)}
                        title={isResolved ? "Edit resolution" : "Resolve flag"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isResolved 
                            ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isResolved ? <MessageSquare size={14} /> : <Check size={14} />}
                      </button>
                      <button
                        onClick={() => onDeleteFlag(flag.id)}
                        title="Delete flag"
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Resolution Dialog */}
      <Dialog open={resolvingFlagId !== null} onOpenChange={(open) => {
        if (!open) {
          setResolvingFlagId(null);
          setResolutionNote('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Resolve Decision Flag
            </DialogTitle>
            <DialogDescription>
              Add a short description of the decision or resolution.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {resolvingFlagId && (() => {
              const flag = events.find(e => e.id === resolvingFlagId);
              const emp = flag ? getEmployee(flag.empId) : null;
              return flag && emp ? (
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="font-medium text-sm">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{flag.details}</p>
                </div>
              ) : null;
            })()}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Note</label>
              <Textarea
                placeholder="Describe the decision made..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResolvingFlagId(null);
              setResolutionNote('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleResolve} className="bg-emerald-600 hover:bg-emerald-700">
              <Check size={16} className="mr-2" />
              {events.find(e => e.id === resolvingFlagId)?.isResolved ? 'Update' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
