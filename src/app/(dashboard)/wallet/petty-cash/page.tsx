import { Coins, Receipt, TriangleAlert, Banknote } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { PETTY_CASH_CATEGORY, label, MANAGER_ROLES } from "@/lib/constants";
import {
  formatSar,
  formatDate,
  formatMonth,
  isMonthKey,
  monthRange,
  monthOptions,
  roundMoney,
} from "@/lib/wallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatTile } from "@/components/dashboard/stat-tile";
import { WalletTabs } from "@/components/wallet/wallet-tabs";
import { WalletPeriodSelect, ALL_TIME } from "@/components/wallet/wallet-period-select";
import { RecordPettyCashBillDialog } from "@/components/wallet/record-petty-cash-bill-dialog";
import { WalletEntryActions } from "@/components/wallet/wallet-entry-actions";

/**
 * Petty cash on its own: what each person was handed, and the VAT invoices
 * they brought back for it. A float only balances once its invoices add up to
 * the amount issued, so "still unaccounted" is the number to watch.
 */
export default async function PettyCashPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireRole([...MANAGER_ROLES]);
  // Floats themselves belong to the ledger, so only the owner may remove one.
  const isAdmin = session.user.role === "admin";

  const { month } = await searchParams;
  const range = isMonthKey(month) ? monthRange(month) : null;
  const period = range ? month! : ALL_TIME;

  const [floats, firstFloat, staff] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: {
        category: PETTY_CASH_CATEGORY,
        ...(range ? { paidAt: { gte: range.start, lt: range.end } } : {}),
      },
      include: {
        attachments: { orderBy: { createdAt: "asc" } },
        payeeStaff: { select: { id: true, name: true } },
        pettyCashSpend: {
          include: {
            attachments: { orderBy: { createdAt: "asc" } },
            spentBy: { select: { id: true, name: true } },
          },
          orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.walletTransaction.findFirst({
      where: { category: PETTY_CASH_CATEGORY },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    }),
    prisma.staff.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const summaries = floats.map((float) => {
    const documented = roundMoney(float.pettyCashSpend.reduce((sum, e) => sum + e.amount, 0));
    const vat = roundMoney(float.pettyCashSpend.reduce((sum, e) => sum + (e.vatAmount ?? 0), 0));
    return {
      float,
      holder: float.payeeStaff?.name ?? float.payeeName ?? "—",
      issued: roundMoney(float.amount),
      documented,
      vat,
      remaining: roundMoney(float.amount - documented),
    };
  });

  const totals = {
    issued: roundMoney(summaries.reduce((sum, s) => sum + s.issued, 0)),
    documented: roundMoney(summaries.reduce((sum, s) => sum + s.documented, 0)),
    vat: roundMoney(summaries.reduce((sum, s) => sum + s.vat, 0)),
    remaining: roundMoney(summaries.reduce((sum, s) => sum + s.remaining, 0)),
    invoices: summaries.reduce((count, s) => count + s.float.pettyCashSpend.length, 0),
  };

  // Same floats grouped by the person holding them, so a coach with several
  // floats reads as one running position rather than scattered rows.
  const byHolder = [...summaries
    .reduce((map, summary) => {
      const key = summary.float.payeeStaff?.id ?? summary.holder;
      const current = map.get(key) ?? { holder: summary.holder, issued: 0, documented: 0, remaining: 0 };
      current.issued = roundMoney(current.issued + summary.issued);
      current.documented = roundMoney(current.documented + summary.documented);
      current.remaining = roundMoney(current.remaining + summary.remaining);
      map.set(key, current);
      return map;
    }, new Map<string, { holder: string; issued: number; documented: number; remaining: number }>())
    .values()].sort((a, b) => b.remaining - a.remaining);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Petty Cash</h1>
        <p className="text-sm text-muted-foreground">
          Cash handed to staff for things the gym needs, and the VAT invoices they brought back for
          it.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WalletTabs showLedger={isAdmin} />
        <WalletPeriodSelect current={period} months={monthOptions(firstFloat?.paidAt ?? null)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Issued"
          value={formatSar(totals.issued)}
          sublabel={range ? formatMonth(period) : "all time"}
          icon={Coins}
          tone="primary"
        />
        <StatTile
          label="Backed by invoices"
          value={formatSar(totals.documented)}
          sublabel={`${totals.invoices} invoice${totals.invoices === 1 ? "" : "s"}`}
          icon={Receipt}
          tone="good"
        />
        <StatTile
          label="Still unaccounted"
          value={formatSar(totals.remaining)}
          sublabel="no invoice yet"
          icon={TriangleAlert}
          tone={totals.remaining > 0 ? "warning" : "good"}
        />
        <StatTile
          label="VAT on invoices"
          value={formatSar(totals.vat)}
          sublabel="as recorded"
          icon={Banknote}
          tone="neutral"
        />
      </div>

      {byHolder.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>By person</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Who</TableHead>
                  <TableHead className="text-right">Issued</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Unaccounted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byHolder.map((holder) => (
                  <TableRow key={holder.holder}>
                    <TableCell className="font-medium">{holder.holder}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatSar(holder.issued)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatSar(holder.documented)}
                    </TableCell>
                    <TableCell
                      className={
                        holder.remaining > 0
                          ? "text-right font-medium whitespace-nowrap text-amber-500"
                          : "text-right whitespace-nowrap text-muted-foreground"
                      }
                    >
                      {formatSar(holder.remaining)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {range
              ? `No petty cash issued in ${formatMonth(period)}.`
              : "No petty cash issued yet. Record a payment on the ledger with “Petty Cash” as what it's for."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {summaries.map(({ float, holder, issued, documented, vat, remaining }) => (
            <Card key={float.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle>
                    {holder} · {formatSar(issued)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Issued {formatDate(float.paidAt)} · {label(float.method)}
                    {float.note ? ` · ${float.note}` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">Float document:</span>
                    <WalletEntryActions
                      kind="transaction"
                      entryId={float.id}
                      label={`Petty cash — ${holder}`}
                      attachments={float.attachments}
                      canDelete={isAdmin}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Invoiced </span>
                    <span className="font-medium">{formatSar(documented)}</span>
                    <span className="text-muted-foreground"> · left </span>
                    <span
                      className={remaining > 0 ? "font-medium text-amber-500" : "font-medium"}
                    >
                      {formatSar(remaining)}
                    </span>
                  </div>
                  <RecordPettyCashBillDialog
                    issueId={float.id}
                    holderName={holder}
                    remaining={remaining}
                    holderId={float.payeeStaff?.id ?? null}
                    staff={staff}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {float.pettyCashSpend.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">
                    No invoices yet — the whole {formatSar(issued)} is still unaccounted for.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Bought from</TableHead>
                          <TableHead>What</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">VAT</TableHead>
                          <TableHead>Invoice</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {float.pettyCashSpend.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDate(expense.spentAt)}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{expense.vendor}</div>
                              {expense.vatNumber && (
                                <div className="text-xs text-muted-foreground">
                                  VAT {expense.vatNumber}
                                </div>
                              )}
                              {/* Only worth showing when it contradicts the
                                  float — otherwise it repeats the card header. */}
                              {expense.spentBy && expense.spentBy.id !== float.payeeStaff?.id && (
                                <div className="text-xs text-amber-500">
                                  bought by {expense.spentBy.name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {expense.description ?? "—"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {formatSar(expense.amount)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                              {expense.vatAmount === null ? "—" : formatSar(expense.vatAmount)}
                            </TableCell>
                            <TableCell>
                              <WalletEntryActions
                                kind="petty_cash_expense"
                                entryId={expense.id}
                                label={`${expense.vendor} — ${formatSar(expense.amount)}`}
                                attachments={expense.attachments}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {vat > 0 && (
                      <p className="px-4 py-3 text-xs text-muted-foreground">
                        {formatSar(vat)} of VAT across these invoices.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
