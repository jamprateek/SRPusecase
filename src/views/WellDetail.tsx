import { useApp } from '../AppState';
import { fmtAgo, fmtTime, OIL_PRICE, productionSeries, telemetrySeries, WELL_BY_ID, WELLS } from '../data/wells';
import { FAULTS } from '../data/faults';
import { AGREEMENT_LABEL, crossCheckFor } from '../data/gauges';
import { ActionChip, ImagePlaceholder, Meter, Panel, StatusPill } from '../components/ui';
import { DynoCard, ProductionChart, TelemetryPanel } from '../components/charts';

const BREAKDOWN_LABELS: [keyof typeof WELLS[number]['breakdown'], string, number][] = [
  ['productionLoss', 'Production loss', 40],
  ['severity', 'Severity', 25],
  ['confidence', 'Confidence', 15],
  ['repeatFailure', 'Repeat failure', 10],
  ['environmental', 'Environmental risk', 10],
];

export default function WellDetail() {
  const { selectedId, selectWell, actionFor, createAction, markReviewed, setTab, setGauge } = useApp();
  const w = WELL_BY_ID[selectedId];
  const f = FAULTS[w.fault];
  const a = actionFor(w.id);
  const prod = productionSeries(w, 30);
  const tel = telemetrySeries(w);
  const onsetIdx = w.onsetHours > 0 && w.onsetHours < 24 ? tel.length - 1 - Math.round(w.onsetHours * 4) : -1;
  const onsetLabel = onsetIdx >= 0 ? tel[onsetIdx].t : undefined;
  const check = crossCheckFor(w.id, w.tubingP);
  const isNormal = w.status === 'normal';
  const rank = WELLS.indexOf(w) + 1;
  const valueRisk = w.deferred * OIL_PRICE;
  const idx = WELLS.findIndex((x) => x.id === w.id);

  return (
    <>
      {/* ---------- header ---------- */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '12px 16px', flexWrap: 'wrap' }}>
          <div>
            <div className="row" style={{ gap: 10 }}>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{w.id}</span>
              <StatusPill status={w.status} />
              {!isNormal && <span className="pill neutral">Rank #{rank} of {WELLS.length}</span>}
            </div>
            <div className="text-2" style={{ marginTop: 3 }}>
              {w.county} County, TX · {w.lease} · {w.pad} · {w.unit} · Last event {fmtTime(w.lastEvent)} ({fmtAgo(w.lastEvent)})
            </div>
          </div>
          <HeaderStat label="Priority score" value={<>{Math.round(w.priority)}<span className="muted" style={{ fontSize: 13 }}> / 100</span></>} />
          <HeaderStat label="Deferred" value={<>{w.deferred}<span className="muted" style={{ fontSize: 13 }}> bbl/day</span></>} />
          <HeaderStat label="Runtime · 24 h" value={<>{w.runtime}<span className="muted" style={{ fontSize: 13 }}>%</span></>} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right', marginRight: 4 }}>
              <div className="label">Field action</div>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 3 }}>
                <ActionChip status={a.status} />
                {a.ticket && <span className="mono text-2" style={{ fontSize: 12 }}>{a.ticket}</span>}
              </div>
              {a.assignee && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{a.assignee}</div>}
            </div>
            <button className="btn primary" disabled={isNormal || a.status === 'Open' || a.status === 'In progress'} onClick={() => createAction(w.id)}>
              + Create field action
            </button>
            <button className="btn" disabled={a.status === 'Reviewed'} onClick={() => markReviewed(w.id)}>✓ Mark reviewed</button>
            <div className="seg" style={{ marginLeft: 6 }}>
              <button disabled={idx <= 0} onClick={() => selectWell(WELLS[Math.max(0, idx - 1)].id)} title="Previous well by priority">‹</button>
              <button disabled={idx >= WELLS.length - 1} onClick={() => selectWell(WELLS[Math.min(WELLS.length - 1, idx + 1)].id)} title="Next well by priority">›</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '330px minmax(0, 1fr) 440px', alignItems: 'start' }}>
        {/* ---------- left: site ---------- */}
        <div className="stack">
          <ImagePlaceholder slot="pumpjack" height={200} />
          <ImagePlaceholder slot="wellhead" height={130} />
          <Panel title="Current readings" sub={w.status === 'offline' ? 'last known' : 'live · 15-min'}>
            <dl className="kv">
              <dt>Tubing pressure</dt><dd>{w.status === 'offline' ? '—' : `${w.tubingP} psi`}</dd>
              <dt>Casing pressure</dt><dd>{w.status === 'offline' ? '—' : `${w.casingP} psi`}</dd>
              <dt>Flowline pressure</dt><dd>{w.status === 'offline' ? '—' : `${w.flowlineP} psi`}</dd>
              <dt>Motor current</dt><dd>{w.status === 'offline' ? '—' : `${w.motorCurrent} A`}</dd>
              <dt>Stroke rate</dt><dd>{w.status === 'offline' ? '—' : `${w.spm} SPM`}</dd>
              <dt>Pump fillage</dt><dd>{w.status === 'offline' ? '—' : `${w.fillage}%`} <span className="muted">(base {w.baselineFillage}%)</span></dd>
            </dl>
            <div className="divider" />
            <dl className="kv">
              <dt>Pumping unit</dt><dd className="mono" style={{ fontSize: 11.5 }}>{w.unit}</dd>
              <dt>Stroke length</dt><dd>{w.stroke} in</dd>
              <dt>Pump depth</dt><dd>{w.pumpDepth.toLocaleString()} ft</dd>
              <dt>Failures · 90 d</dt><dd>{w.repeat90d}</dd>
              <dt>Site risk</dt><dd>{w.envRisk}</dd>
            </dl>
          </Panel>
        </div>

        {/* ---------- middle: evidence charts ---------- */}
        <div className="stack">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
            <Panel title="Oil production" sub="30 days · expected vs. actual · bbl/day">
              <ProductionChart data={prod} height={232} />
            </Panel>
            <Panel title="Dynamometer card" sub={isNormal || w.fault === 'gauge_anomaly' ? 'matches baseline' : w.fault === 'comms_loss' ? 'no data' : `${f.short} signature`}>
              <DynoCard fault={w.fault} fillage={w.fillage} seed={idx + 3} height={236} />
            </Panel>
          </div>
          <Panel title="Telemetry" sub="Last 24 h · 15-min interval" right={onsetLabel && <span className="row muted" style={{ fontSize: 11.5 }}><span style={{ width: 14, borderTop: '2px dashed #d93d3d' }} />Event onset {onsetLabel}</span>}>
            {w.status === 'offline' && <div className="callout warn" style={{ marginBottom: 10 }}>Telemetry offline for {w.onsetHours} h. Chart shows last received data.</div>}
            <TelemetryPanel data={tel} onsetLabel={onsetLabel} height={150} />
          </Panel>
          <Panel title="Priority score" sub="How this well is ranked in the work queue">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr)) auto', alignItems: 'end', gap: 14 }}>
              {BREAKDOWN_LABELS.map(([k, label, max]) => (
                <div key={k}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span className="text-2">{label}</span>
                    <span className="tnum"><b>{w.breakdown[k]}</b><span className="muted"> / {max}</span></span>
                  </div>
                  <Meter value={w.breakdown[k]} max={max} color="var(--series-actual)" />
                </div>
              ))}
              <div style={{ textAlign: 'right', paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>
                <div className="label">Total</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 700 }}>{w.priority}</div>
              </div>
            </div>
          </Panel>
        </div>

        {/* ---------- right: diagnosis + action ---------- */}
        <div className="stack">
          <Panel title="Current diagnosis" right={<span className="muted" style={{ fontSize: 11.5 }}>Rules engine v4.2 · {fmtAgo(w.lastEvent)}</span>}
            style={{ borderColor: w.status === 'critical' ? 'rgba(217,61,61,0.55)' : undefined }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{f.label}</div>
            {w.status !== 'offline' && (
              <div style={{ marginTop: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span className="text-2">Confidence</span><b className="tnum">{w.confidence}%</b>
                </div>
                <Meter value={w.confidence} color={w.confidence >= 80 ? 'var(--ok)' : w.confidence >= 65 ? 'var(--warn)' : 'var(--off)'} />
              </div>
            )}
            <p className="text-2" style={{ margin: '10px 0 6px', fontSize: 12.5 }}>
              {isNormal ? w.diagnosis : <>{w.diagnosis} <span className="muted">Evidence:</span></>}
            </p>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {w.evidence.map((e) => (
                <li key={e} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
                  <span style={{ color: 'var(--series-actual)', flex: 'none' }}>▸</span><span>{e}</span>
                </li>
              ))}
            </ul>
            {!isNormal && <div className="formula" style={{ marginTop: 10, fontSize: 11.5 }}><span className="muted">Rule fired: </span>{f.rule}</div>}
          </Panel>

          <Panel title="Gauge cross-check" sub="CV inspection aid"
            right={<button className="link" style={{ fontSize: 12 }} onClick={() => {
              const map: Record<string, Parameters<typeof setGauge>[0]> = { 'TX-CRANE-019': 'mismatch', 'TX-ECTOR-033': 'dirty', 'TX-ANDREWS-052': 'gas' };
              if (map[w.id]) setGauge(map[w.id]);
              setTab('vision');
            }}>Open CV view →</button>}>
            {check ? (
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 12.5 }}>{check.text}<div className="muted" style={{ fontSize: 11.5 }}>Captured {check.capture}</div></div>
                <span className={`pill ${check.state === 'agrees' ? 'good' : check.state === 'mismatch' ? 'critical' : 'warning'}`}>{AGREEMENT_LABEL[check.state]}</span>
              </div>
            ) : <div className="muted" style={{ fontSize: 12.5 }}>No gauge capture in last 24 h. Telemetry used as sole source.</div>}
          </Panel>

          <Panel title="Business impact">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Impact label="Deferred" value={`${w.deferred}`} unit="bbl/day" />
              <Impact label="Value at risk" value={`$${Math.round(valueRisk).toLocaleString()}`} unit="per day" />
              <Impact label="If unresolved 7 d" value={`$${(valueRisk * 7 / 1000).toFixed(1)}k`} unit="cumulative" />
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Assumes ${OIL_PRICE}/bbl realised oil price. Excludes repair cost.</div>
          </Panel>

          <Panel title="Recommended field action" style={{ borderColor: !isNormal && a.status === 'New' ? 'rgba(57,135,229,0.55)' : undefined }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{w.action}</div>
            <div className="row" style={{ marginTop: 8, gap: 16, fontSize: 12.5 }}>
              <span><span className="muted">SLA </span><b>{w.sla}</b></span>
              <span><span className="muted">Component </span>{f.component}</span>
            </div>
            {!isNormal && (
              <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn primary" disabled={a.status === 'Open' || a.status === 'In progress'} onClick={() => createAction(w.id)}>
                  {a.status === 'Open' || a.status === 'In progress' ? `Action ${a.ticket} ${a.status.toLowerCase()}` : '+ Create field action'}
                </button>
                <button className="btn" disabled={a.status === 'Reviewed'} onClick={() => markReviewed(w.id)}>✓ Mark reviewed</button>
                <button className="btn ghost" onClick={() => setTab('queue')}>Work queue →</button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function HeaderStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ paddingLeft: 18, borderLeft: '1px solid var(--border)' }}>
      <div className="label">{label}</div>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
  );
}

function Impact({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px' }}>
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 19, fontWeight: 600 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{unit}</div>
    </div>
  );
}
