"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  CATEGORY_COLORS,
  TRANSACTION_LABELS,
  TRANSACTION_COLORS,
  UNIT_LABELS,
} from "@/lib/utils";

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
    product: { name: string; category: string };
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

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
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
          label="Low Stock Items"
          value={data.lowStockProducts.length.toString()}
          icon="⚠️"
          color={data.lowStockProducts.length > 0 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}
          alert={data.lowStockProducts.length > 0}
        />
        <StatCard
          label="Waste This Month"
          value={formatCurrency(data.wasteTotal)}
          icon="🗑️"
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Alerts Row */}
      {(data.lowStockProducts.length > 0 || data.expiringSoon.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.lowStockProducts.length > 0 && (
            <AlertCard
              title="Low Stock Alerts"
              color="amber"
              icon="⚠️"
              items={data.lowStockProducts.map((p) => ({
                id: p.id,
                label: p.name,
                sub: `${Number(p.currentQuantity)} ${UNIT_LABELS[p.unitType as keyof typeof UNIT_LABELS] ?? p.unitType} remaining (threshold: ${Number(p.reorderThreshold)})`,
                categoryColor: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS],
                category: p.category,
              }))}
            />
          )}
          {data.expiringSoon.length > 0 && (
            <AlertCard
              title="Expiring Within 30 Days"
              color="red"
              icon="📅"
              items={data.expiringSoon.map((p) => ({
                id: p.id,
                label: p.name,
                sub: `Expires ${new Date(p.expirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                categoryColor: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS],
                category: p.category,
              }))}
            />
          )}
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {data.recentTransactions.length === 0 && (
              <p className="text-slate-400 text-sm">No transactions yet.</p>
            )}
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-start gap-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5 ${TRANSACTION_COLORS[tx.transactionType as keyof typeof TRANSACTION_COLORS]}`}
                >
                  {TRANSACTION_LABELS[tx.transactionType as keyof typeof TRANSACTION_LABELS]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900 truncate">
                    <span className="font-medium">{tx.product.name}</span>
                    {" — "}{tx.quantity} {tx.product.category}
                    {tx.clientName && <span className="text-slate-500"> · {tx.clientName}</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tx.performedBy.name} · {formatDate(tx.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {data.recentTransactions.length > 0 && (
            <Link href="/transactions" className="mt-4 block text-xs text-violet-600 hover:text-violet-700 font-medium">
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
  label, value, icon, color, alert,
}: {
  label: string; value: string; icon: string; color: string; alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${alert ? "border-amber-200" : "border-slate-200"}`}>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function AlertCard({
  title, color, icon, items,
}: {
  title: string;
  color: "amber" | "red";
  icon: string;
  items: Array<{ id: string; label: string; sub: string; categoryColor: string; category: string }>;
}) {
  const borderColor = color === "amber" ? "border-amber-200" : "border-red-200";
  const headerColor = color === "amber" ? "text-amber-700" : "text-red-700";

  return (
    <div className={`bg-white rounded-xl border ${borderColor} p-5`}>
      <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${headerColor}`}>
        <span>{icon}</span> {title}
      </h2>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.id}`}
            className="flex items-start gap-2 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
          >
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 ${item.categoryColor}`}>
              {item.category}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
