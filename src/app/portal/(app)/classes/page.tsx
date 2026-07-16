import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/db";
import { label } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "outline",
  completed: "default",
  cancelled: "secondary",
  no_show: "destructive",
};

export default async function PortalClassesPage() {
  const { client } = await requireClientSession();
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    prisma.session.findMany({
      where: { clientId: client.id, status: "scheduled", datetime: { gte: now } },
      orderBy: { datetime: "asc" },
      include: { trainer: true },
    }),
    prisma.session.findMany({
      where: {
        clientId: client.id,
        OR: [{ status: { not: "scheduled" } }, { datetime: { lt: now } }],
      },
      orderBy: { datetime: "desc" },
      take: 15,
      include: { trainer: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">My Classes</h1>
        <p className="text-sm text-muted-foreground">Your upcoming and past sessions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming sessions.</p>}
          {upcoming.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{label(s.type)}</Badge>
                  <span className="font-medium">with {s.trainer.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {s.datetime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} at{" "}
                  {s.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <Badge variant={STATUS_VARIANT[s.status]}>{label(s.status)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {past.length === 0 && <p className="text-sm text-muted-foreground">No past sessions yet.</p>}
          {past.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{label(s.type)}</Badge>
                  <span className="font-medium">with {s.trainer.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {s.datetime.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <Badge variant={STATUS_VARIANT[s.status]}>{label(s.status)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
