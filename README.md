# DANA

A personal, **non-commercial** 7-day map of DANA / gota fría and flood risk on **14 flood-prone areas** of peninsular Spain and the Balearics.

Mediterranean floods are often missed by products that wait for extreme CAPE or treat a hot, dry lapse rate as a riada. This project separates the **sky pattern** (cut-off, moisture, warm sea) from **rain on the ground**, and scores both hour by hour from open models.

It is a static Vite site. No database, no API keys.

---

## Why

A DANA is a cut-off pool of cold air around 500 hPa (~5.5 km). Over a warm, moist Mediterranean that pattern can stall and rain on the same ramblas for many hours. The deadly events (València, Murcia, Málaga) usually look like **warm rain + stalled cut-off + onshore moisture**, not a supercell with 2500+ J/kg CAPE.

Global models also **under-do** Mediterranean convection: 40–50 mm in the model on a flood corridor under a DANA is already a strong signal, not a modest shower.

The 14 squares on the map are the corridors this index is built for. Outside mainland Spain and the Balearics the same numbers do not mean the same thing.

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

\(T_{500}\) and \(z_{500}\) take the **colder / lower** of ICON and ECMWF IFS 0.25°. Rain stays on the local Open-Meteo mix.

**Level** of an hour:

| | Condition |
|---|---|
| 0 | Quiet |
| 1 | Some rain, instability, or a weak setup |
| 2 | Setup ≥ 0.48 (classic cut-off + Med moisture) |
| 3 | Strong impact, or setup + meaningful rain, or DANA + model ≥ 22 mm/24 h or 45 mm/48 h on a corridor |
| 4 | Flood-gate impact, or DANA + model ≥ 48 mm/24 h or 75 mm/48 h on a corridor |

The flood gate is impact ≥ 0.84. Thermal shock or CAPE alone cannot open it.

**Day colour** (strip and map) is the day as a whole: one yellow hour does not paint the day. Red or purple if any hour reaches 3 or 4. Orange only if rain is actually on (flood gate or ≥ 8 mm/24 h). A dry cold pool does not turn the day orange.

Names in the UI: stable · unsettled · cold air above · heavy storms · flood risk.

---

## Data

- Open-Meteo forecast (7 × 24 h) and marine SST. Non-commercial, [CC BY 4.0](https://open-meteo.com/).
- ECMWF IFS 0.25° \(T_{500}\) / \(z_{500}\) via Open-Meteo, merged with ICON as colder/lower.
- Geocoding limited to Spain.
- Map: OpenStreetMap / CARTO. Live rain overlay: RainViewer (tiles to zoom 7).

---

## Run locally

```bash
npm ci
npm test
npm run dev
```

http://localhost:5173 — Node 20+.

GitHub Pages: push, enable Pages from GitHub Actions. `BASE_PATH` follows the repo name. Workflow: `.github/workflows/ci.yml`.

---

## Tests

Unit tests lock the lapse-rate example, dry heat that must not score as a flood, corridor upscale, dual-model cut-off, geofence, and sanitisation. `npm run test:integration` hits live Open-Meteo.

`npm run backtest` replays the current score on labelled DANA days (Magre 2024 with riuada/quiet squares, Málaga Nov 2024, Murcia Sep 2023, plus dry controls) against Open-Meteo historical forecasts. That is a **near-analysis** stitch, not a 48-hour forecast. Model rain at T−24/T−48/T−72 is printed separately. SAIH gauges are not in this loop yet. Unlabelled Magre squares (Alacant, Vega Baja, Gibraltar, …) stay out of hit/miss counts until a documented flood exists for that day.

---

## Attribution

Weather: [Open-Meteo](https://open-meteo.com/). Map: OpenStreetMap contributors and CARTO. Radar: RainViewer.
