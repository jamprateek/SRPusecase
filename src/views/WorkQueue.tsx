import { useState } from 'react';
import { useApp } from '../AppState';
import { ActionStatus } from '../data/state';
import { WELLS } from '../data/wells';
import { FAULTS } from '../data/faults';
import { ActionChip, Meter, Panel, StatusPill } from '../components/ui';

type QFilter = 'all' | ActionStatus;

export default function WorkQueue() {
  const { actionFor, createAction, markReviewed, openWell, selectedId } = useApp();
  const [qf, setQf] = useState<QFilter>('all');
  const queue = WELLS.filter((w) => w.status !== 'normal');
  const rows = queue.filter((w) => qf === 'all' || actionFor(w.id).status === qf);
  const count = (s: ActionStatus) => queue.filter((w) => actionFor(w.id).status === s).length;
  const totalDeferred = queue.reduce((a, w) => a + w.deferred, 0);
  const actioned = queue.filter((w) => ['Open', 'In progress'].includes(actionFor(w.id).status));
  const covered = actioned.reduce((a, w) => a + w.deferred, 0);
  const sla4 = queue.filter((w) => w.sla === '4h' && actionFor(w.id).status === 'New').length;

  return (
    <>
      <div className="page-head">
        <h1>Work queue</h1>
        <span className="sub">Field actions ranked by estimated production impact. Highest-value work first.</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) minmax(0, 2.2fr)', marginBottom: 12 }}>
        <Stat label="Items in queue" value={queue.length} foot={`${count('New')} awaiting triage`} />
        <Stat label="Deferred in queue" value={Math.round(totalDeferred)} unit="bbl/day" foot="Sum of estimated deferral" />
        <Stat label="Covered by open actions" value={Math.round(covered)} unit="bbl/day" foot={<Meter value={covered} max={totalDeferred} color="var(--series-actual)" />} />
        <Stat label="4 h SLA not dispatched" value={sla4} foot={sla4 ? <span className="crit-text">Dispatch required</span> : <span className="ok-text">All dispatched</span>} />
        <div className="panel" style={{ padding: '10px 12px' }}>
          <div className="label" style={{ marginBottom: 6 }}>Priority score (0–100)</div>
          <div className="formula">
            priority = <span className="term">production loss</span> (0–40) + <span className="term">severity</span> (0–25) + <span className="term">confidence</span> (0–15)
            <br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + <span className="term">repeat failure</span> (0–10) + <span className="term">environmental risk</span> (0–10)
          </div>
        </div>
      </div>

      <Panel title="Prioritized action queue" sub={`${rows.length} items`} flush
        right={
          <div className="seg">
            {(['all', 'New', 'Open', 'In progress', 'Reviewed'] as QFilter[]).map((f) => (
              <button key={f} className={qf === f ? 'active' : ''} onClick={() => setQf(f)}>
                {f === 'all' ? 'All' : f}<span className="count">{f === 'all' ? queue.length : count(f)}</span>
              </button>
            ))}
          </div>
        }>
        <table className="data">
          <thead>
            <tr>
              <th className="num" style={{ width: 44 }}>Rank</th><th>Well</th><th>Issue</th><th>Severity</th><th className="num">Confidence</th>
              <th className="num">Deferred bbl/d</th><th className="num">Priority</th><th>Suggested action</th><th>SLA</th><th>Status</th><th style={{ width: 210 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const a = actionFor(w.id);
              const rank = queue.indexOf(w) + 1;
              return (
                <tr key={w.id} className={w.id === selectedId ? 'selected' : ''} onClick={() => openWell(w.id)}>
                  <td className="num muted" style={{ fontWeight: 600 }}>{rank}</td>
                  <td className="well-id">{w.id}</td>
                  <td>{FAULTS[w.fault].label}{w.fault === 'tubing_leak' && w.confidence < 90 ? <span className="muted"> (suspected)</span> : null}</td>
                  <td><StatusPill status={w.status} /></td>
                  <td className="num">{w.status === 'offline' ? '—' : `${w.confidence}%`}</td>
                  <td className="num"><b>{w.deferred}</b></td>
                  <td className="num">
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{ width: 54 }}><Meter value={w.priority} color="var(--series-actual)" /></div>
                      <b style={{ minWidth: 20 }}>{Math.round(w.priority)}</b>
                    </div>
                  </td>
                  <td className="text-2" style={{ maxWidth: 380, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={w.action}>{w.action}</td>
                  <td className={w.sla === '4h' ? 'crit-text' : ''} style={{ fontWeight: 600 }}>{w.sla}</td>
                  <td>
                    <ActionChip status={a.status} />
                    {a.ticket && <span className="mono muted" style={{ fontSize: 11, marginLeft: 6 }}>{a.ticket}</span>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      {a.status === 'New' || a.status === 'Reviewed' ? (
                        <button className="btn sm primary" onClick={() => createAction(w.id)}>Create action</button>
                      ) : <span className="muted" style={{ fontSize: 11.5 }}>{a.assignee?.split(' · ')[0]}</span>}
                      <button className="btn sm" disabled={a.status === 'Reviewed'} onClick={() => markReviewed(w.id)}>Review</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function Stat({ label, value, unit, foot }: { label: string; value: number; unit?: string; foot?: React.ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value tnum">{value}{unit && <small>{unit}</small>}</div>
      {foot && <div className="kpi-foot" style={{ marginTop: 4 }}>{foot}</div>}
    </div>
  );
}
