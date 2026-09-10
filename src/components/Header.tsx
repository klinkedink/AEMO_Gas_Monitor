import { formatDateTime, formatLongDate } from "../lib/dates";

interface Props {
  lastDate: Date | null;
  fetchedAt: string | null;
  fromCache: boolean;
  stale: boolean;
  loading: boolean;
  lastDayTotal: number;
  onRefresh: () => void;
}

export function Header({ lastDate, fetchedAt, fromCache, stale, loading, lastDayTotal, onRefresh }: Props) {
  return (
    <header className="site-header">
      <div className="header-copy">
        <p className="eyebrow">Piet Clinckemalie · Gas Bulletin Board</p>
        <h1>Australian gas production monitor</h1>
        <p className="lede">
          PROD supply from AEMO GBB Actual Flow and Storage (last ~31 days). Units are terajoules per
          gas day (TJ/d). PIPE, LNG and demand facilities are excluded from supply totals.
        </p>
      </div>
      <div className="header-status">
        <div className="status-block">
          <span className="status-label">Last gas date used</span>
          <span className="status-value">{lastDate ? formatLongDate(lastDate) : loading ? "Loading…" : "—"}</span>
          <span className="status-hint">
            {Number.isFinite(lastDayTotal) && lastDate
              ? `${lastDayTotal.toLocaleString("en-AU", { maximumFractionDigits: 1 })} TJ/d national PROD`
              : "Max GasDate in loaded Last31 CSV"}
          </span>
        </div>
        <div className="status-block compact">
          <span className="status-label">Source refresh</span>
          <span className="status-meta">
            {fetchedAt ? formatDateTime(fetchedAt) : "Not yet fetched"}
            {fromCache ? " · cache" : " · live"}
            {stale ? " · stale fallback" : ""}
          </span>
          <button type="button" className="refresh-btn" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}
