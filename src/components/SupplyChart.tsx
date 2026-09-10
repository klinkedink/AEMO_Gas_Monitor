import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesDef, SeriesPoint } from "../types";
import { sumPoint } from "../lib/aggregate";

interface Props {
  data: SeriesPoint[];
  series: SeriesDef[];
  stacked?: boolean;
  scrollLegend?: boolean;
}

function formatTj(n: number): string {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function CustomTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string; payload?: SeriesPoint }>;
  label?: string;
  series: SeriesDef[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const keys = series.map((s) => s.key);
  const total = point ? sumPoint(point, keys) : 0;
  const rows = [...payload]
    .filter((p) => typeof p.value === "number" && p.value !== 0)
    .sort((a, b) => Number(b.value) - Number(a.value));
  const shown = rows.slice(0, 14);
  const rest = rows.length - shown.length;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      <div className="chart-tooltip-total">
        Total {formatTj(total)} <span>TJ/d</span>
      </div>
      <ul>
        {shown.map((row) => (
          <li key={String(row.dataKey)}>
            <span className="swatch" style={{ background: row.color }} />
            <span className="name">{row.dataKey}</span>
            <span className="val">{formatTj(Number(row.value))}</span>
          </li>
        ))}
      </ul>
      {rest > 0 ? <div className="chart-tooltip-more">+{rest} more series</div> : null}
    </div>
  );
}

export function SupplyChart({ data, series, stacked = true, scrollLegend = false }: Props) {
  const legend = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        last: data.length ? Number(data[data.length - 1][s.key] ?? 0) : 0,
      })),
    [series, data],
  );

  return (
    <div className="supply-chart">
      <div className="supply-chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(232, 226, 210, 0.08)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#b7b09f", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#b7b09f", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => formatTj(v)}
            />
            <Tooltip
              content={<CustomTooltip series={series} />}
              cursor={{ stroke: "rgba(232, 226, 210, 0.25)" }}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId={stacked ? "supply" : s.key}
                stroke={s.color}
                fill={s.color}
                fillOpacity={stacked ? 0.72 : 0.28}
                strokeWidth={stacked ? 1 : 2}
                isAnimationActive={series.length < 20}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className={`chart-legend ${scrollLegend ? "scroll" : ""}`}>
        {legend.map((s) => (
          <li key={s.key}>
            <span className="swatch" style={{ background: s.color }} />
            <span className="legend-name" title={s.label}>
              {s.label}
            </span>
            <span className="legend-val">{formatTj(s.last)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
