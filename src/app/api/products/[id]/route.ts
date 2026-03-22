import { NextRequest, NextResponse } from "next/server";
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
        include: { loggedBy: true, performedBy: true },
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

  const updated = await prisma.product.update({
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
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      notes: body.notes || null,
      isActive: body.isActive ?? true,
    },
  });

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
