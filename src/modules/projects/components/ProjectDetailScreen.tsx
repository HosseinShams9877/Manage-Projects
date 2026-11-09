"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2, Plus, CreditCard, Wallet, ExternalLink } from "lucide-react";
import { Card } from "@/core/components/Card";
import { Button } from "@/core/components/Button";
import { Badge } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { ProgressBar } from "@/core/components/ProgressBar";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import { useProject, useAssignableEmployees, useDeleteProject } from "../hooks";
import { usePayments } from "@/modules/payments/hooks";
import { PaymentTable } from "@/modules/payments/components/PaymentTable";
import { PaymentForm } from "@/modules/payments/components/PaymentForm";
import { DeletePaymentDialog } from "@/modules/payments/components/DeletePaymentDialog";
import type { EmployerPaymentDTO } from "@/modules/payments/lib/schema";
import { useInstallments, useDeleteInstallment } from "@/modules/installments/hooks";
import { useEmployeePayments } from "@/modules/employee-payments/hooks";
import { EmployeePaymentTable } from "@/modules/employee-payments/components/EmployeePaymentTable";
import { ProjectEmployeePaymentDialog } from "@/modules/employee-payments/components/ProjectEmployeePaymentDialog";
import { InstallmentTable } from "@/modules/installments/components/InstallmentTable";
import { InstallmentForm } from "@/modules/installments/components/InstallmentForm";
import { BulkInstallmentForm } from "@/modules/installments/components/BulkInstallmentForm";
import { PartialPaymentDialog } from "@/modules/installments/components/PartialPaymentDialog";
import { DueDateEditor } from "@/modules/installments/components/DueDateEditor";
import { DebtSummaryCard } from "@/modules/installments/components/DebtSummaryCard";
import type { InstallmentDTO } from "@/modules/installments/lib/schema";
import {
  formatJalali,
  formatToman,
  toPersianDigits,
} from "@/core/lib/format";
import { ProjectForm } from "./ProjectForm";
import type { ProjectDTO } from "../lib/schema";
import type { AssignableEmployee } from "./AssignmentEditor";

interface ProjectDetailScreenProps {
  id: string;
  basePath: string;
  canManage: boolean;
  /** Employee view only: id of the signed-in user, enables the «پرداخت‌های من» tab. */
  selfUserId?: string;
  /** Server-fetched project, so the whole page renders in the SSR HTML. */
  initialProject?: ProjectDTO;
}

type TabKey = "payments" | "installments" | "assignments" | "myPayments";

/**
 * Self-payments tab (employee view). Mounted only when the employee opens it,
 * so its query runs for that project alone; the service layer locks an
 * EMPLOYEE session to their own rows, so no other user's payment can appear.
 */
function MyPaymentsTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useEmployeePayments({ projectId });

  if (isLoading) {
    return (
      <p className="text-sm text-foreground-subtle py-8 text-center">در حال بارگذاری…</p>
    );
  }

  return (
    <EmployeePaymentTable
      payments={data?.payments ?? []}
      canManage={false}
      emptyText="هنوز پرداختی به شما ثبت نشده است."
    />
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-surface text-brand-700 shadow-sm border border-border"
          : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
      }`}
    >
      {label}
    </button>
  );
}

export function ProjectDetailScreen({
  id,
  basePath,
  canManage,
  selfUserId,
  initialProject,
}: ProjectDetailScreenProps) {
  const router = useRouter();
  const { data: project, isLoading } = useProject(id, initialProject);
  const { data: employeesData } = useAssignableEmployees(canManage);
  const { mutateAsync: deleteAsync, isPending: deleting } = useDeleteProject();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Employee view: an extra tab with only the viewer's own payments.
  const showMyPayments = !canManage && !!selfUserId;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "payments", label: "پرداخت‌های کارفرما" },
    { key: "installments", label: "اقساط و چک‌ها" },
    { key: "assignments", label: canManage ? "سهم کارمندان" : "سهم شما در پروژه" },
    ...(showMyPayments ? [{ key: "myPayments" as const, label: "پرداخت‌های من" }] : []),
  ];

  const [activeTab, setActiveTab] = useState<TabKey>("payments");

  // Payments dialog state
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments(id, canManage || !!project);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<EmployerPaymentDTO | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<EmployerPaymentDTO | null>(null);

  // Installments dialog state
  const { data: installmentsData, isLoading: installmentsLoading } = useInstallments(
    id,
    canManage || !!project,
  );
  const { mutateAsync: deleteInstallmentAsync, isPending: deletingInstallment } =
    useDeleteInstallment(id);
  const [installmentFormOpen, setInstallmentFormOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<InstallmentDTO | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<InstallmentDTO | null>(null);
  const [dueDateInstallment, setDueDateInstallment] = useState<InstallmentDTO | null>(null);
  const [installmentToDelete, setInstallmentToDelete] = useState<InstallmentDTO | null>(null);

  // Employee-payment dialog state («سهم کارمندان» row actions, admin only).
  const [employeePaymentFor, setEmployeePaymentFor] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 rounded-md bg-surface-2 animate-pulse" />
        <Card title="جزئیات پروژه">
          <div className="h-40 flex items-center justify-center text-foreground-subtle text-sm">
            در حال بارگذاری…
          </div>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground-subtle">پروژه مورد نظر یافت نشد.</p>
        <Button variant="secondary" onClick={() => router.push(basePath)} className="self-start">
          بازگشت به فهرست پروژه‌ها
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteAsync(project.id);
      router.push(basePath);
    } catch {
      // Persian toast already shown by the hook.
      setConfirmDelete(false);
    }
  };

  const handleDeleteInstallment = async () => {
    if (!installmentToDelete) return;
    try {
      await deleteInstallmentAsync(installmentToDelete.id);
      setInstallmentToDelete(null);
    } catch {
      // Persian toast already shown by the hook; dialog stays open on error
      // (e.g. installments with partial payments cannot be deleted).
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">{project.title}</h2>
            <Badge tone={project.progressPercent >= 100 ? "success" : "info"}>
              {toPersianDigits(project.progressPercent)}٪ تکمیل
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted mt-1">
            {project.clientCompany || "بدون نام کارفرما"}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
              ویرایش
            </Button>
            <Button variant="destructive" loading={deleting} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          </div>
        )}
      </div>

      <Card title="اطلاعات قرارداد">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs text-foreground-muted">مبلغ قرارداد</dt>
            <dd className="text-sm font-medium text-foreground tabular-nums mt-1">
              {formatToman(project.contractPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">پرداخت‌شده</dt>
            <dd className="text-sm font-medium text-success tabular-nums mt-1">
              {formatToman(project.paidAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">باقی‌مانده</dt>
            <dd className="text-sm font-medium text-warning tabular-nums mt-1">
              {formatToman(project.remainingAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">تاریخ شروع — پایان</dt>
            <dd className="text-sm text-foreground tabular-nums mt-1">
              {formatJalali(project.startDate)} — {formatJalali(project.endDate)}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <ProgressBar
            value={BigInt(project.paidAmount)}
            total={BigInt(project.contractPrice)}
            showLabel={true}
          />
        </div>

        {project.description && (
          <p className="mt-4 text-sm text-foreground-muted leading-6">{project.description}</p>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            label={tab.label}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {/* All four panels stay mounted (CSS-hidden, not unmounted) so the whole
          detail page — including the «سهم کارمندان» actions — renders in the
          initial server-rendered HTML. */}
      <div className={activeTab === "payments" ? "" : "hidden"}>
        <Card
          title="پرداخت‌های کارفرما"
          description="وجه نقد دریافتی از کارفرما"
          actions={
            canManage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingPayment(null);
                  setPaymentFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                افزودن پرداخت
              </Button>
            ) : undefined
          }
        >
          {paymentsLoading ? (
            <p className="text-sm text-foreground-subtle py-8 text-center">در حال بارگذاری…</p>
          ) : (
            <PaymentTable
              payments={paymentsData?.payments ?? []}
              canManage={canManage}
              onEdit={(p) => {
                setEditingPayment(p);
                setPaymentFormOpen(true);
              }}
              onDelete={(p) => setDeletingPayment(p)}
              emptyText="پرداختی ثبت نشده است."
            />
          )}
        </Card>
      </div>

      <div className={activeTab === "installments" ? "" : "hidden"}>
        <div className="flex flex-col gap-4">
          {installmentsData?.debt && <DebtSummaryCard debt={installmentsData.debt} />}

          <Card
            title="اقساط و چک‌ها"
            description="سررسیدهای آینده کارفرما"
            actions={
              canManage ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingInstallment(null);
                      setInstallmentFormOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    قسط جدید
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                    <CreditCard className="w-4 h-4" />
                    اقساط دوره‌ای
                  </Button>
                </div>
              ) : undefined
            }
          >
            {installmentsLoading ? (
              <p className="text-sm text-foreground-subtle py-8 text-center">در حال بارگذاری…</p>
            ) : (
              <InstallmentTable
                installments={installmentsData?.installments ?? []}
                canManage={canManage}
                onPay={(i) => setPayingInstallment(i)}
                onEdit={(i) => {
                  setEditingInstallment(i);
                  setInstallmentFormOpen(true);
                }}
                onEditDueDate={(i) => setDueDateInstallment(i)}
                onDelete={(i) => setInstallmentToDelete(i)}
                emptyText="قسطی ثبت نشده است."
              />
            )}
          </Card>
        </div>
      </div>

      <div
        className={`${activeTab === "myPayments" && showMyPayments ? "" : "hidden"}`}
      >
        <Card
          title="پرداخت‌های من"
          description="پرداخت‌هایی که از سهم شما در این پروژه تسویه شده است."
        >
          <MyPaymentsTab projectId={project.id} />
        </Card>
      </div>

      <div className={activeTab === "assignments" ? "" : "hidden"}>
        <Card
          title={canManage ? "سهم کارمندان" : "سهم شما در پروژه"}
          description={canManage ? "مجموع درصد سهم‌ها باید دقیقاً ۱۰۰ باشد." : undefined}
        >
          <Table
            columns={canManage ? ["کارمند", "ایمیل", "درصد سهم", "مبلغ سهم", "عملیات"] : ["کارمند", "ایمیل", "درصد سهم", "مبلغ سهم"]}
            rows={project.assignments.map((a) => {
              const cells = [
                <span key="name" className="font-medium text-foreground">{a.userName}</span>,
                <span key="email" className="text-foreground-muted" dir="ltr">
                  {a.userEmail}
                </span>,
                <span key="percent" className="tabular-nums">{toPersianDigits(a.sharePercent)}٪</span>,
                <span key="amount" className="tabular-nums whitespace-nowrap">
                  {formatToman(a.shareAmount)}
                </span>,
              ];
              if (canManage) {
                cells.push(
                  <div key="actions" className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEmployeePaymentFor({ userId: a.userId, userName: a.userName })
                      }
                      className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      <Wallet className="w-4 h-4" />
                      ثبت پرداخت
                    </button>
                    <a
                      href={`/admin/employees/${a.userId}`}
                      className="inline-flex items-center gap-1 text-foreground-muted hover:text-foreground text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      <ExternalLink className="w-4 h-4" />
                      پرونده کارمند
                    </a>
                  </div>,
                );
              }
              return cells;
            })}
            emptyText="کارمندی به این پروژه اختصاص نیافته است."
          />
        </Card>
      </div>

      {canManage && (
        <ProjectEmployeePaymentDialog
          open={employeePaymentFor !== null}
          onOpenChange={(open) => {
            if (!open) setEmployeePaymentFor(null);
          }}
          projectId={project.id}
          projectTitle={project.title}
          userId={employeePaymentFor?.userId ?? ""}
          userName={employeePaymentFor?.userName ?? ""}
        />
      )}

      {canManage && (
        <ProjectForm
          open={editing}
          onClose={() => setEditing(false)}
          employees={(employeesData?.employees ?? []) satisfies AssignableEmployee[]}
          project={project}
        />
      )}

      <PaymentForm
        open={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        projectId={project.id}
        payment={editingPayment}
      />

      <DeletePaymentDialog
        open={!!deletingPayment}
        onClose={() => setDeletingPayment(null)}
        projectId={project.id}
        payment={deletingPayment}
      />

      <InstallmentForm
        open={installmentFormOpen}
        onClose={() => setInstallmentFormOpen(false)}
        projectId={project.id}
        installment={editingInstallment}
      />

      <BulkInstallmentForm
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        projectId={project.id}
      />

      <PartialPaymentDialog
        open={!!payingInstallment}
        onClose={() => setPayingInstallment(null)}
        projectId={project.id}
        installment={payingInstallment}
      />

      <DueDateEditor
        open={!!dueDateInstallment}
        onClose={() => setDueDateInstallment(null)}
        projectId={project.id}
        installment={dueDateInstallment}
      />

      <ConfirmDialog
        open={!!installmentToDelete}
        onClose={() => setInstallmentToDelete(null)}
        onConfirm={handleDeleteInstallment}
        title="حذف قسط"
        description={
          installmentToDelete ? (
            <>
              قسط سررسید{" "}
              <span className="tabular-nums font-medium">
                {formatJalali(installmentToDelete.dueDate)}
              </span>{" "}
              به مبلغ{" "}
              <span className="tabular-nums font-medium">
                {formatToman(installmentToDelete.amount)}
              </span>{" "}
              حذف می‌شود. این عمل قابل بازگشت نیست.
            </>
          ) : (
            "این قسط حذف می‌شود."
          )
        }
        confirmText="حذف"
        cancelText="انصراف"
        destructive
        loading={deletingInstallment}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="حذف پروژه"
        description={`آیا از حذف پروژه «${project.title}» مطمئن هستید؟ تمام سهم‌ها، پرداخت‌ها، اقساط و اعلان‌های مرتبط نیز حذف می‌شوند.`}
        confirmText="حذف"
        cancelText="انصراف"
        destructive
        loading={deleting}
      />
    </div>
  );
}
