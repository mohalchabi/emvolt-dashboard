import Link from "next/link";
import { Wallet, ArrowDownLeft, ArrowUpRight, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { PETTY_CASH_CATEGORY, label } from "@/lib/constants";
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
import { Badge } from "@/components/ui/badge";
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
import { RecordDepositDialog } from "@/components/wallet/record-deposit-dialog";
import { RecordPaymentDialog } from "@/components/wallet/record-payment-dialog";
import {
  WalletEntryActions,
  type EntryAttachment,
  type WalletEntryKind,
} from "@/components/wallet/wallet-entry-actions";

type LedgerRow = {
  id: string;
  kind: WalletEntryKind;
  date: Date;
  createdAt: Date;
  payee: string;
  detail: string | null;
  category: string;
  moneyIn: number | null;
  moneyOut: number | null;
  attachments: EntryAttachment[];
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole(["admin"]);

  const { month } = await searchParams;
  // No month means all time — the ledger opens on everything rather than
  // hiding history behind a default period.
  const range = isMonthKey(month) ? monthRange(month) : null;
  const period = range ? month! : ALL_TIME;

  const depositWhere = range ? { receivedAt: { gte: range.start, lt: range.end } } : {};
  const paymentWhere = range ? { paidAt: { gte: range.start, lt: range.end } } : {};

  const [
    allDeposits,
    allPayments,
    priorDeposits,
    priorPayments,
    pettyIssued,
    pettyDocumented,
    deposits,
    payments,
    byCategory,
    firstDeposit,
    firstPayment,
    staff,
  ] = await Promise.all([
    prisma.walletDeposit.aggregate({ _sum: { amount: true } }),
    prisma.walletTransaction.aggregate({ _sum: { amount: true } }),
    range
      ? prisma.walletDeposit.aggregate({
          _sum: { amount: true },
          where: { receivedAt: { lt: range.start } },
        })
      : null,
    range
      ? prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: { paidAt: { lt: range.start } },
        })
      : null,
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { category: PETTY_CASH_CATEGORY },
    }),
    prisma.pettyCashExpense.aggregate({ _sum: { amount: true } }),
    prisma.walletDeposit.findMany({
      where: depositWhere,
      include: { attachments: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.walletTransaction.findMany({
      where: paymentWhere,
      include: {
        attachments: { orderBy: { createdAt: "asc" } },
        payeeStaff: { select: { name: true } },
        _count: { select: { pettyCashSpend: true } },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.walletTransaction.groupBy({
      by: ["category"],
      where: paymentWhere,
      _sum: { amount: true },
    }),
    prisma.walletDeposit.findFirst({ orderBy: { receivedAt: "asc" }, select: { receivedAt: true } }),
    prisma.walletTransaction.findFirst({ orderBy: { paidAt: "asc" }, select: { paidAt: true } }),
    prisma.staff.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const balance = roundMoney((allDeposits._sum.amount ?? 0) - (allPayments._sum.amount ?? 0));
  const openingBalance = roundMoney(
    (priorDeposits?._sum.amount ?? 0) - (priorPayments?._sum.amount ?? 0)
  );
  const received = roundMoney(deposits.reduce((sum, d) => sum + d.amount, 0));
  const paidOut = roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
  const pettyUnaccounted = roundMoney(
    (pettyIssued._sum.amount ?? 0) - (pettyDocumented._sum.amount ?? 0)
  );

  const earliest = [firstDeposit?.receivedAt, firstPayment?.paidAt]
    .filter((date): date is Date => date instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const rows: LedgerRow[] = [
    ...deposits.map((deposit) => ({
      id: deposit.id,
      kind: "deposit" as const,
      date: deposit.receivedAt,
      createdAt: deposit.createdAt,
      payee: deposit.receivedFrom ? `From ${deposit.receivedFrom}` : "Money received",
      detail:
        [deposit.reference && `Ref ${deposit.reference}`, deposit.note]
          .filter(Boolean)
          .join(" · ") || null,
      category: "Money in",
      moneyIn: deposit.amount,
      moneyOut: null,
      attachments: deposit.attachments,
    })),
    ...payments.map((payment) => ({
      id: payment.id,
      kind: "transaction" as const,
      date: payment.paidAt,
      createdAt: payment.createdAt,
      payee: payment.payeeStaff?.name ?? payment.payeeName ?? "—",
      detail:
        [
          label(payment.method),
          payment.note,
          payment.category === PETTY_CASH_CATEGORY &&
            `${payment._count.pettyCashSpend} invoice${payment._count.pettyCashSpend === 1 ? "" : "s"} logged`,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      category: label(payment.category),
      moneyIn: null,
      moneyOut: payment.amount,
      attachments: payment.attachments,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime());

  const spendByCategory = byCategory
    .map((group) => ({ category: group.category, total: roundMoney(group._sum.amount ?? 0) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Every riyal that comes in and goes out, with the bank transfer or invoice behind it
            where there is one. Admins only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RecordDepositDialog />
          <RecordPaymentDialog staff={staff} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WalletTabs />
        <WalletPeriodSelect current={period} months={monthOptions(earliest ?? null)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Cash on hand"
          value={formatSar(balance)}
          sublabel="all time"
          icon={Wallet}
          tone={balance < 0 ? "critical" : "primary"}
        />
        <StatTile
          label="Received"
          value={formatSar(received)}
          sublabel={range ? formatMonth(period) : "all time"}
          icon={ArrowDownLeft}
          tone="good"
        />
        <StatTile
          label="Paid out"
          value={formatSar(paidOut)}
          sublabel={range ? formatMonth(period) : "all time"}
          icon={ArrowUpRight}
          tone="warning"
        />
        <StatTile
          label="Petty cash unaccounted"
          value={formatSar(pettyUnaccounted)}
          sublabel="no invoice yet"
          icon={TriangleAlert}
          tone={pettyUnaccounted > 0 ? "warning" : "good"}
        />
      </div>

      {range && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Figure label={`Balance before ${formatMonth(period)}`} value={formatSar(openingBalance)} />
            <Figure label="Received" value={`+ ${formatSar(received)}`} />
            <Figure label="Paid out" value={`− ${formatSar(paidOut)}`} />
            <Figure
              label="Balance at month end"
              value={formatSar(roundMoney(openingBalance + received - paidOut))}
              strong
            />
          </CardContent>
        </Card>
      )}

      {spendByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Where the money went</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {spendByCategory.map((group) => (
              <div
                key={group.category}
                className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">{label(group.category)}</span>
                <span className="text-sm font-medium">{formatSar(group.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {range
              ? `Nothing recorded in ${formatMonth(period)}.`
              : "Nothing in the wallet yet. Add the money you received to get started."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {rows.map((row) => (
              <div
                key={`${row.kind}-${row.id}`}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{row.payee}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(row.date)}</div>
                  </div>
                  <div
                    className={
                      row.moneyIn !== null
                        ? "shrink-0 font-medium text-emerald-500"
                        : "shrink-0 font-medium"
                    }
                  >
                    {row.moneyIn !== null
                      ? `+ ${formatSar(row.moneyIn)}`
                      : `− ${formatSar(row.moneyOut ?? 0)}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={row.moneyIn !== null ? "secondary" : "outline"}>
                    {row.category}
                  </Badge>
                </div>
                {row.detail && <p className="text-xs text-muted-foreground">{row.detail}</p>}
                <WalletEntryActions
                  kind={row.kind}
                  entryId={row.id}
                  label={`${row.category} — ${row.payee}`}
                  attachments={row.attachments}
                />
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden sm:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>What for</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.kind}-${row.id}`}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.payee}</div>
                        {row.detail && (
                          <div className="text-xs text-muted-foreground">{row.detail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.moneyIn !== null ? "secondary" : "outline"}>
                          {row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-emerald-500">
                        {row.moneyIn !== null ? formatSar(row.moneyIn) : ""}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {row.moneyOut !== null ? formatSar(row.moneyOut) : ""}
                      </TableCell>
                      <TableCell>
                        <WalletEntryActions
                          kind={row.kind}
                          entryId={row.id}
                          label={`${row.category} — ${row.payee}`}
                          attachments={row.attachments}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {pettyUnaccounted > 0 && (
        <p className="text-sm text-muted-foreground">
          {formatSar(pettyUnaccounted)} of petty cash has no invoice against it yet —{" "}
          <Link href="/wallet/petty-cash" className="text-primary hover:underline">
            reconcile it
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Figure({
  label: text,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{text}</span>
      <span className={strong ? "text-base font-semibold" : "text-sm"}>{value}</span>
    </div>
  );
}
