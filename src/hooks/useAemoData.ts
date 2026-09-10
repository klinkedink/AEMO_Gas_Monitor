import { useCallback, useEffect, useState } from "react";
import { fetchGbb, type GbbPayload } from "../lib/api";
import { parseFacilitiesCsv, parseFlowCsv } from "../lib/csv";
import { joinFlowWithFacilities } from "../lib/aggregate";
import { lastGasDate } from "../lib/aggregate";
import type { JoinedFlowRow } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AemoState {
  rows: JoinedFlowRow[];
  lastDate: Date | null;
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
      let payload: GbbPayload;
      try {
        payload = await fetchGbb(force);
      } catch (first) {
        if (force) {
          payload = await fetchGbb(false);
          payload.stale = true;
          payload.warnings = [...(payload.warnings ?? []), String(first)];
        } else {
          throw first;
        }
      }
      const flow = parseFlowCsv(payload.flowCsv);
      const facilities = parseFacilitiesCsv(payload.facilitiesCsv);
      const joined = joinFlowWithFacilities(flow, facilities);
      setRows(joined);
      setLastDate(lastGasDate(joined));
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
    lastDate,
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
