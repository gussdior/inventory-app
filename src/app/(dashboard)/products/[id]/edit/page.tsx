"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/utils";
import { ProductCategory, UnitType } from "@prisma/client";

interface ProductForm {
  name: string; category: ProductCategory; brand: string; sku: string;
  unitType: UnitType; costPerUnit: string; sellingPrice: string;
  reorderThreshold: string; expirationDate: string; notes: string; isActive: boolean;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProductForm>({
    name: "", category: "BOTOX", brand: "", sku: "", unitType: "VIAL",
    costPerUnit: "", sellingPrice: "", reorderThreshold: "5",
    expirationDate: "", notes: "", isActive: true,
  });

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((p) => {
        setForm({
          name: p.name, category: p.category, brand: p.brand ?? "",
          sku: p.sku ?? "", unitType: p.unitType,
          costPerUnit: String(p.costPerUnit), sellingPrice: p.sellingPrice ? String(p.sellingPrice) : "",
          reorderThreshold: String(p.reorderThreshold),
          expirationDate: p.expirationDate ? p.expirationDate.split("T")[0] : "",
          notes: p.notes ?? "", isActive: p.isActive,
        });
        setLoading(false);
      });
  }, [id]);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/products/${id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/products/${id}`} className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Type</label>
            <select value={form.unitType} onChange={(e) => set("unitType", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
            <input type="text" value={form.brand} onChange={(e) => set("brand", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU</label>
            <input type="text" value={form.sku} onChange={(e) => set("sku", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost Per Unit ($) <span className="text-red-500">*</span></label>
            <input type="number" value={form.costPerUnit} onChange={(e) => set("costPerUnit", e.target.value)} required min="0" step="0.01"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Selling Price ($)</label>
            <input type="number" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} min="0" step="0.01"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reorder Threshold</label>
            <input type="number" value={form.reorderThreshold} onChange={(e) => set("reorderThreshold", e.target.value)} min="0" step="0.01"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiration Date</label>
            <input type="date" value={form.expirationDate} onChange={(e) => set("expirationDate", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} resize-none
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded accent-violet-600" />
              Product is active
            </label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link href={`/products/${id}`}
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
