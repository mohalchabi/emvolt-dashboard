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
import { NewStaffDialog } from "@/components/staff/new-staff-dialog";
import {
  StaffRoleSelect,
  StaffSectionSelect,
  StaffTargetInput,
  StaffPhoneInput,
  StaffActiveToggle,
} from "@/components/staff/staff-row-actions";

export default async function StaffPage() {
  const session = await requireRole(["admin"]);

  const staff = await prisma.staff.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            {staff.length} staff member{staff.length === 1 ? "" : "s"}. This list is the sign-in
            allow-list — deactivating someone here blocks their access immediately.
          </p>
        </div>
        <NewStaffDialog />
      </div>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No staff yet.</CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {staff.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                <div>
                  <div className="font-medium">
                    {s.name}
                    {s.id === session.user.id && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{s.email}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StaffRoleSelect staff={s} />
                  <StaffSectionSelect staff={s} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <StaffPhoneInput staff={s} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Lead target</span>
                  <StaffTargetInput staff={s} />
                </div>
                <StaffActiveToggle staff={s} isSelf={s.id === session.user.id} />
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
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Lead Target</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.name}
                        {s.id === session.user.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.email}</TableCell>
                      <TableCell>
                        <StaffPhoneInput staff={s} />
                      </TableCell>
                      <TableCell>
                        <StaffRoleSelect staff={s} />
                      </TableCell>
                      <TableCell>
                        <StaffSectionSelect staff={s} />
                      </TableCell>
                      <TableCell>
                        <StaffTargetInput staff={s} />
                      </TableCell>
                      <TableCell>
                        <StaffActiveToggle staff={s} isSelf={s.id === session.user.id} />
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
