# AEMO Gas Production Monitor

Dashboard for **Piet Clinckemalie**: Australian gas production (TJ/d) from AEMO Gas Bulletin Board **Actual Flow and Storage**.

Vite + React charts, with a small Express proxy that downloads AEMO files (nemweb has no CORS headers) and caches them on disk.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

| Command | What it does |
| --- | --- |
| `npm run dev` | Express proxy on `:8787` + Vite on `:5173` (proxies `/api`) |
| `npm test` | Operator mapping, date window, aggregation tests |
| `npm run build && npm start` | Production static build served by Express on `:8787` |

On load the app **re-fetches** the full history zip, Last31 (to pick up the newest gas day if the zip lags), and the facilities register. Use **Refresh** for a manual pull. A timer also refreshes once per day.

Cached copies live in `data/cache/` (`history.zip`, filtered PROD+LNGEXPORT rows, facilities). First load shows a loading state while the zip is downloaded and parsed.

## Data sources

- http://nemweb.com.au/Reports/CURRENT/GBB/GasBBActualFlowStorage.zip — full Actual Flow and Storage history (~Sep 2018 onward)
- http://nemweb.com.au/Reports/CURRENT/GBB/GasBBActualFlowStorageLast31.CSV — merged on top of the zip so the latest gas day is not missed
- http://nemweb.com.au/Reports/CURRENT/GBB/GasBBFacilitiesFull.CSV — operator join on `FacilityId`

Human page: [AEMO gas flows](https://www.aemo.com.au/energy-systems/gas/gas-bulletin-board-gbb/data-gbb/gas-flows)

The proxy keeps only `PROD` and `LNGEXPORT` rows from the history file (PIPE/GPG/storage are dropped so the payload stays small). Last31 rows overwrite matching `GasDate + FacilityId` keys.

**Last gas date used** is `max(GasDate)` in the merged file, not calendar today. **Total supply** is the sum of PROD `Supply` on that day, shown as a whole number of TJ/d.

Units in the CSV are already **TJ/day**. Missing values are `0`. Every number in the UI is **rounded to whole TJ**.

## Controls

Default window: **last 31 days** ending on the latest gas date.

Presets: **31 days / 1 year / 5 years / All**. Dual-thumb slider scrubs any sub-range of the loaded history. All charts share that window. X-axis date ticks stay visible (day-month for ~31d, with year on longer spans).

## What is charted

1. **Total production** — stacked **area** of PROD `Supply` by `State`
2. **CSG production** — stacked **area** of QGC vs Santos CSG vs Origin totals, then QGC / Santos / Origin field stacks (`FacilityName`)
3. **Beetaloo** — stacked **area** by operator (currently Sturt Plateau / SPCF)
4. **LNG export** — the only **stacked column** chart. `FacilityType == LNGEXPORT`, stacked by `FacilityName`. GBB reports intake as **Demand** (Supply is always 0 on these rows), so the chart uses Demand.

PIPE, storage and GPG are not added to production totals.

Facility names come from `GasBBFacilitiesFull` when the id joins. Duplicate register rows: prefer **ACTIVE**, then latest `OperatorChangeDate` / `LastUpdated`.

## Operator mapping (checked against live CSVs)

Verified 10 Sep 2026 against Last31 + Facilities Full + the history zip. Mapping is `src/lib/operators.ts`. Empty groups render an empty state; facilities are not invented.

### QGC

`OperatorName` contains `QGC`. Live PROD plants: Bellevue, Jordan, Kenya Gas Plant, Ruby Jo, Windibri, Woleebee Creek.

### Santos CSG

Include `Santos CSG` / `Santos Toga` (Fairview, Scotia, Arcadia, Roma compressor). **Exclude** conventional hubs (Moomba, Ballera, Longford, Otway, Orbost) and Jemena **Roma North**.

### Origin / APLNG

`OperatorName` contains `Australia Pacific LNG` or `Origin`. Origin CSG is reported under **Australia Pacific LNG Pty Limited**. Rolleston/Yellowbank latest operator is Denison, not Origin.

### Beetaloo / Sturt Plateau

FacilityId `580236`, short name SPCF, register name Sturt Plateau Gas Plant, operator Sturt Plateau Compression FacilitySubP/L. If more Beetaloo PROD ids appear, they stack by operator.

### LNG export

Stacked by **FacilityName** (three Curtis Island plants in the live GBB; operator is recorded in the register but names are clearer on the chart):

| FacilityId | FacilityName | Operator (latest ACTIVE) | Series value |
| --- | --- | --- | --- |
| 544272 | QCLNG LNG Plant | QCLNG Operating Company Pty Ltd | Demand |
| 544273 | Australia Pacific LNG | ConocoPhillips Australia Operations P/L | Demand |
| 544276 | GLNG (Curtis Island) | GLNG Operations Pty Ltd | Demand |

History zip (2018-09-29 through latest zip day) contains only these three `LNGEXPORT` facilities. Supply is 0 on every LNGEXPORT row; Demand is the daily intake (TJ/d).

## Limitations

- History zip can lag Last31 by a gas day; the app merges Last31 on top.
- First fetch downloads ~5 MB zip and parses ~46 MB CSV on the server (filtered to PROD+LNGEXPORT).
- Long windows (5 years / All) draw a point per gas day; animation is off on dense charts.
- Facility register has duplicate ids and some truncated operator names.
- Not an official AEMO product.
