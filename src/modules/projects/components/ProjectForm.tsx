"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { useCreateProject, useUpdateProject } from "../hooks";
import type { AssignableEmployee } from "./AssignmentEditor";
import { AssignmentEditor } from "./AssignmentEditor";
import type { AssignmentInput, ProjectDTO, ProjectFormValues } from "../lib/schema";

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  employees: AssignableEmployee[];
  /** Project being edited; undefined = create mode. */
  project?: ProjectDTO | null;
  onSaved?: (id: string) => void;
}

const EMPTY_FORM: ProjectFormValues = {
  title: "",
  description: "",
  clientCompany: "",
  contractPrice: "",
  startDate: null,
  endDate: null,
  assignments: [],
};

/** Seed the form from an existing project (RIA L string → TOMAN string). */
function projectToForm(project: ProjectDTO): ProjectFormValues {
  return {
    title: project.title,
    description: project.description,
    clientCompany: project.clientCompany,
    contractPrice: (BigInt(project.contractPrice) / 10n).toString(),
    startDate: project.startDate,
    endDate: project.endDate,
    assignments: project.assignments.map<AssignmentInput>((a) => ({
      userId: a.userId,
      sharePercent: a.sharePercent,
    })),
  };
}

export function ProjectForm({ open, onClose, employees, project, onSaved }: ProjectFormProps) {
  const isEdit = !!project;

  const [values, setValues] = useState<ProjectFormValues>(EMPTY_FORM);
  const [assignmentError, setAssignmentError] = useState<string | undefined>();

  const { mutateAsync: createAsync, isPending: creating } = useCreateProject();
  const { mutateAsync: updateAsync, isPending: updating } = useUpdateProject();

  // Reset the draft whenever the dialog (re)opens or its target changes.
  useEffect(() => {
    if (!open) return;
    setValues(project ? projectToForm(project) : EMPTY_FORM);
    setAssignmentError(undefined);
  }, [open, project]);

  const set = <K extends keyof ProjectFormValues>(key: K) => (v: ProjectFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (key === "assignments") setAssignmentError(undefined);
  };

  const total = values.assignments.reduce((acc, r) => acc + r.sharePercent, 0);
  const sharesValid = total === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (values.assignments.length === 0) {
      setAssignmentError("حداقل یک کارمند باید به پروژه اختصاص یابد.");
      return;
    }
    if (!sharesValid) {
      setAssignmentError(
        `مجموع درصد سهم کارمندان باید دقیقاً ۱۰۰ باشد. مجموع فعلی: ${total}`,
      );
      return;
    }

    try {
      if (isEdit && project) {
        const updated = await updateAsync({ id: project.id, values });
        onSaved?.(updated.id);
      } else {
        const created = await createAsync(values);
        onSaved?.(created.id);
      }
      onClose();
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open so the
      // user can fix the input.
    }
  };

  const pending = creating || updating;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "ویرایش پروژه" : "پروژه جدید"}
      description={
        isEdit
          ? "اطلاعات پروژه را به‌روزرسانی کنید."
          : "یک پروژه جدید با سهم کارمندان ایجاد کنید."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending} type="button">
            انصراف
          </Button>
          <Button type="submit" form="project-form" loading={pending} disabled={!sharesValid}>
            {isEdit ? "ذخیره تغییرات" : "ساخت پروژه"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="عنوان پروژه"
          required
          name="title"
          value={values.title}
          onChange={(e) => set("title")(e.target.value)}
          placeholder="مثلاً: ساختمان اداری پارسیس"
          disabled={pending}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="نام کارفرما"
            name="clientCompany"
            value={values.clientCompany}
            onChange={(e) => set("clientCompany")(e.target.value)}
            placeholder="شرکت کارفرما"
            disabled={pending}
          />
          <CurrencyInput
            label="مبلغ قرارداد"
            required
            value={values.contractPrice}
            onChange={(v) => set("contractPrice")(v)}
            hint="مبلغ به تومان وارد می‌شود."
            disabled={pending}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <JalaliDatePicker
            label="تاریخ شروع"
            value={values.startDate}
            onChange={(iso) => set("startDate")(iso)}
            disabled={pending}
          />
          <JalaliDatePicker
            label="تاریخ پایان"
            value={values.endDate}
            onChange={(iso) => set("endDate")(iso)}
            disabled={pending}
          />
        </div>

        <Input
          label="توضیحات"
          name="description"
          value={values.description}
          onChange={(e) => set("description")(e.target.value)}
          placeholder="توضیحات اختیاری"
          disabled={pending}
        />

        <AssignmentEditor
          employees={employees}
          value={values.assignments}
          onChange={(rows) => set("assignments")(rows)}
          error={assignmentError}
          disabled={pending}
        />
      </form>
    </Modal>
  );
}
