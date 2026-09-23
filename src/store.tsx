import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_RULES, FLEET, INITIAL_HISTORY, batchIdFor } from './data';
import { DEMO_USER } from './config';
import type { HistoryEvent, ModelRules, Note, SRP, WorkOrder, WorkStatus } from './types';

export type View = 'dashboard' | 'detail' | 'queue' | 'history' | 'settings';

export interface Scope {
  country: string;
  region: string; // 'All' allowed
  field: string; // 'All' allowed
}

export interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'info';
}

interface Store {
  view: View;
  srpId: string | null;
  navigate: (view: View, srpId?: string | null) => void;
  scope: Scope;
  setScope: (s: Scope) => void;
  srps: SRP[];
  scoped: SRP[];
  updateSrp: (id: string, patch: Partial<SRP>) => void;
  workOrders: WorkOrder[];
  addWorkOrder: (wo: Omit<WorkOrder, 'id' | 'createdAt'>) => WorkOrder;
  history: HistoryEvent[];
  logEvent: (srpId: string, action: string, resolution?: HistoryEvent['resolution']) => void;
  notes: Note[];
  addNote: (srpId: string, text: string) => void;
  rules: ModelRules;
  setRules: (r: ModelRules) => void;
  rulesVersion: number;
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  highlightWo: string | null;
  now: number;
}

const Ctx = createContext<Store | null>(null);

function parseHash(): { view: View; srpId: string | null } {
  const [, view, id] = window.location.hash.split('/');
  const views: View[] = ['dashboard', 'detail', 'queue', 'history', 'settings'];
  return { view: views.includes(view as View) ? (view as View) : 'dashboard', srpId: id ? decodeURIComponent(id) : null };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = parseHash();
  const [view, setView] = useState<View>(initial.view);
  const [srpId, setSrpId] = useState<string | null>(initial.srpId);
  const [scope, setScope] = useState<Scope>({ country: 'United States', region: 'All', field: 'All' });
  const [srps, setSrps] = useState<SRP[]>(FLEET);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>(INITIAL_HISTORY);
  const [notes, setNotes] = useState<Note[]>([]);
  const [rules, setRulesState] = useState<ModelRules>(DEFAULT_RULES);
  const [rulesVersion, setRulesVersion] = useState(3);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [highlightWo, setHighlightWo] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = parseHash();
      setView(h.view);
      setSrpId(h.srpId);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((v: View, id?: string | null) => {
    const next = id === undefined ? (v === 'detail' ? srpId : null) : id;
    window.location.hash = `/${v}${next && v === 'detail' ? '/' + encodeURIComponent(next) : ''}`;
    setView(v);
    if (v === 'detail') setSrpId(next);
    window.scrollTo({ top: 0 });
  }, [srpId]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const updateSrp = useCallback((id: string, patch: Partial<SRP>) => {
    setSrps((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const logEvent = useCallback(
    (id: string, action: string, resolution: HistoryEvent['resolution'] = 'In progress') => {
      const s = srps.find((x) => x.id === id);
      if (!s || !s.issue) return;
      const time = Date.now();
      setHistory((h) => [
        {
          id: `EV-${5000 + h.length}`,
          time,
          srpId: id,
          issue: s.issue!,
          contamination: s.contamination,
          confidence: s.confidence,
          batchId: s.batchId,
          reviewer: DEMO_USER.name,
          action,
          resolution,
        },
        ...h,
      ]);
    },
    [srps],
  );

  const addWorkOrder = useCallback(
    (wo: Omit<WorkOrder, 'id' | 'createdAt'>) => {
      const full: WorkOrder = { ...wo, id: `WO-${24130 + workOrders.length + 1}`, createdAt: Date.now() };
      setWorkOrders((l) => [full, ...l]);
      const status: WorkStatus = 'Work order created';
      updateSrp(wo.srpId, { technician: wo.technician, slaHours: wo.slaHours, workStatus: status });
      logEvent(wo.srpId, `Work order ${full.id} created; email prepared for ${wo.technician}`);
      setHighlightWo(wo.srpId);
      setTimeout(() => setHighlightWo(null), 12_000);
      return full;
    },
    [workOrders.length, updateSrp, logEvent],
  );

  const addNote = useCallback((id: string, text: string) => {
    setNotes((n) => [...n, { srpId: id, text, author: DEMO_USER.name, time: Date.now() }]);
  }, []);

  const setRules = useCallback((r: ModelRules) => {
    setRulesState(r);
    setRulesVersion((v) => v + 1);
  }, []);

  const scoped = useMemo(
    () =>
      srps.filter(
        (s) =>
          s.country === scope.country &&
          (scope.region === 'All' || s.region === scope.region) &&
          (scope.field === 'All' || s.field === scope.field),
      ),
    [srps, scope],
  );

  const value: Store = {
    view, srpId, navigate, scope, setScope, srps, scoped, updateSrp, workOrders, addWorkOrder,
    history, logEvent, notes, addNote, rules, setRules, rulesVersion, toasts, toast, highlightWo, now,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export const latestBatchId = () => batchIdFor(Math.max(...FLEET.map((s) => s.lastUpload)));
