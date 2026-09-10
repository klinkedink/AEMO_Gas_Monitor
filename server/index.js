import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "data", "cache");
const DIST_DIR = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);
const isProd = process.env.NODE_ENV === "production";

const SOURCES = {
  flow: "https://nemweb.com.au/Reports/CURRENT/GBB/GasBBActualFlowStorageLast31.CSV",
  facilities: "https://nemweb.com.au/Reports/CURRENT/GBB/GasBBFacilitiesFull.CSV",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "AEMO-Gas-Monitor/0.1 (local dashboard; +https://github.com/klinkedink/AEMO_Gas_Monitor)";

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function cachePaths(key) {
  return {
    csv: path.join(CACHE_DIR, `${key}.csv`),
    meta: path.join(CACHE_DIR, `${key}.meta.json`),
  };
}

async function readCache(key) {
  const { csv, meta } = cachePaths(key);
  try {
    const [body, metaRaw] = await Promise.all([fs.readFile(csv, "utf8"), fs.readFile(meta, "utf8")]);
    const info = JSON.parse(metaRaw);
    return { body, info };
  } catch {
    return null;
  }
}

async function writeCache(key, body, url) {
  const { csv, meta } = cachePaths(key);
  const info = {
    url,
    fetchedAt: new Date().toISOString(),
    bytes: Buffer.byteLength(body),
  };
  await Promise.all([
    fs.writeFile(csv, body, "utf8"),
    fs.writeFile(meta, JSON.stringify(info, null, 2), "utf8"),
  ]);
  return info;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function loadSource(key, url, force) {
  const cached = await readCache(key);
  const ageMs = cached ? Date.now() - Date.parse(cached.info.fetchedAt) : Infinity;
  const cacheFresh = Boolean(cached) && ageMs < CACHE_TTL_MS;

  if (!force && cacheFresh && cached) {
    return { csv: cached.body, meta: cached.info, fromCache: true };
  }

  try {
    const body = await fetchText(url);
    if (!body || !body.trim()) {
      throw new Error(`Empty response from ${url}`);
    }
    const info = await writeCache(key, body, url);
    return { csv: body, meta: info, fromCache: false };
  } catch (err) {
    if (cached) {
      return { csv: cached.body, meta: cached.info, fromCache: true, stale: true, error: String(err) };
    }
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
    const [flow, facilities] = await Promise.all([
      loadSource("flow", SOURCES.flow, force),
      loadSource("facilities", SOURCES.facilities, force),
    ]);
    res.json({
      flowCsv: flow.csv,
      facilitiesCsv: facilities.csv,
      sources: SOURCES,
      fetchedAt: flow.meta.fetchedAt,
      facilitiesFetchedAt: facilities.meta.fetchedAt,
      fromCache: flow.fromCache || facilities.fromCache,
      stale: Boolean(flow.stale || facilities.stale),
      warnings: [flow.error, facilities.error].filter(Boolean),
    });
  } catch (err) {
    res.status(502).json({
      error: "Failed to load AEMO GBB CSVs",
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
