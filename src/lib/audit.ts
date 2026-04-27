import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";

interface AuditLogParams {
  userId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Prisma.InputJsonValue;
  request?: Request;
}

export async function createAuditLog({
  userId,
  action,
  targetType,
  targetId,
  details,
  request,
}: AuditLogParams): Promise<void> {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  let requestMethod: string | null = null;
  let requestPath: string | null = null;

  if (request) {
    ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    userAgent = request.headers.get("user-agent") || null;
    requestMethod = request.method || null;
    try {
      const url = new URL(request.url);
      requestPath = url.pathname;
    } catch {
      // If URL parsing fails, leave as null
    }
  } else {
    try {
      const headersList = await headers();
      ipAddress =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        null;
      userAgent = headersList.get("user-agent") || null;
    } catch {
      // headers() may not be available outside request context
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        targetType,
        targetId: targetId || null,
        details: details || undefined,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
