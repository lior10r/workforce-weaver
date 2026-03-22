import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { Label } from '@/lib/workforce-data';

export const useLabels = (isAuthenticated: boolean) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLabels = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await apiClient.getLabels();
      setLabels(data);
    } catch (err) {
      console.error('Failed to load labels:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  const createLabel = useCallback(async (name: string, color?: string) => {
    try {
      const label = await apiClient.createLabel({ name, color });
      setLabels(prev => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)));
      return label;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create label';
      toast.error(message);
      throw err;
    }
  }, []);

  const deleteLabel = useCallback(async (id: number) => {
    try {
      await apiClient.deleteLabel(id);
      setLabels(prev => prev.filter(l => l.id !== id));
      toast.success('Label deleted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete label';
      toast.error(message);
    }
  }, []);

  return { labels, isLoading, createLabel, deleteLabel, refreshLabels: loadLabels };
};
