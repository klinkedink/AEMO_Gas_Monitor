const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseGasDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const isoish = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoish) {
    const y = Number(isoish[1]);
    const m = Number(isoish[2]);
    const d = Number(isoish[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

export function parseTimestamp(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const aemoLong = s.match(/^(\d{2})[ /-]([A-Za-z]{3})[ /-](\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (aemoLong) {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const day = Number(aemoLong[1]);
    const mon = months[aemoLong[2]];
    const year = Number(aemoLong[3]);
    if (mon == null) return null;
    const hh = Number(aemoLong[4] ?? 0);
    const mm = Number(aemoLong[5] ?? 0);
    const ss = Number(aemoLong[6] ?? 0);
    return new Date(Date.UTC(year, mon, day, hh, mm, ss));
  }

  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (ymd) {
    return new Date(
      Date.UTC(
        Number(ymd[1]),
        Number(ymd[2]) - 1,
        Number(ymd[3]),
        Number(ymd[4] ?? 0),
        Number(ymd[5] ?? 0),
        Number(ymd[6] ?? 0),
      ),
    );
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function dateKeyToUtc(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function enumerateDateKeys(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = dateKeyToUtc(startKey);
  const end = dateKeyToUtc(endKey);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return keys;
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return keys;
}

export function spanDays(startKey: string, endKey: string): number {
  const a = dateKeyToUtc(startKey).getTime();
  const b = dateKeyToUtc(endKey).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

export function formatChartTick(dateKey: string, windowDays = 31): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  if (windowDays > 800) return `${MONTHS[m - 1]} ${y}`;
  if (windowDays > 60) return `${d} ${MONTHS[m - 1]} ${y}`;
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatLongDateKey(dateKey: string): string {
  return formatLongDate(dateKeyToUtc(dateKey));
}

export function formatLongDate(date: Date): string {
  const d = date.getUTCDate();
  const m = MONTHS[date.getUTCMonth()];
  const y = date.getUTCFullYear();
  return `${d} ${m} ${y}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}
