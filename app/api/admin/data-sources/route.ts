import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { encryptSecret } from "@/lib/crypto";
import { testConnection } from "@/lib/datasource/pool";

export async function GET() {
  const { res } = await requireUser();
  if (res) return res;
  const sources = await prisma.dataSource.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      host: true,
      port: true,
      database: true,
      username: true,
      ssl: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

  const b = await req.json().catch(() => ({}));
  const cfg = {
    host: String(b.host || "").trim(),
    port: Number(b.port) || 3306,
    database: String(b.database || "").trim(),
    username: String(b.username || "").trim(),
    password: String(b.password || ""),
    ssl: Boolean(b.ssl),
  };
  const name = String(b.name || "").trim() || cfg.database || "Data source";

  if (!cfg.host || !cfg.database || !cfg.username) {
    return NextResponse.json(
      { error: "host, database and username are required" },
      { status: 400 },
    );
  }

  const test = await testConnection(cfg);
  if (!test.ok) {
    return NextResponse.json({ error: `Connection failed: ${test.error}` }, { status: 400 });
  }

  const source = await prisma.dataSource.create({
    data: {
      name,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      username: cfg.username,
      ssl: cfg.ssl,
      passwordEnc: encryptSecret(cfg.password),
    },
    select: { id: true, name: true, host: true, port: true, database: true, username: true, ssl: true },
  });
  return NextResponse.json({ source }, { status: 201 });
}
