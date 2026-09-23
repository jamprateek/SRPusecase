import { useEffect, useRef, useState } from 'react';
import { DEMO_USER, MODEL_VERSION, UPLOAD_INTERVAL_MIN } from './config';
import { COUNTRIES, LATEST_BATCH_TIME, SEVERITY_RANK, fieldsFor, regionsFor } from './data';
import { latestBatchId, useStore, type View } from './store';
import { Icon, SeverityBadge, fmtAgo, fmtTime, type IconName } from './ui';
import { Dashboard } from './views/Dashboard';
import { Detail } from './views/Detail';
import { WorkQueue } from './views/WorkQueue';
import { History } from './views/History';
import { Settings } from './views/Settings';

const NAV: { view: View; label: string; icon: IconName }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { view: 'detail', label: 'SRP Visual Analytics', icon: 'camera' },
  { view: 'queue', label: 'Work Queue', icon: 'queue' },
  { view: 'history', label: 'Event History', icon: 'history' },
  { view: 'settings', label: 'Model Rules', icon: 'sliders' },
];

export default function App() {
  const { view } = useStore();
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">
          {view === 'dashboard' && <Dashboard />}
          {view === 'detail' && <Detail />}
          {view === 'queue' && <WorkQueue />}
          {view === 'history' && <History />}
          {view === 'settings' && <Settings />}
        </main>
      </div>
      <Toasts />
    </div>
  );
}

function Sidebar() {
  const { view, navigate, scoped, workOrders, rulesVersion } = useStore();
  const open = scoped.filter((s) => s.issue && s.workStatus !== 'Resolved').length;
  const stages: { label: string; detail: string; icon: IconName }[] = [
    { label: 'Burst upload', detail: `every ${UPLOAD_INTERVAL_MIN} min · 3 fps`, icon: 'upload' },
    { label: 'Visual analytics', detail: MODEL_VERSION, icon: 'cpu' },
    { label: 'Rules engine', detail: `ruleset v1.${rulesVersion}`, icon: 'sliders' },
    { label: 'Event generation', detail: `${open} open events`, icon: 'alert' },
    { label: 'Work queue', detail: `${workOrders.length} WOs this session`, icon: 'wrench' },
    { label: 'Notification', detail: 'email trigger', icon: 'mail' },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="7" className="brand-bg" /><path d="M7 25h18M16 25V10M9.5 13.5 16 9l6.5 4.5M20.5 18.5h4v4h-4z" className="brand-stroke" /></svg>
        </div>
        <div className="brand-text">
          <b>SRP Visual Inspection</b>
          <span>Command Center</span>
        </div>
      </div>
      <nav>
        {NAV.map((n) => (
          <button key={n.view} className={`nav-item ${view === n.view ? 'active' : ''}`} onClick={() => navigate(n.view)}>
            <Icon name={n.icon} size={18} />
            <span>{n.label}</span>
            {n.view === 'queue' && <span className="nav-count">{open}</span>}
          </button>
        ))}
      </nav>
      <div className="pipeline">
        <div className="pipeline-title caps">Processing pipeline</div>
        {stages.map((s) => (
          <div key={s.label} className="stage">
            <span className="stage-dot"><Icon name={s.icon} size={12} /></span>
            <div>
              <div className="stage-label">{s.label}</div>
              <div className="stage-detail">{s.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Topbar() {
  const { scope, setScope, navigate, srps, now } = useStore();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => bellRef.current && !bellRef.current.contains(e.target as Node) && setBellOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);
  const alerts = srps
    .filter((s) => (s.severity === 'Critical' || s.severity === 'Warning') && s.workStatus === 'New')
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (b.eventTime ?? 0) - (a.eventTime ?? 0));
  const regions = regionsFor(scope.country);
  const fields = fieldsFor(scope.country, scope.region);

  return (
    <header className="topbar">
      <div className="scope">
        <label className="sel">
          <span>Country</span>
          <select value={scope.country} onChange={(e) => setScope({ country: e.target.value, region: 'All', field: 'All' })}>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="sel">
          <span>Region</span>
          <select value={scope.region} onChange={(e) => setScope({ ...scope, region: e.target.value, field: 'All' })}>
            <option value="All">All regions</option>
            {regions.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="sel">
          <span>Oil field</span>
          <select value={scope.field} onChange={(e) => setScope({ ...scope, field: e.target.value })}>
            <option value="All">All fields</option>
            {fields.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
      </div>
      <div className="topbar-right">
        <span className="demo-badge">Demo data</span>
        <div className="upload-stamp">
          <span className="live-dot" />
          <div>
            <div className="upload-label">Last data upload</div>
            <div className="upload-val">{fmtTime(LATEST_BATCH_TIME)} · {latestBatchId()} <span className="muted">({fmtAgo(LATEST_BATCH_TIME, now)})</span></div>
          </div>
        </div>
        <div className="bell-wrap" ref={bellRef}>
          <button className="icon-btn bell" onClick={() => setBellOpen((o) => !o)} aria-label="Notifications">
            <Icon name="bell" size={19} />
            {alerts.length > 0 && <span className="bell-count">{alerts.length}</span>}
          </button>
          {bellOpen && (
            <div className="bell-menu">
              <div className="bell-head">New camera events <span className="muted">{alerts.length} unreviewed</span></div>
              {alerts.slice(0, 7).map((a) => (
                <button key={a.id} className="bell-item" onClick={() => { setBellOpen(false); navigate('detail', a.id); }}>
                  <SeverityBadge severity={a.severity} compact />
                  <div>
                    <div><b>{a.name}</b> · {a.issue}</div>
                    <div className="muted small">{a.field} · {a.eventTime ? fmtAgo(a.eventTime, now) : ''}</div>
                  </div>
                </button>
              ))}
              {alerts.length === 0 && <div className="muted small pad">All events reviewed.</div>}
            </div>
          )}
        </div>
        <div className="user">
          <span className="avatar">{DEMO_USER.initials}</span>
          <div>
            <div className="user-name">{DEMO_USER.name}</div>
            <div className="user-role">{DEMO_USER.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <Icon name={t.tone === 'success' ? 'check' : 'mail'} size={16} />
          {t.text}
        </div>
      ))}
    </div>
  );
}
