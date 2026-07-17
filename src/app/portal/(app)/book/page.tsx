import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/db";
import { packageBalances } from "@/lib/package-balance";
import { getAvailableSlots } from "@/lib/portal-availability";
import { localDateString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookSessionForm } from "@/components/portal/book-session-form";

function parseDateParam(raw: string | undefined): Date {
  if (raw) {
    const d = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export default async function PortalBookPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { client } = await requireClientSession();
  const params = await searchParams;
  const date = parseDateParam(params.date);

  if (!client.assignedTrainerId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Book a Session</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have a trainer assigned yet — please contact the studio to book a session.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [packages, trainer, slots] = await Promise.all([
    prisma.package.findMany({ where: { clientId: client.id }, orderBy: { purchaseDate: "desc" } }),
    prisma.staff.findUniqueOrThrow({ where: { id: client.assignedTrainerId } }),
    getAvailableSlots(client.assignedTrainerId, date),
  ]);

  const balances = await packageBalances(packages);
  const bookablePackages = packages.filter((p) => {
    const bal = balances.get(p.id);
    const notExpired = !p.expiryDate || p.expiryDate >= new Date();
    return bal && bal.remaining > 0 && notExpired;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Book a Session</h1>
        <p className="text-sm text-muted-foreground">With {trainer.name}.</p>
      </div>

      {bookablePackages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have any packages with sessions remaining. Request a renewal from the Packages page.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose a time</CardTitle>
          </CardHeader>
          <CardContent>
            <BookSessionForm
              packages={bookablePackages.map((p) => ({ id: p.id, name: p.name }))}
              date={localDateString(date)}
              slots={slots.map((s) => s.toISOString())}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
