import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortalInbodyPage() {
  const { client } = await requireClientSession();

  const results = await prisma.inBodyResult.findMany({
    where: { clientId: client.id },
    orderBy: { takenAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">InBody Results</h1>
        <p className="text-sm text-muted-foreground">Your body-composition scan history.</p>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No InBody results uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <a
              key={r.id}
              href={`/api/inbody/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm hover:bg-accent"
            >
              <span className="font-medium text-primary">
                {r.takenAt.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="text-muted-foreground">{r.fileName}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
