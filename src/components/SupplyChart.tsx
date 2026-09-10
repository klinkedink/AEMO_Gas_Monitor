import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesDef, SeriesPoint } from "../types";
import { sumPoint } from "../lib/aggregate";
import { formatChartTick, formatLongDateKey, spanDays } from "../lib/dates";
import { formatTj } from "../lib/format";

interface Props {
  data: SeriesPoint[];
  series: SeriesDef[];
  kind?: "area" | "bar";
  scrollLegend?: boolean;
}

function CustomTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string; payload?: SeriesPoint }>;
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
  const dateLabel = point?.dateKey ? formatLongDateKey(String(point.dateKey)) : "";

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{dateLabel}</div>
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

export function SupplyChart({ data, series, kind = "area", scrollLegend = false }: Props) {
  const legend = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        last: data.length ? Number(data[data.length - 1][s.key] ?? 0) : 0,
      })),
    [series, data],
  );

  const windowDays =
    data.length >= 2 ? spanDays(String(data[0].dateKey), String(data[data.length - 1].dateKey)) : data.length;
  const dense = data.length > 90;

  const axis = (
    <>
      <CartesianGrid stroke="rgba(232, 226, 210, 0.08)" vertical={false} />
      <XAxis
        dataKey="dateKey"
        tick={{ fill: "#b7b09f", fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        minTickGap={kind === "bar" && dense ? 36 : 24}
        tickFormatter={(key: string) => formatChartTick(key, windowDays)}
      />
      <YAxis
        tick={{ fill: "#b7b09f", fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={56}
        domain={[0, "auto"]}
        allowDecimals={false}
        tickFormatter={(v: number) => formatTj(v)}
      />
      <Tooltip
        content={<CustomTooltip series={series} />}
        cursor={{ stroke: "rgba(232, 226, 210, 0.25)", fill: "rgba(232, 226, 210, 0.06)" }}
      />
    </>
  );

  return (
    <div className="supply-chart">
      <div className="supply-chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={dense ? 0 : "18%"} barGap={0}>
              {axis}
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="supply"
                  fill={s.color}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {axis}
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stackId="supply"
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.72}
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={series.length < 12 && data.length < 120}
                />
              ))}
            </AreaChart>
          )}
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
