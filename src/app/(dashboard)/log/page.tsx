"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  cn,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  UNIT_LABELS,
  TRANSACTION_LABELS,
  formatRelativeTime,
  getQuickAmounts,
} from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import type { ProductCategory } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  unitType: string;
  currentQuantity: number;
  reorderThreshold: number;
  defaultUsageAmount: number | null;
}

interface RecentTx {
  productId: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface UndoData {
  transactionId: string;
  productId: string;
  qty: number;
  prevQty: number;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
  undoData?: UndoData;
}

const WASTE_REASONS = [
  { value: "EXPIRED", label: "Expired" },
  { value: "CONTAMINATED", label: "Contaminated" },
  { value: "SPILLED", label: "Spilled" },
  { value: "CLIENT_REACTION", label: "Client Reaction" },
  { value: "OTHER", label: "Other" },
];

const ALL_CATS = ["ALL", "BOTOX", "FILLER", "SKINCARE", "RETAIL", "SUPPLIES", "OTHER"] as const;

// ─── Quick Action Sheet ───────────────────────────────────────────────────────

function QuickActionSheet({
  product,
  currentQty,
  providers,
  sessionUserId,
  sessionUserName,
  defaultQty,
  onLog,
  onClose,
  onSetDefault,
}: {
  product: Product;
  currentQty: number;
  providers: User[];
  sessionUserId: string;
  sessionUserName: string;
  defaultQty: number | null;
  onLog: (product: Product, qty: number, clientName: string, performedById: string) => Promise<void>;
  onClose: () => void;
  onSetDefault: (id: string, qty: number) => void;
}) {
  const quickAmounts = getQuickAmounts(product.category);
  const [selectedQty, setSelectedQty] = useState<number | null>(defaultQty ?? quickAmounts[0]);
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState(defaultQty ? String(defaultQty) : "");
  const [clientName, setClientName] = useState("");
  const [performedById, setPerformedById] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const unitLabel = UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS] ?? product.unitType;
  const finalQty = customMode ? (Number(customVal) || 0) : (selectedQty ?? 0);
  const isLow = currentQty <= Number(product.reorderThreshold);

  async function handleLog() {
    if (!finalQty || finalQty <= 0) return;
    if (saveDefault) onSetDefault(product.id, finalQty);
    setSubmitting(true);
    await onLog(product, finalQty, clientName, performedById || sessionUserId);
    setSubmitting(false);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-sheet-up">
        <div className="max-w-lg mx-auto px-6 pt-4 pb-8">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-1.5",
                CATEGORY_COLORS[product.category as ProductCategory] ?? "bg-slate-100 text-slate-700"
              )}>
                {CATEGORY_LABELS[product.category as ProductCategory] ?? product.category}
              </span>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{product.name}</h2>
              <p className={cn("text-sm mt-0.5", isLow ? "text-amber-600 font-medium" : "text-slate-500")}>
                {currentQty} {unitLabel} in stock{isLow ? " · Low stock ⚠" : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-3 shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amount</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => { setSelectedQty(amt); setCustomMode(false); }}
                className={cn(
                  "py-3.5 rounded-2xl text-sm font-semibold transition-all border-2 min-h-[60px]",
                  selectedQty === amt && !customMode
                    ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200"
                    : "bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                )}
              >
                {amt}
                <span className="block text-xs font-normal opacity-70 mt-0.5">{unitLabel}</span>
              </button>
            ))}
            <button
              onClick={() => { setCustomMode(true); setSelectedQty(null); }}
              className={cn(
                "py-3.5 rounded-2xl text-sm font-semibold transition-all border-2 min-h-[60px]",
                customMode
                  ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200"
                  : "bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50"
              )}
            >
              ✎
              <span className="block text-xs font-normal opacity-70 mt-0.5">Custom</span>
            </button>
          </div>

          {customMode && (
            <input
              type="number" min="0.01" step="0.01" value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              placeholder={`Quantity in ${unitLabel}`}
              autoFocus
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
            />
          )}

          <input
            type="text" value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name (optional)"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-3"
          />

          {providers.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Requested by</label>
              <select
                value={performedById} onChange={(e) => setPerformedById(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="">Myself ({sessionUserName})</option>
                {providers.filter((p) => p.id !== sessionUserId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {finalQty > 0 && (
            <button
              onClick={() => setSaveDefault(!saveDefault)}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors mb-4"
            >
              <div className={cn(
                "w-10 h-6 rounded-full transition-colors shrink-0 flex items-center px-0.5",
                saveDefault ? "bg-violet-600" : "bg-slate-300"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded-full bg-white shadow transition-transform",
                  saveDefault ? "translate-x-4" : "translate-x-0"
                )} />
              </div>
              <span className="text-sm text-slate-600">Set {finalQty} {unitLabel} as 1-tap default</span>
            </button>
          )}

          <button
            onClick={handleLog}
            disabled={finalQty <= 0 || submitting}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl text-base transition-colors min-h-[56px] shadow-lg shadow-violet-200 disabled:shadow-none"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging...
              </span>
            ) : finalQty > 0 ? (
              `Log ${finalQty} ${unitLabel}`
            ) : (
              "Select an amount"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  qty,
  lastUsedAt,
  isFavorite,
  defaultQty,
  onTap,
  onOpenSheet,
  onToggleFavorite,
  size = "normal",
  highlighted,
  disabled,
}: {
  product: Product;
  qty: number;
  lastUsedAt?: string;
  isFavorite: boolean;
  defaultQty: number | null;
  onTap: (product: Product) => void;
  onOpenSheet: (product: Product) => void;
  onToggleFavorite: (id: string) => void;
  size?: "large" | "normal";
  highlighted?: boolean;
  disabled?: boolean;
}) {
  const isLow = qty <= Number(product.reorderThreshold);
  const unitLabel = UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS] ?? product.unitType;
  const threshold = Number(product.reorderThreshold);
  const stockPct = threshold > 0 ? Math.min(qty / (threshold * 4), 1) : Math.min(qty / 20, 1);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onOpenSheet(product);
    }, 500);
  }, [disabled, onOpenSheet, product]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || longPressTriggered.current) return;
    onTap(product);
  }, [disabled, onTap, product]);

  return (
    <div
      className={cn(
        "relative bg-white border rounded-2xl overflow-hidden transition-all select-none flex flex-col",
        size === "large" ? "min-h-[100px] min-w-[164px] max-w-[200px]" : "min-h-[80px] min-w-[140px] max-w-[170px]",
        isLow ? "border-amber-200 hover:border-amber-300" : "border-slate-200 hover:border-violet-200",
        "hover:shadow-md",
        highlighted ? "animate-log-flash" : "",
        disabled ? "opacity-60" : ""
      )}
    >
      {/* Action buttons */}
      <div className="absolute top-2 right-1.5 flex flex-col gap-1 z-10">
        <button
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded-full transition-colors",
            isFavorite ? "text-amber-400" : "text-slate-300 hover:text-amber-300"
          )}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
          onClick={(e) => { e.stopPropagation(); onOpenSheet(product); }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Main tap area */}
      <button
        className={cn(
          "flex-1 text-left w-full transition-colors touch-manipulation",
          disabled ? "cursor-default" : "cursor-pointer hover:bg-violet-50 active:bg-violet-100 group/tap"
        )}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        disabled={disabled}
      >
        <div className="p-3 pr-8">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mb-1.5 leading-tight",
            CATEGORY_COLORS[product.category as ProductCategory] ?? "bg-slate-100 text-slate-700"
          )}>
            {CATEGORY_LABELS[product.category as ProductCategory] ?? product.category}
          </span>

          <p className={cn(
            "font-semibold text-slate-900 leading-tight line-clamp-2",
            size === "large" ? "text-sm" : "text-xs"
          )}>
            {product.name}
          </p>

          <div className="mt-2 flex items-baseline gap-1">
            <span className={cn(
              "font-bold leading-none",
              size === "large" ? "text-2xl" : "text-xl",
              isLow ? "text-amber-600" : "text-slate-900"
            )}>
              {qty}
            </span>
            <span className="text-xs text-slate-400">{unitLabel}</span>
            {isLow && <span className="text-amber-500 text-xs">⚠</span>}
          </div>

          <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                stockPct >= 0.5 ? "bg-green-400" : stockPct >= 0.25 ? "bg-amber-400" : "bg-red-400"
              )}
              style={{ width: `${Math.max(stockPct * 100, 4)}%` }}
            />
          </div>

          {lastUsedAt && (
            <p className="text-xs text-slate-400 mt-1 truncate">{formatRelativeTime(lastUsedAt)}</p>
          )}
        </div>

        {/* Tap CTA strip — shows default usage or generic prompt */}
        <div className="px-3 pb-2.5 pt-0">
          <span className={cn(
            "text-xs font-semibold transition-colors",
            defaultQty !== null
              ? "text-violet-600 group-hover/tap:text-violet-700"
              : "text-slate-400 group-hover/tap:text-violet-500"
          )}>
            {defaultQty !== null ? `Tap = ${defaultQty} ${unitLabel}` : "Tap to log →"}
          </span>
        </div>
      </button>
    </div>
  );
}

// ─── Advanced Log Form ────────────────────────────────────────────────────────

function AdvancedLogForm({
  products,
  providers,
  session,
  isFrontDeskOrManager,
  canAdjust,
  canReceive,
  onSuccess,
}: {
  products: Product[];
  providers: User[];
  session: { user: { id: string; name: string; role: string } } | null;
  isFrontDeskOrManager: boolean;
  canAdjust: boolean;
  canReceive: boolean;
  onSuccess: () => void;
}) {
  const ACTION_TYPES = ["USE", "SELL", "WASTE", "RETURN", "ADJUSTMENT", "RECEIVE"] as const;
  type ActionType = (typeof ACTION_TYPES)[number];

  const allowedActions = ACTION_TYPES.filter((t) => {
    if (t === "ADJUSTMENT" && !canAdjust) return false;
    if (t === "RECEIVE" && !canReceive) return false;
    return true;
  });

  const ACTION_COLORS: Record<ActionType, string> = {
    USE: "bg-blue-600 text-white border-blue-600",
    SELL: "bg-green-600 text-white border-green-600",
    WASTE: "bg-red-600 text-white border-red-600",
    RETURN: "bg-yellow-600 text-white border-yellow-600",
    ADJUSTMENT: "bg-purple-600 text-white border-purple-600",
    RECEIVE: "bg-emerald-600 text-white border-emerald-600",
  };

  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState("");
  const [action, setAction] = useState<ActionType>("USE");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [wasteReason, setWasteReason] = useState("");
  const [performedById, setPerformedById] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showAdjConfirm, setShowAdjConfirm] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setFiltered([]); setShowDrop(false); return; }
    const q = search.toLowerCase();
    const m = products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q)
    );
    setFiltered(m.slice(0, 8));
    setShowDrop(m.length > 0);
  }, [search, products]);

  // Reset confirmation when key inputs change
  useEffect(() => { setShowAdjConfirm(false); }, [action, selected, qty]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !qty) return;

    // ADJUSTMENT: show confirmation panel first
    if (action === "ADJUSTMENT" && !showAdjConfirm) {
      setShowAdjConfirm(true);
      return;
    }

    setSubmitting(true);
    setError("");
    setShowAdjConfirm(false);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selected.id,
        transactionType: action,
        quantity: Number(qty),
        performedById: performedById || session?.user.id,
        clientName: clientName || null,
        notes: notes || null,
        reason: reason || null,
        wasteReason: wasteReason || null,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSelected(null); setSearch(""); setQty(""); setClientName("");
      setNotes(""); setReason(""); setWasteReason(""); setPerformedById(""); setAction("USE");
      onSuccess();
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong.");
    }
  }

  const unitLabel = selected
    ? (UNIT_LABELS[selected.unitType as keyof typeof UNIT_LABELS] ?? selected.unitType)
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Product search */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Product</label>
        <div className="relative">
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); if (selected && e.target.value !== selected.name) setSelected(null); }}
            onFocus={() => search && setShowDrop(filtered.length > 0)}
            placeholder="Search by name or brand..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            autoComplete="off"
          />
          {showDrop && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id} type="button"
                  onClick={() => { setSelected(p); setSearch(p.name); setShowDrop(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.brand} · {p.category}</p>
                  </div>
                  <span className={cn("text-xs font-medium ml-4", Number(p.currentQuantity) <= Number(p.reorderThreshold) ? "text-amber-600" : "text-slate-500")}>
                    {Number(p.currentQuantity)} {UNIT_LABELS[p.unitType as keyof typeof UNIT_LABELS]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Action</label>
        <div className="grid grid-cols-3 gap-2">
          {allowedActions.map((a) => (
            <button
              key={a} type="button" onClick={() => setAction(a)}
              className={cn(
                "py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all min-h-[44px]",
                action === a ? ACTION_COLORS[a] : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {TRANSACTION_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {action === "ADJUSTMENT" ? "New Total Quantity" : "Quantity"}{unitLabel ? ` (${unitLabel})` : ""}
        </label>
        <input
          type="number" min="0" step="0.01" value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder={action === "ADJUSTMENT" ? "Enter new total quantity" : "Enter quantity"}
          required
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        {action === "ADJUSTMENT" && selected && qty && (
          <p className="text-xs text-slate-500 mt-1">
            Current: {Number(selected.currentQuantity)} → New: {qty} {unitLabel}
            {" "}({Number(qty) >= Number(selected.currentQuantity) ? "+" : ""}{Number(qty) - Number(selected.currentQuantity)})
          </p>
        )}
      </div>

      {/* Conditional fields */}
      {(action === "USE" || action === "SELL") && (
        <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
          placeholder="Client name (optional)"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      )}
      {action === "WASTE" && (
        <select value={wasteReason} onChange={(e) => setWasteReason(e.target.value)} required
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          <option value="">Select waste reason...</option>
          {WASTE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      )}
      {action === "ADJUSTMENT" && (
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for adjustment (required)" required
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      )}

      {/* Requested by */}
      {isFrontDeskOrManager && providers.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Requested by</label>
          <select value={performedById} onChange={(e) => setPerformedById(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="">Myself ({session?.user.name})</option>
            {providers.filter((p) => p.id !== session?.user.id).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)" rows={2}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
      />

      {/* ADJUSTMENT confirmation panel — shown before applying */}
      {showAdjConfirm && selected && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Confirm Manual Adjustment</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Set <strong>{selected.name}</strong> from <strong>{Number(selected.currentQuantity)} {unitLabel}</strong> to <strong>{qty} {unitLabel}</strong>?
              </p>
              {reason && <p className="text-xs text-amber-600 mt-1">Reason: {reason}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl text-sm min-h-[44px] transition-colors">
              {submitting ? "Applying..." : "Confirm Adjustment"}
            </button>
            <button type="button" onClick={() => setShowAdjConfirm(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 min-h-[44px] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Submit */}
      {!showAdjConfirm && (
        <button
          type="submit"
          disabled={!selected || !qty || submitting}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl text-sm transition-colors min-h-[48px]"
        >
          {submitting ? "Logging..." : action === "ADJUSTMENT" ? "Preview Adjustment →" : `Log ${TRANSACTION_LABELS[action]}`}
        </button>
      )}
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LogPage() {
  const { data: session } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const [providers, setProviders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [justLogged, setJustLogged] = useState<Set<string>>(new Set());

  // Double-tap prevention: tracks product IDs with in-flight API calls
  const tappingRef = useRef(new Set<string>());

  const { favorites, toggleFavorite } = useFavorites();

  const isFrontDeskOrManager =
    session?.user.role === "FRONT_DESK" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "ADMIN";

  // Fetch products immediately — don't wait for session
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((prods) => { setProducts(Array.isArray(prods) ? prods : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Fetch per-user data once session is available
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/transactions?performedById=${session.user.id}&limit=30`)
      .then((r) => r.json())
      .then((txs) => setRecentTxs(Array.isArray(txs) ? txs : []))
      .catch(() => {});
    if (isFrontDeskOrManager) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((users: User[]) =>
          setProviders(users.filter((u) => ["PROVIDER", "FRONT_DESK", "MANAGER"].includes(u.role)))
        );
    }
  }, [session?.user?.id, isFrontDeskOrManager]);

  const { recentProductIds, lastUsedTimes } = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    const times: Record<string, string> = {};
    for (const tx of recentTxs) {
      if (!seen.has(tx.productId)) { seen.add(tx.productId); ids.push(tx.productId); }
      if (!times[tx.productId]) times[tx.productId] = tx.createdAt;
    }
    return { recentProductIds: ids.slice(0, 8), lastUsedTimes: times };
  }, [recentTxs]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const getQty = useCallback(
    (product: Product) => qtys[product.id] ?? Number(product.currentQuantity),
    [qtys]
  );

  // Toast helper — undoable toasts stay 5s, others 3s
  const addToast = useCallback((
    message: string,
    type: "success" | "error" = "success",
    undoData?: UndoData
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, undoData }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), undoData ? 5000 : 3000);
  }, []);

  // Shared refresh helper
  const refreshData = useCallback(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      session?.user?.id
        ? fetch(`/api/transactions?performedById=${session.user.id}&limit=30`).then((r) => r.json())
        : Promise.resolve([]),
    ]).then(([prods, txs]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setRecentTxs(Array.isArray(txs) ? txs : []);
      setQtys({});
    }).catch((err) => console.error("Log page refresh failed:", err));
  }, [session?.user?.id]);

  // Core log function: double-tap safe, optimistic, supports undo
  const doLog = useCallback(
    async (product: Product, qty: number, clientName: string, performedById: string) => {
      // Prevent duplicate API calls from rapid taps
      if (tappingRef.current.has(product.id)) return;
      tappingRef.current.add(product.id);

      const prevQty = getQty(product);
      const unitLabel = UNIT_LABELS[product.unitType as keyof typeof UNIT_LABELS] ?? product.unitType;

      // Optimistic stock update
      setQtys((prev) => ({ ...prev, [product.id]: prevQty - qty }));

      // Flash highlight
      setJustLogged((prev) => new Set([...prev, product.id]));
      setTimeout(() =>
        setJustLogged((prev) => { const n = new Set(prev); n.delete(product.id); return n; }), 1000
      );

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          transactionType: "USE",
          quantity: qty,
          performedById: performedById || session?.user?.id,
          clientName: clientName || null,
        }),
      });

      // Release lock after minimum 800ms (prevents rapid re-tap)
      setTimeout(() => tappingRef.current.delete(product.id), 800);

      if (!res.ok) {
        setQtys((prev) => ({ ...prev, [product.id]: prevQty }));
        addToast("Failed to log. Try again.", "error");
        return;
      }

      const tx = await res.json();

      // Success toast with 5s undo window
      addToast(
        `+${qty} ${unitLabel} · ${product.name}`,
        "success",
        { transactionId: tx.id, productId: product.id, qty, prevQty }
      );

      setSheetOpen(false);
      refreshData();
    },
    [getQty, session?.user?.id, addToast, refreshData]
  );

  // Undo: reverse a recent transaction (within 5-min server window)
  const handleUndo = useCallback(async (toast: Toast) => {
    if (!toast.undoData) return;
    const { transactionId, productId, prevQty } = toast.undoData;

    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    setQtys((prev) => ({ ...prev, [productId]: prevQty })); // optimistic restore

    const res = await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reversalReason: "Undo" }),
    });

    if (!res.ok) {
      // Revert optimistic update if server rejected the undo
      setQtys((prev) => ({ ...prev, [productId]: prevQty - toast.undoData!.qty }));
      const d = await res.json().catch(() => ({}));
      addToast(d.error ?? "Undo failed — transaction was kept.", "error");
      return;
    }

    addToast("Undo successful — stock restored");
    refreshData();
  }, [addToast, refreshData]);

  const handleSetDefault = useCallback((productId: string, qty: number) => {
    setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, defaultUsageAmount: qty } : p));
    fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultUsageAmount: qty }),
    }).catch(() => {});
  }, []);

  const handleTap = useCallback(
    (product: Product) => {
      const def = product.defaultUsageAmount;
      if (def != null && def > 0) {
        doLog(product, def, "", session?.user?.id ?? "");
      } else {
        setSelectedProduct(product);
        setSheetOpen(true);
      }
    },
    [doLog, session?.user?.id]
  );

  const handleOpenSheet = useCallback((product: Product) => {
    setSelectedProduct(product);
    setSheetOpen(true);
  }, []);

  const favoriteProducts = useMemo(
    () => [...favorites].map((id) => productMap.get(id)).filter(Boolean) as Product[],
    [favorites, productMap]
  );

  const recentProducts = useMemo(
    () => recentProductIds.map((id) => productMap.get(id)).filter(Boolean) as Product[],
    [recentProductIds, productMap]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (catFilter !== "ALL" && p.category !== catFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, catFilter, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log Usage</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Tap to log instantly · ⋯ for options · ★ to favorite
          </p>
        </div>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
            showAdvanced ? "bg-slate-200 text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Advanced
          <svg
            className={cn("w-4 h-4 transition-transform", showAdvanced ? "rotate-180" : "")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Advanced form */}
      {showAdvanced && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-slide-up">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Advanced Log</h2>
          <AdvancedLogForm
            products={products}
            providers={providers}
            session={session}
            isFrontDeskOrManager={isFrontDeskOrManager}
            canAdjust={session?.user.role === "MANAGER" || session?.user.role === "ADMIN"}
            canReceive={session?.user.role !== "PROVIDER"}
            onSuccess={() => {
              addToast("Transaction logged");
              refreshData();
            }}
          />
        </div>
      )}

      {/* ─── FAVORITES ─── */}
      {favoriteProducts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Favorites</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {favoriteProducts.map((p) => (
              <ProductCard
                key={p.id} product={p} qty={getQty(p)}
                lastUsedAt={lastUsedTimes[p.id]} isFavorite={true}
                defaultQty={p.defaultUsageAmount ?? null}
                onTap={handleTap} onOpenSheet={handleOpenSheet} onToggleFavorite={toggleFavorite}
                size="large" highlighted={justLogged.has(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── RECENTLY USED ─── */}
      {recentProducts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recently Used</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {recentProducts.map((p) => (
              <ProductCard
                key={p.id} product={p} qty={getQty(p)}
                lastUsedAt={lastUsedTimes[p.id]} isFavorite={favorites.has(p.id)}
                defaultQty={p.defaultUsageAmount ?? null}
                onTap={handleTap} onOpenSheet={handleOpenSheet} onToggleFavorite={toggleFavorite}
                size="normal" highlighted={justLogged.has(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── ALL PRODUCTS ─── */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-44">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {ALL_CATS.map((cat) => (
              <button
                key={cat} onClick={() => setCatFilter(cat)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px]",
                  catFilter === cat ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat === "ALL" ? "All" : CATEGORY_LABELS[cat as ProductCategory] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id} product={p} qty={getQty(p)}
                lastUsedAt={lastUsedTimes[p.id]} isFavorite={favorites.has(p.id)}
                defaultQty={p.defaultUsageAmount ?? null}
                onTap={handleTap} onOpenSheet={handleOpenSheet} onToggleFavorite={toggleFavorite}
                size="normal" highlighted={justLogged.has(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── QUICK ACTION SHEET ─── */}
      {sheetOpen && selectedProduct && (
        <QuickActionSheet
          product={selectedProduct}
          currentQty={getQty(selectedProduct)}
          providers={isFrontDeskOrManager ? providers : []}
          sessionUserId={session?.user?.id ?? ""}
          sessionUserName={session?.user?.name ?? ""}
          defaultQty={selectedProduct.defaultUsageAmount ?? null}
          onLog={doLog}
          onClose={() => setSheetOpen(false)}
          onSetDefault={handleSetDefault}
        />
      )}

      {/* ─── TOASTS ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col-reverse gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-up pointer-events-auto",
              t.type === "success" ? "bg-slate-900 text-white" : "bg-red-600 text-white"
            )}
          >
            {t.type === "success" ? (
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="whitespace-nowrap">{t.message}</span>
            {t.undoData && (
              <button
                onClick={() => handleUndo(t)}
                className="ml-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors shrink-0 min-h-[28px]"
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
