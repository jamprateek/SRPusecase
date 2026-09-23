# SRP Visual Inspection Command Center

Browser demo for a case study on improving sucker rod pump (SRP) productivity with **camera-based visual analytics**.
A Siemens camera on each pump's supporting strut captures 60-second bursts at 3 images/sec, uploaded every 20 minutes.
The app analyses rod movement and rod-surface contamination and raises only events a mounted camera can see:

| Event | Visual basis |
|---|---|
| Stuck pump | Detected rod path flat across the burst |
| Pump-off | Incomplete / irregular / phase-shifted strokes vs. expected envelope |
| Pump leakage | Oil streaks and darkening near the stuffing box, rising contamination |
| High rod contamination | Grey/black intensity gradient across the rod ROI |
| Poor image quality | Glare, blur, night mode, obstruction - a data-quality event, not a pump fault |

No backend, APIs, auth or real images are required. All data is synthetic and deterministic.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
# or
npm run build && npm run preview
```

Best recorded at 1920×1080 (also works at 1440×810).

## Views

1. **Dashboard** - scope selectors (country / region / oil field), 4 KPIs, regional SRP map, attention list.
2. **SRP Visual Analytics** - header, burst player (play / pause / step / annotated overlay), expected-vs-detected
   movement chart, deviation chart, contamination/blackness analysis, plain-language explanation, action panel
   (work order, ticket, note, attach frame, technician, SLA, simulated email).
3. **Work Queue** - camera-detectable events only, filters, inline status changes; new work orders are highlighted.
4. **Event History** - 7-day event log plus 24 h contamination trend per SRP.
5. **Model Rules** - configurable thresholds (previously hard-coded) with an impact preview and "publish" versioning.

## Suggested walkthrough (5-7 min)

1. Dashboard → pick *United States / Delaware Basin* (optionally *Reeves*).
2. Click **SRP-REEVES-041** (top of the attention list, SLA at risk) → stuck pump: flat red detected line.
3. Play the burst, toggle **View annotated frame**.
4. Switch to **SRP-MIDLAND-088** (pump leakage) to show the contamination panel at 38.6 %.
5. **Create work order** → submit → email preview → **View in work queue** (row highlighted).
6. Optionally open **Model Rules** and change a threshold to show the impact preview.

## Adding real images, videos and maps

Upload files into the [`media/`](media/) folder. There's no code to change: the app finds them when it builds.

- `media/srps/<SRP name>/frames/`: camera photos (`001.jpg`, `002.jpg`, …); any number, spread across the 60 s burst
- `media/srps/<SRP name>/annotated/`: annotated photos (used by "View annotated frame", the work order and the email)
- `media/srps/<SRP name>/video/`: one MP4 clip; plays in the burst player and drives the charts' playhead
- `media/maps/<country>/<region>[/<field>]/`: `map.png` plus `bounds.json` (corner coordinates) per dashboard selection

Each folder has a README explaining what to upload. Anything missing keeps its placeholder.
To load media from somewhere else (CDN, API), change the functions in [`src/config.ts`](src/config.ts).

## Code map

- `src/media.ts` - discovers uploaded media under `media/`.
- `src/data.ts` - synthetic fleet (64 SRPs: 7 critical, 10 warning, 3 data quality, 2 offline), movement /
  rod-profile / trend generators, SLA and priority helpers.
- `src/store.tsx` - app state (scope, work orders, notes, history, rules, toasts) and hash routing.
- `src/components/` - map, burst player, SVG charts, work-order + email modals.
- `src/views/` - the five pages.
