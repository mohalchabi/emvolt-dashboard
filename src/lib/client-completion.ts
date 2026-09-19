import { prisma } from "@/lib/db";
import { packageBalances } from "@/lib/package-balance";

/**
 * Whether a client has worked through everything they bought.
 *
 * A package counts down from sessions marked "completed", so the remaining
 * figure is only as honest as the closing-out. Two clients can both show zero
 * left for very different reasons, and one of them is a filing mistake, so
 * this reports the evidence rather than just the number:
 *
 *  - `remaining` is what the packages say is left
 *  - `upcoming` is what is still booked, which means they aren't done
 *  - `openPast` is classes whose date has passed that nobody closed out
 *
 * A client with `openPast` above zero is not counted as finished however the
 * arithmetic looks, because those classes probably happened and simply were
 * never marked. Deactivating on that basis would be acting on a gap in the
 * records rather than on what the person actually did.
 */
export type ClientCompletion = {
  remaining: number;
  packageCount: number;
  upcoming: number;
  openPast: number;
  /** Bought something, used it all, nothing booked, nothing left hanging. */
  finished: boolean;
  /** Has classes in the past that were never closed out. */
  needsCloseOut: boolean;
};

export async function clientCompletions(
  clientIds: string[],
  now: Date = new Date()
): Promise<Map<string, ClientCompletion>> {
  if (clientIds.length === 0) return new Map();

  const [packages, upcomingRows, openPastRows] = await Promise.all([
    prisma.package.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true, clientId: true, totalSessions: true },
    }),
    prisma.session.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds }, status: "scheduled", datetime: { gte: now } },
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds }, status: "scheduled", datetime: { lt: now } },
      _count: { _all: true },
    }),
  ]);

  const balances = await packageBalances(packages);
  const upcoming = new Map(upcomingRows.map((r) => [r.clientId as string, r._count._all]));
  const openPast = new Map(openPastRows.map((r) => [r.clientId as string, r._count._all]));

  const byClient = new Map<string, { remaining: number; packageCount: number }>();
  for (const pkg of packages) {
    const current = byClient.get(pkg.clientId) ?? { remaining: 0, packageCount: 0 };
    current.remaining += balances.get(pkg.id)?.remaining ?? 0;
    current.packageCount += 1;
    byClient.set(pkg.clientId, current);
  }

  return new Map(
    clientIds.map((id) => {
      const totals = byClient.get(id) ?? { remaining: 0, packageCount: 0 };
      const booked = upcoming.get(id) ?? 0;
      const hanging = openPast.get(id) ?? 0;
      return [
        id,
        {
          ...totals,
          upcoming: booked,
          openPast: hanging,
          finished:
            totals.packageCount > 0 && totals.remaining === 0 && booked === 0 && hanging === 0,
          needsCloseOut: hanging > 0,
        },
      ];
    })
  );
}

/**
 * How many clients have used everything they bought.
 *
 * For the badge on the Clients page, which is why it counts rather than
 * returning rows.
 */
export async function countFinishedClients(now: Date = new Date()): Promise<number> {
  const ids = await prisma.client.findMany({
    where: { status: { not: "churned" } },
    select: { id: true },
  });
  const completions = await clientCompletions(
    ids.map((c) => c.id),
    now
  );
  return [...completions.values()].filter((c) => c.finished).length;
}
