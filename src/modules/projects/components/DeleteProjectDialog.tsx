"use client";

import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import { useDeleteProject } from "../hooks";
import type { ProjectDTO } from "../lib/schema";

interface DeleteProjectDialogProps {
  open: boolean;
  onClose: () => void;
  project: ProjectDTO | null;
  onDeleted?: (id: string) => void;
}

export function DeleteProjectDialog({
  open,
  onClose,
  project,
  onDeleted,
}: DeleteProjectDialogProps) {
  const { mutateAsync, isPending } = useDeleteProject();

  const handleConfirm = async () => {
    if (!project) return;
    try {
      const { id } = await mutateAsync(project.id);
      onDeleted?.(id);
      onClose();
    } catch {
      // The hook already surfaced a Persian toast.
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="حذف پروژه"
      description={`آیا از حذف پروژه «${project?.title ?? ""}» مطمئن هستید؟ تمام سهم‌ها، پرداخت‌ها، اقساط و اعلان‌های مرتبط نیز حذف می‌شوند.`}
      confirmText="حذف"
      cancelText="انصراف"
      destructive
      loading={isPending}
    />
  );
}
