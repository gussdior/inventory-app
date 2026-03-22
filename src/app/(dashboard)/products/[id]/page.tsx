"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, UNIT_LABELS,
  TRANSACTION_LABELS, TRANSACTION_COLORS, formatCurrency, formatDate,
} from "@/lib/utils";

interface Product {
  id: string; name: string; category: string; brand: string | null;
  sku: string | null; unitType: string; costPerUnit: number;
  sellingPrice: number | null; reorderThreshold: number;
  currentQuantity: number; expirationDate: string | null; notes: string | null;
  transactions: Array<{
    id: string; transactionType: string; quantity: number;
    quantityBefore: number; quantityAfter: number; createdAt: string;
    reason: string | null; notes: string | null; clientName: string | null; wasteReason: string | null;
    loggedBy: { name: string }; performedBy: { name: string };
  }>;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const isManager = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((d) => { setProduct(d); setLoading(false); });
  }, [id]);

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

  return (
    <div className="space-y-6">
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
                ⚠ Low Stock
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

      {/* Details + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Product Details</h2>
          <dl className="space-y-3 text-sm">
            {[
              { label: "SKU", value: product.sku ?? "—" },
              { label: "Brand", value: product.brand ?? "—" },
              { label: "Unit", value: UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS] ?? product.unitType },
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
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {product.transactions.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 text-sm border-b border-slate-50 pb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5 ${TRANSACTION_COLORS[tx.transactionType as keyof typeof TRANSACTION_COLORS]}`}>
                    {TRANSACTION_LABELS[tx.transactionType as keyof typeof TRANSACTION_LABELS]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900">
                      <span className="font-medium">{tx.quantity}</span> {UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS]}
                      {" "}→ {tx.quantityAfter} remaining
                      {tx.clientName && <span className="text-slate-500"> · {tx.clientName}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {tx.performedBy.name}
                      {tx.loggedBy.name !== tx.performedBy.name && ` (logged by ${tx.loggedBy.name})`}
                      {" · "}{formatDate(tx.createdAt)}
                    </p>
                    {(tx.reason || tx.wasteReason) && (
                      <p className="text-xs text-slate-400 italic">{tx.reason ?? tx.wasteReason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
