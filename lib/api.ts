import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// Gate an admin API route. Usage:
//   const { user, res } = await requireUser();
//   if (res) return res;
export async function requireUser(): Promise<
  { user: User; res: null } | { user: null; res: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, res: null };
}
