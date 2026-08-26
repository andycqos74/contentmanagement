import { getCurrentUser } from "@/lib/auth";
import { NewsAdmin } from "./NewsAdmin";

export default async function NewsPage() {
  const user = await getCurrentUser();
  const defaultAuthor =
    user?.name?.trim() || user?.email?.split("@")[0] || "admin";
  return <NewsAdmin defaultAuthor={defaultAuthor} />;
}
