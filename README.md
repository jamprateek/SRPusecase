# SRP Productivity Intelligence — demo app

A browser-based demo of a modernized sucker-rod-pump (SRP) surveillance product, built for a
recorded customer walkthrough. All data is **synthetic and generated in the app**. There is no
backend, no login, no external API, and no network calls at runtime.

- React 18 + TypeScript + Vite, plain CSS, Recharts for line and bar charts; custom SVG for the
  dynamometer card, field map, gauge overlay and architecture diagram
- Built for **1920×1080** (16:9 recording) and still usable at laptop widths (1440 px)
- Uses a fixed demo clock (Sep 23, 2026 06:40 CT), so every run shows the same numbers

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
# or a production build
npm run build && npm run preview   # http://localhost:4173
```

`dist/` is a static site: after `npm run build` you can open it from any static file server.

## Views

| Tab | What it shows |
|---|---|
| Fleet Dashboard | 126 wells: status KPIs, deferred bbl/day, runtime, alerts, open tickets, field map with status filter, ranked at-risk wells, fleet production, deferral trend and deferral by condition |
| Well Detail | Status, priority score and breakdown, 30-day expected vs. actual production, 24 h telemetry (tubing/casing pressure, motor current, SPM), dynamometer card vs. baseline, diagnosis with confidence and evidence, gauge cross-check, business impact, recommended action, **Create field action** and **Mark reviewed** buttons |
| CV Gauge Reading | Five scenarios (normal, high tubing pressure, gas interference, low-confidence dirty gauge, sensor mismatch), an SVG detection overlay, extracted readings, a gauge vs. telemetry comparison and a recent-inspection log. Presented as an inspection aid, not the sole source of truth |
| Work Queue | Prioritized actions with rank, issue, severity, confidence, deferral, SLA and status. Shows the priority formula. You can create or review actions from each row |
| Reliability | Repeat-fault patterns (90-day event strips), recurring failure types, downtime by type, components at risk and a timeline that includes actions taken in this session |
| Modernization | Legacy → modern comparison, target architecture diagram, configurable rule set, CI/CD pipeline and how the demo workflow maps to services |

## Adding real images

Every image slot renders a labelled placeholder until you give it a path. Put the files in
`public/images/` and set their paths in `src/images.ts`:

```ts
pumpjack:     { src: 'images/pumpjack.jpg', ... },
wellhead:     { src: 'images/wellhead.jpg', ... },
gauge:        { src: 'images/gauge.jpg', ... },        // CV detection overlay draws on top
cabinet:      { src: 'images/control-cabinet.jpg', ... },
fieldMap:     { src: 'images/field-map.png', ... },   // well markers and county grid draw on top
architecture: { src: 'images/architecture.png', ... },
```

## Suggested walkthrough (≈ 6 min)

1. **Fleet Dashboard.** 126 wells: 6 critical, 11 warning, 5 offline. About 321 bbl/day deferred
   (≈ $23k/day), up sharply today. Click the Critical KPI or filter to show where the risk is on the map.
2. The at-risk list ranks **TX-REEVES-041** first (stuck pump, 42 bbl/day, priority 94). Open it.
3. **Well Detail.** Production dropped to near zero. At 01:10 motor current spiked and stroke rate
   collapsed. The dyno card has lost its load range compared with the baseline. Diagnosis: stuck pump,
   91% confidence, with evidence. The gauge cross-check agrees with the pressure loss. Point out
   the business impact and how the priority score is built.
4. Click **Create field action**. Ticket FT-24830 is assigned to a crew with a 4 h SLA.
5. **CV Gauge Reading.** Step through the scenarios. *Sensor mismatch* on TX-CRANE-019 shows the
   gauge reading 740 psi against a transmitter reading of 612 psi. *Dirty gauge* shows the reading
   being withheld because of low confidence.
6. **Work Queue.** TX-REEVES-041 now shows Open with the ticket, and "covered by open actions" has
   gone up. Show the priority formula. Back on the Fleet Dashboard, open tickets went from 8 to 9.
7. **Reliability.** Repeat stuck-pump pattern on TX-REEVES-041. The new action is at the top of the timeline.
8. **Modernization.** Tie Detect → Explain → Verify → Act back to the modular services that replace
   the monolithic C/C++ application.

Reload the page to reset the demo state.
