import { UserRole } from "@prisma/client";

export function canManageProducts(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canManageUsers(role: UserRole) {
  return role === "ADMIN";
}

export function canDoManualAdjustment(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canViewAllTransactions(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "FRONT_DESK";
}

export function canReceiveStock(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "FRONT_DESK";
}
