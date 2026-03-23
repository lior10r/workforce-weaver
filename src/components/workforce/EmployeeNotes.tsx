import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Pencil, Trash2, Clock, Send } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { EmployeeNote } from '@/lib/workforce-data';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/workforce-data';

interface EmployeeNotesProps {
  employeeId: number;
  employeeName: string;
  isBackendAvailable: boolean;
}

export const EmployeeNotes = ({ employeeId, employeeName, isBackendAvailable }: EmployeeNotesProps) => {
  const [notes, setNotes] = useState<EmployeeNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    if (!isBackendAvailable) return;
    loadNotes();
  }, [employeeId, isBackendAvailable]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getEmployeeNotes(employeeId);
      setNotes(data);
      setHasAccess(true);
    } catch (error: any) {
      if (error.message?.includes('403') || error.message?.includes('Not authorized') || error.message?.includes('managers')) {
        setHasAccess(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const note = await apiClient.createEmployeeNote(employeeId, newNote.trim());
      setNotes(prev => [note, ...prev]);
      setNewNote('');
      toast.success('Note added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add note');
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.updateNote(noteId, editContent.trim());
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: editContent.trim(), updatedAt: new Date().toISOString() } : n));
      setEditingId(null);
      setEditContent('');
      toast.success('Note updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await apiClient.deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete note');
    }
  };

  if (!isBackendAvailable) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
        <MessageSquare size={14} className="inline mr-1" />
        Notes require backend connection
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Don't show anything if user doesn't have access
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-primary" />
        <h4 className="text-sm font-bold text-foreground">Manager Notes</h4>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {notes.length}
        </span>
      </div>

      {/* Add note input */}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note (performance observation, 1-on-1 summary...)"
          className="text-sm min-h-[60px] resize-none bg-background"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
          }}
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={!newNote.trim()}
          className="self-end"
        >
          <Send size={14} />
        </Button>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground animate-pulse">Loading notes...</div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No notes yet</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {notes.map(note => (
            <div key={note.id} className="p-2.5 bg-secondary/40 rounded-lg border border-border/50 group">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="text-sm min-h-[60px] resize-none bg-background"
                    autoFocus
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => handleUpdateNote(note.id)}>Save</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium">{note.authorName}</span>
                      <span>•</span>
                      <Clock size={10} />
                      <span>{formatDate(note.createdAt)}</span>
                      {note.updatedAt !== note.createdAt && (
                        <span className="italic">(edited)</span>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button
                        onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                        title="Edit note"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
