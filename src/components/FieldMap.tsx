import { useState } from 'react';
import { COUNTY_GRID, County, Status, Well } from '../data/wells';
import { FAULTS } from '../data/faults';
import { ImagePlaceholder, STATUS_COLOR, STATUS_LABEL } from './ui';

const W = 1000, H = 520;

function Marker({ w, dim, selected }: { w: Well; dim: boolean; selected: boolean }) {
  const c = STATUS_COLOR[w.status];
  const r = w.status === 'critical' ? 9 : w.status === 'warning' ? 7.5 : 5.5;
  const S = 40, cx = S / 2, cy = S / 2;
  const common = { stroke: '#0d0f12', strokeWidth: 2 } as const;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ opacity: dim ? 0.13 : 1, display: 'block' }}>
      {selected && <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#3987e5" strokeWidth="2.5" />}
      {w.status === 'critical' && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={c} strokeOpacity="0.5" strokeWidth="1.5" />}
      {w.status === 'critical' && <path d={`M${cx},${cy - r} L${cx + r},${cy + r * 0.8} L${cx - r},${cy + r * 0.8}Z`} fill={c} {...common} />}
      {w.status === 'warning' && <rect x={cx - r * 0.75} y={cy - r * 0.75} width={r * 1.5} height={r * 1.5} transform={`rotate(45 ${cx} ${cy})`} fill={c} {...common} />}
      {w.status === 'offline' && <circle cx={cx} cy={cy} r={r} fill="#15191e" stroke={c} strokeWidth="2" />}
      {w.status === 'normal' && <circle cx={cx} cy={cy} r={r} fill={c} {...common} />}
    </svg>
  );
}

export function FieldMap({ wells, filter, selectedId, onSelect, height = 300 }: { wells: Well[]; filter: Status | 'all'; selectedId: string; onSelect: (id: string) => void; height?: number }) {
  const [hover, setHover] = useState<Well | null>(null);
  // draw normal wells first so problem wells sit on top
  const order: Status[] = ['normal', 'offline', 'warning', 'critical'];
  const sorted = [...wells].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <ImagePlaceholder slot="fieldMap" height={height} tagOnly>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
        {(Object.entries(COUNTY_GRID) as [County, [number, number]][]).map(([name, [c, r]]) => (
          <g key={name}>
            <rect x={(c * W) / 5 + 2} y={(r * H) / 3 + 2} width={W / 5 - 4} height={H / 3 - 4} fill="rgba(255,255,255,0.012)" stroke="#2c343e" strokeDasharray="4 4" />
            <text x={(c * W) / 5 + 10} y={(r * H) / 3 + 20} fill="#5f6873" fontSize="13" fontWeight="600" letterSpacing="0.8">{name.toUpperCase()}</text>
          </g>
        ))}
      </svg>
      {sorted.map((w) => (
        <div key={w.id} role="button" aria-label={w.id}
          style={{ position: 'absolute', left: `${w.x * 100}%`, top: `${w.y * 100}%`, transform: 'translate(-50%,-50%)', cursor: 'pointer', zIndex: w.id === selectedId ? 2 : 1 }}
          onMouseEnter={() => setHover(w)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(w.id)}>
          <Marker w={w} dim={filter !== 'all' && w.status !== filter} selected={w.id === selectedId} />
        </div>
      ))}
      {hover && (
        <div className="tooltip" style={{ position: 'absolute', left: `min(calc(${hover.x * 100}% + 14px), calc(100% - 250px))`, top: `min(calc(${hover.y * 100}% + 10px), calc(100% - 90px))`, width: 236, pointerEvents: 'none', zIndex: 3 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="well-id">{hover.id}</span>
            <span style={{ color: STATUS_COLOR[hover.status], fontWeight: 600, fontSize: 11.5 }}>{STATUS_LABEL[hover.status]}</span>
          </div>
          <div className="text-2" style={{ marginTop: 3 }}>{FAULTS[hover.fault].label}</div>
          <div className="t-row" style={{ marginTop: 3 }}><span className="muted">Actual / expected</span><b>{hover.actual} / {hover.expected} bbl/d</b></div>
          {hover.deferred >= 1 && <div className="t-row"><span className="muted">Deferred</span><b>{hover.deferred} bbl/d</b></div>}
        </div>
      )}
      <div className="legend" style={{ position: 'absolute', right: 10, bottom: 8, background: 'rgba(13,15,18,0.8)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', zIndex: 2 }}>
        {(['normal', 'warning', 'critical', 'offline'] as Status[]).map((s) => (
          <span key={s} className="row" style={{ gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              {s === 'critical' && <path d="M5 0.5 9.5 9.2H0.5Z" fill={STATUS_COLOR[s]} />}
              {s === 'warning' && <rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" fill={STATUS_COLOR[s]} />}
              {s === 'offline' && <circle cx="5" cy="5" r="3.8" fill="none" stroke={STATUS_COLOR[s]} strokeWidth="1.6" />}
              {s === 'normal' && <circle cx="5" cy="5" r="4" fill={STATUS_COLOR[s]} />}
            </svg>
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </ImagePlaceholder>
  );
}
