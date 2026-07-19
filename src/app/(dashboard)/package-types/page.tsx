import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewPackageTemplateDialog } from "@/components/package-types/new-package-template-dialog";
import {
  PackageTemplateEditableCells,
  PackageTemplateActiveToggle,
} from "@/components/package-types/package-template-row-actions";

export default async function PackageTypesPage() {
  await requireRole(["admin"]);

  const templates = await prisma.packageTemplate.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }, { sessions: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Package Types</h1>
          <p className="text-sm text-muted-foreground">
            The catalog staff pick from when selling a package. Editing a price here changes it
            for future sales only — it doesn&apos;t touch packages already sold.
          </p>
        </div>
        <NewPackageTemplateDialog />
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No package types yet. Add one to start selling packages from a catalog.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                <PackageTemplateEditableCells template={t} layout="stacked" />
                <PackageTemplateActiveToggle template={t} />
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden sm:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Duration (days)</TableHead>
                    <TableHead>Price (SAR)</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <PackageTemplateEditableCells template={t} layout="row" />
                      <TableCell>
                        <PackageTemplateActiveToggle template={t} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
