import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { ActionRecord, INITIAL_ACTIONS } from './data/state';
import { BASE_OPEN_TICKETS, Status, WELL_BY_ID, WELLS } from './data/wells';

export type Tab = 'fleet' | 'well' | 'vision' | 'queue' | 'reliability' | 'modernization';
export type GaugeScenario = 'normal' | 'high_tubing' | 'gas' | 'dirty' | 'mismatch';

export interface LogEntry { time: string; wellId: string; text: string; kind: 'action' | 'review' }

interface Ctx {
  tab: Tab;
  setTab: (t: Tab) => void;
  selectedId: string;
  openWell: (id: string) => void;
  selectWell: (id: string) => void;
  filter: Status | 'all';
  setFilter: (f: Status | 'all') => void;
  actions: Record<string, ActionRecord>;
  actionFor: (id: string) => ActionRecord;
  createAction: (id: string) => void;
  markReviewed: (id: string) => void;
  openTickets: number;
  log: LogEntry[];
  toast: { title: string; body: string } | null;
  gauge: GaugeScenario;
  setGauge: (g: GaugeScenario) => void;
}

const AppCtx = createContext<Ctx | null>(null);

const CREW: Record<string, string> = {
  stuck_pump: 'Crew 1 · T. Harlan (rig-ready)',
  tubing_leak: 'Crew 4 · A. Villarreal',
  gas_interference: 'Production tech · K. Moore',
  fluid_pound: 'Automation tech · J. Pruitt',
  pump_off: 'Automation tech · J. Pruitt',
  gauge_anomaly: 'I&E tech · S. Delgado',
  comms_loss: 'Automation tech · J. Pruitt',
  normal: 'Production tech · K. Moore',
};

let ticketSeq = 24830;
let minute = 41;
const stamp = () => `Sep 23 06:${String(Math.min(59, minute++)).padStart(2, '0')}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('fleet');
  const [selectedId, setSelectedId] = useState(WELLS[0].id);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [actions, setActions] = useState<Record<string, ActionRecord>>(INITIAL_ACTIONS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [toast, setToast] = useState<Ctx['toast']>(null);
  const [gauge, setGauge] = useState<GaugeScenario>('mismatch');

  const flash = useCallback((t: Ctx['toast']) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 4200);
  }, []);

  const actionFor = useCallback((id: string) => actions[id] ?? { status: 'New' as const }, [actions]);

  const createAction = useCallback((id: string) => {
    const w = WELL_BY_ID[id];
    const ticket = `FT-${ticketSeq++}`;
    const time = stamp();
    const assignee = CREW[w.fault];
    setActions((a) => ({ ...a, [id]: { status: 'Open', ticket, assignee, updated: time } }));
    setLog((l) => [{ time, wellId: id, kind: 'action', text: `Field action ${ticket} created — ${w.action}. Assigned to ${assignee}, SLA ${w.sla}.` }, ...l]);
    flash({ title: `Field action ${ticket} created`, body: `${id} · ${assignee} · SLA ${w.sla}` });
  }, [flash]);

  const markReviewed = useCallback((id: string) => {
    const time = stamp();
    setActions((a) => ({ ...a, [id]: { ...(a[id] ?? {}), status: 'Reviewed', updated: time } }));
    setLog((l) => [{ time, wellId: id, kind: 'review', text: 'Diagnosis reviewed by production engineer.' }, ...l]);
    flash({ title: 'Marked as reviewed', body: id });
  }, [flash]);

  const value = useMemo<Ctx>(() => ({
    tab, setTab, selectedId, filter, setFilter, actions, actionFor, createAction, markReviewed, log, toast, gauge, setGauge,
    selectWell: setSelectedId,
    openWell: (id) => { setSelectedId(id); setTab('well'); window.scrollTo({ top: 0 }); },
    openTickets: BASE_OPEN_TICKETS + Object.values(actions).filter((a) => a.status === 'Open' || a.status === 'In progress').length,
  }), [tab, selectedId, filter, actions, actionFor, createAction, markReviewed, log, toast, gauge]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
