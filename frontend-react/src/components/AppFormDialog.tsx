/**
 * Dialog modal pembungkus form tambah dan ubah data berbasis Dialog shadcn/ui.
 *
 * Dipakai di: UserForm, ResetPasswordDialog, RoleForm, ModuleForm, MenuForm, dan form master data.
 */
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Menampilkan dialog modal bertajuk untuk membungkus form input.
 *
 * Dipakai di: halaman master sistem dan master data.
 */
export function AppFormDialog({ open, onOpenChange, title, description, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : 'sr-only'}>
            {description ?? title}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
