'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';

type ApiResult = { ok: boolean; error?: { message: string } };

export function useAutoSave<T>(
  data: T,
  onSave: (data: T) => Promise<void | ApiResult>,
  delay = 2000
) {
  const debouncedData = useDebounce(data, delay);
  // Snapshot of the last-known-good value (initial mount or last successful save).
  // Prevents remount-flushing form defaults over previously-saved backend state.
  const lastSavedSnapshotRef = useRef<string>(JSON.stringify(data));
  const onSaveRef = useRef(onSave);
  const hasErroredRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const serialized = JSON.stringify(debouncedData);
    if (serialized === lastSavedSnapshotRef.current) {
      return;
    }

    const save = async () => {
      setIsSaving(true);
      try {
        const result = await onSaveRef.current(debouncedData);

        // Handle ApiResult-style returns: { ok: false } is a failure that doesn't throw
        if (result && 'ok' in result && !result.ok) {
          const msg = result.error?.message || 'Auto-save failed';
          setSaveError(msg);
          if (!hasErroredRef.current) {
            toast.error(msg);
            hasErroredRef.current = true;
          }
          return;
        }

        lastSavedSnapshotRef.current = serialized;
        setSaveError(null);
        hasErroredRef.current = false;
        setLastSaved(new Date());
      } catch (error: any) {
        const msg = error?.message || 'Auto-save failed';
        setSaveError(msg);
        if (!hasErroredRef.current) {
          toast.error(msg);
          hasErroredRef.current = true;
        }
      } finally {
        setIsSaving(false);
      }
    };

    save();
  }, [debouncedData]);

  return { isSaving, lastSaved, saveError };
}
