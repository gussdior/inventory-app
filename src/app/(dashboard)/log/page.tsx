"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { UNIT_LABELS, TRANSACTION_LABELS } from "@/lib/utils";

const ACTION_TYPES = ["USE", "SELL", "WASTE", "RETURN", "ADJUSTMENT", "RECEIVE"] as const;
type ActionType = (typeof ACTION_TYPES)[number];

const ACTION_COLORS: Record<ActionType, string> = {
  USE: "border-blue-500 bg-blue-500 text-white",
  SELL: "border-green-500 bg-green-500 text-white",
  WASTE: "border-red-500 bg-red-500 text-white",
  RETURN: "border-yellow-500 bg-yellow-500 text-white",
  ADJUSTMENT: "border-purple-500 bg-purple-500 text-white",
  RECEIVE: "border-emerald-500 bg-emerald-500 text-white",
};

const ACTION_INACTIVE = "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";

const WASTE_REASONS = [
  { value: "EXPIRED", label: "Expired" },
  { value: "CONTAMINATED", label: "Contaminated" },
  { value: "SPILLED", label: "Spilled" },
  { value: "CLIENT_REACTION", label: "Client Reaction" },
  { value: "OTHER", label: "Other" },
];

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  unitType: string;
  currentQuantity: number;
  reorderThreshold: number;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function LogPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [action, setAction] = useState<ActionType>("USE");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [wasteReason, setWasteReason] = useState("");
  const [performedById, setPerformedById] = useState("");
  const [providers, setProviders] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const isFrontDeskOrManager =
    session?.user.role === "FRONT_DESK" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "ADMIN";

  const canAdjust =
    session?.user.role === "MANAGER" || session?.user.role === "ADMIN";

  const canReceive =
    session?.user.role !== "PROVIDER";

  const allowedActions = ACTION_TYPES.filter((t) => {
    if (t === "ADJUSTMENT" && !canAdjust) return false;
    if (t === "RECEIVE" && !canReceive) return false;
    return true;
  });

  // Load products
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  // Load providers for front desk
  useEffect(() => {
    if (isFrontDeskOrManager) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((users: User[]) =>
          setProviders(users.filter((u) => u.role === "PROVIDER" || u.role === "FRONT_DESK" || u.role === "MANAGER"))
        );
    }
  }, [isFrontDeskOrManager]);

  // Filter products
  useEffect(() => {
    if (!search.trim()) {
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const q = search.toLowerCase();
    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
    setFiltered(matches.slice(0, 8));
    setShowDropdown(matches.length > 0);
  }, [search, products]);

  function selectProduct(product: Product) {
    setSelected(product);
    setSearch(product.name);
    setShowDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !quantity) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selected.id,
        transactionType: action,
        quantity: Number(quantity),
        performedById: performedById || session?.user.id,
        clientName: clientName || null,
        notes: notes || null,
        reason: reason || null,
        wasteReason: wasteReason || null,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setSelected(null);
      setSearch("");
      setQuantity("");
      setClientName("");
      setNotes("");
      setReason("");
      setWasteReason("");
      setPerformedById("");
      setAction("USE");
      setTimeout(() => {
        setSuccess(false);
        searchRef.current?.focus();
      }, 2500);
      // Refresh product list
      fetch("/api/products")
        .then((r) => r.json())
        .then(setProducts);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Log Inventory</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Search for a product and log what was used, received, or adjusted.
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Transaction logged successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Step 1: Product Search */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            1. Select Product
          </label>
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (selected && e.target.value !== selected.name) setSelected(null);
              }}
              onFocus={() => search && setShowDropdown(filtered.length > 0)}
              placeholder="Search by name, brand, or category..."
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autoComplete="off"
            />
            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProduct(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.brand && `${p.brand} · `}{p.category}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-xs font-medium ${Number(p.currentQuantity) <= Number(p.reorderThreshold) ? "text-amber-600" : "text-slate-600"}`}>
                        {Number(p.currentQuantity)} {UNIT_LABELS[p.unitType as keyof typeof UNIT_LABELS]}
                      </p>
                      <p className="text-xs text-slate-400">in stock</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{selected.name}</p>
                <p className="text-xs text-slate-500">
                  {selected.brand && `${selected.brand} · `}
                  <span className={Number(selected.currentQuantity) <= Number(selected.reorderThreshold) ? "text-amber-600 font-medium" : ""}>
                    {Number(selected.currentQuantity)} {UNIT_LABELS[selected.unitType as keyof typeof UNIT_LABELS]} in stock
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelected(null); setSearch(""); searchRef.current?.focus(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Action */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            2. Action Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {allowedActions.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  action === a ? ACTION_COLORS[a] : ACTION_INACTIVE
                }`}
              >
                {TRANSACTION_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Quantity */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            3. Quantity {selected && `(${UNIT_LABELS[selected.unitType as keyof typeof UNIT_LABELS]})`}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={action === "ADJUSTMENT" ? "Enter new total quantity" : "Enter quantity"}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          {action === "ADJUSTMENT" && (
            <p className="text-xs text-slate-500 mt-1">For adjustments, enter the new total quantity on hand.</p>
          )}
        </div>

        {/* Conditional fields */}
        {(action === "USE" || action === "SELL") && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Client Name <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        )}

        {action === "WASTE" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Waste Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={wasteReason}
              onChange={(e) => setWasteReason(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
            >
              <option value="">Select reason...</option>
              {WASTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        {action === "ADJUSTMENT" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason for Adjustment <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical count correction"
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Performed by — front desk/manager only */}
        {isFrontDeskOrManager && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Performed By <span className="text-slate-400">(if logging on behalf of someone)</span>
            </label>
            <select
              value={performedById}
              onChange={(e) => setPerformedById(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
            >
              <option value="">Myself ({session?.user.name})</option>
              {providers
                .filter((p) => p.id !== session?.user.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Notes <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!selected || !quantity || submitting}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Logging...
            </span>
          ) : (
            `Log ${TRANSACTION_LABELS[action]}`
          )}
        </button>
      </form>
    </div>
  );
}
