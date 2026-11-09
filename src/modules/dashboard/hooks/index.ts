/**
 * Dashboard React Query hooks (Phase 6 §1/§2).
 * staleTime 30s: the summary is an aggregate over several tables, so a short
 * cache window keeps the landing page snappy without hammering the DB.
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/core/constants";
import { fetchAdminDashboard, fetchMyDashboard } from "../api";

/** Admin dashboard aggregates — admins only; errors surface via the query. */
export function useAdminDashboard() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.admin,
    queryFn: fetchAdminDashboard,
    staleTime: 30_000,
  });
}

/** My employee dashboard additions (received this month, upcoming installments). */
export function useMyDashboard(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.me,
    queryFn: fetchMyDashboard,
    staleTime: 30_000,
    enabled,
  });
}
