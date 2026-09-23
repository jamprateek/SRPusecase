import { useMemo } from 'react';
import { useApp } from '../AppState';
import { fleetProduction, fmtAgo, OIL_PRICE, Status, WELLS } from '../data/wells';
import { FAULTS, FaultType } from '../data/faults';
import { ActionChip, Panel, STATUS_COLOR, STATUS_LABEL, StatusIcon, StatusPill } from '../components/ui';
import { FieldMap } from '../components/FieldMap';
import { DeferredBars, FaultBars, FleetTrendChart } from '../components/charts';

const FILTERS: (Status | 'all')[] = ['all', 'normal', 'warning', 'critical', 'offline'];

export default function FleetDashboard() {
  const { filter, setFilter, selectedId, openWell, actionFor, openTickets } = useApp();
  const counts = useMemo(() => {
    const c: Record<Status, number> = { normal: 0, warning: 0, critical: 0, offline: 0 };
    WELLS.forEach((w) => c[w.status]++);
    return c;
  }, []);
  const deferred = WELLS.reduce((a, w) => a + w.deferred, 0);
  const runtime = WELLS.reduce((a, w) => a + w.runtime, 0) / WELLS.length;
  const alerts = WELLS.reduce((a, w) => a + w.alerts24h, 0);
  const fleet = fleetProduction(14);
  const yesterday = fleet[fleet.length - 2].deferred;
  const visible = WELLS.filter((w) => filter === 'all' || w.status === filter);
  const atRisk = WELLS.filter((w) => w.status !== 'normal').slice(0, 9);

  const faultRows = (Object.keys(FAULTS) as FaultType[])
    .filter((f) => f !== 'normal')
    .map((f) => {
      const ws = WELLS.filter((w) => w.fault === f);
      return { label: FAULTS[f].short, value: Math.round(ws.reduce((a, w) => a + w.deferred, 0)), sub: `${ws.length} wells` };
    })
    .filter((r) => r.sub !== '0 wells')
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="kpis">
        <Kpi label="Active SRP wells" value={WELLS.length} foot="13 counties · Permian Basin" selected={filter === 'all'} onClick={() => setFilter('all')} />
        {(['normal', 'warning', 'critical', 'offline'] as Status[]).map((s) => (
          <Kpi key={s} status={s} label={STATUS_LABEL[s]} value={counts[s]} foot={`${Math.round((counts[s] / WELLS.length) * 100)}% of fleet`} selected={filter === s} onClick={() => setFilter(filter === s ? 'all' : s)} />
        ))}
        <Kpi label="Deferred production today" value={Math.round(deferred)} unit="bbl/day" accent="#c9793a"
          foot={<>${(deferred * OIL_PRICE / 1000).toFixed(1)}k/day · <span className="crit-text">+{Math.round(deferred - yesterday)} vs yday</span></>} />
        <Kpi label="Average runtime" value={runtime.toFixed(0)} unit="%" foot="Target ≥ 90%" />
        <Kpi label="Alerts · last 24 h" value={alerts} foot="14 auto-cleared by rules" />
        <Kpi label="Open field tickets" value={openTickets} foot="Across 3 field crews" accent="#3987e5" />
      </div>

      <div className="grid fleet-grid">
        {/* ---------- left: map + filtered wells ---------- */}
        <Panel title="Field overview" sub={`${visible.length} of ${WELLS.length} wells shown`}
          right={
            <div className="seg">
              {FILTERS.map((f) => (
                <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                  {f !== 'all' && <StatusIcon status={f} />}
                  {f === 'all' ? 'All' : STATUS_LABEL[f]}
                  <span className="count">{f === 'all' ? WELLS.length : counts[f]}</span>
                </button>
              ))}
            </div>
          }>
          <FieldMap wells={WELLS} filter={filter} selectedId={selectedId} onSelect={openWell} height={318} />
          <div className="scroll" style={{ height: 292, marginTop: 10, border: '1px solid var(--border)', borderRadius: 5 }}>
            <table className="data">
              <thead>
                <tr><th>Well</th><th>Status</th><th>Condition</th><th className="num">Actual / exp. bbl/d</th><th className="num">Deferred</th><th className="num">Runtime</th><th className="num">Priority</th></tr>
              </thead>
              <tbody>
                {visible.map((w) => (
                  <tr key={w.id} className={w.id === selectedId ? 'selected' : ''} onClick={() => openWell(w.id)}>
                    <td className="well-id">{w.id}</td>
                    <td><StatusPill status={w.status} /></td>
                    <td className="text-2">{FAULTS[w.fault].short}</td>
                    <td className="num">{w.status === 'offline' ? <span className="muted">— / {w.expected}</span> : <>{w.actual} / {w.expected}</>}</td>
                    <td className="num">{w.deferred >= 1 ? <b>{Math.round(w.deferred)}</b> : <span className="muted">0</span>}</td>
                    <td className="num">{w.runtime}%</td>
                    <td className="num"><b>{Math.round(w.priority)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ---------- middle: priority list ---------- */}
        <Panel title="Wells requiring attention" sub="Ranked by priority score" flush
          right={<span className="muted" style={{ fontSize: 11.5 }}>Top {atRisk.length} of {WELLS.length - counts.normal}</span>}>
          <div>
            {atRisk.map((w, i) => {
              const a = actionFor(w.id);
              return (
                <div key={w.id} onClick={() => openWell(w.id)}
                  style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: i === 0 ? 'rgba(217,61,61,0.06)' : undefined, borderLeft: `3px solid ${STATUS_COLOR[w.status]}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? 'rgba(217,61,61,0.06)' : '')}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--muted)', paddingTop: 1 }} className="tnum">{i + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="well-id">{w.id}</span>
                      <StatusPill status={w.status} />
                    </div>
                    <div style={{ marginTop: 3, fontWeight: 500 }}>
                      {FAULTS[w.fault].label}{w.status !== 'offline' && <span className="muted" style={{ fontWeight: 400 }}> · {w.confidence}% confidence</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.county} County · event {fmtAgo(w.lastEvent)} · SLA {w.sla}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tnum" style={{ fontSize: 17, fontWeight: 600 }}>{w.deferred}<span className="muted" style={{ fontSize: 11, fontWeight: 400 }}> bbl/d</span></div>
                    <div className="muted tnum" style={{ fontSize: 11.5 }}>Priority <b style={{ color: 'var(--text)' }}>{Math.round(w.priority)}</b></div>
                    <div style={{ marginTop: 4 }}><ActionChip status={a.status} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ---------- right: charts ---------- */}
        <div className="stack fleet-charts">
          <Panel title="Fleet oil production" sub="14 days · bbl/day">
            <FleetTrendChart data={fleet} height={150} />
          </Panel>
          <Panel title="Deferred production" sub="14 days · bbl/day">
            <DeferredBars data={fleet} height={128} />
          </Panel>
          <Panel title="Deferral by condition" sub="Today · bbl/day">
            <FaultBars rows={faultRows} />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, unit, foot, status, accent, selected, onClick }: { label: string; value: number | string; unit?: string; foot?: React.ReactNode; status?: Status; accent?: string; selected?: boolean; onClick?: () => void }) {
  return (
    <div className={`kpi ${onClick ? 'clickable' : ''} ${selected ? 'selected' : ''}`} onClick={onClick}>
      {(status || accent) && <span className="bar" style={{ background: status ? STATUS_COLOR[status] : accent }} />}
      <div className="kpi-label">{status && <StatusIcon status={status} />}{label}</div>
      <div className="kpi-value tnum">{value}{unit && <small>{unit}</small>}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}
