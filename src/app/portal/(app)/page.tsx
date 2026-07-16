import { requireClientSession } from "@/lib/client-auth";

export default async function PortalHomePage() {
  const { client } = await requireClientSession();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Welcome, {client.name}</h1>
      <p className="text-sm text-muted-foreground">Portal home — under construction.</p>
    </div>
  );
}
