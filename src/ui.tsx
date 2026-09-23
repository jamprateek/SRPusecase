import { useEffect, type ReactNode } from 'react';
import { slaRemainingMs, slaState } from './data';
import type { Severity, SRP, WorkStatus } from './types';

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const p2 = (n: number) => String(n).padStart(2, '0');

export function fmtTime(ms: number) {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
export function fmtDateTime(ms: number) {
  const d = new Date(ms);
  const mon = d.toLocaleString('en-US', { month: 'short' });
  return `${mon} ${d.getDate()}, ${fmtTime(ms)}`;
}
export function fmtAgo(ms: number, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${p2(m % 60)}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}
export function fmtDuration(ms: number) {
  const neg = ms < 0;
  const m = Math.floor(Math.abs(ms) / 60000);
  const s = `${Math.floor(m / 60)}h ${p2(m % 60)}m`;
  return neg ? `-${s}` : s;
}

// ---------------------------------------------------------------------------
// Status primitives (icon + label, never colour alone)
// ---------------------------------------------------------------------------

export const sevClass = (s: Severity) =>
  ({ Critical: 'critical', Warning: 'warning', 'Data quality': 'dq', Normal: 'normal', Offline: 'offline' })[s];

const SEV_GLYPH: Record<Severity, string> = {
  Critical: '▲',
  Warning: '◆',
  'Data quality': '◐',
  Normal: '●',
  Offline: '○',
};

export function SeverityBadge({ severity, compact }: { severity: Severity; compact?: boolean }) {
  return (
    <span className={`sev sev-${sevClass(severity)}`}>
      <span className="sev-glyph" aria-hidden>{SEV_GLYPH[severity]}</span>
      {compact ? null : severity}
    </span>
  );
}

export function WorkStatusChip({ status }: { status: WorkStatus | null }) {
  if (!status) return <span className="muted">-</span>;
  const cls = status.toLowerCase().replace(/ /g, '-');
  return <span className={`wstat wstat-${cls}`}>{status}</span>;
}

export function SlaChip({ srp, now }: { srp: SRP; now: number }) {
  const rem = slaRemainingMs(srp, now);
  const st = slaState(srp, now);
  if (rem === null || !st) return <span className="muted">-</span>;
  const cls = st === 'Breached' ? 'critical' : st === 'At risk' ? 'warning' : 'ok';
  return (
    <span className={`sla sla-${cls}`} title={`${srp.slaHours}h SLA - ${st}`}>
      <Icon name="clock" size={12} />
      {st === 'Breached' ? `Overdue ${fmtDuration(-rem)}` : fmtDuration(rem)}
    </span>
  );
}

export function Kpi({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string; icon: IconName }) {
  return (
    <div className={`card kpi ${tone ? 'kpi-' + tone : ''}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon"><Icon name={icon} size={16} /></span>
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image placeholders - swap for real images via src
// ---------------------------------------------------------------------------

export function ImageSlot({
  label,
  hint,
  src,
  icon = 'camera',
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  src?: string | null;
  icon?: IconName;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`imgslot ${src ? 'has-img' : ''} ${className}`}>
      {src ? (
        <img src={src} alt={label} />
      ) : (
        <div className="imgslot-ph">
          <Icon name={icon} size={22} />
          <span className="imgslot-label">{label}</span>
          {hint && <span className="imgslot-hint">{hint}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({ title, onClose, children, width = 560, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline, stroke-based)
// ---------------------------------------------------------------------------

const PATHS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  queue: 'M4 6h16M4 12h16M4 18h10',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h4v16H7zM14 4h4v16h-4z',
  prev: 'M18 5l-9 7 9 7zM6 5v14',
  next: 'M6 5l9 7-9 7zM18 5v14',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  pin: 'M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 0-5-5L14 6zM3 21l6-6',
  ticket: 'M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM13 7v12',
  note: 'M4 4h16v12l-4 4H4zM16 20v-4h4M8 9h8M8 13h5',
  clip: 'M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  check: 'M4 12l5 5L20 6',
  x: 'M6 6l12 12M18 6L6 18',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  cpu: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  chevron: 'M6 9l6 6 6-6',
  back: 'M15 18l-6-6 6-6',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  gauge: 'M12 21a9 9 0 1 1 9-9M12 12l5-4',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9a1 1 0 1 0 0-.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  refresh: 'M20 11a8 8 0 0 0-14-5L4 8M4 3v5h5M4 13a8 8 0 0 0 14 5l2-2M20 21v-5h-5',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className ?? ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
