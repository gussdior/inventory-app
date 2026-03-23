"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CATEGORY_LABELS, CATEGORY_COLORS, UNIT_LABELS, formatCurrency, isLowStock } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import type { ProductCategory } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string | null;
  sku: string | null;
  unitType: string;
  costPerUnit: number;
  sellingPrice: number | null;
  reorderThreshold: number;
  currentQuantity: number;
  expirationDate: string | null;
  isActive: boolean;
}

const CATEGORIES = ["ALL", ...Object.keys(CATEGORY_LABELS)] as const;

export default function ProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [showLowStock, setShowLowStock] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  const isManager = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  function load() {
    const params = new URLSearchParams();
    if (category !== "ALL") params.set("category", category);
    if (search) params.set("search", search);
    if (showLowStock) params.set("lowStock", "true");
    setLoading(true);
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((d) => { setProducts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, [category, showLowStock]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") load();
  }

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm mt-0.5">{products.length} active products in catalog</p>
        </div>
        {isManager && (
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search products..."
            className="flex-1 min-w-48 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  category === cat
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "ALL" ? "All" : CATEGORY_LABELS[cat as ProductCategory]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="rounded accent-violet-600"
            />
            Low stock only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm font-medium">No products found</p>
            {isManager && (
              <Link href="/products/new" className="mt-3 inline-block text-violet-600 text-sm hover:underline">
                Add your first product →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-8 px-4 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">In Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost/Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => {
                  const low = isLowStock(Number(product.currentQuantity), Number(product.reorderThreshold));
                  const expired =
                    product.expirationDate && new Date(product.expirationDate) < new Date();
                  const expiringSoon =
                    product.expirationDate &&
                    !expired &&
                    new Date(product.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const isFav = favorites.has(product.id);

                  const rowBorder = expired
                    ? "border-l-2 border-red-400"
                    : low
                    ? "border-l-2 border-amber-400"
                    : "border-l-2 border-transparent";

                  return (
                    <tr key={product.id} className={`hover:bg-slate-50 transition-colors cursor-default ${rowBorder}`}>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                          className="text-base leading-none transition-colors"
                          aria-label={isFav ? "Remove favorite" : "Add favorite"}
                          title={isFav ? "Remove favorite" : "Add to Quick Log favorites"}
                        >
                          <span className={isFav ? "text-amber-400" : "text-slate-200 hover:text-amber-300"}>★</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/products/${product.id}/edit`)}
                          className="text-left group"
                        >
                          <p className="font-medium text-slate-900 group-hover:underline cursor-pointer">{product.name}</p>
                          {product.brand && <p className="text-xs text-slate-500">{product.brand}</p>}
                          {product.sku && <p className="text-xs text-slate-400 font-mono">{product.sku}</p>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[product.category]}`}>
                          {CATEGORY_LABELS[product.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${low ? "text-amber-600" : "text-slate-900"}`}>
                          {Number(product.currentQuantity)}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">
                          {UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS]}
                        </span>
                        {low && (
                          <span className="ml-1 text-amber-500 text-xs">⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatCurrency(product.costPerUnit)}
                      </td>
                      <td className="px-4 py-3">
                        {product.expirationDate ? (
                          <span className={`text-xs ${expired ? "text-red-600 font-medium" : expiringSoon ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                            {new Date(product.expirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {expired && " (EXPIRED)"}
                            {expiringSoon && " (Soon)"}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Expired</span>
                        ) : low ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Low Stock</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/log?productId=${product.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Log
                          </Link>
                          {isManager && (
                            <Link
                              href={`/products/${product.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
