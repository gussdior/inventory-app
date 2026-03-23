import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ProductCategory, UnitType } from "@prisma/client";

// GET /api/products
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as ProductCategory | null;
  const search = searchParams.get("search") ?? "";
  const lowStock = searchParams.get("lowStock") === "true";
  const includeInactive = searchParams.get("includeInactive") === "true";

  const products = await prisma.product.findMany({
    where: {
      isActive: includeInactive ? undefined : true,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(lowStock
        ? {
            currentQuantity: { lte: prisma.product.fields.reorderThreshold },
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  // Filter low stock in JS since Prisma doesn't support column comparison directly
  const filtered = lowStock
    ? products.filter((p) => Number(p.currentQuantity) <= Number(p.reorderThreshold))
    : products;

  return NextResponse.json(filtered);
}

// POST /api/products
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name, category, brand, sku, unitType,
    costPerUnit, sellingPrice, reorderThreshold,
    currentQuantity, expirationDate, notes,
    quantityPerPackage, containedUnitType, defaultUsageAmount,
  } = body;

  if (!name || !category || !unitType || costPerUnit == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      category: category as ProductCategory,
      brand: brand || null,
      sku: sku || null,
      unitType: unitType as UnitType,
      costPerUnit: Number(costPerUnit),
      sellingPrice: sellingPrice ? Number(sellingPrice) : null,
      reorderThreshold: Number(reorderThreshold ?? 5),
      currentQuantity: Number(currentQuantity ?? 0),
      quantityPerPackage: Math.max(1, parseInt(quantityPerPackage ?? "1") || 1),
      containedUnitType: containedUnitType ? (containedUnitType as UnitType) : null,
      defaultUsageAmount: defaultUsageAmount ? Number(defaultUsageAmount) : null,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      notes: notes || null,
    },
  });

  await writeAuditLog({
    entityType: "Product",
    entityId: product.id,
    action: "CREATE",
    changesAfter: product as unknown as object,
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
  });

  return NextResponse.json(product, { status: 201 });
}
