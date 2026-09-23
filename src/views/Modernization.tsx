import { useApp } from '../AppState';
import { ImagePlaceholder, Panel } from '../components/ui';

const COMPARISON = [
  { legacy: 'Monolithic C/C++ application', modern: 'Modular API services', detail: 'Telemetry, rules, CV and work-queue services deploy and scale independently' },
  { legacy: 'Hard-coded business rules', modern: 'Configurable rule engine', detail: 'Engineers tune thresholds per field without a code release' },
  { legacy: 'Manual gauge reading', modern: 'CV-assisted gauge extraction', detail: 'Route photos become cross-checked readings with confidence scores' },
  { legacy: 'Manual testing & deployment', modern: 'Automated test / deploy pipeline', detail: 'Every rule and service change runs regression tests before release' },
  { legacy: 'Local, single-site deployment', modern: 'Scalable cloud-ready monitoring', detail: 'Fleet-wide view; new fields onboard by configuration' },
];

const RULES = [
  { name: 'stuck_pump', expr: 'motor_current_delta > 40% AND spm < 1.0 AND card_load_range < 30% baseline', sev: 'critical', v: 'v4.2' },
  { name: 'fluid_pound', expr: 'fillage < 75% FOR 3 cycles AND downstroke_drop = sharp', sev: 'warning', v: 'v4.2' },
  { name: 'gas_interference', expr: 'casing_var_24h > 25% AND fillage < 70% AND downstroke_drop = gradual', sev: 'warning', v: 'v4.1' },
  { name: 'tubing_leak', expr: 'tubing_p_decline_48h > 15% AND runtime > 90% AND production_gap > 20%', sev: 'critical', v: 'v4.0' },
  { name: 'gauge_anomaly', expr: 'abs(cv_reading − sensor) / sensor > 10% FOR 2 inspections AND cv_conf ≥ 0.60', sev: 'warning', v: 'v1.3' },
];

const PIPELINE = [
  { step: 'Build', detail: '6 services', ok: true },
  { step: 'Unit tests', detail: '1,284 passed', ok: true },
  { step: 'Rule regression', detail: '312 labelled cards', ok: true },
  { step: 'CV accuracy gate', detail: 'MAE 1.8% · ≥ 0.60 conf', ok: true },
  { step: 'Staging', detail: 'Deployed 05:10', ok: true },
  { step: 'Production', detail: 'Canary 25% of fleet', ok: false },
];

export default function Modernization() {
  const { log } = useApp();
  const firstAction = log.filter((l) => l.kind === 'action').slice(-1)[0];
  return (
    <>
      <div className="page-head">
        <h1>Modernization</h1>
        <span className="sub">From a monolithic C/C++ pump-monitoring application to a modular, cloud-ready surveillance platform.</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', alignItems: 'start' }}>
        <div className="stack">
          <Panel title="Legacy constraint → modernized capability" flush>
            <table className="data">
              <thead><tr><th style={{ width: '32%' }}>Legacy constraint</th><th style={{ width: 24 }}></th><th>Modernized capability</th></tr></thead>
              <tbody>
                {COMPARISON.map((c) => (
                  <tr key={c.legacy} style={{ cursor: 'default' }}>
                    <td className="text-2" style={{ padding: '11px 10px' }}>{c.legacy}</td>
                    <td className="muted">→</td>
                    <td style={{ padding: '11px 10px' }}><div style={{ fontWeight: 600 }}>{c.modern}</div><div className="muted" style={{ fontSize: 11.5 }}>{c.detail}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Configurable rule engine" sub="Active rule set · Permian SRP" right={<span className="pill good">Published v4.2</span>} flush>
            <table className="data">
              <thead><tr><th>Rule</th><th>Condition</th><th>Severity</th></tr></thead>
              <tbody>
                {RULES.map((r) => (
                  <tr key={r.name} style={{ cursor: 'default' }}>
                    <td className="mono" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{r.name}<div className="muted">{r.v}</div></td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{r.expr}</td>
                    <td><span className={`pill ${r.sev}`}>{r.sev === 'critical' ? 'Critical' : 'Warning'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Automated test & deploy pipeline" sub="Release 2026.09.3">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPELINE.length}, minmax(0,1fr))`, gap: 6 }}>
              {PIPELINE.map((p) => (
                <div key={p.step} style={{ borderTop: `3px solid ${p.ok ? 'var(--ok)' : 'var(--accent)'}`, background: 'var(--panel-2)', borderRadius: '0 0 4px 4px', padding: '7px 8px' }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{p.ok ? '✓' : '◐'} {p.step}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{p.detail}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Target architecture" sub="How today's workflow runs on the platform">
            <ArchitectureDiagram />
          </Panel>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <ImagePlaceholder slot="architecture" height={170} />
            <ImagePlaceholder slot="cabinet" height={170} />
          </div>
          <Panel title="The workflow you just saw" sub="Each step maps to a service">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              {[
                ['1 · Detect', 'Telemetry ingestion + rules engine flag TX-REEVES-041 among 126 wells'],
                ['2 · Explain', 'Diagnosis service ranks fault evidence: current spike, stroke collapse, dyno card'],
                ['3 · Verify', 'CV inspection service cross-checks the wellhead gauge against the sensor'],
                ['4 · Act', firstAction ? `Work queue issued ${firstAction.text.split(' ')[2]} for ${firstAction.wellId}` : 'Work queue creates a field ticket, ranked by production impact'],
              ].map(([h, b]) => (
                <div key={h} style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 10px' }}>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>{h}</div>
                  <div className="text-2" style={{ fontSize: 12 }}>{b}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function ArchitectureDiagram() {
  const box = (x: number, y: number, w: number, title: string, sub: string, tone: 'edge' | 'svc' | 'app' = 'svc') => (
    <g key={title}>
      <rect x={x} y={y} width={w} height={58} rx="5" fill={tone === 'app' ? '#172536' : '#1b2026'} stroke={tone === 'edge' ? '#5b6572' : tone === 'app' ? '#3987e5' : '#3a434f'} strokeWidth="1.5" />
      <text x={x + 12} y={y + 24} fill="#e7e9ec" fontSize="13.5" fontWeight="600">{title}</text>
      <text x={x + 12} y={y + 43} fill="#7d8690" fontSize="11.5">{sub}</text>
    </g>
  );
  const arrow = (d: string, key: string) => <path key={key} d={d} fill="none" stroke="#5b6572" strokeWidth="1.6" markerEnd="url(#arr)" />;
  return (
    <svg viewBox="0 0 860 290" width="100%" style={{ display: 'block' }}>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10z" fill="#5b6572" />
        </marker>
      </defs>
      <text x="10" y="16" fill="#7d8690" fontSize="11" fontWeight="600" letterSpacing="0.6">FIELD / EDGE</text>
      <text x="220" y="16" fill="#7d8690" fontSize="11" fontWeight="600" letterSpacing="0.6">PLATFORM SERVICES (API)</text>
      <text x="660" y="16" fill="#7d8690" fontSize="11" fontWeight="600" letterSpacing="0.6">OPERATIONS</text>
      <line x1="200" x2="200" y1="6" y2="284" stroke="#252b33" strokeDasharray="3 4" />
      <line x1="640" x2="640" y1="6" y2="284" stroke="#252b33" strokeDasharray="3 4" />
      {box(10, 40, 170, 'Field sensors', 'RTU · load cell · PT · VFD', 'edge')}
      {box(10, 190, 170, 'Gauge images', 'Operator app · camera', 'edge')}
      {box(220, 40, 190, 'Telemetry ingestion', 'Stream · 15-min + events')}
      {box(430, 40, 190, 'Rules engine', 'Configurable · versioned')}
      {box(220, 190, 190, 'CV inspection service', 'Dial · needle · confidence')}
      {box(430, 115, 190, 'Diagnosis & priority', 'Evidence · score · $ impact')}
      {box(660, 40, 190, 'Operations dashboard', 'Fleet · well · reliability', 'app')}
      {box(660, 190, 190, 'Work queue', 'Field tickets · SLA', 'app')}
      {arrow('M180,69 H216', 'a1')}
      {arrow('M410,69 H426', 'a2')}
      {arrow('M180,219 H216', 'a3')}
      {arrow('M525,98 V111', 'a4')}
      {arrow('M410,219 H470 V177', 'a5')}
      {arrow('M620,144 H636 V73 H656', 'a6')}
      {arrow('M620,144 H636 V219 H656', 'a7')}
      {arrow('M315,98 V150 H426', 'a8')}
      <text x="220" y="270" fill="#7d8690" fontSize="11">Each service has its own API, tests and deployment.</text>
      <text x="220" y="284" fill="#7d8690" fontSize="11">The legacy C/C++ collector is wrapped as an ingestion adapter during migration.</text>
    </svg>
  );
}
