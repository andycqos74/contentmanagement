import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

// Update a user's name and/or reset their password.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const data: { name?: string | null; passwordHash?: string } = {};
  if (typeof body.name === "string") data.name = body.name.trim() || null;
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const user = await prisma.user
    .update({ where: { id }, data, select: { id: true, email: true, name: true, createdAt: true } })
    .catch(() => null);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (res) return res;
  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }
  if ((await prisma.user.count()) <= 1) {
    return NextResponse.json({ error: "Can't delete the last remaining user." }, { status: 400 });
  }
  // Widgets keep working — createdById is set null on delete, nothing is scoped per user.
  await prisma.user.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
