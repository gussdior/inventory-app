import { prisma } from "@/lib/prisma";

interface AuditParams {
  entityType: string;
  entityId: string;
  action: string;
  changesBefore?: object | null;
  changesAfter?: object | null;
  performedById?: string | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changesBefore: params.changesBefore ?? undefined,
        changesAfter: params.changesAfter ?? undefined,
        performedById: params.performedById ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
      },
    });
  } catch (error) {
    // Audit log failure should never crash the main operation
    console.error("Audit log write failed:", error);
  }
}
