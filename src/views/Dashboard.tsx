import { priorityCompare } from '../data';
import { MapPanel } from '../components/MapPanel';
import { mapImageFor } from '../config';
import { useStore } from '../store';
import { Icon, Kpi, SeverityBadge, SlaChip, fmtAgo } from '../ui';

export function Dashboard() {
  const { scoped, navigate, now, scope } = useStore();

  const attention = scoped
    .filter((s) => s.issue && s.workStatus !== 'Resolved')
    .sort(priorityCompare(now));
  const crit = scoped.filter((s) => s.severity === 'Critical').length;
  const warn = scoped.filter((s) => s.severity === 'Warning').length;
  const dq = scoped.filter((s) => s.severity === 'Data quality').length;
  const received = scoped.filter((s) => s.uploadStatus === 'Received').length;
  const rate = scoped.length ? (received / scoped.length) * 100 : 0;
  const flagged = scoped.filter((s) => s.severity === 'Critical' || s.severity === 'Warning');
  const avgFlag = flagged.length ? flagged.reduce((a, s) => a + s.contamination, 0) / flagged.length : 0;
  const healthy = scoped.filter((s) => s.severity === 'Normal');
  const avgHealthy = healthy.length ? healthy.reduce((a, s) => a + s.contamination, 0) / healthy.length : 0;

  const scopeLabel = [scope.country, scope.region === 'All' ? 'all regions' : scope.region, scope.field === 'All' ? 'all fields' : scope.field + ' field'].join(' · ');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Operations overview</h1>
          <p className="muted">{scopeLabel} — camera-based rod movement and contamination analytics</p>
        </div>
      </div>

      <div className="kpis">
        <Kpi icon="camera" label="Monitored SRPs" value={scoped.length} sub={<>{scoped.length - scoped.filter((s) => s.severity === 'Offline').length} cameras reporting</>} />
        <Kpi icon="alert" tone={crit ? 'critical' : 'warning'} label="SRPs requiring attention" value={crit + warn + dq}
          sub={<span className="kpi-split"><span className="t-critical">{crit} critical</span><span className="t-warning">{warn} warning</span><span className="t-dq">{dq} data quality</span></span>} />
        <Kpi icon="upload" label="Latest upload success rate" value={<>{rate.toFixed(1)}<small>%</small></>} sub={<>{received} of {scoped.length} bursts received complete</>} />
        <Kpi icon="drop" tone="warning" label="Avg flagged contamination" value={<>{avgFlag.toFixed(1)}<small>%</small></>} sub={<>vs {avgHealthy.toFixed(1)}% across normal units</>} />
      </div>

      <div className="dash-grid">
        <section className="card map-card">
          <div className="card-head">
            <h2><Icon name="map" /> Regional SRP map</h2>
            <span className="muted small">{scoped.length} units · click a marker to open visual analytics</span>
          </div>
          {scoped.length ? <MapPanel srps={scoped} now={now} image={mapImageFor(scope.country, scope.region, scope.field)} onSelect={(id) => navigate('detail', id)} /> : <div className="empty">No SRPs in scope</div>}
        </section>

        <section className="card attn-card">
          <div className="card-head">
            <h2><Icon name="alert" /> Requiring attention</h2>
            <span className="muted small">{attention.length} open camera events</span>
          </div>
          <div className="attn-scroll"><div className="attn-list">
            {attention.map((s) => (
              <button key={s.id} className={`attn-row attn-${s.severity === 'Critical' ? 'critical' : s.severity === 'Warning' ? 'warning' : 'dq'}`} onClick={() => navigate('detail', s.id)}>
                <div className="attn-top">
                  <b className="id">{s.name}</b>
                  <SeverityBadge severity={s.severity} />
                </div>
                <div className="attn-meta">
                  <span className="reason">{s.issue}</span>
                  <span>{s.region}</span>
                  <span>Event {s.eventTime ? fmtAgo(s.eventTime, now) : '-'}</span>
                  <span className="attn-sla">SLA <SlaChip srp={s} now={now} /></span>
                </div>
                <div className="attn-obs">{s.observation}</div>
              </button>
            ))}
            {!attention.length && <div className="empty">No open events in this scope.</div>}
          </div></div>
        </section>
      </div>
    </div>
  );
}
