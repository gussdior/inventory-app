"use client";

import { useEffect, useState, useRef } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, UNIT_LABELS,
  TRANSACTION_LABELS, TRANSACTION_COLORS, formatCurrency, formatDate,
} from "@/lib/utils";

interface TxUser { id: string; name: string }

interface Transaction {
  id: string;
  transactionType: string;
  quantity: number;
  unitType: string;
  quantityBefore: number;
  quantityAfter: number;
  createdAt: string;
  loggedById: string;
  reason: string | null;
  notes: string | null;
  clientName: string | null;
  wasteReason: string | null;
  isReversed: boolean;
  reversalReason: string | null;
  reversedAt: string | null;
  loggedBy: TxUser;
  performedBy: TxUser;
  reversedBy: { name: string } | null;
}

interface Product {
  id: string; name: string; category: string; brand: string | null;
  sku: string | null; unitType: string; costPerUnit: number;
  sellingPrice: number | null; reorderThreshold: number;
  currentQuantity: number; expirationDate: string | null; notes: string | null;
  quantityPerPackage: number; containedUnitType: string | null;
  transactions: Transaction[];
}

const UNDO_WINDOW_MS = 5 * 60 * 1000;

const TX_VERBS: Record<string, { past: string; direction: string }> = {
  USE:        { past: "used in treatment", direction: "deducted" },
  SELL:       { past: "sold",              direction: "deducted" },
  WASTE:      { past: "wasted",            direction: "deducted" },
  RECEIVE:    { past: "received",          direction: "added" },
  RETURN:     { past: "returned to stock", direction: "added" },
  ADJUSTMENT: { past: "manually adjusted", direction: "adjusted" },
};

function qtyLabel(qty: number, unitType: string): string {
  const label = UNIT_LABELS[unitType as keyof typeof UNIT_LABELS] ?? unitType;
  if (unitType === "ML") return qty + " mL";
  return qty + " " + label + (qty !== 1 ? "s" : "");
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [undoTarget, setUndoTarget] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState("");
  const [undoing, setUndoing] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isManager = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";
  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function loadProduct() {
    fetch("/api/products/" + id)
      .then((r) => r.json())
      .then((d) => { setProduct(d); setLoading(false); });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProduct(); }, [id]);

  useEffect(() => {
    if (undoTarget) setTimeout(() => reasonRef.current?.focus(), 50);
  }, [undoTarget]);

  function isUndoable(tx: Transaction) {
    if (tx.isReversed) return false;
    if (isAdmin) return true;
    const age = Date.now() - new Date(tx.createdAt).getTime();
    return age < UNDO_WINDOW_MS && tx.loggedById === session?.user.id;
  }

  function canSeeUndo(tx: Transaction) {
    return !tx.isReversed && (isAdmin || tx.loggedById === session?.user.id);
  }

  function openUndo(txId: string) {
    setUndoReason("");
    setUndoTarget(txId);
  }

  async function handleUndo() {
    if (!undoTarget) return;
    setUndoing(true);
    const res = await fetch("/api/transactions/" + undoTarget, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reversalReason: undoReason.trim() || null }),
    });
    setUndoing(false);
    setUndoTarget(null);
    if (res.ok) {
      setToast("Transaction reversed — stock has been restored.");
      loadProduct();
    } else {
      const data = await res.json().catch(() => ({}));
      setToast("Error: " + (data.error ?? "Failed to reverse transaction."));
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch("/api/products/" + id, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/products");
    } else {
      const data = await res.json().catch(() => ({}));
      setShowDeleteModal(false);
      setToast("Error: " + (data.error ?? "Failed to deactivate product."));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) return <div className="text-slate-500">Product not found.</div>;

  const low = Number(product.currentQuantity) <= Number(product.reorderThreshold);
  const expired = product.expirationDate && new Date(product.expirationDate) < new Date();
  const unitsPerPkg = Number(product.quantityPerPackage ?? 1);
  const totalUsable = Number(product.currentQuantity) * unitsPerPkg;
  const innerUnitLabel = product.containedUnitType
    ? (UNIT_LABELS[product.containedUnitType as keyof typeof UNIT_LABELS] ?? product.containedUnitType)
    : (UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS] ?? product.unitType);

  const undoTx = undoTarget ? product.transactions.find((t) => t.id === undoTarget) : null;
  const undoQty = undoTx ? Number(undoTx.quantity) : 0;
  const undoDir = undoTx ? (TX_VERBS[undoTx.transactionType]?.direction ?? "deducted") : "deducted";

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* Reverse Transaction Modal */}
      {undoTarget && undoTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setUndoTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Reverse this transaction?</h2>
                <p className="text-xs text-slate-500">Original record stays visible, marked as Reversed.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg divide-y divide-slate-100 text-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-500">Original action</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TRANSACTION_COLORS[undoTx.transactionType as keyof typeof TRANSACTION_COLORS]}`}>
                  {TRANSACTION_LABELS[undoTx.transactionType as keyof typeof TRANSACTION_LABELS]}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-500">
                  {undoDir === "deducted" ? "Was deducted" : undoDir === "added" ? "Was added" : "Was adjusted"}
                </span>
                <span className="font-semibold text-slate-800">{qtyLabel(undoQty, undoTx.unitType)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-green-50">
                <span className="text-green-700 font-medium">Will restore to</span>
                <span className="font-semibold text-green-800">{qtyLabel(Number(undoTx.quantityBefore), undoTx.unitType)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Why are you reversing this?
                <span className="ml-1 text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                ref={reasonRef}
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                rows={2}
                placeholder="e.g. Logged wrong amount, wrong product selected..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setUndoTarget(null)}
                disabled={undoing}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUndo}
                disabled={undoing}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {undoing ? "Reversing..." : "Yes, Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && product && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Deactivate product?</h2>
                <p className="text-xs text-slate-500">It will be hidden from inventory but history is kept.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3">
              <span className="font-semibold">{product.name}</span> will be marked as inactive and removed from active inventory views.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {deleting ? "Deactivating..." : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/products" className="text-slate-400 hover:text-slate-600 mt-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[product.category as keyof typeof CATEGORY_COLORS]}`}>
              {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS]}
            </span>
            {low && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                Low Stock
              </span>
            )}
            {expired && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                EXPIRED
              </span>
            )}
          </div>
          {product.brand && <p className="text-slate-500 text-sm mt-0.5">{product.brand}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/log?productId=${product.id}`}
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Log Usage
          </Link>
          {isManager && (
            <Link
              href={`/products/${id}/edit`}
              className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Edit
            </Link>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">In Stock</p>
          <p className={`text-2xl font-bold ${low ? "text-amber-600" : "text-slate-900"}`}>
            {Number(product.currentQuantity)}
          </p>
          <p className="text-xs text-slate-500">{UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS]}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Cost Per Unit</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(product.costPerUnit)}</p>
          <p className="text-xs text-slate-500">per {UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS]}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(Number(product.currentQuantity) * Number(product.costPerUnit))}
          </p>
          <p className="text-xs text-slate-500">on hand</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Reorder At</p>
          <p className="text-2xl font-bold text-slate-900">{Number(product.reorderThreshold)}</p>
          <p className="text-xs text-slate-500">{UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS]}</p>
        </div>
      </div>

      {/* Packaging banner */}
      {unitsPerPkg > 1 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm text-violet-800">
            <span className="font-semibold">{totalUsable} usable {innerUnitLabel}s</span>
            <span className="text-violet-600 ml-1">
              ({Number(product.currentQuantity)} {UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS]} x {unitsPerPkg} {innerUnitLabel}s each)
            </span>
          </p>
        </div>
      )}

      {/* Details + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Details panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Product Details</h2>
          <dl className="space-y-3 text-sm">
            {[
              { label: "SKU", value: product.sku ?? "—" },
              { label: "Brand", value: product.brand ?? "—" },
              { label: "Unit", value: UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS] ?? product.unitType },
              ...(unitsPerPkg > 1 ? [{ label: "Units/Package", value: `${unitsPerPkg} ${innerUnitLabel}s` }] : []),
              { label: "Selling Price", value: product.sellingPrice ? formatCurrency(product.sellingPrice) : "—" },
              {
                label: "Expiration",
                value: product.expirationDate
                  ? new Date(product.expirationDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-900 font-medium text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {product.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{product.notes}</p>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Transaction History
            <span className="ml-2 text-slate-400 font-normal">({product.transactions.length})</span>
          </h2>
          {product.transactions.length === 0 ? (
            <p className="text-slate-400 text-sm">No transactions yet.</p>
          ) : (
            <div className="space-y-0.5 max-h-[480px] overflow-y-auto pr-1">
              {product.transactions.map((tx) => {
                const txQty = Number(tx.quantity);
                const undoable = isUndoable(tx);
                const showUndo = canSeeUndo(tx);

                return (
                  <div
                    key={tx.id}
                    className={`flex items-start gap-3 text-sm rounded-lg px-2 py-2.5 ${tx.isReversed ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"}`}
                  >
                    {/* Badge column */}
                    <div className="shrink-0 flex flex-col gap-1 mt-0.5 min-w-[90px]">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${tx.isReversed ? "bg-slate-100 text-slate-400 line-through" : (TRANSACTION_COLORS[tx.transactionType as keyof typeof TRANSACTION_COLORS] ?? "")}`}>
                        {TRANSACTION_LABELS[tx.transactionType as keyof typeof TRANSACTION_LABELS]}
                      </span>
                      {tx.isReversed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-400 whitespace-nowrap">
                          Reversed
                        </span>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      {/* Quantity + action verb */}
                      <p className={`font-medium ${tx.isReversed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        {qtyLabel(txQty, tx.unitType)}
                        <span className={`ml-1 font-normal text-xs ${tx.isReversed ? "text-slate-400" : "text-slate-500"}`}>
                          {TX_VERBS[tx.transactionType]?.past ?? tx.transactionType.toLowerCase()}
                        </span>
                        {!tx.isReversed && (
                          <span className="ml-1 text-xs text-slate-400">
                            {"\u2192"} {Number(tx.quantityAfter)} remaining
                          </span>
                        )}
                        {tx.clientName && (
                          <span className="ml-1 text-xs text-slate-400">{"\u00b7"} {tx.clientName}</span>
                        )}
                      </p>

                      {/* Provider + Logged By — always both shown */}
                      <p className="text-xs mt-0.5">
                        <span className="font-medium text-slate-600">{tx.performedBy.name}</span>
                        {tx.loggedBy.id !== tx.performedBy.id && (
                          <span className="text-slate-400"> {"\u00b7"} logged by {tx.loggedBy.name}</span>
                        )}
                        <span className="text-slate-400"> {"\u00b7"} {formatDate(tx.createdAt)}</span>
                      </p>

                      {/* Waste / adjustment reason */}
                      {(tx.reason || tx.wasteReason) && (
                        <p className="text-xs text-slate-400 italic mt-0.5">{tx.reason ?? tx.wasteReason}</p>
                      )}

                      {/* Reversal metadata */}
                      {tx.isReversed && (
                        <p className="text-xs text-red-400 mt-0.5">
                          Reversed by {tx.reversedBy?.name ?? "unknown"}
                          {tx.reversedAt && <span> {"\u00b7"} {formatDate(tx.reversedAt)}</span>}
                          {tx.reversalReason && <span> {"\u00b7"} &ldquo;{tx.reversalReason}&rdquo;</span>}
                        </p>
                      )}
                    </div>

                    {/* Reverse button */}
                    {showUndo && (
                      <button
                        onClick={() => undoable && openUndo(tx.id)}
                        disabled={!undoable}
                        title={undoable ? "Reverse this transaction" : "Reversal only available within 5 minutes"}
                        className={`shrink-0 mt-0.5 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${undoable ? "border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50" : "border-slate-100 text-slate-300 cursor-not-allowed"}`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {undoable ? "Reverse" : "—"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
