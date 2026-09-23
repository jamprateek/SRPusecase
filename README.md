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

## Adding real images later

All swap points live in [`src/config.ts`](src/config.ts). Put files in `public/images/` and:

- `MAP_IMAGE_URL` + `MAP_IMAGE_BOUNDS` - licensed Google Maps static image (or other basemap) and its lat/lng bounds;
  markers are projected onto it automatically.
- `cameraFrameUrl(srpId, frame)` - raw burst frames (live stream / captured frame placeholders).
- `annotatedFrameUrl(srpId, frame)` - annotated overlay frames (also used as the work-order / email attachment).

While these return `null`, the UI renders labelled placeholders (the camera view is a schematic driven by the
detected rod position, so playback still reflects the analytics).

## Code map

- `src/data.ts` - synthetic fleet (64 SRPs: 7 critical, 10 warning, 3 data quality, 2 offline), movement /
  rod-profile / trend generators, SLA and priority helpers.
- `src/store.tsx` - app state (scope, work orders, notes, history, rules, toasts) and hash routing.
- `src/components/` - map, burst player, SVG charts, work-order + email modals.
- `src/views/` - the five pages.
