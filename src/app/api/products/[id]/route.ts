import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ProductCategory, UnitType } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/products/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          loggedBy: { select: { id: true, name: true } },
          performedBy: { select: { id: true, name: true } },
          reversedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

// PUT /api/products/:id
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let updated;
  try {
    updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category as ProductCategory,
        brand: body.brand || null,
        sku: body.sku || null,
        unitType: body.unitType as UnitType,
        costPerUnit: Number(body.costPerUnit),
        sellingPrice: body.sellingPrice ? Number(body.sellingPrice) : null,
        reorderThreshold: Number(body.reorderThreshold ?? 5),
        defaultUsageAmount: body.defaultUsageAmount ? Number(body.defaultUsageAmount) : null,
        quantityPerPackage: body.quantityPerPackage ? Math.max(1, parseInt(body.quantityPerPackage) || 1) : 1,
        containedUnitType: body.containedUnitType ? (body.containedUnitType as UnitType) : null,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
        notes: body.notes || null,
        isActive: body.isActive ?? true,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error";
    if (msg.includes("Unique constraint") || msg.includes("unique constraint")) {
      return NextResponse.json({ error: "SKU already in use by another product." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await writeAuditLog({
    entityType: "Product",
    entityId: id,
    action: "UPDATE",
    changesBefore: before as unknown as object,
    changesAfter: updated as unknown as object,
    performedById: session.user.id,
  });

  return NextResponse.json(updated);
}

// PATCH /api/products/:id — lightweight update (defaultUsageAmount, any authenticated user)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { defaultUsageAmount } = await req.json();

  const updated = await prisma.product.update({
    where: { id },
    data: { defaultUsageAmount: defaultUsageAmount != null ? Number(defaultUsageAmount) : null },
  });

  return NextResponse.json(updated);
}

// DELETE /api/products/:id (soft delete)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  await writeAuditLog({
    entityType: "Product",
    entityId: id,
    action: "DEACTIVATE",
    changesAfter: { isActive: false } as object,
    performedById: session.user.id,
  });

  return NextResponse.json(product);
}
