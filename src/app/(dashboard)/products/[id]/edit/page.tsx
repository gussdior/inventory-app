"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/utils";
import type { ProductCategory, UnitType } from "@prisma/client";

interface FormErrors {
  name?: string;
  costPerUnit?: string;
  currentQuantity?: string;
  _server?: string;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    name: "",
    category: "BOTOX" as ProductCategory,
    unitType: "VIAL" as UnitType,
    brand: "",
    sku: "",
    currentQuantity: "0",
    reorderThreshold: "5",
    costPerUnit: "",
    sellingPrice: "",
    defaultUsageAmount: "",
    quantityPerPackage: "1",
    containedUnitType: "" as UnitType | "",
    expirationDate: "",
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((p) => {
        setForm({
          name: p.name,
          category: p.category,
          unitType: p.unitType,
          brand: p.brand ?? "",
          sku: p.sku ?? "",
          currentQuantity: String(p.currentQuantity),
          reorderThreshold: String(p.reorderThreshold),
          costPerUnit: String(p.costPerUnit),
          sellingPrice: p.sellingPrice ? String(p.sellingPrice) : "",
          defaultUsageAmount: p.defaultUsageAmount != null ? String(p.defaultUsageAmount) : "",
          quantityPerPackage: String(p.quantityPerPackage ?? 1),
          containedUnitType: p.containedUnitType ?? "",
          expirationDate: p.expirationDate ? p.expirationDate.split("T")[0] : "",
          notes: p.notes ?? "",
          isActive: p.isActive,
        });
        setLoading(false);
      });
  }, [id]);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined, _server: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Product name is required";
    if (!form.costPerUnit || isNaN(Number(form.costPerUnit))) errs.costPerUnit = "Cost per unit is required";
    if (Number(form.currentQuantity) < 0) errs.currentQuantity = "Stock cannot be negative";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setErrors({});
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
      router.push(`/products/${id}`);
    } else {
      try {
        const data = await res.json();
        setErrors({ _server: data.error ?? "Failed to save." });
      } catch {
        setErrors({ _server: `Failed to save. (${res.status})` });
      }
    }
  }

  const outerUnit = UNIT_LABELS[form.unitType as keyof typeof UNIT_LABELS] ?? form.unitType;
  const outerUnitLower = outerUnit.toLowerCase();
  const innerUnitKey = (form.containedUnitType || form.unitType) as keyof typeof UNIT_LABELS;
  const innerUnit = UNIT_LABELS[innerUnitKey] ?? String(innerUnitKey);
  const innerUnitLower = innerUnit.toLowerCase();
  const qtyPerPkg = parseInt(form.quantityPerPackage) || 1;
  const tapAmt = parseFloat(form.defaultUsageAmount) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/products/${id}`} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
      </div>

      {errors._server && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{errors._server}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-24">

          {/* ── LEFT: Product Info + Inventory ── */}
          <div className="space-y-5">

            {/* Card: Product Info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Info</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set("isActive", e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-600"
                  />
                  <span className="text-xs font-medium text-slate-600">Active</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.name ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Type</label>
                  <select
                    value={form.unitType}
                    onChange={(e) => set("unitType", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU / Code</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => set("sku", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Card: Inventory */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Stock</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.currentQuantity}
                      onChange={(e) => set("currentQuantity", e.target.value)}
                      min="0"
                      step="1"
                      className={`w-full px-4 py-3 pr-14 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.currentQuantity ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{outerUnitLower}s</span>
                  </div>
                  {errors.currentQuantity && <p className="text-xs text-red-500 mt-1">{errors.currentQuantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Cost / {outerUnit} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      value={form.costPerUnit}
                      onChange={(e) => set("costPerUnit", e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className={`w-full pl-7 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.costPerUnit ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                    />
                  </div>
                  {errors.costPerUnit && <p className="text-xs text-red-500 mt-1">{errors.costPerUnit}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-0.5">Low Stock Alert</label>
                <p className="text-xs text-slate-400 mb-1.5">Warn when stock drops below this number</p>
                <div className="relative">
                  <input
                    type="number"
                    value={form.reorderThreshold}
                    onChange={(e) => set("reorderThreshold", e.target.value)}
                    min="0"
                    step="1"
                    className="w-full px-4 py-3 pr-14 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{outerUnitLower}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Usage + Packaging + Optional ── */}
          <div className="space-y-5">

            {/* Card: Typical Usage */}
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Typical Amount Per Treatment</h2>
                <p className="text-xs text-slate-400 mt-1">The system will subtract this amount each time staff logs usage</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-slate-600 shrink-0">We usually use</span>
                <input
                  type="number"
                  value={form.defaultUsageAmount}
                  onChange={(e) => set("defaultUsageAmount", e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="0"
                  className="w-28 px-4 py-3 border-2 border-violet-300 rounded-xl text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
                <span className="text-sm text-slate-600 font-medium">
                  {tapAmt === 1 ? innerUnitLower : innerUnitLower + "s"} per treatment
                </span>
              </div>

              {tapAmt > 0 && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5 text-xs text-violet-700">
                  Each time usage is logged, <strong>{tapAmt} {tapAmt === 1 ? innerUnitLower : innerUnitLower + "s"}</strong> will be subtracted from stock
                </div>
              )}
            </div>

            {/* Card: Packaging */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Packaging</h2>
                <p className="text-xs text-slate-400 mt-1">How many usable units come inside each {outerUnitLower}?</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-600 shrink-0">1 {outerUnitLower} contains</span>
                <input
                  type="number"
                  value={form.quantityPerPackage}
                  onChange={(e) => set("quantityPerPackage", e.target.value)}
                  min="1"
                  step="1"
                  className="w-20 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-center font-semibold"
                />
                <select
                  value={form.containedUnitType}
                  onChange={(e) => set("containedUnitType", e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                >
                  <option value="">— same unit —</option>
                  {Object.entries(UNIT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.toLowerCase()}s</option>
                  ))}
                </select>
              </div>

              {qtyPerPkg > 1 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    1 {outerUnitLower} = {qtyPerPkg} {innerUnitLower}{qtyPerPkg !== 1 ? "s" : ""}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Leave at 1 if each {outerUnitLower} is already one usable item</p>
              )}
            </div>

            {/* Card: Optional */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Optional</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Selling Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      value={form.sellingPrice}
                      onChange={(e) => set("sellingPrice", e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiration Date</label>
                  <input
                    type="date"
                    value={form.expirationDate}
                    onChange={(e) => set("expirationDate", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  placeholder="Storage instructions, special notes..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 py-4 flex gap-3 z-10 -mx-6 px-6">
          <Link
            href={`/products/${id}`}
            className="px-6 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
