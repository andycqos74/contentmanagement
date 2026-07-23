import { prisma } from "@/lib/db";
import { DataSourceManager } from "./DataSourceManager";

export const dynamic = "force-dynamic";

export default async function DataSourcesPage() {
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
    },
  });
  return <DataSourceManager initial={sources} />;
}
