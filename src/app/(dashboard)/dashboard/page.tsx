"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatCurrency,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  UNIT_LABELS,
  formatRelativeTime,
} from "@/lib/utils";
import type { ProductCategory } from "@prisma/client";

interface DashboardData {
  totalProducts: number;
  lowStockProducts: Array<{
    id: string; name: string; category: string;
    currentQuantity: number; reorderThreshold: number; unitType: string;
  }>;
  expiringSoon: Array<{
    id: string; name: string; category: string;
    expirationDate: string; currentQuantity: number; unitType: string;
  }>;
  recentTransactions: Array<{
    id: string; transactionType: string; quantity: number; createdAt: string;
    product: { name: string; category: string; unitType: string };
    performedBy: { name: string };
    loggedBy: { name: string };
    clientName?: string;
  }>;
  inventoryValue: number;
  usageByProvider: Array<{ name: string; count: number }>;
  wasteTotal: number;
  topUsed: Array<{ productId: string; name: string; category: string; unitType: string; totalUsed: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertTab, setAlertTab] = useState<"low" | "expiring">("low");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
        // Default to whichever tab has items
        if (d.lowStockProducts.length === 0 && d.expiringSoon.length > 0) {
          setAlertTab("expiring");
        }
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return <div className="text-slate-500">Failed to load dashboard.</div>;

  const hasAlerts = data.lowStockProducts.length > 0 || data.expiringSoon.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Inventory overview and alerts</p>
        </div>
        <Link
          href="/log"
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Usage
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          href="/products"
          label="Total Products"
          value={data.totalProducts.toString()}
          icon="📦"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          icon="💰"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          href="/products?lowStock=true"
          label="Low Stock Items"
          value={data.lowStockProducts.length.toString()}
          icon="⚠️"
          color={data.lowStockProducts.length > 0 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}
          alert={data.lowStockProducts.length > 0}
        />
        <StatCard
          href="/transactions?type=WASTE"
          label="Waste This Month"
          value={formatCurrency(data.wasteTotal)}
          icon="🗑️"
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Needs Attention */}
      {hasAlerts && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Needs Attention</h2>
            <div className="flex gap-1">
              <TabBtn
                active={alertTab === "low"}
                onClick={() => setAlertTab("low")}
                count={data.lowStockProducts.length}
                label="Low Stock"
                color="amber"
              />
              <TabBtn
                active={alertTab === "expiring"}
                onClick={() => setAlertTab("expiring")}
                count={data.expiringSoon.length}
                label="Expiring Soon"
                color="red"
              />
            </div>
          </div>
          <div className="p-4 space-y-1">
            {alertTab === "low" && (
              data.lowStockProducts.length === 0 ? (
                <p className="text-slate-400 text-sm py-2 px-1">All products are well stocked.</p>
              ) : (
                data.lowStockProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${CATEGORY_COLORS[p.category as ProductCategory]}`}>
                      {CATEGORY_LABELS[p.category as ProductCategory]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {Number(p.currentQuantity)} {UNIT_LABELS[p.unitType as keyof typeof UNIT_LABELS] ?? p.unitType} remaining · reorder at {Number(p.reorderThreshold)}
                      </p>
                    </div>
                    <Link
                      href={`/log?productId=${p.id}`}
                      className="shrink-0 text-xs text-violet-600 hover:text-violet-700 font-medium px-2 py-1 rounded hover:bg-violet-50 transition-colors"
                    >
                      Log
                    </Link>
                  </div>
                ))
              )
            )}
            {alertTab === "expiring" && (
              data.expiringSoon.length === 0 ? (
                <p className="text-slate-400 text-sm py-2 px-1">No products expiring within 30 days.</p>
              ) : (
                data.expiringSoon.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${CATEGORY_COLORS[p.category as ProductCategory]}`}>
                      {CATEGORY_LABELS[p.category as ProductCategory]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        Expires {new Date(p.expirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{Number(p.currentQuantity)} {UNIT_LABELS[p.unitType as keyof typeof UNIT_LABELS] ?? p.unitType} in stock
                      </p>
                    </div>
                    <Link
                      href={`/log?productId=${p.id}`}
                      className="shrink-0 text-xs text-violet-600 hover:text-violet-700 font-medium px-2 py-1 rounded hover:bg-violet-50 transition-colors"
                    >
                      Log
                    </Link>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent Activity</h2>
          <div className="divide-y divide-slate-50">
            {data.recentTransactions.length === 0 && (
              <p className="text-slate-400 text-sm py-2">No transactions yet.</p>
            )}
            {data.recentTransactions.map((tx) => {
              const unitLabel = UNIT_LABELS[tx.product.unitType as keyof typeof UNIT_LABELS] ?? tx.product.unitType;
              const verb: Record<string, string> = {
                USE: "used", SELL: "sold", WASTE: "wasted",
                RETURN: "returned", ADJUSTMENT: "adjusted", RECEIVE: "received",
              };
              const dotColor: Record<string, string> = {
                USE: "bg-blue-400", SELL: "bg-green-400", WASTE: "bg-red-400",
                RETURN: "bg-yellow-400", ADJUSTMENT: "bg-purple-400", RECEIVE: "bg-emerald-400",
              };
              return (
                <div key={tx.id} className="flex items-start gap-3 py-2.5">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotColor[tx.transactionType] ?? "bg-slate-300"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 leading-snug">
                      <span className="font-medium">{tx.performedBy.name}</span>
                      {" "}{verb[tx.transactionType] ?? tx.transactionType.toLowerCase()}{" "}
                      <span className="font-medium">{tx.product.name}</span>
                      {" × "}<span className="font-semibold">{tx.quantity}</span>
                      <span className="text-slate-400"> {unitLabel}</span>
                      {tx.clientName && (
                        <span className="text-slate-500"> · {tx.clientName}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(tx.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {data.recentTransactions.length > 0 && (
            <Link href="/transactions" className="mt-3 block text-xs text-violet-600 hover:text-violet-700 font-medium">
              View all history →
            </Link>
          )}
        </div>

        {/* Side Column */}
        <div className="space-y-4">
          {/* Usage by Provider */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Usage by Provider (30d)</h2>
            {data.usageByProvider.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {data.usageByProvider.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{p.name}</span>
                    <span className="font-semibold text-slate-900 ml-2">{p.count} uses</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Used */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Most Used (30d)</h2>
            {data.topUsed.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {data.topUsed.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-700 truncate">{p.name}</p>
                    </div>
                    <span className="text-slate-500 ml-2 text-xs whitespace-nowrap">
                      {p.totalUsed} {UNIT_LABELS[p.unitType as keyof typeof UNIT_LABELS]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  href, label, value, icon, color, alert,
}: {
  href?: string; label: string; value: string; icon: string; color: string; alert?: boolean;
}) {
  const inner = (
    <div className={`bg-white rounded-xl border p-5 transition-shadow ${alert ? "border-amber-200" : "border-slate-200"} ${href ? "hover:shadow-md cursor-pointer" : ""}`}>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function TabBtn({
  active, onClick, count, label, color,
}: {
  active: boolean; onClick: () => void; count: number; label: string; color: "amber" | "red";
}) {
  const activeClass = color === "amber"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        active ? activeClass : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold ${
          active ? (color === "amber" ? "bg-amber-200 text-amber-800" : "bg-red-200 text-red-800") : "bg-slate-200 text-slate-600"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
