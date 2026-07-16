import { requireClientSession } from "@/lib/client-auth";
import { PortalNav } from "@/components/portal/portal-nav";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const { client } = await requireClientSession();

  return (
    <div className="flex min-h-full flex-col">
      <PortalNav clientName={client.name} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
