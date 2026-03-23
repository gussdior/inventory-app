"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  TRANSACTION_LABELS, TRANSACTION_COLORS, UNIT_LABELS,
  CATEGORY_LABELS, CATEGORY_COLORS, formatDate,
} from "@/lib/utils";

interface Transaction {
  id: string; transactionType: string; quantity: number;
  quantityBefore: number; quantityAfter: number; createdAt: string;
  clientName: string | null; reason: string | null; notes: string | null; wasteReason: string | null;
  isReversed: boolean;
  product: { id: string; name: string; category: string; unitType: string };
  performedBy: { id: string; name: string; role: string };
  loggedBy: { id: string; name: string; role: string };
}

interface User { id: string; name: string; role: string; }

const TYPES = ["ALL", "USE", "SELL", "WASTE", "RETURN", "ADJUSTMENT", "RECEIVE"] as const;

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("ALL");
  const [providers, setProviders] = useState<User[]>([]);
  const [providerId, setProviderId] = useState("ALL");
  const [voidConfirm, setVoidConfirm] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(new Set<string>());
  const [voidError, setVoidError] = useState("");

  async function handleVoid(txId: string) {
    setVoiding((prev) => new Set([...prev, txId]));
    setVoidError("");
    const res = await fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reversalReason: "Voided from history" }),
    });
    setVoiding((prev) => { const n = new Set(prev); n.delete(txId); return n; });
    if (res.ok) {
      setTransactions((prev) => prev.map((t) => t.id === txId ? { ...t, isReversed: true } : t));
    } else {
      const d = await res.json().catch(() => ({}));
      setVoidError(d.error ?? "Could not void — only admins can void any transaction; others can only void within 5 minutes.");
      setVoidConfirm(null);
    }
  }

  const isManager = session?.user.role === "ADMIN" || session?.user.role === "MANAGER" || session?.user.role === "FRONT_DESK";

  useEffect(() => {
    if (isManager) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setProviders(d); })
        .catch(() => {});
    }
  }, [isManager]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (type !== "ALL") params.set("type", type);
    if (providerId !== "ALL") params.set("performedById", providerId);
    params.set("limit", "100");
    setLoading(true);
    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => { setTransactions(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type, providerId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        <p className="text-slate-500 text-sm mt-0.5">All inventory movements, timestamped and attributed.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  type === t
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t === "ALL" ? "All Types" : TRANSACTION_LABELS[t as keyof typeof TRANSACTION_LABELS]}
              </button>
            ))}
          </div>
          {isManager && providers.length > 0 && (
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">All Providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <span className="text-xs text-slate-400 ml-auto">{transactions.length} records</span>
        </div>
      </div>

      {voidError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{voidError}</span>
          <button onClick={() => setVoidError("")} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">No transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock After</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-50 transition-colors${tx.isReversed ? " opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${TRANSACTION_COLORS[tx.transactionType as keyof typeof TRANSACTION_COLORS]}`}>
                        {TRANSACTION_LABELS[tx.transactionType as keyof typeof TRANSACTION_LABELS]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{tx.product.name}</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[tx.product.category as keyof typeof CATEGORY_COLORS]}`}>
                        {CATEGORY_LABELS[tx.product.category as keyof typeof CATEGORY_LABELS]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">
                      {tx.quantity} <span className="text-slate-400 font-normal text-xs">{UNIT_LABELS[tx.product.unitType as keyof typeof UNIT_LABELS]}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {tx.quantityAfter}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{tx.performedBy.name}</p>
                      {tx.loggedBy.id !== tx.performedBy.id && (
                        <p className="text-xs text-slate-400">Logged by {tx.loggedBy.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {tx.clientName ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {tx.wasteReason ?? tx.reason ?? tx.notes ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {tx.isReversed ? (
                        <span className="text-xs text-slate-300 italic">Voided</span>
                      ) : voidConfirm === tx.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleVoid(tx.id)}
                            disabled={voiding.has(tx.id)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg min-h-[30px] transition-colors"
                          >
                            {voiding.has(tx.id) ? "..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setVoidConfirm(null)}
                            className="px-2.5 py-1 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg min-h-[30px] hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setVoidConfirm(tx.id)}
                          className="px-2.5 py-1 text-xs text-slate-300 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors min-h-[30px]"
                        >
                          Void
                        </button>
                      )}
                    </td>
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
