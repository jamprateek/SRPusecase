import { useMemo, useState } from 'react';
import { MAP_IMAGE_BOUNDS, MAP_IMAGE_URL } from '../config';
import { SEVERITY_RANK, rng } from '../data';
import type { SRP } from '../types';
import { Icon, SeverityBadge, fmtAgo, sevClass } from '../ui';

const W = 1000;
const H = 600;

/**
 * Map-style regional view. Renders a stylised basemap until MAP_IMAGE_URL
 * (e.g. a licensed Google Maps static image) is configured in src/config.ts.
 */
export function MapPanel({ srps, onSelect, now, selectedId }: { srps: SRP[]; onSelect: (id: string) => void; now: number; selectedId?: string | null }) {
  const [hover, setHover] = useState<SRP | null>(null);

  const proj = useMemo(() => {
    let [s, w, n, e] = MAP_IMAGE_URL && MAP_IMAGE_BOUNDS ? MAP_IMAGE_BOUNDS : [0, 0, 0, 0];
    if (!(MAP_IMAGE_URL && MAP_IMAGE_BOUNDS)) {
      const lats = srps.map((p) => p.lat);
      const lngs = srps.map((p) => p.lng);
      s = Math.min(...lats); n = Math.max(...lats); w = Math.min(...lngs); e = Math.max(...lngs);
      // keep aspect and pad
      const midLat = (s + n) / 2;
      const k = Math.cos((midLat * Math.PI) / 180);
      let spanX = (e - w) * k;
      let spanY = n - s;
      const target = W / H;
      if (spanX / spanY < target) spanX = spanY * target; else spanY = spanX / target;
      spanX *= 1.18; spanY *= 1.22;
      const cx = (w + e) / 2; const cy = (s + n) / 2;
      w = cx - spanX / k / 2; e = cx + spanX / k / 2; s = cy - spanY / 2; n = cy + spanY / 2;
    }
    return {
      x: (lng: number) => ((lng - w) / (e - w)) * W,
      y: (lat: number) => ((n - lat) / (n - s)) * H,
      bounds: [s, w, n, e] as const,
    };
  }, [srps]);

  const fields = useMemo(() => {
    const m = new Map<string, SRP[]>();
    srps.forEach((s) => m.set(s.field, [...(m.get(s.field) ?? []), s]));
    return [...m.entries()].map(([name, list]) => {
      const xs = list.map((p) => proj.x(p.lng));
      const ys = list.map((p) => proj.y(p.lat));
      return { name, x0: Math.min(...xs) - 34, y0: Math.min(...ys) - 34, x1: Math.max(...xs) + 34, y1: Math.max(...ys) + 34, region: list[0].region };
    });
  }, [srps, proj]);

  // decorative basemap: roads, drainage, lease grid (deterministic)
  const deco = useMemo(() => {
    const r = rng('basemap:' + srps.length + fields.map((f) => f.name).join());
    const roads = Array.from({ length: 5 }, (_, i) => {
      const horizontal = i % 2 === 0;
      const pts: string[] = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const a = horizontal ? t * W : 80 + r() * (W - 160);
        const b = horizontal ? 60 + (i / 5) * H + (r() - 0.5) * 40 : t * H;
        pts.push(horizontal ? `${a},${b}` : `${a + (r() - 0.5) * 30},${b}`);
      }
      return pts.join(' ');
    });
    const creeks = Array.from({ length: 2 }, () => {
      let x = r() * W; let y = 0; const pts = [`${x},${y}`];
      while (y < H) { y += 40; x += (r() - 0.5) * 70; pts.push(`${x.toFixed(0)},${y}`); }
      return pts.join(' ');
    });
    return { roads, creeks };
  }, [srps.length, fields]);

  const sorted = [...srps].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const [s, w, n, e] = proj.bounds;

  return (
    <div className="map">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="map-svg">
        <defs>
          <pattern id="terrain" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="14" className="terrain-line" />
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="var(--map-vignette)" />
          </radialGradient>
        </defs>
        {MAP_IMAGE_URL ? (
          <image href={MAP_IMAGE_URL} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
        ) : (
          <g>
            <rect width={W} height={H} className="map-bg" />
            <rect width={W} height={H} fill="url(#terrain)" />
            {Array.from({ length: 11 }, (_, i) => <line key={'gx' + i} x1={(i * W) / 10} x2={(i * W) / 10} y1={0} y2={H} className="map-grid" />)}
            {Array.from({ length: 7 }, (_, i) => <line key={'gy' + i} y1={(i * H) / 6} y2={(i * H) / 6} x1={0} x2={W} className="map-grid" />)}
            {deco.creeks.map((c, i) => <polyline key={'c' + i} points={c} className="map-creek" />)}
            {deco.roads.map((rd, i) => <polyline key={'r' + i} points={rd} className={i < 2 ? 'map-road major' : 'map-road'} />)}
            {fields.map((f) => (
              <g key={f.name}>
                <rect x={f.x0} y={f.y0} width={f.x1 - f.x0} height={f.y1 - f.y0} rx={18} className="map-field" />
                <text x={f.x0 + 12} y={f.y1 - 10} className="map-field-label">{f.name.toUpperCase()} FIELD</text>
              </g>
            ))}
            <rect width={W} height={H} fill="url(#vignette)" />
          </g>
        )}
        {sorted.map((p) => {
          const cx = proj.x(p.lng);
          const cy = proj.y(p.lat);
          const cls = sevClass(p.severity);
          const big = p.severity === 'Critical' || p.severity === 'Warning';
          return (
            <g key={p.id} className={`marker marker-${cls} ${selectedId === p.id ? 'selected' : ''}`} transform={`translate(${cx},${cy})`}
              onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(p.id)}>
              {p.severity === 'Critical' && <circle r={16} className="pulse" />}
              <circle r={14} className="hit" />
              <circle r={big ? 8 : 6} className="dot" />
              {p.severity === 'Critical' && <text y={-14} className="marker-label" textAnchor="middle">{p.name.replace('SRP-', '')}</text>}
            </g>
          );
        })}
      </svg>

      <div className="map-ph-note">
        <Icon name="map" size={14} />
        Map placeholder: replace with licensed Google Maps image or API
      </div>
      <div className="map-legend">
        {(['Critical', 'Warning', 'Data quality', 'Normal', 'Offline'] as const).map((sv) => (
          <span key={sv}><SeverityBadge severity={sv} /> <b>{srps.filter((p) => p.severity === sv).length}</b></span>
        ))}
      </div>
      <div className="map-zoom" aria-hidden>
        <button tabIndex={-1}>+</button>
        <button tabIndex={-1}>−</button>
      </div>
      <div className="map-coords">{s.toFixed(2)}°, {w.toFixed(2)}° → {n.toFixed(2)}°, {e.toFixed(2)}°</div>

      {hover && (
        <div className="map-tip" style={{ left: `${(proj.x(hover.lng) / W) * 100}%`, top: `${(proj.y(hover.lat) / H) * 100}%` }}>
          <div className="tt-head">{hover.name}</div>
          <div className="row gap6"><SeverityBadge severity={hover.severity} />{hover.issue && <span>{hover.issue}</span>}</div>
          <div className="muted">{hover.field} · {hover.cameraId}</div>
          <div className="muted">Contamination {hover.contamination.toFixed(1)}% · upload {fmtAgo(hover.lastUpload, now)}</div>
          {hover.issue && <div className="tip-cta">Click to open visual analytics</div>}
        </div>
      )}
    </div>
  );
}
