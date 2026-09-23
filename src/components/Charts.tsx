import { useEffect, useMemo, useRef, useState } from 'react';
import type { MovementSeries, RodProfile } from '../data';
import { ROD_SEGMENTS } from '../data';
import type { ModelRules } from '../types';

// Shared chart geometry -----------------------------------------------------

const PAD = { l: 44, r: 14, t: 12, b: 26 };

/** Track the rendered width so the viewBox matches pixels and text stays at its CSS size. */
function useWidth(fallback = 760) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { wrapRef: ref, W: w };
}

function useHover(n: number, width: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const svg = ref.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const f = (x - PAD.l) / (width - PAD.l - PAD.r);
    if (f < 0 || f > 1) return setIdx(null);
    setIdx(Math.round(f * (n - 1)));
  };
  return { ref, idx, onMove, onLeave: () => setIdx(null) };
}

// Movement: expected vs detected rod position ------------------------------

export function MovementChart({ s, frame, height = 230 }: { s: MovementSeries; frame?: number; height?: number }) {
  const { wrapRef, W } = useWidth();
  const H = height;
  const n = s.t.length;
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);
  const { ref, idx, onMove, onLeave } = useHover(n, W);

  const expectedPath = useMemo(() => s.expected.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(''), [s, W, H]);
  const hi = idx ?? null;

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="chart" onMouseMove={onMove} onMouseLeave={onLeave}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={PAD.l - 8} y={y(v) + 4} className="tick" textAnchor="end">{v}</text>
          </g>
        ))}
        {[0, 10, 20, 30, 40, 50, 60].map((sec) => (
          <text key={sec} x={x((sec / 60) * (n - 1))} y={H - 8} className="tick" textAnchor="middle">{sec}s</text>
        ))}
        <text x={12} y={PAD.t + (H - PAD.t - PAD.b) / 2} className="axis-title" transform={`rotate(-90 12 ${PAD.t + (H - PAD.t - PAD.b) / 2})`} textAnchor="middle">Rod position (% stroke)</text>
        <path d={expectedPath} className="line-expected" />
        {s.detected.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={2.3} className="pt-detected" />))}
        {frame !== undefined && <line x1={x(frame)} x2={x(frame)} y1={PAD.t} y2={H - PAD.b} className="playhead" />}
        {hi !== null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={PAD.t} y2={H - PAD.b} className="crosshair" />
            <circle cx={x(hi)} cy={y(s.expected[hi])} r={4} className="hover-exp" />
            {s.detected[hi] !== null && <circle cx={x(hi)} cy={y(s.detected[hi]!)} r={4} className="hover-det" />}
          </g>
        )}
      </svg>
      {hi !== null && (
        <div className="tooltip" style={{ left: `${(x(hi) / W) * 100}%` }}>
          <div className="tt-head">Frame {hi + 1} · t={s.t[hi].toFixed(1)}s</div>
          <div><i className="sw sw-exp" />Expected {s.expected[hi].toFixed(1)}%</div>
          <div><i className="sw sw-det" />Detected {s.detected[hi] === null ? 'no rod edge' : s.detected[hi]!.toFixed(1) + '%'}</div>
        </div>
      )}
    </div>
  );
}

// Deviation: expected minus detected ---------------------------------------

export function DeviationChart({ s, rules, height = 130 }: { s: MovementSeries; rules: ModelRules; height?: number }) {
  const { wrapRef, W } = useWidth();
  const H = height;
  const n = s.t.length;
  const maxAbs = Math.max(0, ...s.diff.map((v) => Math.abs(v ?? 0)));
  const max = Math.max(40, Math.ceil(maxAbs / 20) * 20);
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v + max) / (2 * max)) * (H - PAD.t - PAD.b);
  const bw = (W - PAD.l - PAD.r) / n;
  const { ref, idx, onMove, onLeave } = useHover(n, W);
  // thresholds expressed in % of stroke (deviation index * 2 * RMS of a full stroke ≈ index * 65)
  const warn = rules.deviationWarning * 65;
  const crit = rules.deviationCritical * 65;
  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="chart" onMouseMove={onMove} onMouseLeave={onLeave}>
        {[-max, -max / 2, 0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'baseline' : 'grid'} />
            <text x={PAD.l - 8} y={y(v) + 4} className="tick" textAnchor="end">{v}</text>
          </g>
        ))}
        {[crit, -crit].map((v) => <line key={v} x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="thr thr-crit" />)}
        {[warn, -warn].map((v) => <line key={v} x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="thr thr-warn" />)}
        {s.diff.map((v, i) => {
          if (v === null) return null;
          const a = Math.abs(v);
          const cls = a > crit ? 'dev-crit' : a > warn ? 'dev-warn' : 'dev-ok';
          return <rect key={i} x={x(i) - bw / 2 + 0.3} width={Math.max(1, bw - 0.6)} y={Math.min(y(0), y(v))} height={Math.abs(y(v) - y(0))} className={cls} />;
        })}
        <text x={W - PAD.r - 4} y={y(crit) - 4} className="thr-label" textAnchor="end">critical ±{crit.toFixed(0)}</text>
        <text x={W - PAD.r - 4} y={y(-warn) + 12} className="thr-label" textAnchor="end">warning ±{warn.toFixed(0)}</text>
        {idx !== null && <line x1={x(idx)} x2={x(idx)} y1={PAD.t} y2={H - PAD.b} className="crosshair" />}
      </svg>
      {idx !== null && (
        <div className="tooltip" style={{ left: `${(x(idx) / W) * 100}%` }}>
          <div className="tt-head">t={s.t[idx].toFixed(1)}s</div>
          <div>Expected − detected: {s.diff[idx] === null ? 'n/a' : s.diff[idx]!.toFixed(1) + ' pts'}</div>
        </div>
      )}
    </div>
  );
}

// Rod grey-level strip + per-segment blackness bars -------------------------

export function RodIntensity({ p, rules }: { p: RodProfile; rules: ModelRules }) {
  const W = 520;
  const H = 210;
  const stripX = 10;
  const stripW = 34;
  const top = 10;
  const segH = (H - 20) / ROD_SEGMENTS;
  const chartL = 110;
  const chartR = W - 12;
  const bx = (v: number) => chartL + (v / 100) * (chartR - chartL);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart rod-chart">
        {/* grey-level strip of rod (top = carrier bar, bottom = stuffing box) */}
        {p.segments.map((s, i) => (
          <rect key={i} x={stripX} y={top + i * segH} width={stripW} height={segH + 0.5} fill={`rgb(${s.intensity},${s.intensity},${s.intensity - 4})`} opacity={s.relevant ? 1 : 0.35} />
        ))}
        <rect x={stripX} y={top} width={stripW} height={ROD_SEGMENTS * segH} className="strip-frame" />
        {p.streaks.map((i) => <line key={i} x1={stripX + 8 + (i % 3) * 7} x2={stripX + 10 + (i % 3) * 7} y1={top + (i - 3) * segH} y2={top + (i + 2) * segH} className="streak" />)}
        {/* ROI bracket */}
        <path d={`M${stripX + stripW + 6},${top + p.relevantStart * segH} h6 V${top + (p.relevantEnd + 1) * segH} h-6`} className="roi-bracket" />
        <text x={stripX + stripW + 16} y={top + ((p.relevantStart + p.relevantEnd) / 2) * segH} className="tick" transform={`rotate(-90 ${stripX + stripW + 22} ${top + ((p.relevantStart + p.relevantEnd) / 2) * segH})`} textAnchor="middle">relevant ROI</text>
        <text x={stripX + stripW / 2} y={H - 1} className="tick" textAnchor="middle">SB</text>

        {/* blackness bars */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={bx(v)} x2={bx(v)} y1={top} y2={H - 10} className="grid" />
          </g>
        ))}
        <line x1={bx(rules.contaminationWarning)} x2={bx(rules.contaminationWarning)} y1={top} y2={H - 10} className="thr thr-warn" />
        <line x1={bx(rules.contaminationCritical)} x2={bx(rules.contaminationCritical)} y1={top} y2={H - 10} className="thr thr-crit" />
        {p.segments.map((s, i) => {
          const cls = !s.relevant ? 'bar-ignored' : s.blackness > rules.contaminationCritical ? 'bar-crit' : s.blackness > rules.contaminationWarning ? 'bar-warn' : 'bar-ok';
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={chartL} y={top + i * segH} width={chartR - chartL} height={segH} fill="transparent" />
              <rect x={chartL} y={top + i * segH + 0.6} width={Math.max(1.5, bx(s.blackness) - chartL)} height={Math.max(1, segH - 1.2)} rx={1.5} className={cls} />
            </g>
          );
        })}
        {hover !== null && <rect x={chartL - 2} y={top + hover * segH} width={chartR - chartL + 4} height={segH} className="row-hover" />}
      </svg>
      <div className="rod-axis"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100% blackness</span></div>
      {hover !== null && (
        <div className="tooltip tooltip-static">
          <div className="tt-head">Rod segment {hover + 1} of {ROD_SEGMENTS}{p.segments[hover].relevant ? '' : ' (ignored - hardware)'}</div>
          <div>Grey level {p.segments[hover].intensity} · blackness {p.segments[hover].blackness.toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
}

// Contamination band gauge --------------------------------------------------

export function ContaminationGauge({ value, rules }: { value: number; rules: ModelRules }) {
  const max = 50;
  const pct = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  return (
    <div className="gauge">
      <div className="gauge-track">
        <div className="gz gz-normal" style={{ left: 0, width: pct(10) }} />
        <div className="gz gz-monitor" style={{ left: pct(10), width: `calc(${pct(rules.contaminationWarning)} - ${pct(10)})` }} />
        <div className="gz gz-warn" style={{ left: pct(rules.contaminationWarning), width: `calc(${pct(rules.contaminationCritical)} - ${pct(rules.contaminationWarning)})` }} />
        <div className="gz gz-crit" style={{ left: pct(rules.contaminationCritical), right: 0 }} />
        <div className="gauge-needle" style={{ left: pct(value) }} />
      </div>
      <div className="gauge-labels">
        <span style={{ left: 0 }}>0</span>
        <span style={{ left: pct(10) }}>10</span>
        <span style={{ left: pct(rules.contaminationWarning) }}>{rules.contaminationWarning}</span>
        <span style={{ left: pct(rules.contaminationCritical) }}>{rules.contaminationCritical}</span>
        <span style={{ left: '100%' }}>50%+</span>
      </div>
    </div>
  );
}

// Contamination trend -------------------------------------------------------

export function TrendChart({ data, rules, height = 170, label }: { data: { time: number; value: number | null }[]; rules: ModelRules; height?: number; label?: string }) {
  const { wrapRef, W } = useWidth();
  const H = height;
  const n = data.length;
  const maxV = Math.max(45, ...data.map((d) => d.value ?? 0));
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / maxV) * (H - PAD.t - PAD.b);
  const { ref, idx, onMove, onLeave } = useHover(n, W);
  let d = '';
  let pen = false;
  data.forEach((p, i) => {
    if (p.value === null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    pen = true;
  });
  const area = `${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const hh = (t: number) => { const dt = new Date(t); return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`; };
  const last = data[n - 1];
  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="chart" onMouseMove={onMove} onMouseLeave={onLeave}>
        {[0, 10, 20, 30, 40].filter((v) => v <= maxV).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'baseline' : 'grid'} />
            <text x={PAD.l - 8} y={y(v) + 4} className="tick" textAnchor="end">{v}%</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(rules.contaminationWarning)} y2={y(rules.contaminationWarning)} className="thr thr-warn" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(rules.contaminationCritical)} y2={y(rules.contaminationCritical)} className="thr thr-crit" />
        <text x={PAD.l + 6} y={y(rules.contaminationCritical) - 4} className="thr-label">critical {rules.contaminationCritical}%</text>
        <text x={PAD.l + 6} y={y(rules.contaminationWarning) - 4} className="thr-label">warning {rules.contaminationWarning}%</text>
        {data.filter((_, i) => i % 12 === 0 || i === n - 1).map((p) => {
          const i = data.indexOf(p);
          return <text key={i} x={x(i)} y={H - 8} className="tick" textAnchor={i === n - 1 ? 'end' : 'middle'}>{i === n - 1 ? 'latest' : hh(p.time)}</text>;
        })}
        <path d={area} className="trend-area" />
        <path d={d} className="trend-line" />
        {last.value !== null && <circle cx={x(n - 1)} cy={y(last.value)} r={4.5} className="trend-end" />}
        {idx !== null && data[idx].value !== null && (
          <g>
            <line x1={x(idx)} x2={x(idx)} y1={PAD.t} y2={H - PAD.b} className="crosshair" />
            <circle cx={x(idx)} cy={y(data[idx].value!)} r={4} className="trend-end" />
          </g>
        )}
      </svg>
      {idx !== null && (
        <div className="tooltip" style={{ left: `${(x(idx) / W) * 100}%` }}>
          <div className="tt-head">{label ? label + ' · ' : ''}{hh(data[idx].time)} upload</div>
          <div>Contamination {data[idx].value === null ? 'no upload' : data[idx].value!.toFixed(1) + '%'}</div>
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, width = 90, height = 24, cls = '' }: { values: number[]; width?: number; height?: number; cls?: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / (max - min)) * (height - 4)).toFixed(1)}`).join('');
  return <svg width={width} height={height} className={`spark ${cls}`}><path d={d} /></svg>;
}
