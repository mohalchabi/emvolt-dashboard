import { requireClientSession } from "@/lib/client-auth";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  await requireClientSession();
  return <div className="flex min-h-full flex-col">{children}</div>;
}
