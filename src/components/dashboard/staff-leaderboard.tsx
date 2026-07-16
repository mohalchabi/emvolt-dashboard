import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { getStaffLeaderboard } from "@/lib/kpi";
import type { Dictionary } from "@/lib/i18n";

export function StaffLeaderboardCard({
  leaderboard,
  t,
}: {
  leaderboard: Awaited<ReturnType<typeof getStaffLeaderboard>>;
  t: Dictionary["staffLeaderboard"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {leaderboard.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t.noLeadsAssignedYet}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colStaff}</TableHead>
                <TableHead className="text-right">{t.colAssigned}</TableHead>
                <TableHead className="text-right">{t.colTarget}</TableHead>
                <TableHead className="text-right">{t.colContacted}</TableHead>
                <TableHead className="text-right">{t.colNotContacted}</TableHead>
                <TableHead className="text-right">{t.colSaidYes}</TableHead>
                <TableHead className="text-right">{t.colConversion}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((row) => (
                <TableRow key={row.staffId}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.target === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={row.total >= row.target ? "text-emerald-400" : ""}>
                        {row.total}/{row.target}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.contacted}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.notContacted}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.converted}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(row.conversionRate * 100).toFixed(0)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
