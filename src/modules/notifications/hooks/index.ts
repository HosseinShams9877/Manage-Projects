"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/core/constants";
import { persianToast } from "@/core/components/Toast";
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markAllRead as markAllReadApi,
  markRead as markReadApi,
} from "../api";
import type {
  NotificationListDTO,
  NotificationListParams,
  UnreadCountDTO,
} from "../lib/schema";

/** Notifications of the current user (newest first). */
export function useNotifications(params?: NotificationListParams) {
  return useQuery({
    queryKey: QUERY_KEYS.notifications.mine(params),
    queryFn: () => fetchMyNotifications(params),
  });
}

/** Unread count; polled every 60s so newly written rows surface on their own. */
export function useUnreadCount() {
  return useQuery({
    queryKey: QUERY_KEYS.notifications.unreadCount,
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Mark one notification as read, optimistically: the row's `readAt` is set and
 * the unread count decremented before the request lands. On error the cached
 * state is rolled back and the Persian error toast surfaces.
 */
type MarkReadContext = {
  previous: [readonly unknown[], NotificationListDTO | undefined][];
};

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, string, MarkReadContext>({
    mutationFn: (id) => markReadApi(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previous = queryClient.getQueriesData<NotificationListDTO>({
        queryKey: ["notifications", "mine"],
      });

      const now = new Date().toISOString();
      queryClient.setQueriesData<NotificationListDTO>(
        { queryKey: ["notifications", "mine"] },
        (old) =>
          old
            ? {
                ...old,
                notifications: old.notifications.map((n) =>
                  n.id === id && !n.readAt ? { ...n, readAt: now } : n,
                ),
              }
            : old,
      );
      queryClient.setQueryData<UnreadCountDTO>(QUERY_KEYS.notifications.unreadCount, (old) =>
        old ? { count: Math.max(0, old.count - 1) } : old,
      );

      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
      persianToast.error(error.message || "به‌روزرسانی اعلان با خطا مواجه شد.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "mine"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
    },
  });
}

/** Mark every unread notification as read, optimistically. */
type MarkAllReadContext = {
  previous: [readonly unknown[], NotificationListDTO | undefined][];
  previousCount: UnreadCountDTO | undefined;
};

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation<{ count: number }, Error, void, MarkAllReadContext>({
    mutationFn: () => markAllReadApi(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previous = queryClient.getQueriesData<NotificationListDTO>({
        queryKey: ["notifications", "mine"],
      });
      const previousCount = queryClient.getQueryData<UnreadCountDTO>(
        QUERY_KEYS.notifications.unreadCount,
      );

      const now = new Date().toISOString();
      queryClient.setQueriesData<NotificationListDTO>(
        { queryKey: ["notifications", "mine"] },
        (old) =>
          old
            ? {
                ...old,
                notifications: old.notifications.map((n) =>
                  n.readAt ? n : { ...n, readAt: now },
                ),
              }
            : old,
      );
      queryClient.setQueryData<UnreadCountDTO>(QUERY_KEYS.notifications.unreadCount, {
        count: 0,
      });

      return { previous, previousCount };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousCount) {
        queryClient.setQueryData(QUERY_KEYS.notifications.unreadCount, context.previousCount);
      }
      persianToast.error(error.message || "به‌روزرسانی اعلان‌ها با خطا مواجه شد.");
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        persianToast.success(`${data.count} اعلان خوانده‌شده علامت زده شد.`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "mine"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
    },
  });
}
