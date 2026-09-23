import { useMemo } from 'react';
import { useApp } from '../AppState';
import { seeded, WELLS } from '../data/wells';
import { FAULTS, FaultType } from '../data/faults';
import { FaultBars } from '../components/charts';
import { Meter, Panel, StatusPill } from '../components/ui';

/** Fixed categorical order for fault identity (validated dark-mode palette slots). */
const FAULT_COLOR: Partial<Record<FaultType, string>> = {
  fluid_pound: '#3987e5',
  gas_interference: '#d95926',
  pump_off: '#199e70',
  tubing_leak: '#c98500',
  stuck_pump: '#d55181',
  gauge_anomaly: '#9085e9',
  comms_loss: '#7d8690',
};

const RECURRING: { f: FaultType; events: number; hours: number }[] = [
  { f: 'fluid_pound', events: 64, hours: 212 },
  { f: 'gas_interference', events: 41, hours: 168 },
  { f: 'pump_off', events: 37, hours: 131 },
  { f: 'comms_loss', events: 34, hours: 96 },
  { f: 'gauge_anomaly', events: 15, hours: 0 },
  { f: 'tubing_leak', events: 12, hours: 388 },
  { f: 'stuck_pump', events: 9, hours: 274 },
];

const AT_RISK = [
  { comp: 'Rod string / couplings', wells: ['TX-LOVING-012', 'TX-UPTON-030'], risk: 68, basis: 'Fluid-pound impact loads 180–212/hr' },
  { comp: 'Plunger / barrel', wells: ['TX-REEVES-041'], risk: 74, basis: '3 sticking events in 90 d; sand in last pull' },
  { comp: 'Production tubing', wells: ['TX-MIDLAND-088', 'TX-HOWARD-071'], risk: 61, basis: 'Pressure decline + 7 yr since last tubing inspection' },
  { comp: 'Gas anchor / separator', wells: ['TX-ANDREWS-052', 'TX-MIDLAND-104'], risk: 44, basis: 'Recurring low fillage with casing variance' },
  { comp: 'Tubing pressure transmitter', wells: ['TX-CRANE-019'], risk: 52, basis: 'CV mismatch on 2 consecutive inspections' },
  { comp: 'RTU radio link', wells: ['TX-LOVING-038', 'TX-WARD-061'], risk: 39, basis: '3 comms drops in 90 d' },
];

const HISTORY: { time: string; wellId: string; kind: 'anomaly' | 'action' | 'resolved'; text: string }[] = [
  { time: 'Sep 23 06:02', wellId: 'TX-WARD-061', kind: 'action', text: 'FT-24821 · automation tech dispatched to check RTU power and radio' },
  { time: 'Sep 23 05:12', wellId: 'TX-UPTON-030', kind: 'action', text: 'FT-24817 · crew on site, POC idle time being increased' },
  { time: 'Sep 23 01:10', wellId: 'TX-REEVES-041', kind: 'anomaly', text: 'Motor current spike 71 A; 3 auto-restarts failed. Stuck pump rule fired (91%).' },
  { time: 'Sep 22 17:48', wellId: 'TX-HOWARD-071', kind: 'action', text: 'FT-24809 · tubing pressure test scheduled' },
  { time: 'Sep 22 14:20', wellId: 'TX-GLASSCOCK-008', kind: 'resolved', text: 'Fluid pound reviewed; idle time extended remotely, fillage recovering' },
  { time: 'Sep 21 09:15', wellId: 'TX-MIDLAND-088', kind: 'anomaly', text: 'Tubing pressure decline rule triggered (−15% / 48 h)' },
  { time: 'Sep 16 11:40', wellId: 'TX-LOVING-012', kind: 'resolved', text: 'Workover: 3 rod couplings replaced, SPM reduced 9.6 → 9.1' },
  { time: 'Sep 12 03:25', wellId: 'TX-REEVES-041', kind: 'resolved', text: 'Stuck pump flushed and unseated; back online after 14 h downtime' },
  { time: 'Aug 30 15:05', wellId: 'TX-UPTON-030', kind: 'resolved', text: 'Pump-off: POC setpoint adjusted remotely' },
  { time: 'Aug 18 08:50', wellId: 'TX-REEVES-041', kind: 'resolved', text: 'Pump pulled: sand-scored barrel replaced (pulling unit, 2 days)' },
];

interface Ev { day: number; f: FaultType }

export default function Reliability() {
  const { log, openWell } = useApp();

  const repeatWells = useMemo(() => {
    return WELLS.filter((w) => w.repeat90d >= 2).map((w, i) => {
      const r = seeded(i * 97 + 13);
      const evs: Ev[] = [];
      if (w.status !== 'normal') evs.push({ day: Math.floor(w.onsetHours / 24), f: w.fault });
      for (let k = 0; k < w.repeat90d; k++) {
        const f: FaultType = r() < 0.8 && w.fault !== 'normal' ? w.fault : 'comms_loss';
        evs.push({ day: Math.round(8 + r() * 80), f });
      }
      const days = evs.map((e) => e.day).sort((a, b) => a - b);
      const gaps = days.slice(1).map((d, j) => d - days[j]);
      const mtbe = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 90;
      return { w, evs, mtbe };
    }).sort((a, b) => b.evs.length - a.evs.length || a.mtbe - b.mtbe);
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Reliability &amp; history</h1>
        <span className="sub">Recurring failure patterns, components at risk and the record of anomalies and operator actions. Last 90 days.</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))', marginBottom: 12 }}>
        <Stat label="Mean time between events" value="38" unit="days" foot="Fleet, per well · was 29 d prior quarter" />
        <Stat label="Downtime avoided · 90 d" value="1,180" unit="well-hours" foot="≈ 6,400 bbl from earlier detection" />
        <Stat label="Events · 90 d" value="212" foot="41% resolved remotely" />
        <Stat label="Repeat-failure wells" value={String(repeatWells.length)} foot="≥ 2 events in 90 days" />
        <Stat label="Mean time to action" value="3.6" unit="h" foot="Alert → field ticket · was 19 h" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="stack">
          <Panel title="Repeat fault patterns by well" sub="Events over last 90 days" flush
            right={<div className="legend">{(Object.keys(FAULT_COLOR) as FaultType[]).map((f) => <span key={f}><span className="dot" style={{ background: FAULT_COLOR[f], marginRight: 5 }} />{FAULTS[f].short}</span>)}</div>}>
            <table className="data">
              <thead><tr><th>Well</th><th>Status</th><th>Dominant pattern</th><th className="num">Events</th><th className="num">MTBE</th><th style={{ width: '38%' }}>90 days ago → today</th></tr></thead>
              <tbody>
                {repeatWells.map(({ w, evs, mtbe }) => (
                  <tr key={w.id} onClick={() => openWell(w.id)}>
                    <td className="well-id">{w.id}</td>
                    <td><StatusPill status={w.status} /></td>
                    <td className="text-2">{FAULTS[w.fault === 'normal' ? 'comms_loss' : w.fault].short}</td>
                    <td className="num"><b>{evs.length}</b></td>
                    <td className="num">{mtbe} d</td>
                    <td>
                      <svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none">
                        <line x1="0" x2="400" y1="9" y2="9" stroke="#2c343e" />
                        {[0, 30, 60, 90].map((d) => <line key={d} x1={400 - (d / 90) * 400} x2={400 - (d / 90) * 400} y1="4" y2="14" stroke="#2c343e" />)}
                        {evs.map((e, i) => (
                          <rect key={i} x={Math.min(391, 400 - (e.day / 90) * 400 - 4)} y="2" width="8" height="14" rx="2" fill={FAULT_COLOR[e.f]} stroke="#15191e" strokeWidth="1.5">
                            <title>{FAULTS[e.f].label} · {e.day === 0 ? 'today' : `${e.day} d ago`}</title>
                          </rect>
                        ))}
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Panel title="Top recurring failure types" sub="Fleet events · 90 d">
              <FaultBars unit="events" rows={RECURRING.map((r) => ({ label: FAULTS[r.f].short, value: r.events, color: FAULT_COLOR[r.f] }))} />
            </Panel>
            <Panel title="Downtime by failure type" sub="Well-hours · 90 d">
              <FaultBars unit="h" rows={[...RECURRING].sort((a, b) => b.hours - a.hours).filter((r) => r.hours > 0).map((r) => ({ label: FAULTS[r.f].short, value: r.hours, color: FAULT_COLOR[r.f] }))} />
            </Panel>
          </div>
        </div>

        <div className="stack">
          <Panel title="Components at risk" sub="30-day failure likelihood" flush>
            <table className="data">
              <thead><tr><th>Component</th><th>Wells</th><th style={{ width: 130 }}>Risk</th></tr></thead>
              <tbody>
                {AT_RISK.map((c) => (
                  <tr key={c.comp} style={{ cursor: 'default' }}>
                    <td><div style={{ fontWeight: 600 }}>{c.comp}</div><div className="muted" style={{ fontSize: 11.5 }}>{c.basis}</div></td>
                    <td>{c.wells.map((id) => <div key={id}><button className="link mono" style={{ fontSize: 11.5 }} onClick={() => openWell(id)}>{id}</button></div>)}</td>
                    <td>
                      <div className="row"><div style={{ flex: 1 }}><Meter value={c.risk} color={c.risk >= 60 ? 'var(--crit)' : c.risk >= 45 ? 'var(--warn)' : 'var(--off)'} /></div><b className="tnum">{c.risk}%</b></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Timeline" sub="Anomalies and operator actions">
            <div style={{ position: 'relative', paddingLeft: 18 }}>
              <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 1, background: 'var(--border-strong)' }} />
              {[
                ...log.map((l) => ({ time: l.time, wellId: l.wellId, kind: 'action' as const, text: l.text, live: true })),
                ...HISTORY.map((h) => ({ ...h, live: false })),
              ].map((e, i) => (
                <div key={i} style={{ position: 'relative', padding: '0 0 11px' }}>
                  <span style={{ position: 'absolute', left: -17, top: 4, width: 9, height: 9, borderRadius: '50%', border: '2px solid var(--panel)', background: e.kind === 'anomaly' ? 'var(--crit)' : e.kind === 'resolved' ? 'var(--ok)' : 'var(--accent)' }} />
                  <div className="row" style={{ gap: 8, fontSize: 11.5 }}>
                    <span className="muted tnum">{e.time}</span>
                    <button className="link mono" style={{ fontSize: 11.5 }} onClick={() => openWell(e.wellId)}>{e.wellId}</button>
                    <span className="muted">{e.kind === 'anomaly' ? 'Anomaly' : e.kind === 'resolved' ? 'Resolved' : 'Operator action'}</span>
                    {e.live && <span className="pill accent" style={{ fontSize: 10 }}>this session</span>}
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 1 }}>{e.text}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, unit, foot }: { label: string; value: string; unit?: string; foot?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value tnum">{value}{unit && <small>{unit}</small>}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}

