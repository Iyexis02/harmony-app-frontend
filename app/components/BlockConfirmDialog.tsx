'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: () => void;
  loading?: boolean;
};

export default function BlockConfirmDialog({ open, onOpenChange, userName, onConfirm, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block {userName}?</DialogTitle>
          <DialogDescription>
            They won&apos;t appear in your feed and any existing match will be removed. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Blocking...' : 'Block'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
