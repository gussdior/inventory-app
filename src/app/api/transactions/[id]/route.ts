import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/transactions/:id — reverse a transaction (mark as reversed, restore stock)
// Allowed: own transactions within 5 minutes, or ADMIN any time
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { reversalReason } = await req.json();

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { product: { select: { id: true, currentQuantity: true } } },
  });

  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (tx.isReversed) return NextResponse.json({ error: "Transaction already reversed" }, { status: 409 });

  const isAdmin = session.user.role === "ADMIN";
  const isOwn = tx.loggedById === session.user.id;
  const ageMs = Date.now() - new Date(tx.createdAt).getTime();
  const isRecent = ageMs < 5 * 60 * 1000; // 5 minutes

  if (!isAdmin && (!isOwn || !isRecent)) {
    return NextResponse.json(
      { error: "Can only reverse your own transactions within 5 minutes" },
      { status: 403 }
    );
  }

  const currentQty = Number(tx.product.currentQuantity);

  // Reverse the quantity: invert what the original transaction did
  let restoredQty: number;
  if (tx.transactionType === "RECEIVE" || tx.transactionType === "RETURN") {
    restoredQty = currentQty - Number(tx.quantity);
  } else if (tx.transactionType === "ADJUSTMENT") {
    restoredQty = Number(tx.quantityBefore);
  } else {
    // USE, SELL, WASTE — add back
    restoredQty = currentQty + Number(tx.quantity);
  }

  // Atomic: mark as reversed + restore stock
  await prisma.$transaction([
    prisma.transaction.update({
      where: { id },
      data: {
        isReversed: true,
        reversalReason: reversalReason || null,
        reversedById: session.user.id,
        reversedAt: new Date(),
      },
    }),
    prisma.product.update({
      where: { id: tx.productId },
      data: { currentQuantity: restoredQty },
    }),
  ]);

  await writeAuditLog({
    entityType: "Transaction",
    entityId: id,
    action: "UNDO",
    changesBefore: { transactionType: tx.transactionType, quantity: Number(tx.quantity) } as object,
    changesAfter: {
      restoredQuantity: restoredQty,
      reversalReason: reversalReason || null,
    } as object,
    performedById: session.user.id,
  });

  return NextResponse.json({ ok: true, restoredQty });
}
