"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface AuditEntry {
  id: string; entityType: string; entityId: string; action: string;
  changesBefore: Record<string, unknown> | null;
  changesAfter: Record<string, unknown> | null;
  createdAt: string;
  performedBy: { name: string } | null;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name", category: "Category", brand: "Brand", sku: "SKU",
  unitType: "Unit", costPerUnit: "Cost/unit", sellingPrice: "Selling price",
  reorderThreshold: "Reorder at", currentQuantity: "Qty",
  defaultUsageAmount: "Default qty", expirationDate: "Expiration",
  notes: "Notes", isActive: "Active", transactionType: "Type",
  quantity: "Qty", quantityBefore: "Qty before", quantityAfter: "Qty after",
  restoredQuantity: "Restored qty",
};
const SKIP_FIELDS = new Set(["id", "createdAt", "updatedAt", "productId",
  "loggedById", "performedById", "unitType", "appointmentRef"]);

function fmt(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return String(v);
}

function renderChange(log: AuditEntry) {
  const before = log.changesBefore;
  const after = log.changesAfter;

  // Transaction actions — show a compact summary
  if (["USE", "SELL", "WASTE", "RETURN", "ADJUSTMENT", "RECEIVE"].includes(log.action)) {
    const qty = after?.quantity ?? before?.quantity;
    const qBefore = after?.quantityBefore ?? before?.quantity;
    const qAfter = after?.quantityAfter ?? after?.quantity;
    if (qBefore != null && qAfter != null) {
      return <span className="text-slate-600">{fmt(qBefore)} → {fmt(qAfter)}</span>;
    }
    if (qty != null) return <span className="text-slate-600">×{fmt(qty)}</span>;
  }

  // UNDO
  if (log.action === "UNDO") {
    const restored = after?.restoredQuantity;
    const txType = before?.transactionType;
    return (
      <span className="text-slate-600">
        Reversed {txType ? String(txType).toLowerCase() : "transaction"}
        {restored != null ? ` → qty: ${fmt(restored)}` : ""}
      </span>
    );
  }

  // CREATE — show name + category
  if (log.action === "CREATE" && after) {
    const name = after.name ? String(after.name) : "";
    const cat = after.category ? String(after.category) : "";
    return <span className="text-slate-600">{name}{cat ? ` · ${cat}` : ""}</span>;
  }

  // DEACTIVATE
  if (log.action === "DEACTIVATE") {
    return <span className="text-slate-500 italic">deactivated</span>;
  }

  // UPDATE — diff before vs after, show only changed fields
  if (log.action === "UPDATE" && before && after) {
    const diffs: { label: string; from: string; to: string }[] = [];
    for (const key of Object.keys(after)) {
      if (SKIP_FIELDS.has(key)) continue;
      const bVal = before[key];
      const aVal = after[key];
      if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        diffs.push({
          label: FIELD_LABELS[key] ?? key,
          from: fmt(bVal),
          to: fmt(aVal),
        });
      }
    }
    if (diffs.length === 0) return <span className="text-slate-400 italic">no changes</span>;
    return (
      <ul className="space-y-0.5">
        {diffs.map((d) => (
          <li key={d.label} className="text-xs text-slate-600">
            <span className="font-medium text-slate-500">{d.label}:</span>{" "}
            <span className="text-red-500">{d.from}</span>
            <span className="text-slate-400"> → </span>
            <span className="text-green-600">{d.to}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Fallback
  if (after) return <span className="text-slate-500 text-xs">{JSON.stringify(after).slice(0, 80)}</span>;
  return null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DEACTIVATE: "bg-red-100 text-red-700",
  USE: "bg-blue-100 text-blue-700",
  RECEIVE: "bg-emerald-100 text-emerald-700",
  SELL: "bg-green-100 text-green-700",
  WASTE: "bg-red-100 text-red-700",
  ADJUSTMENT: "bg-purple-100 text-purple-700",
  RETURN: "bg-yellow-100 text-yellow-700",
  UNDO: "bg-orange-100 text-orange-700",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((d) => { setLogs(d); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 text-sm mt-0.5">Immutable record of every inventory change. Cannot be edited or deleted.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm flex items-center gap-2">
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        This log is append-only. Records cannot be modified or removed.
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No audit entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Logged By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Requested By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{log.entityType}</p>
                      <p className="text-xs text-slate-400 font-mono">{log.entityId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.performedBy?.name ?? <span className="text-slate-400">System</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.changesAfter?.requestedBy
                        ? <span className="text-slate-700">{String(log.changesAfter.requestedBy)}</span>
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 max-w-sm">{renderChange(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
