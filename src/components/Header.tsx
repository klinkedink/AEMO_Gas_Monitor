import { formatDateTime, formatLongDate } from "../lib/dates";
import { formatTj } from "../lib/format";

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
        <p className="lede">Actual production as cited by AEMO GBB.</p>
      </div>
      <div className="header-status">
        <div className="kpi-row">
          <div className="status-block">
            <span className="status-label">Last gas date used</span>
            <span className="status-value">{lastDate ? formatLongDate(lastDate) : loading ? "Loading…" : "—"}</span>
          </div>
          <div className="status-block">
            <span className="status-label">Total supply</span>
            <span className="status-value">
              {lastDate ? `${formatTj(lastDayTotal)} TJ/d` : loading ? "Loading…" : "—"}
            </span>
          </div>
        </div>
        <div className="status-block compact">
          <span className="status-label">Source refresh</span>
          <span className="status-meta">
            {fetchedAt ? formatDateTime(fetchedAt) : "Not yet fetched"}
            {fromCache ? " · cache" : " · live"}
            {stale ? " · stale fallback" : ""}
          </span>
          <button type="button" className="refresh-btn" onClick={onRefresh} disabled={loading}>
            {loading ? "Loading history…" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}
