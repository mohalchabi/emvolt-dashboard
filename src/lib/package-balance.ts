import { prisma } from "@/lib/db";
import type { Package } from "@/generated/prisma/client";

export type PackageBalance = { used: number; remaining: number };

// Sessions used/remaining are derived from completed Session rows rather than
// a manually-incremented counter, so the balance can never drift out of sync.
export async function packageBalances(
  packages: Pick<Package, "id" | "totalSessions">[]
): Promise<Map<string, PackageBalance>> {
  if (packages.length === 0) return new Map();

  const counts = await prisma.session.groupBy({
    by: ["packageId"],
    where: { packageId: { in: packages.map((p) => p.id) }, status: "completed" },
    _count: { _all: true },
  });
  const usedByPackage = new Map(counts.map((c) => [c.packageId as string, c._count._all]));

  return new Map(
    packages.map((p) => {
      const used = usedByPackage.get(p.id) ?? 0;
      return [p.id, { used, remaining: Math.max(p.totalSessions - used, 0) }];
    })
  );
}
