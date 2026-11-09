"use client";

import { api } from "@/core/lib/api-client";
import type {
  NotificationListDTO,
  NotificationListParams,
  UnreadCountDTO,
} from "../lib/schema";

function toSearchParams(params?: NotificationListParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  if (params.unreadOnly) sp.set("unreadOnly", "true");
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Notifications of the current user, optionally unread-only and/or capped. */
export async function fetchMyNotifications(
  params?: NotificationListParams,
): Promise<NotificationListDTO> {
  return api.get(`/api/notifications${toSearchParams(params)}`);
}

/** Count of the current user's unread notifications. */
export async function fetchUnreadCount(): Promise<UnreadCountDTO> {
  return api.get("/api/notifications/unread-count");
}

/** Mark one notification as read (the service enforces ownership → 404). */
export async function markRead(id: string): Promise<{ id: string }> {
  return api.post(`/api/notifications/${id}/read`);
}

/** Mark every unread notification of the current user as read. */
export async function markAllRead(): Promise<{ count: number }> {
  return api.patch("/api/notifications");
}
