import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "data", "cache");
const DIST_DIR = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);
const isProd = process.env.NODE_ENV === "production";

const SOURCES = {
  history: "https://nemweb.com.au/Reports/CURRENT/GBB/GasBBActualFlowStorage.zip",
  last31: "https://nemweb.com.au/Reports/CURRENT/GBB/GasBBActualFlowStorageLast31.CSV",
  facilities: "https://nemweb.com.au/Reports/CURRENT/GBB/GasBBFacilitiesFull.CSV",
};

const KEEP_TYPES = new Set(["PROD", "LNGEXPORT"]);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 120_000;
const USER_AGENT =
  "AEMO-Gas-Monitor/0.1 (local dashboard; +https://github.com/klinkedink/AEMO_Gas_Monitor)";

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function cachePaths(key) {
  return {
    body: path.join(CACHE_DIR, `${key}.json`),
    file: path.join(CACHE_DIR, key),
    meta: path.join(CACHE_DIR, `${key}.meta.json`),
  };
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(file, value) {
  await fs.writeFile(file, JSON.stringify(value), "utf8");
}

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "*/*", "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  return (await fetchBuffer(url)).toString("utf8");
}

function headerIndex(line) {
  const cols = line.replace(/^\uFEFF/, "").trim().split(",");
  const find = (name) => cols.findIndex((c) => c.trim().toLowerCase() === name.toLowerCase());
  return {
    date: find("GasDate"),
    name: find("FacilityName"),
    id: find("FacilityId"),
    type: find("FacilityType"),
    demand: find("Demand"),
    supply: find("Supply"),
    state: find("State"),
  };
}

function toIsoDate(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function parseKeptRow(line, idx) {
  if (!line || !line.trim()) return null;
  const cols = line.split(",");
  const type = (cols[idx.type] || "").trim();
  if (!KEEP_TYPES.has(type)) return null;
  const date = toIsoDate(cols[idx.date]);
  if (!date) return null;
  const id = (cols[idx.id] || "").trim();
  if (!id) return null;
  const supply = Number(cols[idx.supply]);
  const demand = Number(cols[idx.demand]);
  return [
    date,
    id,
    type,
    Number.isFinite(supply) ? supply : 0,
    Number.isFinite(demand) ? demand : 0,
    (cols[idx.state] || "").trim(),
    (cols[idx.name] || "").trim(),
  ];
}

function rowKey(row) {
  return `${row[0]}|${row[1]}|${row[2]}`;
}

async function parseCsvText(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (!lines.length) return [];
  const idx = headerIndex(lines[0]);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseKeptRow(lines[i], idx);
    if (row) out.push(row);
  }
  return out;
}

function unzipCsvStream(zipPath) {
  const child = spawn("unzip", ["-p", zipPath, "GasBBActualFlowStorage.CSV"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

async function parseHistoryZip(zipPath) {
  const child = unzipCsvStream(zipPath);
  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  let idx = null;
  const rows = [];
  for await (const line of rl) {
    if (!idx) {
      idx = headerIndex(line);
      continue;
    }
    const row = parseKeptRow(line, idx);
    if (row) rows.push(row);
  }
  const errChunks = [];
  child.stderr?.on("data", (c) => errChunks.push(c));
  const code = await new Promise((resolve) => child.on("close", resolve));
  if (code !== 0 && !rows.length) {
    throw new Error(`unzip failed (${code}): ${Buffer.concat(errChunks).toString()}`);
  }
  return rows;
}

function mergeRows(history, last31) {
  const map = new Map();
  for (const row of history) map.set(rowKey(row), row);
  for (const row of last31) map.set(rowKey(row), row);
  return [...map.values()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1].localeCompare(b[1])));
}

async function readCachedBundle() {
  const filteredPath = path.join(CACHE_DIR, "flow-filtered.json");
  const facilitiesPath = path.join(CACHE_DIR, "facilities.csv");
  const metaPath = path.join(CACHE_DIR, "bundle.meta.json");
  const meta = await readJson(metaPath);
  if (!meta) return null;
  try {
    const [flowRows, facilitiesCsv] = await Promise.all([
      readJson(filteredPath),
      fs.readFile(facilitiesPath, "utf8"),
    ]);
    if (!flowRows || !facilitiesCsv) return null;
    return { flowRows, facilitiesCsv, meta, fromCache: true };
  } catch {
    return null;
  }
}

async function loadBundle(force) {
  const cached = await readCachedBundle();
  const ageMs = cached ? Date.now() - Date.parse(cached.meta.fetchedAt) : Infinity;
  const cacheFresh = Boolean(cached) && ageMs < CACHE_TTL_MS;
  if (!force && cacheFresh && cached) return cached;

  try {
    const zipPath = path.join(CACHE_DIR, "history.zip");
    const [zipBuf, last31Text, facilitiesCsv] = await Promise.all([
      fetchBuffer(SOURCES.history),
      fetchText(SOURCES.last31),
      fetchText(SOURCES.facilities),
    ]);
    await fs.writeFile(zipPath, zipBuf);
    const historyRows = await parseHistoryZip(zipPath);
    const last31Rows = await parseCsvText(last31Text);
    const flowRows = mergeRows(historyRows, last31Rows);
    const meta = {
      fetchedAt: new Date().toISOString(),
      historyRows: historyRows.length,
      last31Rows: last31Rows.length,
      mergedRows: flowRows.length,
      sources: SOURCES,
    };
    await Promise.all([
      writeJson(path.join(CACHE_DIR, "flow-filtered.json"), flowRows),
      fs.writeFile(path.join(CACHE_DIR, "facilities.csv"), facilitiesCsv, "utf8"),
      writeJson(path.join(CACHE_DIR, "bundle.meta.json"), meta),
    ]);
    return { flowRows, facilitiesCsv, meta, fromCache: false };
  } catch (err) {
    if (cached) return { ...cached, stale: true, error: String(err) };
    throw err;
  }
}

const app = express();
app.disable("x-powered-by");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/gbb", async (req, res) => {
  const force = req.query.force === "1" || req.query.force === "true";
  try {
    await ensureCacheDir();
    const bundle = await loadBundle(force);
    const payload = Buffer.from(
      JSON.stringify({
        flowRows: bundle.flowRows,
        facilitiesCsv: bundle.facilitiesCsv,
        sources: SOURCES,
        fetchedAt: bundle.meta.fetchedAt,
        rowCount: bundle.flowRows.length,
        fromCache: bundle.fromCache,
        stale: Boolean(bundle.stale),
        warnings: bundle.error ? [bundle.error] : [],
      }),
    );
    const gz = gzipSync(payload);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Encoding", "gzip");
    res.send(gz);
  } catch (err) {
    res.status(502).json({
      error: "Failed to load AEMO GBB history",
      detail: String(err),
    });
  }
});

if (isProd) {
  app.use(express.static(DIST_DIR));
  app.use(async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

await ensureCacheDir();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AEMO proxy listening on http://127.0.0.1:${PORT} (${isProd ? "production" : "dev"})`);
});
