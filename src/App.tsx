import { Header } from "./components/Header";
import { ChartCard } from "./components/ChartCard";
import { SupplyChart } from "./components/SupplyChart";
import { useAemoData } from "./hooks/useAemoData";
import {
  beetalooProd,
  operatorTotals,
  originAplngProd,
  prodRows,
  qgcProd,
  santosCsgProd,
  seriesFromKeys,
  sumPoint,
  totalSupplyByDate,
  pivotStacked,
} from "./lib/aggregate";
import { operatorColor, seriesColor, stateColor } from "./lib/colors";

const STATE_ORDER = ["QLD", "NSW", "VIC", "SA", "NT", "WA", "TAS", "ACT"];

function sortStates(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = STATE_ORDER.indexOf(a);
    const ib = STATE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export default function App() {
  const { rows, lastDate, fetchedAt, fromCache, stale, warnings, sources, loading, error, refresh } =
    useAemoData();

  const prod = prodRows(rows);
  const total = totalSupplyByDate(prod);
  const lastDayTotal = total.data.length ? sumPoint(total.data[total.data.length - 1], total.keys) : 0;

  const byState = pivotStacked(prod, (r) => r.state || "Unknown");
  const stateKeys = sortStates(byState.keys);

  const qgc = qgcProd(rows);
  const qgcPivot = pivotStacked(qgc, (r) => r.displayName);

  const santos = santosCsgProd(rows);
  const santosPivot = pivotStacked(santos, (r) => r.displayName);

  const origin = originAplngProd(rows);
  const originPivot = pivotStacked(origin, (r) => r.displayName);

  const ops = operatorTotals(rows);
  const opsPivot = pivotStacked(ops, (r) => r.displayName);
  const opKeys = ["QGC", "Santos CSG", "Origin / APLNG"].filter((k) => opsPivot.keys.includes(k));

  const beet = beetalooProd(rows);
  const beetPivot = pivotStacked(beet, (r) => r.operatorName || r.displayName);

  const allPivot = pivotStacked(prod, (r) => r.displayName);

  return (
    <div className="app">
      <Header
        lastDate={lastDate}
        fetchedAt={fetchedAt}
        fromCache={fromCache}
        stale={stale}
        loading={loading}
        lastDayTotal={lastDayTotal}
        onRefresh={() => void refresh()}
      />

      {error ? (
        <div className="banner error">
          Could not refresh AEMO data: {error}
          <button type="button" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : null}
      {stale || warnings.length ? (
        <div className="banner warn">
          Showing the last successful CSV cache
          {warnings.length ? ` (${warnings[0]})` : ""}.
        </div>
      ) : null}

      <main className="charts">
        <ChartCard
          title="Total supply — last 31 days"
          subtitle="Sum of Supply where FacilityType is PROD only. Demand, PIPE, storage and LNG export are not added."
          empty={!loading && prod.length === 0}
          loading={loading && prod.length === 0}
        >
          <SupplyChart
            data={total.data}
            series={seriesFromKeys(total.keys, () => "#d4a017")}
            stacked={false}
          />
        </ChartCard>

        <ChartCard
          title="Total supply by state"
          subtitle="Stacked PROD Supply by State on each gas day."
          empty={!loading && byState.keys.length === 0}
          loading={loading && byState.keys.length === 0}
        >
          <SupplyChart
            data={byState.data}
            series={stateKeys.map((k, i) => ({ key: k, label: k, color: stateColor(k, i) }))}
          />
        </ChartCard>

        <ChartCard
          title="QGC CSG production fields"
          subtitle="OperatorName contains “QGC”. Stacked by FacilityName."
          empty={!loading && qgc.length === 0}
          emptyTitle="No QGC PROD facilities"
          loading={loading && qgc.length === 0}
        >
          <SupplyChart
            data={qgcPivot.data}
            series={seriesFromKeys(qgcPivot.keys, (_, i) => seriesColor(i))}
          />
        </ChartCard>

        <ChartCard
          title="Santos CSG production fields"
          subtitle="Santos CSG / Santos Toga plants (Fairview, Scotia, Arcadia, Roma). Conventional hubs excluded."
          empty={!loading && santos.length === 0}
          emptyTitle="No Santos CSG PROD facilities"
          loading={loading && santos.length === 0}
        >
          <SupplyChart
            data={santosPivot.data}
            series={seriesFromKeys(santosPivot.keys, (_, i) => seriesColor(i + 4))}
          />
        </ChartCard>

        <ChartCard
          title="Origin / APLNG production fields"
          subtitle="OperatorName matches Australia Pacific LNG or Origin. Live GBB reports Origin CSG under APLNG."
          empty={!loading && origin.length === 0}
          emptyTitle="No Origin / APLNG PROD facilities"
          loading={loading && origin.length === 0}
        >
          <SupplyChart
            data={originPivot.data}
            series={seriesFromKeys(originPivot.keys, (_, i) => seriesColor(i + 8))}
          />
        </ChartCard>

        <ChartCard
          title="QGC vs Santos CSG vs Origin"
          subtitle="Operator totals from the CSG field groups above — three series, not double-counted across groups."
          empty={!loading && ops.length === 0}
          loading={loading && ops.length === 0}
        >
          <SupplyChart
            data={opsPivot.data}
            series={opKeys.map((k, i) => ({ key: k, label: k, color: operatorColor(k, i) }))}
          />
        </ChartCard>

        <ChartCard
          title="Beetaloo / Sturt Plateau"
          subtitle="FacilityId 580236 (SPCF / Sturt Plateau Gas Plant). Additional Beetaloo PROD would stack by OperatorName."
          empty={!loading && beet.length === 0}
          emptyTitle="No Beetaloo PROD in this extract"
          loading={loading && beet.length === 0}
        >
          <SupplyChart
            data={beetPivot.data}
            series={seriesFromKeys(beetPivot.keys, (_, i) => seriesColor(i + 18))}
          />
        </ChartCard>

        <ChartCard
          title="All PROD fields"
          subtitle={`Every production facility in Last31 (${allPivot.keys.length} series). Legend scrolls; tooltip lists the largest contributors.`}
          empty={!loading && allPivot.keys.length === 0}
          loading={loading && allPivot.keys.length === 0}
        >
          <SupplyChart
            data={allPivot.data}
            series={seriesFromKeys(allPivot.keys, (_, i) => seriesColor(i))}
            scrollLegend
          />
        </ChartCard>
      </main>

      <footer className="site-footer">
        <p>
          Last-day QGC {lastDaySlice(qgcPivot.data, qgcPivot.keys)} · Santos CSG{" "}
          {lastDaySlice(santosPivot.data, santosPivot.keys)} · Origin / APLNG{" "}
          {lastDaySlice(originPivot.data, originPivot.keys)} TJ/d
        </p>
        <p>
          Data:{" "}
          <a href={sources?.flow} target="_blank" rel="noreferrer">
            GasBBActualFlowStorageLast31.CSV
          </a>
          {" · "}
          <a href={sources?.facilities} target="_blank" rel="noreferrer">
            GasBBFacilitiesFull.CSV
          </a>
          {" · "}
          <a href="https://www.aemo.com.au/energy-systems/gas/gas-bulletin-board-gbb/data-gbb/gas-flows" target="_blank" rel="noreferrer">
            AEMO Gas Flows
          </a>
          . Not an official AEMO product. Missing Supply is treated as 0.
        </p>
      </footer>
    </div>
  );
}

function lastDaySlice(
  data: Array<{ date: string; dateKey: string; [series: string]: string | number }>,
  keys: string[],
): string {
  if (!data.length) return "0";
  const n = sumPoint(data[data.length - 1], keys);
  return n.toLocaleString("en-AU", { maximumFractionDigits: 1 });
}
