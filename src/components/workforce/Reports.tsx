import { useState, useMemo, useRef } from 'react';
import { FileText, Download, Check, Users, TrendingUp, TrendingDown, Calendar, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Employee, WorkforceEvent, TeamStructure, HierarchyStructure, getDepartmentsFlat, formatDate } from '@/lib/workforce-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsProps {
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
  hierarchy: HierarchyStructure;
}

const CHART_COLORS = [
  'hsl(220, 70%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(35, 85%, 55%)',
  'hsl(0, 65%, 55%)', 'hsl(270, 55%, 55%)', 'hsl(190, 70%, 45%)',
  'hsl(330, 60%, 55%)', 'hsl(90, 50%, 45%)',
];

type ReportSection = 'headcount' | 'gaps' | 'forecast' | 'events' | 'roles' | 'tenure';

const sectionConfig: Record<ReportSection, { label: string; icon: typeof Users }> = {
  headcount: { label: 'Headcount Summary', icon: Users },
  gaps: { label: 'Staffing Gaps', icon: TrendingUp },
  forecast: { label: 'Staffing Forecast', icon: TrendingDown },
  events: { label: 'Upcoming Events', icon: Calendar },
  roles: { label: 'Role Distribution', icon: BarChart3 },
  tenure: { label: 'Tenure Analysis', icon: Clock },
};

export const Reports = ({ employees, events, teamStructures, hierarchy }: ReportsProps) => {
  const [sections, setSections] = useState<Record<ReportSection, boolean>>({
    headcount: true, gaps: true, forecast: true, events: true, roles: true, tenure: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const departments = useMemo(() => getDepartmentsFlat(hierarchy), [hierarchy]);

  const toggleSection = (key: ReportSection) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Headcount data ---
  const headcountData = useMemo(() => {
    return Object.entries(departments).map(([dept, teams]) => {
      const deptEmps = employees.filter(e => e.dept === dept);
      return {
        department: dept,
        total: deptEmps.length,
        active: deptEmps.filter(e => e.status === 'Active').length,
        onLeave: deptEmps.filter(e => e.status === 'Parental Leave').length,
        notice: deptEmps.filter(e => e.status === 'Notice Period').length,
        onCourse: deptEmps.filter(e => e.status === 'On Course').length,
        teams: teams.length,
      };
    });
  }, [employees, departments]);

  // --- Staffing gaps ---
  const gapsData = useMemo(() => {
    return teamStructures.map(ts => {
      const teamEmps = employees.filter(e => e.team === ts.teamName);
      const currentCount = teamEmps.length;
      const targetSize = ts.targetSize || Object.values(ts.requiredRoles).reduce((a, b) => a + b, 0);
      const diff = currentCount - targetSize;
      const missingRoles: { role: string; need: number; have: number }[] = [];
      Object.entries(ts.requiredRoles).forEach(([role, need]) => {
        const have = teamEmps.filter(e => e.role === role).length;
        if (have < need) missingRoles.push({ role, need, have });
      });
      return { team: ts.teamName, department: ts.department, currentCount, targetSize, diff, missingRoles };
    }).filter(t => t.diff !== 0 || t.missingRoles.length > 0);
  }, [employees, teamStructures]);

  // --- Upcoming events ---
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return events
      .filter(e => { const d = new Date(e.date); return d >= now && d <= future90; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => ({ ...e, employeeName: employees.find(emp => emp.id === e.empId)?.name || 'Unknown' }));
  }, [events, employees]);

  // --- Role distribution ---
  const roleData = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.role] = (counts[e.role] || 0) + 1; });
    return Object.entries(counts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  // --- Tenure analysis ---
  const tenureData = useMemo(() => {
    const now = new Date();
    const tenures = employees.map(e => {
      const joined = new Date(e.joined);
      return (now.getTime() - joined.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    });
    const avg = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;
    const lt1 = tenures.filter(t => t < 1).length;
    const b1_3 = tenures.filter(t => t >= 1 && t < 3).length;
    const gt3 = tenures.filter(t => t >= 3).length;
    return {
      avgYears: Math.floor(avg),
      avgMonths: Math.round((avg % 1) * 12),
      buckets: [
        { label: '< 1 year', count: lt1, pct: tenures.length ? Math.round(lt1 / tenures.length * 100) : 0 },
        { label: '1-3 years', count: b1_3, pct: tenures.length ? Math.round(b1_3 / tenures.length * 100) : 0 },
        { label: '3+ years', count: gt3, pct: tenures.length ? Math.round(gt3 / tenures.length * 100) : 0 },
      ],
    };
  }, [employees]);

  // PDF generation
  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      pdf.save(`workforce-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report generated successfully');
    } catch (err) {
      toast.error('Failed to generate PDF');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const enabledCount = Object.values(sections).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Report Builder
            </CardTitle>
            <Button onClick={generatePDF} disabled={isGenerating || enabledCount === 0} className="gap-2">
              <Download size={16} />
              {isGenerating ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Toggle sections to include in your report:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(Object.entries(sectionConfig) as [ReportSection, typeof sectionConfig[ReportSection]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={key} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <Switch checked={sections[key]} onCheckedChange={() => toggleSection(key)} id={key} />
                  <Label htmlFor={key} className="text-xs cursor-pointer flex items-center gap-1.5">
                    <Icon size={12} className="text-muted-foreground" />
                    {cfg.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Report preview */}
      <div ref={reportRef} className="space-y-6 bg-background">
        {/* Title for PDF */}
        <div className="text-center py-4 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Workforce Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Generated on {new Date().toLocaleDateString('en-GB')}</p>
        </div>

        {sections.headcount && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users size={16} className="text-primary" /> Headcount Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">On Course</TableHead>
                    <TableHead className="text-right">On Leave</TableHead>
                    <TableHead className="text-right">Notice</TableHead>
                    <TableHead className="text-right">Teams</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headcountData.map(row => (
                    <TableRow key={row.department}>
                      <TableCell className="font-medium">{row.department}</TableCell>
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                      <TableCell className="text-right">{row.active}</TableCell>
                      <TableCell className="text-right">{row.onCourse}</TableCell>
                      <TableCell className="text-right">{row.onLeave}</TableCell>
                      <TableCell className="text-right">{row.notice}</TableCell>
                      <TableCell className="text-right">{row.teams}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{headcountData.reduce((a, r) => a + r.total, 0)}</TableCell>
                    <TableCell className="text-right">{headcountData.reduce((a, r) => a + r.active, 0)}</TableCell>
                    <TableCell className="text-right">{headcountData.reduce((a, r) => a + r.onCourse, 0)}</TableCell>
                    <TableCell className="text-right">{headcountData.reduce((a, r) => a + r.onLeave, 0)}</TableCell>
                    <TableCell className="text-right">{headcountData.reduce((a, r) => a + r.notice, 0)}</TableCell>
                    <TableCell className="text-right">{headcountData.reduce((a, r) => a + r.teams, 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {sections.gaps && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Staffing Gaps</CardTitle></CardHeader>
            <CardContent>
              {gapsData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">All teams are fully staffed</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead>Missing Roles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gapsData.map(row => (
                      <TableRow key={row.team}>
                        <TableCell className="font-medium">{row.team}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell className="text-right">{row.currentCount}</TableCell>
                        <TableCell className="text-right">{row.targetSize}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.diff < 0 ? 'text-destructive' : row.diff > 0 ? 'text-green-600' : ''}`}>
                          {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {row.missingRoles.map(mr => (
                              <Badge key={mr.role} variant="outline" className="text-[10px]">
                                {mr.role} ({mr.have}/{mr.need})
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {sections.events && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar size={16} className="text-primary" /> Upcoming Events (Next 90 Days)</CardTitle></CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No upcoming events</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                        <TableCell className="font-medium">{e.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant={e.isFlag ? 'destructive' : 'secondary'} className="text-[10px]">
                            {e.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{e.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {sections.roles && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 size={16} className="text-primary" /> Role Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleData} layout="vertical" margin={{ left: 100 }}>
                      <XAxis type="number" />
                      <YAxis dataKey="role" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleData} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80} label={({ role, count }) => `${role}: ${count}`} labelLine={false}>
                        {roleData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {sections.tenure && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock size={16} className="text-primary" /> Tenure Analysis</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-accent/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {tenureData.avgYears}y {tenureData.avgMonths}m
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Average Tenure</p>
                </div>
                {tenureData.buckets.map(b => (
                  <div key={b.label} className="bg-accent/30 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{b.count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{b.label} ({b.pct}%)</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
