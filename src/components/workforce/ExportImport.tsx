import { useState, useRef } from 'react';
import { Download, Upload, FileJson, Users, Calendar, Building2, X, FileText, Image } from 'lucide-react';
import { Employee, WorkforceEvent, TeamStructure, DEPARTMENTS } from '@/lib/workforce-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportImportProps {
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
  departments: Record<string, string[]>;
  onImportEmployees: (employees: Employee[]) => void;
  onImportEvents: (events: WorkforceEvent[]) => void;
  onImportTeamStructures: (structures: TeamStructure[]) => void;
  onImportDepartments: (departments: Record<string, string[]>) => void;
  onImportAll: (data: {
    employees?: Employee[];
    events?: WorkforceEvent[];
    teamStructures?: TeamStructure[];
    departments?: Record<string, string[]>;
  }) => void;
  orgChartRef?: React.RefObject<HTMLDivElement>;
}

interface FullExportData {
  version: string;
  exportedAt: string;
  employees: Employee[];
  events: WorkforceEvent[];
  teamStructures: TeamStructure[];
  departments: Record<string, string[]>;
}

interface ExportData {
  version: string;
  exportedAt: string;
  employees?: Employee[];
  events?: WorkforceEvent[];
  teamStructures?: TeamStructure[];
  departments?: Record<string, string[]>;
}

export const ExportImport = ({
  employees,
  events,
  teamStructures,
  departments,
  onImportEmployees,
  onImportEvents,
  onImportTeamStructures,
  onImportDepartments,
  onImportAll,
  orgChartRef
}: ExportImportProps) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadJSON = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`);
  };

  const downloadCSV = (data: object[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = (row as Record<string, unknown>)[h];
          const stringValue = value === null || value === undefined ? '' : String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`);
  };

  // Generate complete team structures for all teams (not just configured ones)
  const getAllTeamStructures = (): TeamStructure[] => {
    const allTeams: TeamStructure[] = [];
    
    Object.entries(departments).forEach(([dept, teams]) => {
      teams.forEach(teamName => {
        const existing = teamStructures.find(s => s.teamName === teamName);
        if (existing) {
          allTeams.push(existing);
        } else {
          // Create default structure for unconfigured teams
          const teamMembers = employees.filter(e => e.team === teamName);
          const teamLead = teamMembers.find(e => e.role === 'Team Lead');
          allTeams.push({
            teamName,
            department: dept,
            teamLeader: teamLead?.id,
            requiredRoles: {},
            targetSize: teamMembers.length
          });
        }
      });
    });
    
    return allTeams;
  };

  // Full comprehensive export with all data
  const exportAll = () => {
    const allTeamStructures = getAllTeamStructures();
    
    const data: FullExportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      employees: employees.map(e => ({
        ...e,
        managerId: e.managerId || undefined,
        isPotential: e.isPotential || undefined
      })),
      events: events.map(e => ({
        ...e,
        targetTeam: e.targetTeam || undefined,
        endDate: e.endDate || undefined
      })),
      teamStructures: allTeamStructures,
      departments
    };
    downloadJSON(data, `workforce-full-export-${new Date().toISOString().split('T')[0]}.json`);
    setIsExportOpen(false);
  };

  const exportEmployeesJSON = () => {
    downloadJSON({ 
      version: '1.0', 
      exportedAt: new Date().toISOString(), 
      employees: employees.map(e => ({
        ...e,
        managerId: e.managerId || undefined,
        isPotential: e.isPotential || undefined
      }))
    }, 'employees.json');
  };

  const exportEmployeesCSV = () => {
    const flatEmployees = employees.map(e => ({
      id: e.id,
      name: e.name,
      dept: e.dept,
      team: e.team,
      role: e.role,
      status: e.status,
      joined: e.joined,
      managerId: e.managerId || '',
      isPotential: e.isPotential || false
    }));
    downloadCSV(flatEmployees, 'employees.csv');
  };

  const exportEventsJSON = () => {
    downloadJSON({ 
      version: '1.0', 
      exportedAt: new Date().toISOString(), 
      events: events.map(e => ({
        ...e,
        targetTeam: e.targetTeam || undefined,
        endDate: e.endDate || undefined
      }))
    }, 'events.json');
  };

  const exportEventsCSV = () => {
    const flatEvents = events.map(e => ({
      id: e.id,
      empId: e.empId,
      type: e.type,
      date: e.date,
      details: e.details,
      isFlag: e.isFlag,
      targetTeam: e.targetTeam || '',
      endDate: e.endDate || ''
    }));
    downloadCSV(flatEvents, 'events.csv');
  };

  const exportTeamStructuresJSON = () => {
    const allTeamStructures = getAllTeamStructures();
    downloadJSON({ 
      version: '1.0', 
      exportedAt: new Date().toISOString(), 
      teamStructures: allTeamStructures 
    }, 'team-structures.json');
  };

  const exportDepartmentsJSON = () => {
    downloadJSON({ version: '1.0', exportedAt: new Date().toISOString(), departments }, 'departments.json');
  };

  // PDF Export for Org Chart
  const exportOrgChartPDF = async () => {
    if (!orgChartRef?.current) {
      toast.error('Org chart not available');
      return;
    }

    setIsExportingPDF(true);
    toast.info('Generating PDF...');

    try {
      const element = orgChartRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f0f1a'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate PDF dimensions (landscape for wider charts)
      const pdfWidth = 297; // A4 landscape width in mm
      const pdfHeight = 210; // A4 landscape height in mm
      
      const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));
      const scaledWidth = imgWidth * 0.264583 * ratio;
      const scaledHeight = imgHeight * 0.264583 * ratio;

      const pdf = new jsPDF({
        orientation: scaledWidth > scaledHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Center the image
      const xOffset = (pdf.internal.pageSize.getWidth() - scaledWidth) / 2;
      const yOffset = 10;

      pdf.setFontSize(16);
      pdf.text('Organization Chart', pdf.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset + 20, scaledWidth, scaledHeight);

      pdf.save(`org-chart-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export org chart as PNG
  const exportOrgChartImage = async () => {
    if (!orgChartRef?.current) {
      toast.error('Org chart not available');
      return;
    }

    setIsExportingPDF(true);
    toast.info('Generating image...');

    try {
      const element = orgChartRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f0f1a'
      });

      const link = document.createElement('a');
      link.download = `org-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Image exported successfully');
    } catch (error) {
      console.error('Image export error:', error);
      toast.error('Failed to export image');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as ExportData;
        setImportPreview(data);
      } catch (error) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = (type: 'all' | 'employees' | 'events' | 'teamStructures' | 'departments') => {
    if (!importPreview) return;

    switch (type) {
      case 'all':
        onImportAll({
          employees: importPreview.employees,
          events: importPreview.events,
          teamStructures: importPreview.teamStructures,
          departments: importPreview.departments
        });
        toast.success('Imported all data successfully');
        break;
      case 'employees':
        if (importPreview.employees) {
          onImportEmployees(importPreview.employees);
          toast.success(`Imported ${importPreview.employees.length} employees`);
        }
        break;
      case 'events':
        if (importPreview.events) {
          onImportEvents(importPreview.events);
          toast.success(`Imported ${importPreview.events.length} events`);
        }
        break;
      case 'teamStructures':
        if (importPreview.teamStructures) {
          onImportTeamStructures(importPreview.teamStructures);
          toast.success(`Imported ${importPreview.teamStructures.length} team structures`);
        }
        break;
      case 'departments':
        if (importPreview.departments) {
          onImportDepartments(importPreview.departments);
          toast.success('Imported departments');
        }
        break;
    }

    setImportPreview(null);
    setIsImportOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setIsExportOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-lg transition-colors"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => setIsImportOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-lg transition-colors"
        >
          <Upload size={14} />
          Import
        </button>
      </div>

      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download size={20} />
              Export Data
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Full Export */}
            <button
              onClick={exportAll}
              className="w-full flex items-center gap-3 p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20"
            >
              <FileJson size={24} className="text-primary" />
              <div className="text-left flex-1">
                <p className="font-semibold">Export All Data (JSON)</p>
                <p className="text-xs text-muted-foreground">
                  Complete backup: {employees.length} employees, {events.length} events, {getAllTeamStructures().length} teams
                </p>
              </div>
            </button>

            {/* Org Chart Export */}
            {orgChartRef && (
              <div className="p-4 bg-accent/50 rounded-xl space-y-3">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Image size={16} className="text-primary" />
                  Org Chart Export
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={exportOrgChartPDF}
                    disabled={isExportingPDF}
                    className="flex flex-col items-center gap-2 p-3 bg-background hover:bg-background/80 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <FileText size={20} className="text-primary" />
                    <span className="text-xs font-medium">PDF</span>
                  </button>
                  <button
                    onClick={exportOrgChartImage}
                    disabled={isExportingPDF}
                    className="flex flex-col items-center gap-2 p-3 bg-background hover:bg-background/80 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Image size={20} className="text-primary" />
                    <span className="text-xs font-medium">PNG Image</span>
                  </button>
                </div>
              </div>
            )}

            {/* Individual Exports */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={exportEmployeesJSON}
                className="flex flex-col items-center gap-2 p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
              >
                <Users size={20} className="text-primary" />
                <span className="text-xs font-medium">Employees (JSON)</span>
              </button>
              <button
                onClick={exportEmployeesCSV}
                className="flex flex-col items-center gap-2 p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
              >
                <Users size={20} className="text-primary" />
                <span className="text-xs font-medium">Employees (CSV)</span>
              </button>
              <button
                onClick={exportEventsJSON}
                className="flex flex-col items-center gap-2 p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
              >
                <Calendar size={20} className="text-primary" />
                <span className="text-xs font-medium">Events (JSON)</span>
              </button>
              <button
                onClick={exportEventsCSV}
                className="flex flex-col items-center gap-2 p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
              >
                <Calendar size={20} className="text-primary" />
                <span className="text-xs font-medium">Events (CSV)</span>
              </button>
              <button
                onClick={exportTeamStructuresJSON}
                className="flex flex-col items-center gap-2 p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
              >
                <Building2 size={20} className="text-primary" />
                <span className="text-xs font-medium">All Teams ({getAllTeamStructures().length})</span>
              </button>
              <button
                onClick={exportDepartmentsJSON}
                className="flex flex-col items-center gap-2 p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
              >
                <Building2 size={20} className="text-primary" />
                <span className="text-xs font-medium">Departments</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={(open) => {
        setIsImportOpen(open);
        if (!open) {
          setImportPreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={20} />
              Import Data
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {!importPreview ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <FileJson size={40} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-2">Select a JSON file to import</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports full exports and individual data files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className="btn-primary cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={16} />
                  Choose File
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-accent rounded-xl">
                  <div>
                    <p className="text-sm font-medium">File Preview</p>
                    <p className="text-xs text-muted-foreground">
                      Version: {importPreview.version} • Exported: {new Date(importPreview.exportedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setImportPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="p-1 hover:bg-background rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  {(importPreview.employees || importPreview.events || importPreview.teamStructures || importPreview.departments) && (
                    <button
                      onClick={() => handleImport('all')}
                      className="w-full p-3 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 text-left"
                    >
                      <p className="font-semibold text-sm">Import All Available Data</p>
                      <p className="text-xs text-muted-foreground">Replace current data with imported data</p>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {importPreview.employees && (
                      <button
                        onClick={() => handleImport('employees')}
                        className="p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors text-left"
                      >
                        <p className="text-xs font-medium">Employees</p>
                        <p className="text-xs text-muted-foreground">{importPreview.employees.length} records</p>
                      </button>
                    )}
                    {importPreview.events && (
                      <button
                        onClick={() => handleImport('events')}
                        className="p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors text-left"
                      >
                        <p className="text-xs font-medium">Events</p>
                        <p className="text-xs text-muted-foreground">{importPreview.events.length} records</p>
                      </button>
                    )}
                    {importPreview.teamStructures && (
                      <button
                        onClick={() => handleImport('teamStructures')}
                        className="p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors text-left"
                      >
                        <p className="text-xs font-medium">Team Structures</p>
                        <p className="text-xs text-muted-foreground">{importPreview.teamStructures.length} records</p>
                      </button>
                    )}
                    {importPreview.departments && (
                      <button
                        onClick={() => handleImport('departments')}
                        className="p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors text-left"
                      >
                        <p className="text-xs font-medium">Departments</p>
                        <p className="text-xs text-muted-foreground">{Object.keys(importPreview.departments).length} departments</p>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
