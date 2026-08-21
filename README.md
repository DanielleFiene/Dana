# DANA

A personal, **non-commercial** 7-day map of DANA / gota fría and flood risk on **14 flood-prone squares** of peninsular Spain and the Balearics.

Mediterranean floods are often missed by products that wait for extreme CAPE or treat a hot, dry lapse rate as a riada. This project separates the **sky pattern** (cut-off, moisture, warm sea) from **rain on the ground**, and scores both hour by hour from open models.

It is a static Vite site. No database, no API keys. Official warnings stay [AEMET](https://www.aemet.es/) and 112. This desk is not a warning service.

The map paints a **situation**, not a chance figure and not an instruction. There is no “X% chance of flood” in the UI. Open-Meteo `precipitation_probability` is an input to the rain bundle only. A percentage waits for ECMWF IFS ENS (51 members at 0.25°, Open-Meteo Ensemble API) **calibrated on labelled events with SAIH**. SAIH does not admit AROME into the live score. Level hints describe weather, not behaviour — no “go upstairs”, “evacuate”, or “leave now”.

The 14 squares are the corridors this index is built for. Outside mainland Spain and the Balearics the same numbers do not mean the same thing.

---

## Why

A DANA is a cut-off pool of cold air around 500 hPa (~5.5 km). Over a warm, moist Mediterranean that pattern can stall and rain on the same ramblas for many hours. The deadly events (València, Murcia, Málaga) usually look like **warm rain + stalled cut-off + onshore moisture**, not a supercell with 2500+ J/kg CAPE.

Global models also **under-do** Mediterranean convection: 40–50 mm in the model on a flood corridor under a DANA is already a strong signal, not a modest shower.

---

## Physics

**Thermal shock** is \(T_{2\mathrm{m}} - T_{500}\). Over ~5.5 km:

| ΔT | Mean lapse | Meaning |
|---|---|---|
| ~36 °C | ~6.5 K/km | Standard atmosphere |
| ~54 °C | ~9.8 K/km | Dry adiabatic. Air can rise fast **if** it is moist |

Night and heatwaves without a cold core sit near 0 on that bar: 500 hPa is warm, so the difference collapses. That is expected, not a broken sensor.

**Cut-off.** \(T_{500} \lesssim -15\,^\circ\mathrm{C}\) and \(z_{500} \lesssim 5600\,\mathrm{m}\) mark a real cold pool. A heat-ridge is warm and high up there.

**Fuel.** Column water (PWAT) around 35–45 kg/m², SST from ~26 °C (28 °C+ is typical before autumn DANAs), dew point from ~16 °C, 850 hPa RH from ~70 %, and wind off the sea at 850 hPa.

**Instability.** CAPE and lifted index say how easily air rises. Mediterranean floods often sit at **500–1500 J/kg**. CAPE and thermal shock **amplify** showers; they do not open the flood gate.

---

## Scoring

Each hour is two blocks, each a weighted mean of piecewise-linear 0–1 scores.

**Setup** (cold air above): \(T_{500}\), \(z_{500}\), PWAT, SST, 850 hPa RH, dew point, onshore 850 hPa wind, weak 700 hPa steering, CIN.

**Impact** (rain): 24 h and 48 h totals, mm/h, probability, weather code; then persistence (wet hours) and soil moisture.

\[
\mathrm{impact} = 0.72\,\mathrm{rain} + 0.18\,\mathrm{persistence} + 0.10\,\mathrm{soil}
\]

On a flood-prone square, rain is multiplied by 1.2 (capped at 1).

\(T_{500}\) and \(z_{500}\) take the **colder / lower** of ICON and ECMWF IFS 0.25°. Rain stays on the local Open-Meteo mix. Live scoring does **not** use AROME.

**Level** of an hour:

| | Condition |
|---|---|
| 0 | Quiet |
| 1 | Some rain, instability, or a weak setup |
| 2 | Setup ≥ 0.48 (classic cut-off + Med moisture) |
| 3 | Strong impact (≥ 0.64), or setup ≥ 0.48 + impact ≥ 0.38, or DANA + model ≥ 22 mm/24 h or 45 mm/48 h on a corridor |
| 4 | Flood-gate impact (≥ 0.84), or DANA + model ≥ 48 mm/24 h or 75 mm/48 h on a corridor |

The flood gate is impact ≥ 0.84. Thermal shock or CAPE alone cannot open it. The 22 / 45 mm corridor **upscale** exists because the mix under-does convective cores; it is not a millimetre-for-millimetre match to a gauge.

**Day colour** (strip and map) is the day as a whole: one yellow hour does not paint the day. Red or purple if any hour reaches 3 or 4. Orange only if rain is actually on (flood gate or ≥ 8 mm/24 h). A dry cold pool does not turn the day orange.

English names in the UI: settled · unsettled · cold air above · heavy storms · flood risk.

---

## Backtest

`npm run backtest` replays the current score on **hand-labelled** calendar days against Open-Meteo historical forecasts. That stitch is a **near-analysis**, not a 48-hour forecast. Model rain at T−24 / T−48 / T−72 is printed separately (forecast skill). Unlabelled squares stay out of hit/miss counts until a documented rambla flood exists for that day.

Labels live in `src/data/events.ts`. `riuada` = a flash flood on that square that day. `quiet` = no flood (false-alarm control). They are desk squares tagged after the fact — not AEMET warning zones and not complete catchments.

**Labelled events**

| Event | Peak (Europe/Madrid) | Riuada squares | Quiet controls |
|---|---|---|---|
| Porto Cristo / Manacor | 28 Oct 2024 | Mallorca | Pitiusas |
| Magre / l'Horta | 29 Oct 2024 | l'Horta, Utiel–Requena, Ribera del Xúquer, Málaga, Murcia | Mallorca, Pitiusas, Tarragona, Barcelona |
| Magre aftermath | 30 Oct–2 Nov 2024 | — | the three Magre squares |
| Llobregat / Tarragona | 4 Nov 2024 | Barcelona, Tarragona | Magre squares |
| Almería / Poniente ramblas | 11 Nov 2024 | Almería | — |
| Málaga / Guadalhorce | 13 Nov 2024 | Málaga | — |
| Murcia / Guadalentín | 3 Sep 2023 | Murcia | — |
| Quiet summer control | 13 Aug 2024 | — | Magre squares |
| Dry cold-pool control | 15 Jan 2024 | — | Magre squares |

Castellón, Alacant, Vega Baja, Gibraltar and other unlisted squares stay **unlabelled** on those days: rain or warnings is not enough.

Misses and false alarms are tagged with a **desk mechanism** in `src/data/mechanisms.ts`. A later threshold change must not “fix” a convective-core miss with the hangover hinge, or vice versa. A miss without a row is `unassigned` — not dumped into hangover or undercatch by default.

| Mechanism | Meaning | Do not mix with |
|---|---|---|
| `grid-undercatch` | Model millimetres far below the convective core. Upscale can still hit. | Lowering rain thresholds to chase a miss |
| `hangover` | Leftover cut-off + soil/impact after a big event, little new rain. Thin 0.48 + 0.38 path. | The 22 mm corridor upscale |
| `leftover-rain` | Calendar day already quiet, but rolling 24/48 h still holds the previous dump. | The thin hangover hinge |
| `lead-time-dry` | Analysis had rain; previous-run T−24/48/72 did not. | The live formula |

Labelled days also log **margin to the nearest watch-3 path** (setup+impact 0.48/0.38, severe impact 0.64, corridor upscale 22 mm/24 h or 45 mm/48 h). `thin` means the binding path is within 12 %, not a side limb.

Burn scars and infiltration belong to catchment hydrology. They are not a third slider on setup/impact, and they do not explain a 17 mm grid vs 180 mm Salou or a 6 mm Magre hangover painted as heavy storms.

---

## Ground truth (SAIH and Magre)

Open-Meteo’s own analysis is partly circular as a check on Open-Meteo forecasts. Independent rain is SAIH (and AEMET station reports). SAIH is for **calibrating ECMWF ENS members later**, not for folding AROME into the live mix. Do not stack both unproven changes at once.

There is no single SAIH API:

| Network | Where | Notes |
|---|---|---|
| CHJ | Júcar / Magre | Undocumented JSON at saih.chj.es. Live works. Public retention ~6–12 months — 29 Oct 2024 Magre returns `[]`. |
| CHS | Segura | Live JSON / ArcGIS snapshot. History behind auth. |
| ACA | Catalan coast | Documented Sentilo REST. Rolling window; 4 Nov 2024 empty. Tarragona square is ACA coast + CHE Ebro. |
| CHE | Ebro | Separate from ACA. |
| Hidrosur | Málaga / Almería / Campo de Gibraltar | Junta de Andalucía, **not** CHG. Undocumented POST+CSV (`ci_session`). Cártama `038P01` rain and `038R03` nivel/caudal for 11–15 Nov 2024 are on disk as one-shot fixtures. |
| Balears | Mallorca / Pitiusas | No confederación SAIH. |

`npm run saih:chj` archives the Magre-corridor CHJ stations (Turís 7R04, Chiva 0P09, Utiel 0N01, Poyo N-III 0O04 rain + caudal) into `data/saih/chj/` as JSONL. Each run looks back 72 h so a missed pull still overlaps. It cannot recover Magre 2024 from the public JSON. Not wired into the live score. Cron: `*/2` hours, or `npm run saih:chj -- --loop`.

`npm run saih:hidrosur` is a **one-shot** historical pull, not a cron: Cártama `038P01` hourly rain and `038R03` nivel (plus the caudal column on that same CSV) for 11–15 Nov 2024 into `src/saih/hidrosur/fixtures/`. Same `{fecha, valor, estado}` rows as CHJ. Rain, stage and flow stay on three labels. Not a live score input. Other Hidrosur IDs stay unfetched until they reappear on the 177-station form.

**Málaga 13 Nov 2024 — first SAIH model-day referee.** Hidrosur Cártama rain on 13 Nov (24 h Europe/Madrid) *is* comparable to a model calendar day. The 5-day 11–15 Nov sum is not. AROME is out of domain on this square. Stage/flow do not referee millimetres.

| Source | Station | Window | Figure |
|---|---|---|---|
| Hidrosur | Cártama 038P01 rain | **24 h on 13 Nov 2024** (Europe/Madrid) | 77.3 mm; peak hour 19.2 mm. Comparable to a model day. |
| Hidrosur | Cártama 038P01 rain | Episode-sum **11–15 Nov** | 84.5 mm — almost all the 13th. Not the model-day referee. |
| Hidrosur | Cártama 038R03 nivel | Hourly, public series | 13 Nov max 1.84 m; window peak **3.08 m at 14 Nov 10:00**. First public stage series in the suite (Poyo has none). |
| Hidrosur | Cártama 038R03 caudal column | Same CSV, not the nivel series | 13 Nov max 210.2 m³/s; window peak **455.59 m³/s at the same 14 Nov 10:00 hour**. |

Local rain at Cártama is not Magre-core. The Guadalhorce still rose, peaking the morning after the rain day.

**Magre 2024 observed** is already in `src/data/probes.ts`. Two windows, never mixed, never compared to a single model-run day (`comparableToModelDay: false`):

| Source | Station | Window | Figure |
|---|---|---|---|
| AEMET | Turís | Peak-hours: **14 h on 29 Oct 2024** | ~700–770 mm; peak hour 184.6 mm. Not SAIH. Not a 24 h model day. |
| CHJ SAIH | Chiva 0P09 | Episode-sum: **28 Oct 00:00 – 5 Nov 00:00** (8 local days, Europe/Madrid) | 621 mm |
| CHJ SAIH | Marco en Real 7O09 | same 8-day window | 545.3 mm |
| CHJ SAIH | Embalse de Forata 7E03 | same | 320 mm |
| CHJ SAIH | EA 60 Requena 5A02 | same | 273.4 mm |
| CHJ SAIH | Poyo N-III rain 0O04 | same | 240.2 mm |

Report: CHJ `20241029-1104Informe-Episodio-C-version2.pdf`. SAIH millimetres include wet hours around the Magre peak; they are **not** 29 Oct calendar-day totals.

**Poyo N-III hydro is three labels, not one “Poyo datum”.** Magre `MAGRE_POYO_STAGE` is **nivel** (4.899 m at 18:55, then the sensor was lost) — incomplete, not on the public API (`fldTNivel` is null). The same clock in the episode report also printed **caudal** 2282.9 m³/s as `MAGRE_POYO_FLOW_AT_LOSS` (snapshot, not a series). Live archive `POYO_N3_CAUDAL` is CHJ variable **13873** (m³/s). A later event’s peak flow can proxy collapse time without a stage series. Do not file caudal under a STAGE-shaped name.

700–770 mm (Turís) and the SAIH episode table are enough to talk about **grid undercatch**. They are not an ENS calibration set and not a reason to put a chance % on the desk.

---

## AROME (parallel only)

AROME France (`/v1/meteofrance`, `models=arome_france` explicit) is a **parallel backtest source**. Live scoring stays on the ICON/ECMWF mix.

On Magre it is less wrong on Turís / Chiva / Utiel (best cell ~240 mm vs AEMET Turís ~700–770 mm in 14 h — still ~3× short) and worse on l'Horta. That is a bias profile, not a fix.

`corridorBelt` is a **table label** (`inland-orographic` · `coastal-plain` · `inland-basin` · `island` · `south`). Do not call inland-AROME a rule before a majority across `INLAND_AROME_RULE_MIN_CELLS` (6) independent **inland-orographic** labelled cells. Today that count is 1 of 6 (Utiel–Requena). Mallorca 28 Oct is **island**; Almería 11 Nov is **south** and outside the AROME France domain — labelled, but they do not increment the six. Málaga / Almería / Gibraltar are always out of domain.

Murcia Sep 2023 AROME all-null is an Open-Meteo **archive gap**, not an AROME dry-miss and not the inland/coast tally.

An AROME-only false alarm is `hangover` or `leftover-rain` (or `unassigned`) — never a new “AROME FA” bucket. Example: 31 Oct Utiel leftover-rain with `source: arome` (AROME’s own 29 Oct millimetres still in the rolling 48 h).

---

## Data

- Open-Meteo forecast (7 × 24 h) and marine SST. Non-commercial, [CC BY 4.0](https://open-meteo.com/).
- ECMWF IFS 0.25° \(T_{500}\) / \(z_{500}\) via Open-Meteo, merged with ICON as colder/lower.
- Geocoding limited to Spain.
- Map: OpenStreetMap / CARTO. Live rain overlay: RainViewer (tiles to zoom 7).
- Magre observed: AEMET Turís (peak-hours) and CHJ SAIH episode table as above.
- Málaga 13 Nov 2024 observed: Hidrosur Cártama `038P01` rain and `038R03` nivel/caudal fixtures (not CHG). 13 Nov rain is a model-day referee; stage peaks 14 Nov.

---

## Run locally

```bash
npm ci
npm test
npm run dev
npm run saih:chj
npm run saih:hidrosur
```

http://localhost:5173 — Node 22+ (see `.nvmrc`). `npm run saih:chj` is one CHJ pull; add `-- --loop` to repeat every 2 hours. `npm run saih:hidrosur` re-fetches the Cártama Nov 2024 fixture.

GitHub Pages: push, enable Pages from GitHub Actions. `BASE_PATH` follows the repo name. Workflow: `.github/workflows/ci.yml`.

---

## Tests

Unit tests lock the lapse-rate example, dry heat that must not score as a flood, corridor upscale, dual-model cut-off, geofence, sanitisation, Magre observed windows, and desk mechanisms. `npm run test:integration` hits live Open-Meteo. `npm run backtest` is the labelled replay above.

---

## Attribution

Weather: [Open-Meteo](https://open-meteo.com/). Map: OpenStreetMap contributors and CARTO. Radar: RainViewer. Magre SAIH episode table: Confederación Hidrográfica del Júcar. Cártama rain and Guadalhorce stage: SAIH Hidrosur (Junta de Andalucía).
