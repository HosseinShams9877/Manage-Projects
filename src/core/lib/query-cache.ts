"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/core/constants";

/**
 * Invalidate every cache a ledger write can touch. Per the Phase 3 rules, a
 * payment or installment mutation must refresh: the project list (progress %),
 * the project detail, the employer payments of that project, the installment
 * plan of that project, the current user's notifications, and the unread
 * badge (Phase 5).
 */
export async function invalidateProjectLedger(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.detail(projectId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments.byProject(projectId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installments.byProject(projectId) }),
    invalidateNotifications(queryClient),
  ]);
}

/**
 * Invalidate every cache an employee-payment write can touch (Phase 4): the
 * employee payments list, the paid employee's balance (detail + the admin
 * balances overview), and the affected employee's notifications + unread
 * badge (Phase 5).
 */
export async function invalidateEmployeeLedger(
  queryClient: QueryClient,
  userId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employeePayments.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees.balances }),
    ...(userId
      ? [queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees.detail(userId) })]
      : []),
    invalidateNotifications(queryClient),
  ]);
}

/**
 * Invalidate the current user's notification caches (list + unread badge).
 * Notification rows are written from several services, so every one of them
 * funnels its invalidation through here.
 */
export async function invalidateNotifications(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["notifications", "mine"] }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount }),
  ]);
}
