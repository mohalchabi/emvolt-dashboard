import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageThread } from "@/components/portal/message-thread";

export default async function PortalMessagesPage() {
  const { client } = await requireClientSession();

  if (!client.assignedTrainerId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Messages</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have a trainer assigned yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [trainer, messages] = await Promise.all([
    prisma.staff.findUniqueOrThrow({ where: { id: client.assignedTrainerId } }),
    prisma.message.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">Chat with {trainer.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{trainer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageThread
            messages={messages.map((m) => ({
              id: m.id,
              text: m.text,
              createdAt: m.createdAt.toISOString(),
              fromMe: m.authorIsClient,
            }))}
            senderNameForOthers={trainer.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
