import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { UserRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// PUT /api/users/:id — update name, email, role, isActive (ADMIN only)
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const before = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = body.email !== before.email
    ? await prisma.user.findUnique({ where: { email: body.email } })
    : null;
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email,
      role: body.role as UserRole,
      isActive: body.isActive ?? before.isActive,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: id,
    action: "UPDATE",
    changesBefore: before as unknown as object,
    changesAfter: updated as unknown as object,
    performedById: session.user.id,
  });

  return NextResponse.json(updated);
}

// DELETE /api/users/:id — soft delete (deactivate), ADMIN only, can't delete self
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: id,
    action: "DEACTIVATE",
    changesAfter: { isActive: false } as object,
    performedById: session.user.id,
  });

  return NextResponse.json(user);
}
