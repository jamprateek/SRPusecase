import { useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS, ChartTooltip, GRID } from './ui';
import { dynoCard, ProdPoint, TelemetryPoint } from '../data/wells';
import type { FaultType } from '../data/faults';

export function ProductionChart({ data, height = 220 }: { data: ProdPoint[]; height?: number }) {
  const withGap = data.map((d) => ({ ...d, gap: [d.actual, Math.max(d.actual, d.expected)] as [number, number] }));
  return (
    <div>
      <div className="legend" style={{ marginBottom: 6 }}>
        <span><span className="sw dash" />Expected</span>
        <span><span className="sw" style={{ background: 'var(--series-actual)' }} />Actual</span>
        <span><span className="sw" style={{ background: 'rgba(217,61,61,0.35)', height: 8 }} />Deferred</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={withGap} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="day" {...AXIS} interval={4} />
          <YAxis {...AXIS} axisLine={false} width={44} domain={[0, 'auto']} />
          <Tooltip content={<ChartTooltip unit="bbl/d" names={{ expected: 'Expected', actual: 'Actual' }} />} filterNull />
          <Area dataKey="gap" stroke="none" fill="rgba(217,61,61,0.22)" isAnimationActive={false} activeDot={false} tooltipType="none" />
          <Line dataKey="expected" stroke="var(--series-expected)" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="actual" stroke="var(--series-actual)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#15191e' }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const TEL = {
  tubing: { label: 'Tubing pressure', unit: 'psi' },
  casing: { label: 'Casing pressure', unit: 'psi' },
  current: { label: 'Motor current', unit: 'A' },
  spm: { label: 'Stroke rate', unit: 'SPM' },
} as const;

/** Four small multiples on a shared time axis — one y-scale each, never a dual axis. */
export function TelemetryPanel({ data, onsetLabel, height = 118 }: { data: TelemetryPoint[]; onsetLabel?: string; height?: number }) {
  const keys = Object.keys(TEL) as (keyof typeof TEL)[];
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
      {keys.map((k) => {
        const last = [...data].reverse().find((d) => d[k] != null)?.[k];
        const ticks = niceTicks(data.map((d) => d[k]).filter((v): v is number => v != null));
        return (
          <div key={k} style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 8px 2px' }}>
            <div className="row" style={{ justifyContent: 'space-between', padding: '0 2px' }}>
              <span className="text-2" style={{ fontSize: 11.5 }}>{TEL[k].label}</span>
              <span className="tnum" style={{ fontWeight: 600 }}>{last ?? '—'} <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>{TEL[k].unit}</span></span>
            </div>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="t" {...AXIS} interval={23} fontSize={10} />
                <YAxis {...AXIS} axisLine={false} width={34} ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} />
                <Tooltip content={<ChartTooltip unit={TEL[k].unit} names={{ [k]: TEL[k].label }} />} />
                {onsetLabel && <ReferenceLine x={onsetLabel} stroke="#d93d3d" strokeDasharray="3 3" />}
                <Line dataKey={k} stroke="var(--series-actual)" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

/** Padded, rounded axis ticks so small sensor noise is not magnified to full chart height. */
function niceTicks(vals: number[]): number[] {
  if (!vals.length) return [0, 1];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const pad = Math.max((hi - lo) * 0.15, Math.abs(mean) * 0.06, 0.5);
  const raw = (hi - lo + 2 * pad) / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.max(0, Math.floor((lo - pad) / step) * step);
  const out: number[] = [];
  for (let v = start; v <= hi + pad + step * 0.999; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

export function DynoCard({ fault, fillage, seed, height = 210 }: { fault: FaultType; fillage: number; seed: number; height?: number }) {
  const [hover, setHover] = useState<{ x: number; load: number } | null>(null);
  const W = 360, H = height, P = { l: 34, r: 10, t: 10, b: 24 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const base = dynoCard('normal', 88, 7);
  const cur = fault === 'comms_loss' ? [] : dynoCard(fault === 'gauge_anomaly' ? 'normal' : fault, fillage, seed);
  const sx = (x: number) => P.l + x * iw;
  const sy = (l: number) => P.t + ih - ((l - 4) / 16) * ih;
  const path = (pts: { x: number; load: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.load).toFixed(1)}`).join(' ') + 'Z';
  return (
    <div>
      <div className="legend" style={{ marginBottom: 4 }}>
        <span><span className="sw dash" />Baseline card</span>
        <span><span className="sw" style={{ background: 'var(--series-actual)' }} />Current card</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          const y = ((e.clientY - r.top) / r.height) * H;
          if (x < P.l || x > W - P.r || y < P.t || y > H - P.b) return setHover(null);
          setHover({ x: (x - P.l) / iw, load: 4 + ((P.t + ih - y) / ih) * 16 });
        }}
        onMouseLeave={() => setHover(null)}>
        {[4, 8, 12, 16, 20].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} stroke="#232931" />
            <text x={P.l - 6} y={sy(v) + 3.5} textAnchor="end" fill="#7d8690" fontSize="10">{v}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="#3a414b" />
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <text key={v} x={sx(v)} y={H - 8} textAnchor="middle" fill="#7d8690" fontSize="10">{Math.round(v * 100)}%</text>
        ))}
        <text x={P.l + 4} y={P.t + 10} fill="#7d8690" fontSize="10">load, klbs</text>
        <path d={path(base)} fill="none" stroke="var(--series-expected)" strokeWidth="1.5" strokeDasharray="5 4" />
        {cur.length > 0 && <path d={path(cur)} fill="rgba(57,135,229,0.10)" stroke="var(--series-actual)" strokeWidth="2" strokeLinejoin="round" />}
        {cur.length === 0 && <text x={W / 2} y={H / 2} fill="#7d8690" textAnchor="middle" fontSize="12">No card — telemetry offline</text>}
        {hover && (
          <g pointerEvents="none">
            <line x1={sx(hover.x)} x2={sx(hover.x)} y1={P.t} y2={H - P.b} stroke="#5b6572" strokeDasharray="2 2" />
            <rect x={Math.min(sx(hover.x) + 6, W - 112)} y={P.t + 2} width="104" height="20" rx="3" fill="#0f1216" stroke="#3a434f" />
            <text x={Math.min(sx(hover.x) + 12, W - 106)} y={P.t + 16} fill="#e7e9ec" fontSize="10.5">{Math.round(hover.x * 100)}% · {hover.load.toFixed(1)} klbs</text>
          </g>
        )}
      </svg>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Surface card · polished rod load vs. stroke position</div>
    </div>
  );
}

export function FleetTrendChart({ data, height = 150 }: { data: { day: string; expected: number; actual: number }[]; height?: number }) {
  return (
    <div>
      <div className="legend" style={{ marginBottom: 4 }}>
        <span><span className="sw dash" />Expected</span>
        <span><span className="sw" style={{ background: 'var(--series-actual)' }} />Actual</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="day" {...AXIS} interval={3} />
          <YAxis {...AXIS} axisLine={false} width={46} domain={['dataMin - 150', 'dataMax + 50']} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
          <Tooltip content={<ChartTooltip unit="bbl/d" names={{ expected: 'Expected', actual: 'Actual' }} />} />
          <Line dataKey="expected" stroke="var(--series-expected)" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="actual" stroke="var(--series-actual)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeferredBars({ data, height = 120 }: { data: { day: string; deferred: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 14, right: 6, bottom: 0, left: 0 }} barCategoryGap={3}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="day" {...AXIS} interval={3} />
        <YAxis {...AXIS} axisLine={false} width={34} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip unit="bbl/d" names={{ deferred: 'Deferred' }} />} />
        <Bar dataKey="deferred" fill="#c9793a" radius={[3, 3, 0, 0]} isAnimationActive={false}
          label={({ x, y, width, index, value }: { x: number; y: number; width: number; index: number; value: number }) =>
            index === data.length - 1 ? <text x={x + width / 2} y={y - 4} textAnchor="middle" fill="#e7e9ec" fontSize={11} fontWeight={600}>{value}</text> : <g />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars as plain HTML: count + deferral per fault. */
export function FaultBars({ rows, unit }: { rows: { label: string; value: number; sub?: string; color?: string }[]; unit?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="stack" style={{ gap: 7 }}>
      {rows.map((r) => (
        <div key={r.label} title={`${r.label}: ${r.value} ${unit ?? ''}`}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span className="text-2">{r.label}</span>
            <span className="tnum"><b>{r.value}</b>{unit && <span className="muted"> {unit}</span>}{r.sub && <span className="muted"> · {r.sub}</span>}</span>
          </div>
          <div className="meter" style={{ height: 7 }}><span style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? 'var(--series-actual)' }} /></div>
        </div>
      ))}
    </div>
  );
}
