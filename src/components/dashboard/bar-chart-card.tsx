"use client";

import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { name: string; value: number };

export function BarChartCard({
  title,
  data,
  unit = "",
  emptyMessage,
}: {
  title: string;
  data: Row[];
  unit?: string;
  emptyMessage?: string;
}) {
  const format = (v: number) => `${v}${unit}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage ?? "No data yet."}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(data.length * 34, 100)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--popover-foreground)" }}
                formatter={(value) => [format(Number(value)), ""]}
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: unknown) => format(Number(v))}
                  style={{ fill: "var(--foreground)", fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
