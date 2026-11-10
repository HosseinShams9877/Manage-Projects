"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { ROLES } from "@/core/constants";
import { useCreateUser, useUpdateUser } from "../hooks";
import { createUserSchema, updateUserSchema, type UserDTO, type UserFormValues, type UserRole } from "../lib/schema";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing user → edit mode; absent → create mode. */
  initialData?: Pick<UserDTO, "id" | "name" | "email" | "role">;
  /** Called after a successful create/update (the dialog closes itself). */
  onSuccess: () => void;
}

type FieldErrors = Partial<Record<"name" | "email" | "password" | "role", string>>;

const ROLES_ORDER: UserRole[] = ["EMPLOYEE", "ADMIN"];

/**
 * Create or edit a user. Create requires a password; on edit an empty
 * password field keeps the stored hash. Validation errors are Zod's Persian
 * messages, shown under the offending field.
 */
export function UserFormDialog({ open, onOpenChange, initialData, onSuccess }: UserFormDialogProps) {
  const isEdit = !!initialData;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("EMPLOYEE");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset the form every time the dialog OPENS. Resetting on every render
  // would clobber keystrokes; resetting only on `open`'s false→true edge keeps
  // create mode pristine (no leftovers from a previous edit) while edits still
  // prefill from `initialData`.
  const wasOpen = useRef(false);
  useEffect(() => {
    const opening = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opening) return;
    setName(initialData?.name ?? "");
    setEmail(initialData?.email ?? "");
    setRole(initialData?.role ?? "EMPLOYEE");
    setPassword("");
    setErrors({});
  }, [open, initialData]);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const validate = (): boolean => {
    const parsed = isEdit
      ? updateUserSchema.safeParse(password ? { name, email, password, role } : { name, email, role })
      : createUserSchema.safeParse({ name, email, password, role });
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "email" || key === "password" || key === "role") {
        next[key] = issue.message;
      }
    }
    setErrors(next);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEdit && initialData) {
        const values: Partial<UserFormValues> = {
          name,
          email,
          role,
          ...(password ? { password } : {}),
        };
        await updateMutation.mutateAsync({ id: initialData.id, ...values });
      } else {
        await createMutation.mutateAsync({ name, email, password, role });
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open.
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "ویرایش اطلاعات کارمند" : "کارمند جدید"}
      description={
        isEdit
          ? "اطلاعات حساب کاربری را به‌روزرسانی کنید."
          : "یک حساب کاربری جدید برای کارمند ایجاد کنید."
      }
      footer={
        <>
          <Button
            variant="secondary"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            انصراف
          </Button>
          <Button type="submit" form="user-form" loading={isPending}>
            {isEdit ? "ذخیره تغییرات" : "ایجاد کارمند"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-name" className="text-sm font-medium text-foreground">
            نام
          </label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            autoFocus
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          />
          {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-email" className="text-sm font-medium text-foreground">
            ایمیل
          </label>
          <input
            id="user-email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-left text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          />
          {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-password" className="text-sm font-medium text-foreground">
            رمز عبور
          </label>
          <input
            id="user-password"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            placeholder={isEdit ? "خالی = تغییر نکردن رمز عبور" : ""}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-left text-foreground placeholder:text-foreground-subtle focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          />
          {errors.password ? (
            <p className="text-xs text-danger">{errors.password}</p>
          ) : (
            <p className="text-xs text-foreground-subtle">
              {isEdit ? "در صورت خالی گذاشتن، رمز عبور فعلی نگه داشته می‌شود." : "حداقل ۸ کاراکتر."}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-role" className="text-sm font-medium text-foreground">
            نقش
          </label>
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isPending}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          >
            {ROLES_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLES[r]}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
