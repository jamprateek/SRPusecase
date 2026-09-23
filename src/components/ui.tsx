import { ReactNode } from 'react';
import { IMAGES, ImageKey } from '../images';
import type { Status } from '../data/wells';
import type { ActionStatus } from '../data/state';

export function Panel(props: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; flush?: boolean; style?: React.CSSProperties; bodyStyle?: React.CSSProperties }) {
  return (
    <section className={`panel ${props.className ?? ''}`} style={props.style}>
      {props.title !== undefined && (
        <header className="panel-head">
          <span className="panel-title">{props.title}</span>
          {props.sub && <span className="panel-sub">{props.sub}</span>}
          {props.right && <div className="right">{props.right}</div>}
        </header>
      )}
      <div className={`panel-body ${props.flush ? 'flush' : ''}`} style={props.bodyStyle}>{props.children}</div>
    </section>
  );
}

export const STATUS_LABEL: Record<Status, string> = { normal: 'Normal', warning: 'Warning', critical: 'Critical', offline: 'Offline' };
export const STATUS_COLOR: Record<Status, string> = { normal: '#1fa34a', warning: '#f0a81c', critical: '#d93d3d', offline: '#6b737d' };

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill ${status}`}><StatusIcon status={status} />{STATUS_LABEL[status]}</span>;
}

/** Shape + colour so status never relies on colour alone. */
export function StatusIcon({ status, size = 9 }: { status: Status; size?: number }) {
  const c = STATUS_COLOR[status];
  if (status === 'critical') return <svg width={size} height={size} viewBox="0 0 10 10"><path d="M5 0.5 9.5 9.2H0.5Z" fill={c} /></svg>;
  if (status === 'warning') return <svg width={size} height={size} viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" fill={c} /></svg>;
  if (status === 'offline') return <svg width={size} height={size} viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.8" fill="none" stroke={c} strokeWidth="1.6" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" fill={c} /></svg>;
}

export function ActionChip({ status }: { status: ActionStatus }) {
  return <span className={`action-status ${status.replace(' ', '-')}`}>{status}</span>;
}

export function Meter({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
  return <div className="meter"><span style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} /></div>;
}

export function ImagePlaceholder({ slot, height, children, className, style, tagOnly }: { slot: ImageKey; height?: number | string; children?: ReactNode; className?: string; style?: React.CSSProperties; tagOnly?: boolean }) {
  const img = IMAGES[slot];
  return (
    <div className={`ph ${className ?? ''}`} style={{ height, ...style }}>
      {img.src ? (
        <img src={img.src} alt={img.label} />
      ) : tagOnly ? (
        <span className="ph-tag" style={{ top: 'auto', bottom: 8 }}>Image placeholder: {img.label}</span>
      ) : (
        <div className="ph-label">
          <svg width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1" y="1" width="24" height="20" rx="2" />
            <circle cx="8" cy="7.5" r="2.2" />
            <path d="M1 17l7-6 5 4 4-3 8 6" />
          </svg>
          <span>Image placeholder: {img.label}</span>
        </div>
      )}
      {children && <div className="ph-overlay">{children}</div>}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, unit, names }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; unit?: string; names?: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip">
      <div className="t-head">{label}</div>
      {payload.map((p) => (
        <div className="t-row" key={p.dataKey}>
          <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: p.color }} />{names?.[p.dataKey] ?? p.name}</span>
          <b>{p.value == null ? '—' : p.value.toLocaleString()} {unit}</b>
        </div>
      ))}
    </div>
  );
}

export const AXIS = { stroke: '#3a414b', tick: { fill: '#7d8690', fontSize: 11 }, tickLine: false } as const;
export const GRID = { stroke: '#232931', vertical: false } as const;
