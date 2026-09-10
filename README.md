# AEMO Gas Production Monitor

First-pass dashboard for **Piet Clinckemalie**: Australian gas production (TJ/d) from AEMO Gas Bulletin Board **Actual Flow and Storage**.

The UI is a Vite + React app. A tiny Express proxy fetches the AEMO CSVs (nemweb does not send CORS headers), caches them on disk, and the browser charts **PROD Supply only**.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

| Command | What it does |
| --- | --- |
| `npm run dev` | Express proxy on `:8787` + Vite on `:5173` (proxies `/api`) |
| `npm test` | Operator mapping and aggregation tests |
| `npm run build && npm start` | Production static build served by Express on `:8787` |

On load the app **re-fetches** `GasBBActualFlowStorageLast31.CSV` and `GasBBFacilitiesFull.CSV`. Use **Refresh** for a manual pull. A timer also refreshes once per day (and when you return to the tab after 24h).

Cached copies live in `data/cache/` and are used only if the live fetch fails.

## Data sources

Primary (v1):

- http://nemweb.com.au/Reports/CURRENT/GBB/GasBBActualFlowStorageLast31.CSV (HTTPS redirect)
- http://nemweb.com.au/Reports/CURRENT/GBB/GasBBFacilitiesFull.CSV

Human page (reference): [AEMO gas flows](https://www.aemo.com.au/energy-systems/gas/gas-bulletin-board-gbb/data-gbb/gas-flows)

Full history zip exists but is **not** used in v1:

- http://nemweb.com.au/Reports/CURRENT/GBB/GasBBActualFlowStorage.zip

**Last gas date used** is `max(GasDate)` in the loaded Last31 file, not calendar today. AEMO typically publishes the previous gas day. The current extract has ~30 calendar days, not always 31.

Units in the CSV are already **TJ/day**. Missing `Supply` is treated as `0`.

## What is charted

All supply charts sum `Supply` where `FacilityType == PROD`. PIPE, LNG export, storage, GPG and demand rows are not added (that would double-count).

1. Header last gas date + refresh  
2. National PROD supply  
3. PROD supply stacked by `State`  
4. QGC CSG fields stacked by `FacilityName`  
5. Santos CSG fields stacked by `FacilityName`  
6. Origin / APLNG fields stacked by `FacilityName`  
7. QGC vs Santos CSG vs Origin totals  
8. Beetaloo / Sturt Plateau by operator  
9. Every PROD field (busy legend is scrollable)

Facility names come from `GasBBFacilitiesFull` when the id joins; otherwise from the flow file. Operator is joined on `FacilityId`. Duplicate register rows: prefer **ACTIVE**, then latest `OperatorChangeDate` / `LastUpdated`.

## Operator mapping (checked against live CSVs)

Verified 10 Sep 2026 against the live Last31 + Facilities Full extracts. Mapping is code in `src/lib/operators.ts`. Empty groups render an empty state; facilities are not invented.

### QGC

`OperatorName` contains `QGC`. Live PROD plants:

| FacilityId | FacilityName |
| --- | --- |
| 540083 | Bellevue |
| 540088 | Jordan |
| 540075 | Kenya Gas Plant |
| 540082 | Ruby Jo |
| 540069 | Windibri |
| 540087 | Woleebee Creek |

### Santos CSG

Include `Santos CSG` / `Santos Toga` (and Santos* rows whose names are Fairview, Scotia, Arcadia, or Roma compressor). **Exclude** conventional hubs (Moomba, Ballera, Longford, Otway, Orbost).

Live Last31 PROD:

| FacilityId | FacilityName | Operator (latest ACTIVE) |
| --- | --- | --- |
| 540070 | Fairview | Santos Toga Pty Ltd |
| 540072 | Scotia | Santos CSG Pty Ltd |
| 540101 | Arcadia Compression Facility | Santos Toga Pty Ltd |
| 540095 | Roma Compressor Station | Santos CSG Pty Ltd |

Excluded on purpose:

- **Moomba** (`550045`, Santos Limited) — conventional
- **Ballera** (Santos Limited) — conventional; not present in the current Last31 flow file
- **Roma North** (`544260`) — Jemena Roma North Processing Pty Ltd in the latest ACTIVE row (also historically GLNG). Not Santos*

### Origin / APLNG

`OperatorName` contains `Australia Pacific LNG` or `Origin`. On the live GBB, **Origin CSG production is reported under Australia Pacific LNG Pty Limited**. `Origin Energy Electricity Limited` rows are power stations (not PROD) and do not appear on these charts.

Live APLNG PROD in Last31: Combabula, Condabri Central/North/South, Eurombah Creek, Orana, Peat, Reedy Creek, Spring Gully, Strathblane, Talinga Gas Plant, Taloona.

Not in the Origin stack (latest operator is no longer APLNG):

- Rolleston and Yellowbank → **Denison Gas Ltd**
- Kincora (deregistered APLNG register row) is not in Last31; the live Kincora PROD row is ADZ Energy

### Beetaloo / Sturt Plateau

| Field | Live value |
| --- | --- |
| FacilityId | `580236` |
| Short name | SPCF |
| Register name | Sturt Plateau Gas Plant |
| Operator | Sturt Plateau Compression FacilitySubP/L |
| OperatingStateDate | 2026/08/28 |

The Last31 file starts reporting the facility on 2026/09/01 (zeros), with first non-zero supply 2026/09/05 and about 20–22 TJ/d by 2026/09/09. If more Beetaloo PROD ids appear later, they stack by `OperatorName`.

## Limitations

- Last31 only; no history zip, no date-range picker.
- Facility register has duplicate ids and some truncated operator names in the CSV.
- Join quality depends on `FacilityId`. Names in the flow file are often short names (e.g. `SPCF`).
- Not an official AEMO product; AEMO remains the source of truth.
- The proxy is required in a browser because `nemweb.com.au` does not send `Access-Control-Allow-Origin`.

## Later: full history

1. Download `GasBBActualFlowStorage.zip`.
2. Parse the historical CSV with the same `parseFlowCsv` path as Last31.
3. Keep the same PROD-only aggregations and operator helpers.
4. Add a date-range control; consider downsampling or a backend summary if the zip is large.

The current `/api/gbb` endpoint can grow a `?history=1` branch that unpacks the zip into `data/cache/` without changing the chart components.
