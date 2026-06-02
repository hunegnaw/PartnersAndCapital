import { NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/upload";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { documentUploadedEmail, getEmailLogoUrl } from "@/lib/email-templates";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const year = searchParams.get("year") || "";
    const userId = searchParams.get("userId") || "";
    const investmentId = searchParams.get("investmentId") || "";
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.DocumentWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      ...(type ? { type } : {}),
      ...(year ? { year: parseInt(year) } : {}),
      ...(userId ? { userId } : {}),
      ...(investmentId ? { investmentId } : {}),
    };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          investment: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({ documents, total, page, pageSize });
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const type = (formData.get("type") as string) || "OTHER";
    const year = formData.get("year") as string | null;
    const description = formData.get("description") as string | null;
    const userId = formData.get("userId") as string | null;
    const investmentId = formData.get("investmentId") as string | null;
    const advisorVisible = formData.get("advisorVisible") === "true";

    if (!file || !name) {
      return NextResponse.json(
        { error: "File and name are required" },
        { status: 400 }
      );
    }

    // Upload and encrypt file
    const uploadResult = await saveUploadedFile(file, "documents");

    const document = await prisma.document.create({
      data: {
        name,
        fileName: uploadResult.fileName,
        filePath: uploadResult.filePath,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        type,
        year: year ? parseInt(year) : null,
        description: description || null,
        userId: userId || null,
        investmentId: investmentId || null,
        advisorVisible,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        investment: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPLOAD_DOCUMENT",
      targetType: "Document",
      targetId: document.id,
      details: {
        name,
        type,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
      },
      request,
    });

    // Notify document owner
    if (document.userId && document.user) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await createNotification({
        userId: document.userId,
        type: "DOCUMENT_UPLOADED",
        title: "New document uploaded",
        message: `New document: ${name}`,
        link: "/documents",
      });
      const logoUrl = await getEmailLogoUrl();
      await sendEmail({
        to: document.user.email,
        subject: "New document available in your portal",
        html: documentUploadedEmail({
          userName: document.user.name || "Investor",
          documentTitle: name,
          portalUrl: `${baseUrl}/documents`,
          logoUrl,
        }),
      });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes("not allowed") ? 400 : 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireSuperAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const documents = await prisma.document.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, fileName: true },
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "No documents found" },
        { status: 404 }
      );
    }

    await prisma.document.updateMany({
      where: { id: { in: documents.map((d) => d.id) } },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "BULK_DELETE_DOCUMENTS",
      targetType: "Document",
      targetId: documents.map((d) => d.id).join(","),
      details: { count: documents.length, ids: documents.map((d) => d.id) },
      request,
    });

    return NextResponse.json({ deleted: documents.length });
  } catch (error) {
    console.error("Error deleting documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
