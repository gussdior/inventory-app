import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { TransactionType, WasteReason } from "@prisma/client";

// GET /api/transactions
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const performedById = searchParams.get("performedById");
  const type = searchParams.get("type") as TransactionType | null;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  // Providers can only see their own transactions
  const isProviderOnly =
    session.user.role === "PROVIDER";

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(performedById ? { performedById } : {}),
      ...(isProviderOnly ? { performedById: session.user.id } : {}),
      ...(type ? { transactionType: type } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true } },
      loggedBy: { select: { id: true, name: true, role: true } },
      performedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    productId,
    transactionType,
    quantity,
    performedById,
    clientName,
    appointmentRef,
    wasteReason,
    reason,
    notes,
  } = body;

  if (!productId || !transactionType || quantity == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Only managers/admins can do ADJUSTMENT
  if (
    transactionType === "ADJUSTMENT" &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "MANAGER"
  ) {
    return NextResponse.json({ error: "Forbidden — Managers only" }, { status: 403 });
  }

  // Only managers/admins/front-desk can RECEIVE
  if (
    transactionType === "RECEIVE" &&
    session.user.role === "PROVIDER"
  ) {
    return NextResponse.json({ error: "Forbidden — Not authorized to receive stock" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const qty = Number(quantity);
  const currentQty = Number(product.currentQuantity);
  const resolvedPerformedById = performedById ?? session.user.id;

  // Calculate new quantity based on type
  let newQty: number;
  if (transactionType === "RECEIVE" || transactionType === "RETURN") {
    newQty = currentQty + qty;
  } else if (transactionType === "ADJUSTMENT") {
    // For adjustment, quantity is the new absolute quantity
    newQty = qty;
  } else {
    // USE, SELL, WASTE — subtract
    newQty = currentQty - qty;
  }

  // Block negative stock for non-managers
  if (
    newQty < 0 &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "MANAGER"
  ) {
    return NextResponse.json(
      { error: "Insufficient stock. Contact a manager to override." },
      { status: 422 }
    );
  }

  // Run product update + transaction creation atomically
  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        productId,
        transactionType: transactionType as TransactionType,
        quantity: transactionType === "ADJUSTMENT" ? Math.abs(newQty - currentQty) : qty,
        unitType: product.unitType,
        quantityBefore: currentQty,
        quantityAfter: newQty,
        loggedById: session.user.id,
        performedById: resolvedPerformedById,
        clientName: clientName || null,
        appointmentRef: appointmentRef || null,
        wasteReason: (wasteReason as WasteReason) || null,
        reason: reason || null,
        notes: notes || null,
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { currentQuantity: newQty },
    }),
  ]);

  // Fetch the esthetician's name for the audit "Requested By" column
  let requestedByName: string | null = null;
  if (resolvedPerformedById !== session.user.id) {
    const performer = await prisma.user.findUnique({
      where: { id: resolvedPerformedById },
      select: { name: true },
    });
    requestedByName = performer?.name ?? null;
  }

  await writeAuditLog({
    entityType: "Transaction",
    entityId: transaction.id,
    action: transactionType,
    changesBefore: { quantity: currentQty } as object,
    changesAfter: {
      quantity: newQty,
      ...(requestedByName ? { requestedBy: requestedByName } : {}),
    } as object,
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
  });

  return NextResponse.json(transaction, { status: 201 });
}
