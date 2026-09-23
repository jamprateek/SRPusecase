import { useMemo, useState } from 'react';
import { TECHNICIANS, contaminationBand, priorityCompare, slaState } from '../data';
import { useStore } from '../store';
import { ISSUE_TYPES, WORK_STATUSES, type WorkStatus } from '../types';
import { Icon, SeverityBadge, SlaChip, fmtAgo, fmtTime } from '../ui';

const PRIORITY: Record<string, string> = { Critical: 'P1', Warning: 'P2', 'Data quality': 'P3' };

export function WorkQueue() {
  const { scoped, navigate, now, rules, updateSrp, logEvent, highlightWo, workOrders, scope } = useStore();
  const [issue, setIssue] = useState('All');
  const [severity, setSeverity] = useState('All');
  const [region, setRegion] = useState('All');
  const [sla, setSla] = useState('All');
  const [tech, setTech] = useState('All');

  const items = useMemo(() => scoped.filter((s) => s.issue), [scoped]);
  const regions = [...new Set(items.map((s) => s.region))];
  const rows = items
    .filter((s) => issue === 'All' || s.issue === issue)
    .filter((s) => severity === 'All' || s.severity === severity)
    .filter((s) => region === 'All' || s.region === region)
    .filter((s) => sla === 'All' || slaState(s, now) === sla)
    .filter((s) => tech === 'All' || (tech === 'Unassigned' ? !s.technician : s.technician === tech))
    .sort(priorityCompare(now));

  const counts = WORK_STATUSES.map((st) => ({ st, n: items.filter((s) => s.workStatus === st).length }));
  const anyFilter = [issue, severity, region, sla, tech].some((v) => v !== 'All');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Work queue</h1>
          <p className="muted">Camera-detectable events only · {scope.country}{scope.region !== 'All' ? ' · ' + scope.region : ''}{scope.field !== 'All' ? ' · ' + scope.field : ''}</p>
        </div>
        <div className="status-strip">
          {counts.map(({ st, n }) => (
            <div key={st} className="ss-item"><b>{n}</b><span>{st}</span></div>
          ))}
        </div>
      </div>

      <section className="card">
        <div className="filters">
          <Icon name="filter" size={15} className="muted" />
          <Filter label="Issue type" value={issue} set={setIssue} options={ISSUE_TYPES} />
          <Filter label="Severity" value={severity} set={setSeverity} options={['Critical', 'Warning', 'Data quality']} />
          <Filter label="Region" value={region} set={setRegion} options={regions} />
          <Filter label="SLA status" value={sla} set={setSla} options={['On track', 'At risk', 'Breached']} />
          <Filter label="Assigned technician" value={tech} set={setTech} options={['Unassigned', ...TECHNICIANS]} />
          {anyFilter && <button className="btn btn-ghost" onClick={() => { setIssue('All'); setSeverity('All'); setRegion('All'); setSla('All'); setTech('All'); }}>Clear</button>}
          <span className="muted small push">{rows.length} of {items.length} events</span>
        </div>
        <div className="table-scroll">
          <table className="table dense">
            <thead>
              <tr>
                <th>Priority</th><th>SRP name</th><th>Oil field</th><th>Region</th><th>Issue type</th><th className="num">Contam. %</th><th className="num">Confidence</th>
                <th>Last upload</th><th>Event time</th><th>SLA</th><th>Observation</th><th>Assigned to</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const wo = workOrders.find((w) => w.srpId === s.id);
                const band = contaminationBand(s.contamination, rules);
                return (
                  <tr key={s.id} className={`clickable ${highlightWo === s.id ? 'row-new' : ''}`} onClick={() => navigate('detail', s.id)}>
                    <td><span className={`prio prio-${PRIORITY[s.severity]}`}>{PRIORITY[s.severity]}</span> <SeverityBadge severity={s.severity} compact /></td>
                    <td className="mono strong nowrap">{s.name}{wo && <div className="wo-id">{wo.id}</div>}</td>
                    <td>{s.field}</td>
                    <td className="nowrap">{s.region}</td>
                    <td className="nowrap">{s.issue}</td>
                    <td className={`num t-${band.cls}`}>{s.contamination.toFixed(1)}</td>
                    <td className={`num ${s.confidence < rules.imageQualityThreshold ? 't-dq' : ''}`}>{s.confidence}%</td>
                    <td className="nowrap">{fmtTime(s.lastUpload)}</td>
                    <td className="nowrap">{s.eventTime ? fmtAgo(s.eventTime, now) : '-'}</td>
                    <td className="nowrap"><SlaChip srp={s} now={now} /></td>
                    <td className="obs">{s.observation}</td>
                    <td className="nowrap">{s.technician ?? <span className="muted">Unassigned</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select className={`status-select wstat-${(s.workStatus ?? 'new').toLowerCase().replace(/ /g, '-')}`} value={s.workStatus ?? 'New'}
                        onChange={(e) => { const st = e.target.value as WorkStatus; updateSrp(s.id, { workStatus: st }); logEvent(s.id, `Status changed to ${st}`, st === 'Resolved' ? 'Resolved' : 'In progress'); }}>
                        {WORK_STATUSES.map((st) => <option key={st}>{st}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={13} className="empty">No events match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Filter({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: readonly string[] }) {
  return (
    <label className={`filter ${value !== 'All' ? 'active' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)}>
        <option value="All">All</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
