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

// Monochrome ink bars: full-adherence days read at full strength, lower
// adherence days fade out proportionally (25% -> 100% opacity).
function barOpacity(pct: number): number {
  return 0.25 + (Math.min(100, Math.max(0, pct)) / 100) * 0.75;
}

export default function AdherenceChart({ history }: { history: DayAdherence[] }) {
  const data = history.map((d) => ({
    day: label(d.dayMs),
    pct: d.pct,
    total: d.total,
    taken: d.taken,
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(22,19,17,0.06)" }}
            formatter={(v: number, _n, p) =>
              [`${v}% (${p.payload.taken}/${p.payload.total})`, "Adherence"] as [string, string]
            }
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--ink)",
            }}
          />
          <Bar dataKey="pct">
            {data.map((d, i) => (
              <Cell key={i} fill="var(--ink)" fillOpacity={barOpacity(d.pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
