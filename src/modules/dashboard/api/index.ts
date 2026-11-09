/**
 * Dashboard API client (Phase 6 §1/§2) — thin typed wrappers around the two
 * read-only dashboard routes. Money arrives as RIAL strings; the components
 * convert to Toman at render time.
 */

import { api } from "@/core/lib/api-client";
import type { AdminDashboardDTO, EmployeeDashboardDTO } from "../lib/schema";

/** GET /api/dashboard/admin — admin-only aggregates (403 for employees). */
export function fetchAdminDashboard(): Promise<AdminDashboardDTO> {
  return api.get<AdminDashboardDTO>("/api/dashboard/admin");
}

/** GET /api/dashboard/me — my received-this-month + my upcoming installments. */
export function fetchMyDashboard(): Promise<EmployeeDashboardDTO> {
  return api.get<EmployeeDashboardDTO>("/api/dashboard/me");
}
