import { Tab, useApp } from './AppState';
import { NOW, TZ, WELLS } from './data/wells';
import FleetDashboard from './views/FleetDashboard';
import WellDetail from './views/WellDetail';
import GaugeVision from './views/GaugeVision';
import WorkQueue from './views/WorkQueue';
import Reliability from './views/Reliability';
import Modernization from './views/Modernization';

const TABS: { id: Tab; label: string }[] = [
  { id: 'fleet', label: 'Fleet Dashboard' },
  { id: 'well', label: 'Well Detail' },
  { id: 'vision', label: 'CV Gauge Reading' },
  { id: 'queue', label: 'Work Queue' },
  { id: 'reliability', label: 'Reliability' },
  { id: 'modernization', label: 'Modernization' },
];

export default function App() {
  const { tab, setTab, selectedId, toast, actionFor } = useApp();
  const untriaged = WELLS.filter((w) => w.status !== 'normal' && actionFor(w.id).status === 'New').length;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#e8a33d" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 13.5h12M5 13.5 8 6l3 7.5M3 6.5l9.5-2.5M12.5 4v3.5" />
            </svg>
          </div>
          <div>
            <div className="brand-name">SRP Productivity Intelligence</div>
            <div className="brand-sub">Artificial lift surveillance</div>
          </div>
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }}>
              {t.label}
              {t.id === 'well' && <span className="nav-meta mono">{selectedId}</span>}
              {t.id === 'queue' && <span className="nav-meta">{untriaged} new</span>}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="asset-select">Permian Basin SRP fleet ▾</span>
          <span className="clock"><span className="live-dot" />Live · {NOW.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })} CT</span>
          <span className="demo-badge" title="All wells, readings and financials are synthetic and public-safe">Demo data</span>
          <span className="role-chip" title="Production engineer"><span className="avatar">PE</span><span>Prod. Engineer</span></span>
        </div>
      </header>
      <main className="main">
        {tab === 'fleet' && <FleetDashboard />}
        {tab === 'well' && <WellDetail />}
        {tab === 'vision' && <GaugeVision />}
        {tab === 'queue' && <WorkQueue />}
        {tab === 'reliability' && <Reliability />}
        {tab === 'modernization' && <Modernization />}
      </main>
      {toast && (
        <div className="toast">
          <div className="t-title">✓ {toast.title}</div>
          <div className="text-2">{toast.body}</div>
        </div>
      )}
    </div>
  );
}
