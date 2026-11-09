"use client";

import Link from "next/link";
import { FolderOpen, Pencil, Trash2 } from "lucide-react";
import { Table } from "@/core/components/Table";
import { ProgressBar } from "@/core/components/ProgressBar";
import { formatJalali, formatToman } from "@/core/lib/format";
import type { ProjectDTO } from "../lib/schema";

interface ProjectTableProps {
  projects: ProjectDTO[];
  /** Link base for the "open project" action, e.g. "/admin/projects". */
  basePath: string;
  /** Whether the viewer may edit/delete (admin). */
  canManage: boolean;
  onEdit?: (project: ProjectDTO) => void;
  onDelete?: (project: ProjectDTO) => void;
  emptyText?: string;
}

const COLUMNS = [
  "عنوان",
  "کارفرما",
  "مبلغ قرارداد",
  "تاریخ شروع",
  "تاریخ پایان",
  "پیشرفت",
  "پرونده",
  "عملیات",
];

export function ProjectTable({
  projects,
  basePath,
  canManage,
  onEdit,
  onDelete,
  emptyText = "پروژه‌ای یافت نشد.",
}: ProjectTableProps) {
  return (
    <>
      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table
          columns={COLUMNS}
          rows={projects.map((p) => [
            <span key="title" className="font-medium text-foreground">{p.title}</span>,
            <span key="client" className="text-foreground-muted">{p.clientCompany || "—"}</span>,
            <span key="price" className="tabular-nums whitespace-nowrap">{formatToman(p.contractPrice)}</span>,
            <span key="start" className="tabular-nums">{formatJalali(p.startDate)}</span>,
            <span key="end" className="tabular-nums">{formatJalali(p.endDate)}</span>,
            <div key="progress" className="w-28">
              <ProgressBar value={BigInt(p.paidAmount)} total={BigInt(p.contractPrice)} />
            </div>,
            <Link
              key="link"
              href={`${basePath}/${p.id}`}
              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              پرونده پروژه
            </Link>,
            canManage ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit?.(p)}
                  className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  aria-label={`ویرایش ${p.title}`}
                  title="ویرایش"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(p)}
                  className="p-1.5 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-bg transition-colors"
                  aria-label={`حذف ${p.title}`}
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-foreground-subtle text-xs">—</span>
            ),
          ])}
          emptyText={emptyText}
        />
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-foreground-subtle text-sm">
            {emptyText}
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{p.title}</h3>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {p.clientCompany || "—"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit?.(p)}
                      className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                      aria-label="ویرایش"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(p)}
                      className="p-1.5 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-bg transition-colors"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm tabular-nums">{formatToman(p.contractPrice)}</p>

              <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted">
                <span>شروع: {formatJalali(p.startDate)}</span>
                <span>پایان: {formatJalali(p.endDate)}</span>
              </div>

              <ProgressBar value={BigInt(p.paidAmount)} total={BigInt(p.contractPrice)} />

              <Link
                href={`${basePath}/${p.id}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border-strong text-foreground hover:bg-surface-2 transition-colors h-9 px-3 text-xs font-medium"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                پرونده پروژه
              </Link>
            </div>
          ))
        )}
      </div>
    </>
  );
}
