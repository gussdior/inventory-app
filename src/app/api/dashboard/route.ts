import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalProducts,
    lowStockProducts,
    expiringSoon,
    recentTransactions,
    inventoryValue,
    usageByProvider,
    wasteTotal,
    topUsed,
  ] = await Promise.all([
    // Total active products
    prisma.product.count({ where: { isActive: true } }),

    // Low stock (currentQuantity <= reorderThreshold)
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, currentQuantity: true, reorderThreshold: true, unitType: true },
    }).then((products) => products.filter((p) => Number(p.currentQuantity) <= Number(p.reorderThreshold))),

    // Expiring in 30 days
    prisma.product.findMany({
      where: {
        isActive: true,
        expirationDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, name: true, category: true, expirationDate: true, currentQuantity: true, unitType: true },
      orderBy: { expirationDate: "asc" },
    }),

    // Recent 15 transactions
    prisma.transaction.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, category: true, unitType: true } },
        performedBy: { select: { name: true } },
        loggedBy: { select: { name: true } },
      },
    }),

    // Total inventory value: sum(currentQuantity * costPerUnit) for all active products
    prisma.product.findMany({
      where: { isActive: true },
      select: { costPerUnit: true, currentQuantity: true },
    }).then((products) =>
      products.reduce((sum, p) => {
        const cost = parseFloat(String(p.costPerUnit ?? 0)) || 0;
        const qty = parseFloat(String(p.currentQuantity ?? 0)) || 0;
        return sum + cost * qty;
      }, 0)
    ),

    // Usage by provider (last 30 days) — batch user lookup, no N+1
    prisma.transaction.groupBy({
      by: ["performedById"],
      where: {
        transactionType: "USE",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _count: { id: true },
    }).then(async (groups) => {
      if (groups.length === 0) return [];
      const users = await prisma.user.findMany({
        where: { id: { in: groups.map((g) => g.performedById) } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.name]));
      return groups
        .map((g) => ({ name: userMap.get(g.performedById) ?? "Unknown", count: g._count.id }))
        .sort((a, b) => b.count - a.count);
    }),

    // Waste total (last 30 days)
    prisma.transaction.findMany({
      where: {
        transactionType: "WASTE",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: { product: { select: { costPerUnit: true } } },
    }).then((txns) =>
      txns.reduce((sum, t) => sum + Number(t.quantity) * Number(t.product.costPerUnit), 0)
    ),

    // Top 5 most used products (last 30 days) — batch product lookup, no N+1
    prisma.transaction.groupBy({
      by: ["productId"],
      where: {
        transactionType: { in: ["USE", "SELL"] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }).then(async (groups) => {
      if (groups.length === 0) return [];
      const products = await prisma.product.findMany({
        where: { id: { in: groups.map((g) => g.productId) } },
        select: { id: true, name: true, category: true, unitType: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      return groups.map((g) => {
        const p = productMap.get(g.productId);
        return {
          productId: g.productId,
          name: p?.name ?? "Unknown",
          category: p?.category ?? "OTHER",
          unitType: p?.unitType ?? "UNIT",
          totalUsed: Number(g._sum.quantity ?? 0),
        };
      });
    }),
  ]);

  return NextResponse.json({
    totalProducts,
    lowStockProducts,
    expiringSoon,
    recentTransactions,
    inventoryValue,
    usageByProvider,
    wasteTotal,
    topUsed,
  });
}
