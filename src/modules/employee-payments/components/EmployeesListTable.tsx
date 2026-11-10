"use client";

import { useMemo, useState } from "react";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/core/components/Button";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import { useEmployeeBalances } from "../hooks";
import { useDeleteUser } from "@/modules/users/hooks";
import { formatToman } from "@/core/lib/format";
import { UserFormDialog } from "@/modules/users/components/UserFormDialog";
import type { EmployeeBalanceDTO } from "../lib/schema";
import type { UserDTO } from "@/modules/users/lib/schema";

interface EmployeesListTableProps {
  /** Server-fetched rows, so the table is populated in the SSR HTML too. */
  employees: EmployeeBalanceDTO[];
  /** Base path for the employee detail page, e.g. "/admin/employees". */
  basePath: string;
}

const COLUMNS = [
  "نام",
  "ایمیل",
  "تعداد پروژه‌ها",
  "مجموع سهم",
  "مجموع پرداخت‌شده",
  "مانده حساب",
  "عملیات",
] as const;

/**
 * Tone of the “مانده حساب” cell.
 *  - remaining 0 → settled (success)
 *  - remaining < 50% of the share → warning
 *  - remaining ≥ 50% of the share → danger (most of the money still unpaid)
 */
function remainingTone(totalShare: string, totalRemaining: string): string {
  const remaining = BigInt(totalRemaining);
  if (remaining <= 0n) return "text-success";
  const share = BigInt(totalShare);
  if (remaining * 2n < share) return "text-warning";
  return "text-danger";
}

type EditTarget = Pick<UserDTO, "id" | "name" | "email" | "role">;

export function EmployeesListTable({ employees, basePath }: EmployeesListTableProps) {
  // Server-supplied rows hydrate the cache; the hook then refreshes in place.
  const { data, isLoading } = useEmployeeBalances(
    employees.length > 0 ? { employees } : undefined,
  );
  const rows = useMemo(() => data?.employees ?? [], [data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const { mutateAsync: deleteAsync, isPending: deletingPending } = useDeleteUser();

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAsync(deleting.id);
      setDeleting(null);
    } catch {
      // Persian toast already shown by the hook; dialog stays open on error.
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">کارمندان</h2>
          <p className="text-sm text-foreground-muted mt-1">
            {isLoading && rows.length === 0 ? "در حال بارگذاری…" : `${rows.length} کارمند`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          کارمند جدید
        </Button>
      </div>

      {/* Desktop: table. The whole row opens the employee file; the name cell
          carries the real link so keyboards/screen readers have an anchor. */}
      <div className="hidden md:block">
        <div className="rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-right font-medium text-foreground-muted whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-8 text-center text-foreground-subtle"
                  >
                    {isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
                  </td>
                </tr>
              ) : (
                rows.map((e) => {
                  const href = `${basePath}/${e.userId}`;
                  return (
                    <tr
                      key={e.userId}
                      onClick={() => {
                        window.location.href = href;
                      }}
                      className="border-b border-border last:border-0 hover:bg-surface-2/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <a
                          href={href}
                          className="font-medium text-foreground hover:text-brand-600 transition-colors"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {e.name}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span dir="ltr" className="text-foreground-muted text-sm text-right break-all">
                          {e.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {e.projects.length}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatToman(e.totalShare)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatToman(e.totalPaid)}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap tabular-nums font-medium ${remainingTone(
                          e.totalShare,
                          e.totalRemaining,
                        )}`}
                      >
                        {formatToman(e.totalRemaining)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditing({
                                id: e.userId,
                                name: e.name,
                                email: e.email,
                                role: e.role,
                              });
                            }}
                            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            <Pencil className="w-4 h-4" />
                            ویرایش
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleting({ id: e.userId, name: e.name });
                            }}
                            className="inline-flex items-center gap-1 text-danger hover:brightness-110 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </button>
                          <a
                            href={href}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1 text-foreground-muted hover:text-foreground text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            <FolderOpen className="w-4 h-4" />
                            پرونده
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-foreground-subtle text-sm">
            {isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
          </div>
        ) : (
          rows.map((e) => {
            const href = `${basePath}/${e.userId}`;
            return (
              <div
                key={e.userId}
                className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2"
              >
                <a
                  href={href}
                  className="text-sm font-medium text-foreground hover:text-brand-600 transition-colors"
                >
                  {e.name}
                </a>
                <span dir="ltr" className="text-xs text-foreground-muted text-right">
                  {e.email}
                </span>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-foreground-muted tabular-nums">
                    {e.projects.length} پروژه
                  </span>
                  <span className="text-xs tabular-nums">{formatToman(e.totalShare)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-foreground-muted">مانده حساب</span>
                  <span
                    className={`text-xs tabular-nums font-medium ${remainingTone(
                      e.totalShare,
                      e.totalRemaining,
                    )}`}
                  >
                    {formatToman(e.totalRemaining)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({ id: e.userId, name: e.name, email: e.email, role: e.role })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium h-9 rounded-md border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="w-4 h-4" />
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting({ id: e.userId, name: e.name })}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-danger text-sm font-medium h-9 rounded-md border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          /* Rows refetch via users/employees query invalidation. */
        }}
      />
      <UserFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        initialData={editing ?? undefined}
        onSuccess={() => {
          /* Rows refetch via users/employees query invalidation. */
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        title="حذف کارمند"
        description={
          deleting ? (
            <>
              آیا از حذف کارمند «<span className="font-medium">{deleting.name}</span>» مطمئن هستید؟
              این عمل قابل بازگشت نیست.
            </>
          ) : (
            ""
          )
        }
        confirmText="حذف"
        cancelText="انصراف"
        destructive
        loading={deletingPending}
      />
    </div>
  );
}
