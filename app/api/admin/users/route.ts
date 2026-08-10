import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

// All users share the same widgets, data sources and CDN connection — there is no
// per-user scoping — so adding a user simply grants another login to the workspace.
export async function GET() {
  const { res } = await requireUser();
  if (res) return res;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: { email, name: name || null, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create the user" }, { status: 500 });
  }
}
