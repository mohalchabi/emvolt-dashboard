"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

export type TrendPoint = { date: string; revenue: number; newClients: number };

type Metric = "revenue" | "newClients";

/**
 * Revenue and signups over the chosen period, one metric at a time.
 *
 * Two metrics on one pair of axes would need a second scale — thousands of
 * riyals against a handful of people — and a dual-axis chart invites reading a
 * crossing point as meaningful when it is an artefact of the scaling. Switching
 * is one tap and never lies.
 */
export function TrendChart({
  data,
  t,
  currency,
}: {
  data: TrendPoint[];
  t: Dictionary["reports"];
  /** e.g. "SAR", appended in the tooltip rather than on every axis tick. */
  currency: string;
}) {
  const [metric, setMetric] = useState<Metric>("revenue");

  const hasAny = data.some((d) => d.revenue > 0 || d.newClients > 0);
  const isMoney = metric === "revenue";

  const tabs: { key: Metric; label: string }[] = [
    { key: "revenue", label: t.revenue },
    { key: "newClients", label: t.newClients },
  ];

  // Long ranges get unreadable if every day is labelled.
  const tickEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">{t.trend}</CardTitle>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMetric(tab.key)}
              aria-pressed={metric === tab.key}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                metric === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t.nothingInPeriod}</p>
        ) : (
          // Recharts lays out its geometry assuming LTR and ignores CSS `dir`;
          // under dir="rtl" the browser mirrors the SVG and the axis labels
          // drift away from the data they belong to. Same fix as BarChartCard.
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  interval={tickEvery - 1}
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  allowDecimals={!isMoney}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--popover-foreground)" }}
                  formatter={(value) => [
                    isMoney
                      ? `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`
                      : String(value),
                    isMoney ? t.revenue : t.newClients,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
