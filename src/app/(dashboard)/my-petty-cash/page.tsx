import { Coins, Receipt, TriangleAlert, Paperclip } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { PETTY_CASH_CATEGORY } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { formatSar, formatDate, roundMoney } from "@/lib/wallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RecordOwnPettyCashBillDialog } from "@/components/wallet/record-own-petty-cash-bill-dialog";

/**
 * The float holder's own view of the petty cash they're carrying: what they
 * were handed, what they've filed bills for, and what's still on them.
 *
 * Reads and writes the very same rows as the admin petty cash screen — there's
 * no separate copy of the data — so anything filed here shows up in the office
 * immediately, and the "still on you" figure is the same subtraction the admin
 * is reconciling against.
 */
export default async function MyPettyCashPage() {
  const session = await requireSession();
  const { t } = await getDictionary();
  const c = t.myPettyCash;

  const floats = await prisma.walletTransaction.findMany({
    where: { category: PETTY_CASH_CATEGORY, payeeStaffId: session.user.id },
    include: {
      pettyCashSpend: {
        include: { attachments: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  const summaries = floats.map((float) => {
    const documented = roundMoney(float.pettyCashSpend.reduce((sum, e) => sum + e.amount, 0));
    return {
      float,
      issued: roundMoney(float.amount),
      documented,
      remaining: roundMoney(float.amount - documented),
    };
  });

  const totals = {
    issued: roundMoney(summaries.reduce((sum, s) => sum + s.issued, 0)),
    documented: roundMoney(summaries.reduce((sum, s) => sum + s.documented, 0)),
    remaining: roundMoney(summaries.reduce((sum, s) => sum + s.remaining, 0)),
    invoices: summaries.reduce((count, s) => count + s.float.pettyCashSpend.length, 0),
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {c.noFloats}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* What's still on them leads and spans the row: it's the number they
              answer for. Three tiles side by side clipped "SAR 1,000.00" and
              truncated the Arabic labels at phone width, so the other two pair
              up underneath instead. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <StatTile
                label={c.remaining}
                value={formatSar(totals.remaining)}
                sublabel={c.remainingHint}
                icon={TriangleAlert}
                tone={totals.remaining > 0 ? "warning" : "good"}
              />
            </div>
            <StatTile label={c.issued} value={formatSar(totals.issued)} icon={Coins} tone="primary" />
            <StatTile
              label={c.documented}
              value={formatSar(totals.documented)}
              sublabel={`${totals.invoices} ${totals.invoices === 1 ? c.invoiceOne : c.invoiceMany}`}
              icon={Receipt}
              tone="good"
            />
          </div>

          {summaries.map(({ float, issued, documented, remaining }) => (
            <Card key={float.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle>{formatSar(issued)}</CardTitle>
                  {/* <bdi> keeps each Latin run (the date, the admin's note) as
                      one unit — without it RTL reorders them into each other. */}
                  <p className="text-sm text-muted-foreground">
                    {c.issuedOn} <bdi>{formatDate(float.paidAt)}</bdi>
                    {float.note ? <> · <bdi>{float.note}</bdi></> : null}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{c.filed} </span>
                    <span className="font-medium">{formatSar(documented)}</span>
                    <span className="text-muted-foreground"> · {c.stillOnYou} </span>
                    <span className={remaining > 0 ? "font-medium text-amber-500" : "font-medium"}>
                      {formatSar(remaining)}
                    </span>
                  </p>
                </div>
                <RecordOwnPettyCashBillDialog issueId={float.id} t={c} />
              </CardHeader>

              <CardContent className="flex flex-col gap-2 pt-0">
                {float.pettyCashSpend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{c.noPurchasesYet}</p>
                ) : (
                  float.pettyCashSpend.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium">
                          <bdi>{expense.vendor}</bdi>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <bdi>{formatDate(expense.spentAt)}</bdi>
                          {expense.description ? <> · <bdi>{expense.description}</bdi></> : null}
                        </span>
                        {/* View-only. Correcting a filed bill is an admin job, so
                            a mistake can't quietly rewrite the reconciliation. */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {expense.attachments.map((attachment, index) => (
                            <a
                              key={attachment.id}
                              href={`/api/wallet-attachments/${attachment.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={attachment.fileName}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              <Paperclip className="size-3" />
                              {index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                      <span className="shrink-0 font-medium whitespace-nowrap">
                        {formatSar(expense.amount)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-muted-foreground">{c.adminNote}</p>
        </>
      )}
    </div>
  );
}
