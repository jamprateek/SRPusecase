import { BURST_SECONDS, FRAMES_PER_BURST, FRAMES_PER_SECOND, UPLOAD_INTERVAL_MIN } from './config';
import type { HistoryEvent, IssueType, ModelRules, Severity, SRP, WorkStatus } from './types';

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number | string) {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

// ---------------------------------------------------------------------------
// Time reference: uploads land on a 20-minute cadence
// ---------------------------------------------------------------------------

export const NOW = Date.now();
const INTERVAL_MS = UPLOAD_INTERVAL_MIN * 60_000;
export const LATEST_BATCH_TIME = Math.floor(NOW / INTERVAL_MS) * INTERVAL_MS;

export function batchIdFor(time: number): string {
  const d = new Date(Math.floor(time / INTERVAL_MS) * INTERVAL_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `UB-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export const DEFAULT_RULES: ModelRules = {
  contaminationWarning: 20,
  contaminationCritical: 35,
  deviationWarning: 0.15,
  deviationCritical: 0.3,
  minFramesPerBurst: 150,
  imageQualityThreshold: 60,
  uploadDelayMinutes: 45,
  consecutiveUploads: 3,
};

export const TECHNICIANS = [
  'J. Ramirez',
  'K. Patel',
  'M. Okafor',
  'D. Nguyen',
  'S. Whitfield',
  'A. Al-Harthy',
];

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

interface FieldDef {
  country: string;
  region: string;
  field: string;
  code: string;
  lat: number;
  lng: number;
  count: number;
  /** half-width of the scatter around the field centre, in degrees (default 0.13 lat / 0.156 lng) */
  spread?: [number, number];
}

const FIELDS: FieldDef[] = [
  { country: 'United States', region: 'Delaware Basin', field: 'Reeves', code: 'REEVES', lat: 31.45, lng: -103.78, count: 10, spread: [0.11, 0.12] },
  { country: 'United States', region: 'Delaware Basin', field: 'Loving', code: 'LOVING', lat: 31.87, lng: -103.47, count: 7, spread: [0.09, 0.11] },
  { country: 'United States', region: 'Delaware Basin', field: 'Ward', code: 'WARD', lat: 31.55, lng: -103.1, count: 8 },
  { country: 'United States', region: 'Midland Basin', field: 'Midland', code: 'MIDLAND', lat: 31.9, lng: -102.05, count: 9 },
  { country: 'United States', region: 'Midland Basin', field: 'Martin', code: 'MARTIN', lat: 32.3, lng: -101.95, count: 8 },
  { country: 'United States', region: 'Midland Basin', field: 'Upton', code: 'UPTON', lat: 31.37, lng: -102.02, count: 7 },
  { country: 'United States', region: 'Midland Basin', field: 'Andrews', code: 'ANDREWS', lat: 32.3, lng: -102.6, count: 7 },
  { country: 'Oman', region: 'South Oman', field: 'Marmul', code: 'MARMUL', lat: 18.14, lng: 55.2, count: 5 },
  { country: 'Oman', region: 'South Oman', field: 'Nimr', code: 'NIMR', lat: 18.55, lng: 55.75, count: 3 },
];

export const COUNTRIES = [...new Set(FIELDS.map((f) => f.country))];
export const regionsFor = (country: string) =>
  [...new Set(FIELDS.filter((f) => f.country === country).map((f) => f.region))];
export const fieldsFor = (country: string, region: string) =>
  FIELDS.filter((f) => f.country === country && (region === 'All' || f.region === region)).map((f) => f.field);

// ---------------------------------------------------------------------------
// Hand-authored flagged units (the story of the demo)
// ---------------------------------------------------------------------------

interface Flagged {
  name: string;
  severity: Severity;
  issue: IssueType | null;
  contamination: number;
  trendFrom: number;
  confidence: number;
  eventAgoMin: number;
  slaHours: number;
  observation: string;
  technician?: string;
  workStatus?: WorkStatus;
  frames?: number;
  offlineMin?: number;
}

const FLAGGED: Flagged[] = [
  // Critical
  { name: 'SRP-REEVES-041', severity: 'Critical', issue: 'Stuck pump', contamination: 8.4, trendFrom: 7.9, confidence: 94, eventAgoMin: 171, slaHours: 4,
    observation: 'Rod movement flat for 58 seconds; expected pump-cycle movement not detected.' },
  { name: 'SRP-MIDLAND-088', severity: 'Critical', issue: 'Pump leakage', contamination: 38.6, trendFrom: 12.2, confidence: 91, eventAgoMin: 96, slaHours: 4,
    observation: 'Oil streak visible near stuffing-box area in 3 consecutive frames; blackness rising along lower rod.' },
  { name: 'SRP-MARTIN-017', severity: 'Critical', issue: 'Pump-off', contamination: 13.1, trendFrom: 11.8, confidence: 88, eventAgoMin: 74, slaHours: 4,
    observation: 'Detected movement deviates from expected cycle for 4 consecutive uploads.' },
  { name: 'SRP-LOVING-014', severity: 'Critical', issue: 'Stuck pump', contamination: 6.2, trendFrom: 5.8, confidence: 92, eventAgoMin: 205, slaHours: 4, technician: 'D. Nguyen', workStatus: 'Dispatched',
    observation: 'Rod position unchanged across 176 of 180 frames; no upstroke detected in latest burst.' },
  { name: 'SRP-ANDREWS-052', severity: 'Critical', issue: 'High rod contamination', contamination: 36.9, trendFrom: 14.3, confidence: 89, eventAgoMin: 140, slaHours: 4, workStatus: 'Reviewed',
    observation: 'Black/grey contamination ratio increased from 14% to 37% across relevant rod region.' },
  { name: 'SRP-WARD-026', severity: 'Critical', issue: 'Pump leakage', contamination: 41.2, trendFrom: 18.5, confidence: 90, eventAgoMin: 33, slaHours: 4,
    observation: 'Dark streaking below carrier bar and darkening around stuffing box in 5 consecutive frames.' },
  { name: 'SRP-UPTON-030', severity: 'Critical', issue: 'Pump-off', contamination: 15.4, trendFrom: 14.9, confidence: 86, eventAgoMin: 118, slaHours: 4,
    observation: 'Incomplete downstroke in 7 of 8 cycles; movement outside expected envelope for 3 uploads.' },
  // Warning
  { name: 'SRP-REEVES-019', severity: 'Warning', issue: 'High rod contamination', contamination: 28.1, trendFrom: 11.0, confidence: 87, eventAgoMin: 190, slaHours: 12,
    observation: 'Black/grey contamination ratio increased from 11% to 28% across relevant rod region.' },
  { name: 'SRP-MIDLAND-061', severity: 'Warning', issue: 'Pump-off', contamination: 9.6, trendFrom: 9.1, confidence: 83, eventAgoMin: 260, slaHours: 12, workStatus: 'Reviewed',
    observation: 'Incomplete downstroke detected in 2 of the last 3 bursts; cycle shape irregular.' },
  { name: 'SRP-MARTIN-033', severity: 'Warning', issue: 'Pump leakage', contamination: 24.7, trendFrom: 13.4, confidence: 84, eventAgoMin: 330, slaHours: 12, technician: 'K. Patel', workStatus: 'Work order created',
    observation: 'Darkening around stuffing-box region; oil streak visible in 2 frames.' },
  { name: 'SRP-UPTON-012', severity: 'Warning', issue: 'High rod contamination', contamination: 21.8, trendFrom: 12.6, confidence: 85, eventAgoMin: 410, slaHours: 12,
    observation: 'Grey-level gradient darkening on mid-rod section; blackness ratio above warning threshold.' },
  { name: 'SRP-WARD-044', severity: 'Warning', issue: 'Pump-off', contamination: 11.2, trendFrom: 10.4, confidence: 81, eventAgoMin: 150, slaHours: 12,
    observation: 'Detected movement phase-shifted and short-stroked in 2 consecutive uploads.' },
  { name: 'SRP-ANDREWS-007', severity: 'Warning', issue: 'High rod contamination', contamination: 26.3, trendFrom: 15.2, confidence: 86, eventAgoMin: 520, slaHours: 12, technician: 'M. Okafor', workStatus: 'Dispatched',
    observation: 'Rod darkening across upper visible section; contamination up 11 pts in 24 h.' },
  { name: 'SRP-LOVING-029', severity: 'Warning', issue: 'Pump leakage', contamination: 22.9, trendFrom: 9.8, confidence: 82, eventAgoMin: 95, slaHours: 12,
    observation: 'Thin oil streak near stuffing box in 2 of 3 bursts; lower rod darkening.' },
  { name: 'SRP-REEVES-066', severity: 'Warning', issue: 'Pump-off', contamination: 10.3, trendFrom: 9.9, confidence: 80, eventAgoMin: 640, slaHours: 12,
    observation: 'Irregular up/down pattern; stroke length reduced vs. expected envelope.' },
  { name: 'SRP-MIDLAND-015', severity: 'Warning', issue: 'High rod contamination', contamination: 20.6, trendFrom: 13.1, confidence: 84, eventAgoMin: 280, slaHours: 12, workStatus: 'Reviewed',
    observation: 'Black/grey contamination ratio increased from 13% to 21% across relevant rod region.' },
  { name: 'SRP-MARMUL-008', severity: 'Warning', issue: 'High rod contamination', contamination: 23.5, trendFrom: 12.0, confidence: 85, eventAgoMin: 360, slaHours: 12, technician: 'A. Al-Harthy', workStatus: 'Reviewed',
    observation: 'Uniform rod darkening with dust-oil film; blackness ratio above warning threshold.' },
  // Data quality
  { name: 'SRP-WARD-051', severity: 'Data quality', issue: 'Poor image quality', contamination: 12.0, trendFrom: 7.4, confidence: 41, eventAgoMin: 65, slaHours: 24,
    observation: 'Image glare prevents reliable rod boundary detection.' },
  { name: 'SRP-MARTIN-048', severity: 'Data quality', issue: 'Poor image quality', contamination: 9.0, trendFrom: 6.8, confidence: 38, eventAgoMin: 180, slaHours: 24,
    observation: 'Night-mode frames with insufficient contrast; rod edge not resolved in 62% of frames.' },
  { name: 'SRP-UPTON-021', severity: 'Data quality', issue: 'Poor image quality', contamination: 10.5, trendFrom: 6.1, confidence: 44, eventAgoMin: 300, slaHours: 24,
    observation: 'Lens partially obstructed (dust build-up); lower rod region occluded.' },
  // Offline (no recent upload) - shown on map, not a pump fault
  { name: 'SRP-ANDREWS-039', severity: 'Offline', issue: null, contamination: 5.1, trendFrom: 5.0, confidence: 0, eventAgoMin: 0, slaHours: 0, offlineMin: 87,
    observation: 'No burst received for 4 upload cycles.' },
  { name: 'SRP-LOVING-022', severity: 'Offline', issue: null, contamination: 4.4, trendFrom: 4.6, confidence: 0, eventAgoMin: 0, slaHours: 0, offlineMin: 64,
    observation: 'No burst received for 3 upload cycles.' },
];

const NORMAL_OBS = [
  'Rod movement matches expected cycle; rod surface clean.',
  'Full stroke detected in all cycles; no visible oil film.',
  'Movement within envelope; light grey film within normal range.',
  'Normal cycle; contamination stable over 24 h.',
];

// ---------------------------------------------------------------------------
// Analytics (deterministic, derived from SRP identity + issue)
// ---------------------------------------------------------------------------

export interface MovementSeries {
  t: number[]; // seconds
  expected: number[]; // % of stroke
  detected: (number | null)[];
  diff: (number | null)[];
}

function expectedPos(t: number, period: number) {
  const ph = (2 * Math.PI * t) / period;
  return clamp(50 - 46 * Math.cos(ph) + 4 * Math.sin(2 * ph), 0, 100);
}

export function movementSeries(srp: Pick<SRP, 'id' | 'issue' | 'severity' | 'spm'>): MovementSeries {
  const r = rng(srp.id + ':move');
  const period = 60 / srp.spm;
  const t: number[] = [];
  const expected: number[] = [];
  const detected: (number | null)[] = [];
  const noise = (a: number) => (r() - 0.5) * 2 * a;
  const crit = srp.severity === 'Critical';

  // per-stroke amplitude factors for pump-off
  const strokes = Math.ceil(BURST_SECONDS / period) + 1;
  const amp = Array.from({ length: strokes }, () => (crit ? 0.42 + r() * 0.2 : 0.7 + r() * 0.14));
  const stuckAt = 18 + r() * 10;
  const lag = crit ? 0.9 : 0.45;

  for (let i = 0; i < FRAMES_PER_BURST; i++) {
    const ti = i / FRAMES_PER_SECOND;
    const e = expectedPos(ti, period);
    t.push(round(ti, 2));
    expected.push(e);
    let d: number | null;
    switch (srp.issue) {
      case 'Stuck pump': {
        // brief residual motion, then flat
        const fade = Math.exp(-ti / 0.8);
        d = stuckAt + (e - stuckAt) * fade + noise(0.9);
        break;
      }
      case 'Pump-off': {
        const k = Math.floor((ti + lag) / period);
        const shifted = expectedPos(Math.max(0, ti - lag), period);
        let v = 50 + (shifted - 50) * amp[k];
        // fluid pound: plateau part-way through the downstroke
        const phase = (((ti - lag) / period) % 1 + 1) % 1;
        if (phase > 0.55 && phase < 0.78) v = Math.max(v, 50 + 30 * amp[k]);
        d = v + noise(2.2);
        break;
      }
      case 'Poor image quality':
        d = r() < 0.38 ? null : e + noise(9);
        break;
      default:
        d = srp.severity === 'Offline' ? null : e + noise(srp.issue === 'Pump leakage' ? 3.2 : 2.2);
    }
    detected.push(d === null ? null : clamp(d, 0, 100));
  }
  const diff = detected.map((d, i) => (d === null ? null : expected[i] - d));
  return { t, expected, detected, diff };
}

/** Normalised movement deviation index: RMS(expected - detected) / (2 * RMS(expected - mean)). */
export function deviationIndex(s: MovementSeries): number {
  const mean = s.expected.reduce((a, b) => a + b, 0) / s.expected.length;
  const rmsE = Math.sqrt(s.expected.reduce((a, b) => a + (b - mean) ** 2, 0) / s.expected.length);
  const d = s.diff.filter((v): v is number => v !== null);
  if (!d.length) return 0;
  const rmsD = Math.sqrt(d.reduce((a, b) => a + b * b, 0) / d.length);
  return round(clamp(rmsD / (2 * rmsE), 0, 1), 2);
}

export interface RodProfile {
  segments: { intensity: number; blackness: number; relevant: boolean }[];
  relevantStart: number;
  relevantEnd: number;
  streaks: number[]; // segment indices with visible streaking
}

export const ROD_SEGMENTS = 40;

export function rodProfile(srp: Pick<SRP, 'id' | 'issue' | 'contamination'>): RodProfile {
  const r = rng(srp.id + ':rod');
  const relevantStart = 6;
  const relevantEnd = 34; // inclusive; above = carrier bar / clamp, below = stuffing box housing
  const n = relevantEnd - relevantStart + 1;
  const weights: number[] = [];
  const streaks: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1); // 0 top .. 1 bottom (stuffing box)
    let w: number;
    switch (srp.issue) {
      case 'Pump leakage':
        w = 0.25 + 1.9 * x ** 1.8 + (r() - 0.5) * 0.35;
        break;
      case 'High rod contamination':
        w = 0.7 + 0.6 * Math.sin(x * Math.PI * 1.3 + 0.4) + (r() - 0.5) * 0.4;
        break;
      case 'Poor image quality':
        w = 1 + (r() - 0.5) * 1.1;
        break;
      default:
        w = 1 + (r() - 0.5) * 0.7;
    }
    weights.push(Math.max(0.05, w));
  }
  if (srp.issue === 'Pump leakage') {
    const count = 3;
    for (let s = 0; s < count; s++) {
      const idx = Math.floor(n * (0.55 + r() * 0.4));
      weights[idx] *= 1.7;
      streaks.push(relevantStart + idx);
    }
  }
  const meanW = weights.reduce((a, b) => a + b, 0) / n;
  const segments = Array.from({ length: ROD_SEGMENTS }, (_, i) => {
    const relevant = i >= relevantStart && i <= relevantEnd;
    let blackness: number;
    if (relevant) blackness = clamp((srp.contamination * weights[i - relevantStart]) / meanW, 0.5, 96);
    else blackness = clamp(srp.contamination * 0.35 + r() * 6, 0.5, 60); // hardware / clamp zone, ignored
    const intensity = clamp(212 - blackness * 1.85 + (r() - 0.5) * 10, 18, 240);
    return { intensity: Math.round(intensity), blackness: round(blackness), relevant };
  });
  return { segments, relevantStart, relevantEnd, streaks };
}

export function rodMetrics(p: RodProfile) {
  const rel = p.segments.filter((s) => s.relevant);
  const mean = rel.reduce((a, s) => a + s.intensity, 0) / rel.length;
  const spread = Math.sqrt(rel.reduce((a, s) => a + (s.intensity - mean) ** 2, 0) / rel.length);
  // share of relevant-ROI pixels darker than the black/grey cut-off (soft threshold per segment)
  const blacknessRatio = (rel.reduce((a, s) => a + 1 / (1 + Math.exp((s.intensity - 150) / 11)), 0) / rel.length) * 100;
  return {
    meanBrightness: Math.round(mean),
    brightnessSpread: round(spread),
    blacknessRatio: round(blacknessRatio),
    relevantRatio: round((rel.length / p.segments.length) * 100),
  };
}

/** Contamination % per 20-minute upload for the last 24 h (72 points), ending at the current value. */
export function contaminationTrend(srp: Pick<SRP, 'id' | 'contamination' | 'trendFrom' | 'issue' | 'severity'>, points = 72) {
  const r = rng(srp.id + ':trend');
  const out: { time: number; value: number | null }[] = [];
  const rising = srp.contamination - srp.trendFrom > 4;
  const onset = 0.35 + r() * 0.3;
  for (let i = 0; i < points; i++) {
    const x = i / (points - 1);
    let v: number;
    if (rising) {
      const k = x < onset ? 0 : ((x - onset) / (1 - onset)) ** 1.3;
      v = srp.trendFrom + (srp.contamination - srp.trendFrom) * k + (r() - 0.5) * 1.6;
    } else {
      v = srp.trendFrom + (srp.contamination - srp.trendFrom) * x + (r() - 0.5) * 1.2;
    }
    if (i === points - 1) v = srp.contamination;
    const time = LATEST_BATCH_TIME - (points - 1 - i) * INTERVAL_MS;
    const missing = srp.severity === 'Offline' && i > points - 5;
    out.push({ time, value: missing ? null : round(Math.max(0, v)) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fleet generation
// ---------------------------------------------------------------------------

function buildFleet(): SRP[] {
  const flaggedByName = new Map(FLAGGED.map((f) => [f.name, f]));
  const fleet: SRP[] = [];
  let camSeq = 400;

  for (const fd of FIELDS) {
    const r = rng('field:' + fd.code);
    const names = FLAGGED.filter((f) => f.name.startsWith(`SRP-${fd.code}-`)).map((f) => f.name);
    const used = new Set(names.map((n) => Number(n.split('-')[2])));
    while (names.length < fd.count) {
      const num = 3 + Math.floor(r() * 95);
      if (used.has(num)) continue;
      used.add(num);
      names.push(`SRP-${fd.code}-${String(num).padStart(3, '0')}`);
    }
    names.sort();

    for (const name of names) {
      const f = flaggedByName.get(name);
      const sr = rng(name);
      const [sLat, sLng] = fd.spread ?? (fd.country === 'Oman' ? [0.16, 0.192] : [0.13, 0.156]);
      const lat = fd.lat + (sr() - 0.5) * sLat * 2;
      const lng = fd.lng + (sr() - 0.5) * sLng * 2;
      const spm = round(6.2 + sr() * 2.4, 1);
      const cameraId = `SIE-CAM-${String(camSeq++).padStart(4, '0')}`;

      const severity: Severity = f?.severity ?? 'Normal';
      const issue = f?.issue ?? null;
      const partial = !f && sr() < 0.03;
      const lastUpload = f?.offlineMin
        ? LATEST_BATCH_TIME - f.offlineMin * 60_000
        : LATEST_BATCH_TIME - Math.floor(sr() * 95_000);
      const contamination = f?.contamination ?? round(2.5 + sr() ** 1.6 * 10.5);
      const base: SRP = {
        id: name,
        name,
        country: fd.country,
        region: fd.region,
        field: fd.field,
        lat,
        lng,
        cameraId,
        severity,
        issue,
        lastUpload,
        uploadStatus: f?.offlineMin ? 'Missed' : partial ? 'Partial' : 'Received',
        framesAnalyzed: f?.offlineMin ? 0 : partial ? 132 : f?.frames ?? FRAMES_PER_BURST,
        batchId: batchIdFor(lastUpload),
        eventTime: f && f.eventAgoMin ? LATEST_BATCH_TIME - f.eventAgoMin * 60_000 : null,
        slaHours: f?.slaHours ?? 0,
        observation: f?.observation ?? NORMAL_OBS[Math.floor(sr() * NORMAL_OBS.length)],
        contamination,
        trendFrom: f?.trendFrom ?? round(contamination + (sr() - 0.5) * 2),
        confidence: f?.confidence ?? Math.round(90 + sr() * 8),
        deviation: 0,
        meanBrightness: 0,
        brightnessSpread: 0,
        blacknessRatio: 0,
        relevantRatio: 0,
        spm,
        technician: f?.technician ?? null,
        workStatus: f && f.issue ? f.workStatus ?? 'New' : null,
      };
      base.deviation = deviationIndex(movementSeries(base));
      Object.assign(base, rodMetrics(rodProfile(base)));
      fleet.push(base);
    }
  }
  return fleet;
}

export const FLEET: SRP[] = buildFleet();

// ---------------------------------------------------------------------------
// Event history (past 7 days)
// ---------------------------------------------------------------------------

const REVIEWERS = ['Alex Morgan', 'R. Castillo', 'L. Chen', 'Model (auto)'];

function buildHistory(): HistoryEvent[] {
  const r = rng('history');
  const events: HistoryEvent[] = [];
  let seq = 1;
  const push = (e: Omit<HistoryEvent, 'id'>) => events.push({ id: `EV-${String(4800 + seq++)}`, ...e });

  for (const s of FLEET) {
    if (s.issue && s.eventTime) {
      const actionFor: Record<string, string> = {
        New: 'Event raised - awaiting review',
        Reviewed: 'Reviewed - evidence confirmed',
        'Work order created': 'Work order created',
        Dispatched: 'Technician dispatched',
      };
      push({
        time: s.eventTime,
        srpId: s.id,
        issue: s.issue,
        contamination: s.contamination,
        confidence: s.confidence,
        batchId: batchIdFor(s.eventTime),
        reviewer: s.workStatus === 'New' ? 'Model (auto)' : REVIEWERS[Math.floor(r() * 3)],
        action: actionFor[s.workStatus ?? 'New'],
        resolution: s.workStatus === 'New' ? 'Open' : 'In progress',
      });
    }
  }
  // Resolved / dismissed events earlier in the week
  const past: [IssueType, string, 'Resolved' | 'Dismissed'][] = [
    ['Pump leakage', 'Stuffing box packing replaced', 'Resolved'],
    ['High rod contamination', 'Rod cleaned; wiper installed', 'Resolved'],
    ['Stuck pump', 'Pump unseated and re-spaced', 'Resolved'],
    ['Pump-off', 'Pump-off controller setpoint adjusted', 'Resolved'],
    ['Poor image quality', 'Camera lens cleaned', 'Resolved'],
    ['Poor image quality', 'Transient glare - no action', 'Dismissed'],
    ['High rod contamination', 'Monitored - returned to normal', 'Dismissed'],
    ['Pump leakage', 'Work order WO-2291 closed', 'Resolved'],
  ];
  const pool = FLEET.filter((s) => s.severity !== 'Offline');
  for (let i = 0; i < 26; i++) {
    const s = pool[Math.floor(r() * pool.length)];
    const [issue, action, resolution] = past[Math.floor(r() * past.length)];
    const time = LATEST_BATCH_TIME - Math.floor((0.6 + r() * 6.3) * 86_400_000 / INTERVAL_MS) * INTERVAL_MS;
    const contamination =
      issue === 'Pump leakage' || issue === 'High rod contamination' ? round(21 + r() * 18) : round(4 + r() * 10);
    push({
      time,
      srpId: s.id,
      issue,
      contamination,
      confidence: issue === 'Poor image quality' ? Math.round(35 + r() * 15) : Math.round(80 + r() * 15),
      batchId: batchIdFor(time),
      reviewer: REVIEWERS[Math.floor(r() * 3)],
      action,
      resolution,
    });
  }
  return events.sort((a, b) => b.time - a.time);
}

export const INITIAL_HISTORY: HistoryEvent[] = buildHistory();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const SEVERITY_RANK: Record<Severity, number> = {
  Critical: 0,
  Warning: 1,
  'Data quality': 2,
  Offline: 3,
  Normal: 4,
};

const WORK_RANK: Record<string, number> = { New: 0, Reviewed: 1, 'Work order created': 2, Dispatched: 3, Resolved: 4 };

/** Triage order: severity, then untouched events first, then least SLA time remaining. */
export function priorityCompare(now: number) {
  return (a: SRP, b: SRP) =>
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    (WORK_RANK[a.workStatus ?? 'New'] ?? 0) - (WORK_RANK[b.workStatus ?? 'New'] ?? 0) ||
    (slaRemainingMs(a, now) ?? 0) - (slaRemainingMs(b, now) ?? 0);
}

export function slaRemainingMs(srp: Pick<SRP, 'eventTime' | 'slaHours'>, now = Date.now()) {
  if (!srp.eventTime || !srp.slaHours) return null;
  return srp.eventTime + srp.slaHours * 3_600_000 - now;
}

export type SlaState = 'On track' | 'At risk' | 'Breached';
export function slaState(srp: Pick<SRP, 'eventTime' | 'slaHours'>, now = Date.now()): SlaState | null {
  const rem = slaRemainingMs(srp, now);
  if (rem === null) return null;
  if (rem < 0) return 'Breached';
  if (rem < Math.min(3_600_000 * 1.5, srp.slaHours * 3_600_000 * 0.25)) return 'At risk';
  return 'On track';
}

export function contaminationBand(v: number, rules: ModelRules) {
  if (v > rules.contaminationCritical) return { label: 'Critical', cls: 'critical' };
  if (v > rules.contaminationWarning) return { label: 'Warning', cls: 'warning' };
  if (v > 10) return { label: 'Monitor', cls: 'monitor' };
  return { label: 'Normal', cls: 'normal' };
}

export function explanation(srp: SRP): string {
  switch (srp.issue) {
    case 'Stuck pump':
      return `The detected rod path is nearly flat across the latest burst (${srp.framesAnalyzed} frames, ${BURST_SECONDS} s). The expected up/down cycle of ~${srp.spm} strokes/min was not observed and the movement deviation index reached ${srp.deviation.toFixed(2)}, indicating a possible stuck pump.`;
    case 'Pump-off':
      return `The rod movement pattern is incomplete across the last ${srp.severity === 'Critical' ? 'four' : 'two'} image bursts. The model detected repeated deviation from the expected cycle envelope (index ${srp.deviation.toFixed(2)}) with shortened, phase-shifted strokes and a plateau in the downstroke, indicating a possible pump-off condition.`;
    case 'Pump leakage':
      return `The rod region shows increased blackness and streaking near the lower visible section above the stuffing box. Contamination rose from ${srp.trendFrom.toFixed(1)}% to ${srp.contamination.toFixed(1)}% in 24 h, above the warning threshold, while rod movement remains close to the expected cycle - indicating possible pump leakage rather than a movement fault.`;
    case 'High rod contamination':
      return `The black/grey intensity gradient across the relevant rod region has darkened from ${srp.trendFrom.toFixed(1)}% to ${srp.contamination.toFixed(1)}% contamination. Streaking is not concentrated at the stuffing box and movement is normal, indicating a build-up of oil film on the rod rather than an active leak.`;
    case 'Poor image quality':
      return `Model confidence is ${srp.confidence}% - below the image quality threshold. ${srp.observation} This is treated as a data quality event: no pump-fault classification is made until a clear burst is received.`;
    default:
      return srp.severity === 'Offline'
        ? 'No image burst has been received from this camera within the upload delay threshold. Check camera power and uplink.'
        : 'Detected rod movement follows the expected cycle and rod-surface contamination is within the normal band. No event raised.';
  }
}
