import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
      })),
    });
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
  }
}
