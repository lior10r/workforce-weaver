import { useState, useRef } from 'react';
import { Download, Upload, FileJson, Users, Calendar, Building2, X } from 'lucide-react';
import { Employee, WorkforceEvent, TeamStructure } from '@/lib/workforce-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  onImportAll
}: ExportImportProps) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
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
          // Escape quotes and wrap in quotes if contains comma or quote
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

  const exportAll = () => {
    const data: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      employees,
      events,
      teamStructures,
      departments
    };
    downloadJSON(data, `workforce-full-export-${new Date().toISOString().split('T')[0]}.json`);
    setIsExportOpen(false);
  };

  const exportEmployeesJSON = () => {
    downloadJSON({ version: '1.0', exportedAt: new Date().toISOString(), employees }, 'employees.json');
  };

  const exportEmployeesCSV = () => {
    const flatEmployees = employees.map(e => ({
      ...e,
      managerId: e.managerId || '',
      isPotential: e.isPotential || false
    }));
    downloadCSV(flatEmployees, 'employees.csv');
  };

  const exportEventsJSON = () => {
    downloadJSON({ version: '1.0', exportedAt: new Date().toISOString(), events }, 'events.json');
  };

  const exportEventsCSV = () => {
    const flatEvents = events.map(e => ({
      ...e,
      targetTeam: e.targetTeam || '',
      endDate: e.endDate || ''
    }));
    downloadCSV(flatEvents, 'events.csv');
  };

  const exportTeamStructuresJSON = () => {
    downloadJSON({ version: '1.0', exportedAt: new Date().toISOString(), teamStructures }, 'team-structures.json');
  };

  const exportDepartmentsJSON = () => {
    downloadJSON({ version: '1.0', exportedAt: new Date().toISOString(), departments }, 'departments.json');
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download size={20} />
              Export Data
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <button
              onClick={exportAll}
              className="w-full flex items-center gap-3 p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20"
            >
              <FileJson size={24} className="text-primary" />
              <div className="text-left">
                <p className="font-semibold">Export All (JSON)</p>
                <p className="text-xs text-muted-foreground">
                  Complete backup with all data
                </p>
              </div>
            </button>

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
                <span className="text-xs font-medium">Team Structures</span>
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
