"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { formatJalali } from "@/core/lib/format";
import { useUpdateInstallmentDueDate } from "../hooks";
import type { InstallmentDTO } from "../lib/schema";

interface DueDateEditorProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  installment: InstallmentDTO | null;
  onSaved?: (id: string) => void;
}

export function DueDateEditor({ open, onClose, projectId, installment, onSaved }: DueDateEditorProps) {
  const [dueDate, setDueDate] = useState("");
  const { mutateAsync, isPending } = useUpdateInstallmentDueDate(projectId);

  useEffect(() => {
    if (!open || !installment) return;
    setDueDate(installment.dueDate);
  }, [open, installment]);

  if (!installment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await mutateAsync({ id: installment.id, dueDate });
      onSaved?.(updated.id);
      onClose();
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open.
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="تغییر سررسید"
      description={`سررسید فعلی: ${formatJalali(installment.dueDate)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending} type="button">
            انصراف
          </Button>
          <Button type="submit" form="due-date-form" loading={isPending}>
            ذخیره سررسید
          </Button>
        </>
      }
    >
      <form id="due-date-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <JalaliDatePicker
          label="سررسید جدید"
          required
          value={dueDate || null}
          onChange={(iso) => setDueDate(iso ?? "")}
          disabled={isPending}
        />
        <p className="text-xs text-foreground-muted">
          سررسید قسط حتی در صورت پرداخت جزئی قابل تغییر است.
        </p>
      </form>
    </Modal>
  );
}
