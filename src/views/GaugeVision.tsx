import { useApp } from '../AppState';
import { agreement, AGREEMENT_LABEL, Agreement, GaugeReading, Scenario, SCENARIOS } from '../data/gauges';
import { WELL_BY_ID } from '../data/wells';
import { ImagePlaceholder, Meter, Panel, StatusPill } from '../components/ui';

const PILL: Record<Agreement, string> = { agrees: 'good', mismatch: 'critical', low_confidence: 'warning' };

export default function GaugeVision() {
  const { gauge, setGauge, openWell } = useApp();
  const s = SCENARIOS.find((x) => x.id === gauge)!;
  const w = WELL_BY_ID[s.wellId];
  const primary = s.readings.find((r) => r.key === s.primary)!;
  const primaryState = agreement(primary);

  return (
    <>
      <div className="page-head">
        <h1>Computer-vision gauge reading</h1>
        <span className="sub">Reads analog wellhead gauges from operator or fixed-camera images and cross-checks them against telemetry.</span>
        <span className="spacer" />
        <span className="pill warning">Controlled demo · inspection aid</span>
      </div>

      <div className="row" style={{ marginBottom: 12, gap: 12 }}>
        <span className="label">Scenario</span>
        <div className="seg">
          {SCENARIOS.map((x) => (
            <button key={x.id} className={gauge === x.id ? 'active' : ''} onClick={() => setGauge(x.id)}>{x.label}</button>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="stack">
          <Panel title="Capture" sub={`${s.source} · ${s.capture}`}
            right={<span className="row"><span className="well-id">{w.id}</span><StatusPill status={w.status} /><button className="link" onClick={() => openWell(w.id)}>Open well →</button></span>}>
            <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 210px' }}>
              <ImagePlaceholder slot="gauge" height={440} tagOnly>
                <GaugeOverlay s={s} r={primary} state={primaryState} />
              </ImagePlaceholder>
              <div className="stack" style={{ gap: 10 }}>
                <div className="label">Detection</div>
                <dl className="kv" style={{ fontSize: 12 }}>
                  <dt>Target dial</dt><dd>{primary.label.replace(' pressure', '')}</dd>
                  <dt>Dial found</dt><dd>{s.glare ? '0.71' : '0.98'}</dd>
                  <dt>Scale OCR</dt><dd>0–{primary.range} psi</dd>
                  <dt>Needle angle</dt><dd>{(-135 + (primary.gauge / primary.range) * 270).toFixed(1)}°</dd>
                  <dt>Image quality</dt><dd className={s.glare ? 'warn-text' : ''}>{s.glare ? 'Glare 38%' : 'Good'}</dd>
                </dl>
                <div className="divider" style={{ margin: '2px 0' }} />
                <div className="label">Pipeline</div>
                {['Image capture', 'Dial detection', 'Scale & needle keypoints', 'Value extraction', 'Telemetry cross-check'].map((step, i) => (
                  <div key={step} className="row" style={{ fontSize: 12 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 700, background: s.glare && i === 2 ? 'rgba(240,168,28,0.18)' : 'rgba(57,135,229,0.18)', color: s.glare && i === 2 ? 'var(--warn-text)' : '#8bbcf3' }}>{i + 1}</span>
                    <span className="text-2">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Recent inspections" sub="Last 24 h · 38 captures, 6 shown" flush>
            <table className="data">
              <thead><tr><th>Captured</th><th>Well</th><th>Source</th><th className="num">Gauges</th><th className="num">Mean conf.</th><th>Result</th></tr></thead>
              <tbody>
                {SCENARIOS.map((x) => ({ x, st: x.readings.map(agreement) }))
                  .concat([{ x: { ...SCENARIOS[0], capture: 'Sep 23 05:58', wellId: 'TX-REEVES-041', source: 'Operator mobile capture · route 1' } as Scenario, st: ['agrees', 'agrees', 'agrees'] as Agreement[] }])
                  .sort((p, q) => q.x.capture.localeCompare(p.x.capture))
                  .map(({ x, st }) => {
                    const worst: Agreement = st.includes('mismatch') ? 'mismatch' : st.includes('low_confidence') ? 'low_confidence' : 'agrees';
                    return (
                      <tr key={x.wellId + x.capture} className={x.id === gauge && x.wellId === s.wellId ? 'selected' : ''} onClick={() => SCENARIOS.some((y) => y.wellId === x.wellId) ? setGauge(x.id) : openWell(x.wellId)}>
                        <td className="tnum text-2">{x.capture}</td>
                        <td className="well-id">{x.wellId}</td>
                        <td className="text-2">{x.source.split(' · ')[0]}</td>
                        <td className="num">3</td>
                        <td className="num">{(x.readings.reduce((a, r) => a + r.conf, 0) / 3).toFixed(2)}</td>
                        <td><span className={`pill ${PILL[worst]}`}>{AGREEMENT_LABEL[worst]}</span></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="stack">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
            {s.readings.map((r) => <ReadingCard key={r.key} r={r} primary={r.key === s.primary} />)}
          </div>

          <Panel title="Gauge vs. telemetry" sub="Agreement band ±10% · confidence floor 0.60" flush>
            <table className="data">
              <thead><tr><th>Measurement</th><th className="num">CV gauge</th><th className="num">Sensor</th><th className="num">Difference</th><th className="num">Confidence</th><th>Status</th></tr></thead>
              <tbody>
                {s.readings.map((r) => {
                  const st = agreement(r);
                  const d = r.gauge - r.telemetry;
                  return (
                    <tr key={r.key} style={{ cursor: 'default' }}>
                      <td>{r.label}</td>
                      <td className="num">{r.gauge} psi</td>
                      <td className="num">{r.telemetry} psi</td>
                      <td className={`num ${st === 'mismatch' ? 'crit-text' : ''}`}>{d > 0 ? '+' : ''}{d} psi ({((d / r.telemetry) * 100).toFixed(1)}%)</td>
                      <td className="num">{r.conf.toFixed(2)}</td>
                      <td><span className={`pill ${PILL[st]}`}>{AGREEMENT_LABEL[st]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel title="Finding" style={{ borderColor: primaryState === 'mismatch' ? 'rgba(217,61,61,0.5)' : primaryState === 'low_confidence' ? 'rgba(240,168,28,0.5)' : undefined }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.finding}</div>
            <div className="text-2" style={{ marginTop: 6, fontSize: 12.5 }}>→ {s.next}</div>
          </Panel>

          <div className="callout">
            <b style={{ color: 'var(--text)' }}>Inspection aid, not the sole source of truth.</b> CV readings corroborate or challenge
            transmitter data and route field checks. Diagnoses and alarms continue to use calibrated telemetry; readings below 0.60 confidence
            are never used in rules, and every mismatch is confirmed by a technician before a sensor is replaced.
          </div>
        </div>
      </div>
    </>
  );
}

function ReadingCard({ r, primary }: { r: GaugeReading; primary: boolean }) {
  const st = agreement(r);
  return (
    <div className="kpi" style={{ borderColor: primary ? 'var(--border-strong)' : undefined }}>
      <div className="kpi-label" style={{ justifyContent: 'space-between' }}>{r.label}{primary && <span className="pill accent" style={{ fontSize: 10.5 }}>overlay</span>}</div>
      <div className="kpi-value tnum" style={{ opacity: st === 'low_confidence' ? 0.55 : 1 }}>{r.gauge}<small>psi</small></div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <span className="muted" style={{ fontSize: 11.5 }}>Sensor {r.telemetry} psi</span>
        <span className={`pill ${PILL[st]}`}>{AGREEMENT_LABEL[st]}</span>
      </div>
      <div className="row" style={{ marginTop: 8, gap: 8, fontSize: 11.5 }}>
        <span className="muted">Conf.</span>
        <div style={{ flex: 1 }}><Meter value={r.conf * 100} color={r.conf >= 0.8 ? 'var(--ok)' : r.conf >= 0.6 ? 'var(--warn)' : 'var(--crit)'} /></div>
        <b className="tnum">{r.conf.toFixed(2)}</b>
      </div>
    </div>
  );
}

/** Detection overlay: dial outline, scale ticks, keypoints and extracted needle. */
function GaugeOverlay({ s, r, state }: { s: Scenario; r: GaugeReading; state: Agreement }) {
  const cx = 250, cy = 250, R = 170;
  const ang = (v: number) => ((-225 + (v / r.range) * 270) * Math.PI) / 180;
  const pt = (v: number, rad: number) => [cx + Math.cos(ang(v)) * rad, cy + Math.sin(ang(v)) * rad];
  const color = state === 'agrees' ? '#4cc574' : state === 'mismatch' ? '#f06a6a' : '#f5bd4f';
  const [nx, ny] = pt(r.gauge, R - 22);
  const [tx, ty] = pt(r.telemetry, R - 8);
  const [tx2, ty2] = pt(r.telemetry, R + 14);
  const ticks = Array.from({ length: 11 }, (_, i) => (i * r.range) / 10);
  const arc = (from: number, to: number, rad: number) => {
    const [x1, y1] = pt(from, rad), [x2, y2] = pt(to, rad);
    const large = ((to - from) / r.range) * 270 > 180 ? 1 : 0;
    return `M${x1},${y1} A${rad},${rad} 0 ${large} 1 ${x2},${y2}`;
  };
  return (
    <svg viewBox="0 0 500 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* bounding box */}
      <rect x={cx - R - 24} y={cy - R - 24} width={(R + 24) * 2} height={(R + 24) * 2} fill="none" stroke={s.glare ? '#f5bd4f' : '#3987e5'} strokeWidth="2" strokeDasharray="8 5" />
      <rect x={cx - R - 24} y={cy - R - 46} width="210" height="22" fill={s.glare ? '#f5bd4f' : '#3987e5'} />
      <text x={cx - R - 16} y={cy - R - 30} fill="#0d0f12" fontSize="13" fontWeight="700">{r.label.split(' ')[0].toLowerCase()}_gauge {s.glare ? '0.71' : '0.98'}</text>
      {/* dial outline */}
      <circle cx={cx} cy={cy} r={R} fill="rgba(13,15,18,0.35)" stroke="#8fb8e8" strokeWidth="2.5" />
      <path d={arc(0, r.range, R - 8)} fill="none" stroke="#5b6572" strokeWidth="2" />
      {s.highLimit && <path d={arc(s.highLimit, r.range, R - 8)} fill="none" stroke="#d93d3d" strokeWidth="6" />}
      {ticks.map((v) => {
        const [x1, y1] = pt(v, R - 8), [x2, y2] = pt(v, R - 24), [lx, ly] = pt(v, R - 40);
        return (
          <g key={v}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#aab3bd" strokeWidth="2" />
            <text x={lx} y={ly + 4} fill="#aab3bd" fontSize="12" textAnchor="middle">{v}</text>
          </g>
        );
      })}
      {/* scale keypoints */}
      {[0, r.range].map((v) => { const [x, y] = pt(v, R - 8); return <circle key={v} cx={x} cy={y} r="6" fill="none" stroke="#c9a6f5" strokeWidth="2" />; })}
      {/* telemetry reference marker */}
      <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="#e7e9ec" strokeWidth="3" />
      <text x={tx2 + (tx2 > cx ? 6 : -6)} y={ty2 - 4} fill="#e7e9ec" fontSize="12" textAnchor={tx2 > cx ? 'start' : 'end'}>sensor {r.telemetry}</text>
      {/* extracted needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={state === 'low_confidence' ? '10 7' : undefined} />
      <circle cx={cx} cy={cy} r="9" fill={color} />
      <circle cx={nx} cy={ny} r="7" fill="none" stroke={color} strokeWidth="2.5" />
      {s.glare && (
        <g>
          <ellipse cx={cx + 55} cy={cy - 70} rx="95" ry="55" fill="rgba(245,189,79,0.12)" stroke="#f5bd4f" strokeDasharray="5 4" transform={`rotate(-25 ${cx + 55} ${cy - 70})`} />
          <text x={cx + 70} y={cy - 64} fill="#f5bd4f" fontSize="12" textAnchor="middle">glare / condensation</text>
        </g>
      )}
      {/* readout */}
      <rect x={cx - 78} y={cy + 52} width="156" height="54" rx="4" fill="rgba(13,15,18,0.88)" stroke={color} />
      <text x={cx} y={cy + 77} fill="#e7e9ec" fontSize="20" fontWeight="700" textAnchor="middle">{r.gauge} psi</text>
      <text x={cx} y={cy + 96} fill={color} fontSize="12" textAnchor="middle">conf {r.conf.toFixed(2)} · {AGREEMENT_LABEL[state].toLowerCase()}</text>
    </svg>
  );
}
