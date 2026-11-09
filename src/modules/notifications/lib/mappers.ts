import type { Notification } from "@prisma/client";
import type { NotificationDTO, NotificationType } from "./schema";

export function mapNotificationToDTO(n: Notification): NotificationDTO {
  return {
    id: n.id,
    type: n.type as NotificationType,
    userId: n.userId,
    projectId: n.projectId,
    message: n.message,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}
