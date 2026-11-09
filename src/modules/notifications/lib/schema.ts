/**
 * Notifications module — schemas & DTOs.
 * Phase 3 wrote rows (from payments/installments/employee-payment events) and
 * exposed a read endpoint. Phase 5 adds the read/unread lifecycle: mark-one,
 * mark-all, unread count, plus the employee-facing UI.
 */

import { z } from "zod";

/** Mirrors the Prisma NotificationType enum. */
export type NotificationType = "EMPLOYER_PAYMENT" | "SYSTEM";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  /** Owner of the notification — included so clients can assert scoping. */
  userId: string;
  /** Project the notification is about, when applicable. */
  projectId: string | null;
  message: string;
  /** ISO timestamp or null while unread. */
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListDTO {
  notifications: NotificationDTO[];
  /** Number of rows matching the same filter (not the lifetime total). */
  total: number;
}

export interface UnreadCountDTO {
  count: number;
}

/** Query params for listing the current user's notifications. */
export interface NotificationListParams {
  unreadOnly?: boolean;
  limit?: number;
}

/** Path params for marking a single notification as read. */
export const markReadSchema = z.object({
  id: z.string().min(1, "شناسه اعلان الزامی است."),
});

/** Body for marking every unread notification of the current user as read. */
export const markAllReadSchema = z.object({}).strict();

/**
 * Extra context for a notification. Reserved for later phases — the current
 * Prisma model has no metadata column, so nothing is persisted yet; the
 * `projectId` column doubles as the deep-link target.
 */
export interface NotificationMetadata {
  [key: string]: unknown;
}
