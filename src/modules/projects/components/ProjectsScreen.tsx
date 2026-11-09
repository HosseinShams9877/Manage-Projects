"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { useProjects, useAssignableEmployees } from "../hooks";
import { ProjectTable } from "./ProjectTable";
import { ProjectForm } from "./ProjectForm";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import type { AssignableEmployee } from "./AssignmentEditor";
import type { ProjectDTO } from "../lib/schema";

interface ProjectsScreenProps {
  /** Link base for the detail page, e.g. "/admin/projects". */
  basePath: string;
  /** Read-only mode hides the create button and the row actions. */
  canManage: boolean;
}

type SortKey = "newest" | "oldest" | "priceDesc" | "priceAsc";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "جدیدترین",
  oldest: "قدیمی‌ترین",
  priceDesc: "بیشترین مبلغ",
  priceAsc: "کمترین مبلغ",
};

export function ProjectsScreen({ basePath, canManage }: ProjectsScreenProps) {
  const { data, isLoading } = useProjects();
  const { data: employeesData } = useAssignableEmployees(canManage);
  const employees = (employeesData?.employees ?? []) satisfies AssignableEmployee[];
  const all = useMemo(() => data?.projects ?? [], [data]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDTO | null>(null);
  const [deleting, setDeleting] = useState<ProjectDTO | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? all.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.clientCompany.toLowerCase().includes(q),
        )
      : all;

    const byPrice = (a: ProjectDTO, b: ProjectDTO) =>
      BigInt(b.contractPrice) - BigInt(a.contractPrice) > 0n ? 1 : -1;

    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "priceDesc":
        sorted.sort(byPrice);
        break;
      case "priceAsc":
        sorted.sort((a, b) => -byPrice(a, b));
        break;
    }
    return sorted;
  }, [all, search, sort]);

  const handleEdit = (project: ProjectDTO) => {
    setEditing(project);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">پروژه‌ها</h2>
          <p className="text-sm text-foreground-muted mt-1">
            {isLoading ? "در حال بارگذاری…" : `${filtered.length} پروژه`}
          </p>
        </div>
        {canManage && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            پروژه جدید
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            startIcon={<Search className="w-4 h-4" />}
            placeholder="جستجو در عنوان یا نام کارفرما…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="مرتب‌سازی"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:w-44"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <ProjectTable
        projects={filtered}
        basePath={basePath}
        canManage={canManage}
        onEdit={canManage ? handleEdit : undefined}
        onDelete={canManage ? (p) => setDeleting(p) : undefined}
        emptyText={isLoading ? "در حال بارگذاری…" : "پروژه‌ای یافت نشد."}
      />

      {canManage && (
        <>
          <ProjectForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            employees={employees}
            project={editing}
          />
          <DeleteProjectDialog
            open={deleting !== null}
            onClose={() => setDeleting(null)}
            project={deleting}
          />
        </>
      )}
    </div>
  );
}
