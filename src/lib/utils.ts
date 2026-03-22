import { ProductCategory, UnitType, TransactionType } from "@prisma/client";

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  BOTOX: "Botox",
  FILLER: "Filler",
  SKINCARE: "Skincare",
  RETAIL: "Retail",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export const UNIT_LABELS: Record<UnitType, string> = {
  VIAL: "Vial",
  SYRINGE: "Syringe",
  BOTTLE: "Bottle",
  BOX: "Box",
  PIECE: "Piece",
  ML: "mL",
  UNIT: "Unit",
};

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  USE: "Used in Treatment",
  SELL: "Sold (Retail)",
  WASTE: "Wasted / Damaged",
  RETURN: "Returned to Stock",
  ADJUSTMENT: "Manual Adjustment",
  RECEIVE: "Received / Purchased",
};

export const TRANSACTION_COLORS: Record<TransactionType, string> = {
  USE: "text-blue-600 bg-blue-50",
  SELL: "text-green-600 bg-green-50",
  WASTE: "text-red-600 bg-red-50",
  RETURN: "text-yellow-600 bg-yellow-50",
  ADJUSTMENT: "text-purple-600 bg-purple-50",
  RECEIVE: "text-emerald-600 bg-emerald-50",
};

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  BOTOX: "bg-violet-100 text-violet-700",
  FILLER: "bg-pink-100 text-pink-700",
  SKINCARE: "bg-teal-100 text-teal-700",
  RETAIL: "bg-amber-100 text-amber-700",
  SUPPLIES: "bg-slate-100 text-slate-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function isLowStock(currentQty: number, threshold: number): boolean {
  return currentQty <= threshold;
}

export function isExpiringSoon(expirationDate: Date | null, days = 30): boolean {
  if (!expirationDate) return false;
  const now = new Date();
  const exp = new Date(expirationDate);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function isExpired(expirationDate: Date | null): boolean {
  if (!expirationDate) return false;
  return new Date(expirationDate) < new Date();
}
