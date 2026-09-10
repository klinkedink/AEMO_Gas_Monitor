import { useMemo } from "react";
import { Header } from "./components/Header";
import { ChartCard } from "./components/ChartCard";
import { DateRangeControls } from "./components/DateRangeControls";
import { SupplyChart } from "./components/SupplyChart";
import { useAemoData } from "./hooks/useAemoData";
import { useDateRange } from "./hooks/useDateRange";
import {
  beetalooProd,
  filterByDateWindow,
  lngExportRows,
  operatorTotals,
  originAplngProd,
  pivotStacked,
  prodRows,
  prodSupplyOnDate,
  qgcProd,
  santosCsgProd,
  seriesFromKeys,
} from "./lib/aggregate";
import { lngColor, operatorColor, seriesColor, stateColor } from "./lib/colors";
import { enumerateDateKeys, toDateKey } from "./lib/dates";

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
  const { rows, lastDate, minKey, maxKey, fetchedAt, fromCache, stale, warnings, sources, loading, error, refresh } =
    useAemoData();
  const range = useDateRange(minKey, maxKey);

  const lastDateKey = lastDate ? toDateKey(lastDate) : "";
  const lastDayTotal = lastDateKey ? prodSupplyOnDate(rows, lastDateKey) : 0;

  const windowed = useMemo(
    () => filterByDateWindow(rows, range.startKey, range.endKey),
    [rows, range.startKey, range.endKey],
  );
  const dates = useMemo(
    () => (range.startKey && range.endKey ? enumerateDateKeys(range.startKey, range.endKey) : []),
    [range.startKey, range.endKey],
  );

  const prod = useMemo(() => prodRows(windowed), [windowed]);
  const byState = useMemo(() => pivotStacked(prod, (r) => r.state || "Unknown", { dateKeys: dates }), [prod, dates]);
  const stateKeys = sortStates(byState.keys);

  const qgc = useMemo(() => qgcProd(windowed), [windowed]);
  const qgcPivot = useMemo(() => pivotStacked(qgc, (r) => r.displayName, { dateKeys: dates }), [qgc, dates]);

  const santos = useMemo(() => santosCsgProd(windowed), [windowed]);
  const santosPivot = useMemo(
    () => pivotStacked(santos, (r) => r.displayName, { dateKeys: dates }),
    [santos, dates],
  );

  const origin = useMemo(() => originAplngProd(windowed), [windowed]);
  const originPivot = useMemo(
    () => pivotStacked(origin, (r) => r.displayName, { dateKeys: dates }),
    [origin, dates],
  );

  const ops = useMemo(() => operatorTotals(windowed), [windowed]);
  const opsPivot = useMemo(() => pivotStacked(ops, (r) => r.displayName, { dateKeys: dates }), [ops, dates]);
  const opKeys = ["QGC", "Santos CSG", "Origin / APLNG"].filter((k) => opsPivot.keys.includes(k));

  const beet = useMemo(() => beetalooProd(windowed), [windowed]);
  const beetPivot = useMemo(
    () => pivotStacked(beet, (r) => beetalooLabel(r.operatorName || r.displayName), { dateKeys: dates }),
    [beet, dates],
  );

  const lng = useMemo(() => lngExportRows(windowed), [windowed]);
  const lngPivot = useMemo(
    () =>
      pivotStacked(lng, (r) => r.displayName, {
        dateKeys: dates,
        getValue: (r) => r.demand,
      }),
    [lng, dates],
  );

  const pending = loading && rows.length === 0;

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

      <DateRangeControls
        disabled={pending}
        preset={range.preset}
        startKey={range.startKey}
        endKey={range.endKey}
        startIndex={range.startIndex}
        endIndex={range.endIndex}
        maxIndex={Math.max(0, range.keys.length - 1)}
        onPreset={range.applyPreset}
        onStartIndex={range.setStartIndex}
        onEndIndex={range.setEndIndex}
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

      <section className="chart-section">
        <h2 className="section-title">
          <span>1</span> Total production
        </h2>
        <ChartCard title="Supply by state" empty={!pending && byState.keys.length === 0} loading={pending}>
          <SupplyChart
            data={byState.data}
            series={stateKeys.map((k, i) => ({ key: k, label: k, color: stateColor(k, i) }))}
          />
        </ChartCard>
      </section>

      <section className="chart-section">
        <h2 className="section-title">
          <span>2</span> CSG production
        </h2>
        <div className="charts">
          <ChartCard title="QGC vs Santos vs Origin" empty={!pending && ops.length === 0} loading={pending}>
            <SupplyChart
              data={opsPivot.data}
              series={opKeys.map((k, i) => ({ key: k, label: k, color: operatorColor(k, i) }))}
            />
          </ChartCard>
          <ChartCard
            title="QGC fields"
            empty={!pending && qgc.length === 0}
            emptyTitle="No QGC PROD facilities"
            loading={pending}
          >
            <SupplyChart
              data={qgcPivot.data}
              series={seriesFromKeys(qgcPivot.keys, (_, i) => seriesColor(i))}
            />
          </ChartCard>
          <ChartCard
            title="Santos CSG fields"
            empty={!pending && santos.length === 0}
            emptyTitle="No Santos CSG PROD facilities"
            loading={pending}
          >
            <SupplyChart
              data={santosPivot.data}
              series={seriesFromKeys(santosPivot.keys, (_, i) => seriesColor(i + 4))}
            />
          </ChartCard>
          <ChartCard
            title="Origin / APLNG fields"
            empty={!pending && origin.length === 0}
            emptyTitle="No Origin / APLNG PROD facilities"
            loading={pending}
          >
            <SupplyChart
              data={originPivot.data}
              series={seriesFromKeys(originPivot.keys, (_, i) => seriesColor(i + 8))}
            />
          </ChartCard>
        </div>
      </section>

      <section className="chart-section">
        <h2 className="section-title">
          <span>3</span> Beetaloo
        </h2>
        <ChartCard
          title="Beetaloo by operator"
          empty={!pending && beet.length === 0}
          emptyTitle="No Beetaloo PROD in this window"
          loading={pending}
        >
          <SupplyChart
            data={beetPivot.data}
            series={seriesFromKeys(beetPivot.keys, (_, i) => seriesColor(i + 18))}
          />
        </ChartCard>
      </section>

      <section className="chart-section">
        <h2 className="section-title">
          <span>4</span> LNG export
        </h2>
        <ChartCard
          title="LNG export by facility"
          empty={!pending && lng.length === 0}
          emptyTitle="No LNGEXPORT facilities"
          loading={pending}
        >
          <SupplyChart
            data={lngPivot.data}
            series={seriesFromKeys(lngPivot.keys, (k, i) => lngColor(k, i))}
            kind="bar"
          />
        </ChartCard>
      </section>

      <footer className="site-footer">
        <p>
          Data:{" "}
          <a href={sources?.history} target="_blank" rel="noreferrer">
            GasBBActualFlowStorage.zip
          </a>
          {" + "}
          <a href={sources?.last31} target="_blank" rel="noreferrer">
            Last31
          </a>
          {" · "}
          <a href={sources?.facilities} target="_blank" rel="noreferrer">
            GasBBFacilitiesFull.CSV
          </a>
          {" · "}
          <a
            href="https://www.aemo.com.au/energy-systems/gas/gas-bulletin-board-gbb/data-gbb/gas-flows"
            target="_blank"
            rel="noreferrer"
          >
            AEMO Gas Flows
          </a>
          . PROD charts use Supply; LNGEXPORT uses Demand (Supply is 0 in the GBB). Missing values are 0. Not an
          official AEMO product.
        </p>
      </footer>
    </div>
  );
}

function beetalooLabel(operatorName: string): string {
  if (/sturt plateau/i.test(operatorName)) return "Sturt Plateau";
  return operatorName || "Beetaloo";
}
