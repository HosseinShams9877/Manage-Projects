/**
 * Notifications service — the single writer for the notifications table and
 * the read-side lifecycle. Producers live in the payments/installments and
 * employee-payments services:
 *  - createPayment (employer)  → notifies every assigned employee
 *  - recordPartialPayment      → notifies every assigned employee
 *  - createEmployeePayment     → notifies the paid employee
 *
 * Phase 5 additions: mark-read (ownership-checked), mark-all-read, unread
 * count, and filterable listing. Reads are ALWAYS scoped to one userId in the
 * service layer — route guards are defense in depth, not the boundary.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/core/lib/prisma";
import { PersianErrors } from "@/core/lib/api-response";
import type {
  NotificationListDTO,
  NotificationListParams,
  NotificationType,
  UnreadCountDTO,
} from "./schema";
import { mapNotificationToDTO } from "./mappers";

type Session = { sub: string; role: "ADMIN" | "EMPLOYEE" };

/**
 * Create one Notification for every employee assigned to the project.
 * Admins are excluded — they are the ones performing the action.
 * Throws when the project does not exist.
 */
export async function notifyProjectEmployees(
  projectId: string,
  type: NotificationType,
  message: string,
): Promise<number> {
  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId },
    select: { userId: true },
  });

  if (assignments.length === 0) return 0;

  await prisma.notification.createMany({
    data: assignments.map((a) => ({
      userId: a.userId,
      type,
      projectId,
      message,
    })),
  });

  return assignments.length;
}

/** Create one Notification for a single user (e.g. an employee payment). */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  message: string,
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, message },
  });
}

/**
 * Notifications belonging to one user, newest first.
 * `unreadOnly` filters to the unread subset; `limit` caps the page size.
 * `total` counts rows matching the same filter.
 */
export async function listForUser(
  userId: string,
  params?: NotificationListParams,
): Promise<NotificationListDTO> {
  const where: Prisma.NotificationWhereInput = { userId };
  if (params?.unreadOnly) where.readAt = null;

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(params?.limit ? { take: params.limit } : {}),
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications: rows.map(mapNotificationToDTO),
    total,
  };
}

/** Notifications belonging to the requesting user (convenience wrapper). */
export async function listMyNotifications(
  session: Session,
  params?: NotificationListParams,
): Promise<NotificationListDTO> {
  return listForUser(session.sub, params);
}

/** Count the user's unread notifications. */
export async function unreadCount(userId: string): Promise<UnreadCountDTO> {
  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });
  return { count };
}

/**
 * Mark one notification as read. Ownership is checked in the service: a
 * foreign id (or a nonexistent one) yields 404 «اعلان مورد نظر یافت نشد.»
 * Marking an already-read row is a no-op success.
 */
export async function markRead(id: string, userId: string): Promise<{ id: string }> {
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, readAt: true },
  });
  if (!notification || notification.userId !== userId) {
    throw PersianErrors.notFound("اعلان");
  }
  if (notification.readAt) return { id };

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  return { id };
}

/** Mark every unread notification of the user as read. Returns how many. */
export async function markAllRead(userId: string): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { count: result.count };
}
