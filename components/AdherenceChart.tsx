"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayAdherence } from "@/lib/tracker";

function label(dayMs: number): string {
  return new Date(dayMs).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdherenceChart({ history }: { history: DayAdherence[] }) {
  const data = history.map((d) => ({
    day: label(d.dayMs),
    pct: d.pct,
    total: d.total,
    taken: d.taken,
  }));

  const barColor = (pct: number) =>
    pct >= 100 ? "#10b981" : pct >= 50 ? "#f59e0b" : pct > 0 ? "#f43f5e" : "#94a3b8";

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "currentColor" }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(127,127,127,0.1)" }}
            formatter={(v: number, _n, p) =>
              [`${v}% (${p.payload.taken}/${p.payload.total})`, "Adherence"] as [string, string]
            }
            contentStyle={{
              background: "var(--background)",
              border: "1px solid rgba(127,127,127,0.3)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={barColor(d.pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
