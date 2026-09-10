import { useCallback, useEffect, useState } from "react";
import { fetchGbb, type GbbPayload } from "../lib/api";
import { parseCompactFlow } from "../lib/compact";
import { parseFacilitiesCsv } from "../lib/csv";
import { firstGasDate, joinFlowWithFacilities, lastGasDate } from "../lib/aggregate";
import { toDateKey } from "../lib/dates";
import type { JoinedFlowRow } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AemoState {
  rows: JoinedFlowRow[];
  firstDate: Date | null;
  lastDate: Date | null;
  minKey: string;
  maxKey: string;
  fetchedAt: string | null;
  fromCache: boolean;
  stale: boolean;
  warnings: string[];
  sources: GbbPayload["sources"] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAemoData(): AemoState {
  const [rows, setRows] = useState<JoinedFlowRow[]>([]);
  const [firstDate, setFirstDate] = useState<Date | null>(null);
  const [lastDate, setLastDate] = useState<Date | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [stale, setStale] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sources, setSources] = useState<GbbPayload["sources"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchGbb(force);
      const flow = parseCompactFlow(payload.flowRows);
      const facilities = parseFacilitiesCsv(payload.facilitiesCsv);
      const joined = joinFlowWithFacilities(flow, facilities);
      const first = firstGasDate(joined);
      const last = lastGasDate(joined);
      setRows(joined);
      setFirstDate(first);
      setLastDate(last);
      setFetchedAt(payload.fetchedAt);
      setFromCache(payload.fromCache);
      setStale(Boolean(payload.stale));
      setWarnings(payload.warnings ?? []);
      setSources(payload.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load(true);
    }, DAY_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible" || !fetchedAt) return;
      if (Date.now() - Date.parse(fetchedAt) >= DAY_MS) {
        void load(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchedAt, load]);

  return {
    rows,
    firstDate,
    lastDate,
    minKey: firstDate ? toDateKey(firstDate) : "",
    maxKey: lastDate ? toDateKey(lastDate) : "",
    fetchedAt,
    fromCache,
    stale,
    warnings,
    sources,
    loading,
    error,
    refresh: () => load(true),
  };
}
