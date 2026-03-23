import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

// GET /api/users
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true,
      isActive: true, createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

// POST /api/users
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
  }

  const { email, name, password, role } = await req.json();
  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: role as UserRole },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: user.id,
    action: "CREATE",
    changesAfter: { email, name, role } as object,
    performedById: session.user.id,
  });

  return NextResponse.json(user, { status: 201 });
}
