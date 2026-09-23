import { useMemo, useState } from 'react';
import { contaminationBand, contaminationTrend } from '../data';
import { TrendChart } from '../components/Charts';
import { useStore } from '../store';
import { ISSUE_TYPES } from '../types';
import { Icon, fmtDateTime } from '../ui';

export function History() {
  const { history, srps, scoped, rules, navigate } = useStore();
  const scopedIds = useMemo(() => new Set(scoped.map((s) => s.id)), [scoped]);
  const events = history.filter((e) => scopedIds.has(e.srpId));
  const candidates = scoped.filter((s) => s.issue);
  const [selected, setSelected] = useState<string>(() => (candidates.find((s) => s.issue === 'Pump leakage') ?? candidates[0] ?? scoped[0])?.id ?? '');
  const [onlySelected, setOnlySelected] = useState(false);
  const [issue, setIssue] = useState('All');

  const srp = srps.find((s) => s.id === selected) ?? scoped[0];
  const trend = useMemo(() => (srp ? contaminationTrend(srp) : []), [srp?.id]);
  const rows = events
    .filter((e) => !onlySelected || e.srpId === selected)
    .filter((e) => issue === 'All' || e.issue === issue);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Event history</h1>
          <p className="muted">Visual analytics events over the last 7 days · {events.length} events in scope</p>
        </div>
      </div>

      {srp && (
        <section className="card">
          <div className="card-head">
            <h2><Icon name="drop" /> Contamination trend · last 24 h</h2>
            <div className="row gap8">
              <label className="filter active">
                <span>SRP</span>
                <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {scoped.map((s) => <option key={s.id} value={s.id}>{s.name}{s.issue ? ' · ' + s.issue : ''}</option>)}
                </select>
              </label>
              <button className="btn btn-ghost" onClick={() => navigate('detail', srp.id)}>Open analytics <Icon name="next" size={12} /></button>
            </div>
          </div>
          <div className="trend-summary">
            <div><span>Current</span><b className={`t-${contaminationBand(srp.contamination, rules).cls}`}>{srp.contamination.toFixed(1)}%</b></div>
            <div><span>24 h ago</span><b>{srp.trendFrom.toFixed(1)}%</b></div>
            <div><span>Change</span><b>{srp.contamination - srp.trendFrom >= 0 ? '+' : ''}{(srp.contamination - srp.trendFrom).toFixed(1)} pts</b></div>
            <div><span>Uploads</span><b>{trend.filter((t) => t.value !== null).length}/{trend.length}</b></div>
          </div>
          <TrendChart data={trend} rules={rules} height={190} label={srp.name} />
        </section>
      )}

      <section className="card">
        <div className="filters">
          <Icon name="filter" size={15} className="muted" />
          <label className={`filter ${issue !== 'All' ? 'active' : ''}`}>
            <span>Issue</span>
            <select value={issue} onChange={(e) => setIssue(e.target.value)}>
              <option value="All">All</option>
              {ISSUE_TYPES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} />Only {srp?.name}</label>
          <span className="muted small push">{rows.length} events</span>
        </div>
        <div className="table-scroll">
          <table className="table dense">
            <thead>
              <tr><th>Timestamp</th><th>SRP</th><th>Issue</th><th className="num">Contam. %</th><th className="num">Confidence</th><th>Upload batch ID</th><th>Reviewer</th><th>Action taken</th><th>Resolution</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className={`clickable ${e.srpId === selected ? 'row-sel' : ''}`} onClick={() => setSelected(e.srpId)}>
                  <td className="nowrap">{fmtDateTime(e.time)}</td>
                  <td className="mono strong nowrap">{e.srpId}</td>
                  <td className="nowrap">{e.issue}</td>
                  <td className={`num t-${contaminationBand(e.contamination, rules).cls}`}>{e.contamination.toFixed(1)}</td>
                  <td className="num">{e.confidence}%</td>
                  <td className="mono small">{e.batchId}</td>
                  <td className="nowrap">{e.reviewer}</td>
                  <td>{e.action}</td>
                  <td><span className={`res res-${e.resolution.toLowerCase().replace(/ /g, '-')}`}>{e.resolution}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
