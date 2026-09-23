import { useEffect, useMemo, useRef, useState } from 'react';
import { hasRealFootage } from '../config';
import type { MapImage } from '../media';
import { SEVERITY_RANK, rng } from '../data';
import type { SRP } from '../types';
import { Icon, SeverityBadge, fmtAgo, sevClass } from '../ui';

const W = 1000;

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/**
 * Map-style regional view. Renders a stylised basemap unless a map image for the
 * scope has been uploaded to media/maps (see media/maps/README.md).
 */
export function MapPanel({ srps, onSelect, now, selectedId, image }: {
  srps: SRP[]; onSelect: (id: string) => void; now: number; selectedId?: string | null; image?: MapImage | null;
}) {
  const [hover, setHover] = useState<{ srp: SRP; x: number; y: number } | null>(null);
  // natural size of the uploaded map image, once loaded
  const [imgInfo, setImgInfo] = useState<{ ratio: number; width: number } | null>(null);
  useEffect(() => {
    setImgInfo(null);
    if (!image) return;
    const el = new Image();
    el.onload = () => el.naturalWidth && setImgInfo({ ratio: el.naturalHeight / el.naturalWidth, width: el.naturalWidth });
    el.src = image.url;
  }, [image?.url]);
  const img = image && imgInfo ? image : null;
  // viewBox height follows the container's aspect so the map fills its panel without distortion
  const wrapRef = useRef<HTMLDivElement>(null);
  const [H, setH] = useState(600);
  const [panelWidth, setPanelWidth] = useState(1000);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) {
        setH(Math.round((W * height) / width));
        setPanelWidth(width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // uploaded image: viewBox keeps the image's own aspect and is cropped to the panel (never stretched)
  const VH = img ? Math.round(W * imgInfo!.ratio) : H;

  const proj = useMemo(() => {
    if (img) {
      const [s, w, n, e] = img.bounds;
      // Google Maps imagery is Web Mercator: x is linear in longitude, y in mercator latitude
      return {
        x: (lng: number) => ((lng - w) / (e - w)) * W,
        y: (lat: number) => ((mercY(n) - mercY(lat)) / (mercY(n) - mercY(s))) * VH,
        bounds: img.bounds,
      };
    }
    const lats = srps.map((p) => p.lat);
    const lngs = srps.map((p) => p.lng);
    let s = Math.min(...lats); let n = Math.max(...lats); let w = Math.min(...lngs); let e = Math.max(...lngs);
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
    return {
      x: (lng: number) => ((lng - w) / (e - w)) * W,
      y: (lat: number) => ((n - lat) / (n - s)) * H,
      bounds: [s, w, n, e] as const,
    };
  }, [srps, H, img, VH]);

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
  }, [srps.length, fields, H]);

  const sorted = [...srps].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  // Visible window. On an uploaded map, zoom to the SRPs in scope - but only as far as the
  // screenshot's resolution allows (≤1.5 source px per screen px), so the imagery stays sharp.
  const view = useMemo(() => {
    if (!img || !srps.length) return { x: 0, y: 0, w: W, h: H, k: 1 };
    const A = H / W;
    const xs = srps.map((p) => proj.x(p.lng));
    const ys = srps.map((p) => proj.y(p.lat));
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = 70;
    const maxZoom = Math.max(1, Math.min(3, (imgInfo!.width / panelWidth) * 1.5));
    let w = Math.max(x1 - x0 + 2 * pad, (y1 - y0 + 2 * pad) / A, W / maxZoom);
    let h = w * A;
    if (w > W) { w = W; h = w * A; }
    if (h > VH) { h = VH; w = h / A; }
    const x = Math.min(Math.max((x0 + x1) / 2 - w / 2, 0), Math.max(0, W - w));
    const y = Math.min(Math.max((y0 + y1) / 2 - h / 2, 0), Math.max(0, VH - h));
    return { x, y, w, h, k: w / W };
  }, [img, srps, proj, H, VH, panelWidth, imgInfo]);

  let [s, w, n, e] = proj.bounds;
  if (img) {
    // report the coordinates of the visible window, not the whole screenshot
    const [bs, bw, bn, be] = img.bounds;
    const lngAt = (x: number) => bw + (x / W) * (be - bw);
    const latAt = (y: number) => (Math.atan(Math.sinh(mercY(bn) - (y / VH) * (mercY(bn) - mercY(bs)))) * 180) / Math.PI;
    [s, w, n, e] = [latAt(view.y + view.h), lngAt(view.x), latAt(view.y), lngAt(view.x + view.w)];
  }

  return (
    <div className="map" ref={wrapRef}>
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${img ? view.h : VH}`} preserveAspectRatio={img ? 'xMidYMid slice' : 'none'} className="map-svg">
        <defs>
          <pattern id="terrain" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="14" className="terrain-line" />
          </pattern>
        </defs>
        {img ? (
          <image href={img.url} x={0} y={0} width={W} height={VH} preserveAspectRatio="none" />
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
          </g>
        )}
        {sorted.map((p) => {
          const cx = proj.x(p.lng);
          const cy = proj.y(p.lat);
          const cls = sevClass(p.severity);
          const big = p.severity === 'Critical' || p.severity === 'Warning';
          return (
            <g key={p.id} className={`marker marker-${cls} ${selectedId === p.id ? 'selected' : ''}`} transform={`translate(${cx},${cy}) scale(${view.k})`}
              onMouseEnter={(ev) => {
                const box = wrapRef.current?.getBoundingClientRect();
                const r = ev.currentTarget.getBoundingClientRect();
                if (box) setHover({ srp: p, x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top });
              }}
              onMouseLeave={() => setHover(null)} onClick={() => onSelect(p.id)}>
              {p.severity === 'Critical' && <circle r={16} className="pulse" />}
              <circle r={14} className="hit" />
              <circle r={big ? 8 : 6} className="dot" />
              {hasRealFootage(p.id) ? (
                <text y={-14} className="marker-label marker-label-media" textAnchor="middle">{p.name.replace('SRP-', '')} · camera</text>
              ) : p.severity === 'Critical' && <text y={-14} className="marker-label" textAnchor="middle">{p.name.replace('SRP-', '')}</text>}
            </g>
          );
        })}
      </svg>

      {!img && (
        <div className="map-ph-note">
          <Icon name="map" size={14} />
          Map placeholder: replace with licensed Google Maps image or API
        </div>
      )}
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
        <div className="map-tip" style={{ left: hover.x, top: hover.y }}>
          <div className="tt-head">{hover.srp.name}</div>
          <div className="row gap6"><SeverityBadge severity={hover.srp.severity} />{hover.srp.issue && <span>{hover.srp.issue}</span>}</div>
          <div className="muted">{hover.srp.field} · {hover.srp.cameraId}</div>
          <div className="muted">Contamination {hover.srp.contamination.toFixed(1)}% · upload {fmtAgo(hover.srp.lastUpload, now)}</div>
          {hover.srp.issue && <div className="tip-cta">Click to open visual analytics</div>}
        </div>
      )}
    </div>
  );
}
