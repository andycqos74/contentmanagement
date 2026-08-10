import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { UserManager } from "./UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, me] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    getCurrentUser(),
  ]);
  return (
    <UserManager
      initial={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      currentUserId={me?.id ?? ""}
    />
  );
}
