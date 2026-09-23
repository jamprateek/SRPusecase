import { FAULTS, FaultType } from './faults';

export type Status = 'normal' | 'warning' | 'critical' | 'offline';

/** Fixed demo clock so every recording shows identical numbers. */
export const NOW = new Date('2026-09-23T06:40:00-05:00');
export const TZ = 'America/Chicago'; // field time zone, independent of the viewer's machine
export const OIL_PRICE = 72; // USD/bbl, WTI assumption for value-at-risk
export const BASE_OPEN_TICKETS = 4; // tickets open on wells outside this view (facilities, roads)

export const COUNTIES = [
  'Andrews', 'Martin', 'Howard',
  'Loving', 'Winkler', 'Ector', 'Midland', 'Glasscock',
  'Reeves', 'Ward', 'Crane', 'Upton', 'Reagan',
] as const;
export type County = (typeof COUNTIES)[number];

/** Schematic grid position of each county on the field overview (col, row). */
export const COUNTY_GRID: Record<County, [number, number]> = {
  Andrews: [2, 0], Martin: [3, 0], Howard: [4, 0],
  Loving: [0, 1], Winkler: [1, 1], Ector: [2, 1], Midland: [3, 1], Glasscock: [4, 1],
  Reeves: [0, 2], Ward: [1, 2], Crane: [2, 2], Upton: [3, 2], Reagan: [4, 2],
};

export interface PriorityBreakdown {
  productionLoss: number; // 0-40
  severity: number; // 0-25
  confidence: number; // 0-15
  repeatFailure: number; // 0-10
  environmental: number; // 0-10
}

export interface Well {
  id: string;
  county: County;
  lease: string;
  pad: string;
  x: number; // 0-1 within field map
  y: number;
  status: Status;
  fault: FaultType;
  confidence: number; // %
  runtime: number; // %
  expected: number; // bbl/day
  actual: number; // bbl/day
  deferred: number; // bbl/day
  tubingP: number; // psi
  casingP: number; // psi
  flowlineP: number; // psi
  motorCurrent: number; // A
  spm: number; // strokes/min
  fillage: number; // %
  baselineFillage: number;
  priority: number;
  breakdown: PriorityBreakdown;
  lastEvent: Date;
  onsetHours: number;
  action: string;
  sla: string;
  repeat90d: number;
  envRisk: string;
  alerts24h: number;
  diagnosis: string;
  evidence: string[];
  pumpDepth: number; // ft
  unit: string;
  stroke: number; // in
}

// ---------- deterministic RNG ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const seeded = mulberry32;
const rng = mulberry32(20260923);
const rnd = (min: number, max: number) => min + rng() * (max - min);
const round1 = (v: number) => Math.round(v * 10) / 10;

// ---------- curated problem wells (the demo story) ----------
interface Curated {
  id: string;
  status: Status;
  fault: FaultType;
  confidence: number;
  expected: number;
  deferred: number;
  runtime: number;
  sla: string;
  repeat90d: number;
  env: [number, string];
  onsetHours: number;
  fillage: number;
  baselineFillage?: number;
  tubingP: number;
  casingP: number;
  flowlineP: number;
  motorCurrent: number;
  spm: number;
  alerts24h: number;
  action?: string;
  evidence: string[];
}

const CURATED: Curated[] = [
  {
    id: 'TX-REEVES-041', status: 'critical', fault: 'stuck_pump', confidence: 91,
    expected: 44, deferred: 42, runtime: 61, sla: '4h', repeat90d: 3, env: [8, 'H₂S area, 0.4 mi from playa'],
    onsetHours: 5.5, fillage: 12, tubingP: 186, casingP: 332, flowlineP: 94, motorCurrent: 58.4, spm: 0.4, alerts24h: 6,
    action: 'Dispatch crew: attempt unseat and flush; stage pulling unit if unsuccessful',
    evidence: [
      'Motor current spiked to 71 A (+64% vs 7-day baseline) at 01:10, then 3 failed auto-restarts',
      'Stroke rate collapsed from 8.4 SPM to 0.4 SPM',
      'Dyno load range down 78% vs baseline card — plunger not travelling',
      'Tubing pressure fell 612 → 186 psi; production 42 bbl/day below expected',
    ],
  },
  {
    id: 'TX-MIDLAND-088', status: 'critical', fault: 'tubing_leak', confidence: 84,
    expected: 58, deferred: 31, runtime: 96, sla: '8h', repeat90d: 2, env: [6, 'Adjacent to county road drainage'],
    onsetHours: 52, fillage: 86, tubingP: 412, casingP: 288, flowlineP: 176, motorCurrent: 38.2, spm: 8.2, alerts24h: 4,
    action: 'Pressure test tubing; schedule workover rig if test fails',
    evidence: [
      'Tubing pressure declined 21% over 48h (522 → 412 psi) with normal runtime',
      'Upstroke peak load down 14% — fluid column not supported',
      'Pump fillage normal (86%) — rules out inflow problem',
      'Production 31 bbl/day below expected despite 96% runtime',
    ],
  },
  {
    id: 'TX-WARD-023', status: 'critical', fault: 'stuck_pump', confidence: 77,
    expected: 26, deferred: 23, runtime: 48, sla: '4h', repeat90d: 1, env: [4, 'Standard'],
    onsetHours: 9, fillage: 18, tubingP: 142, casingP: 265, flowlineP: 88, motorCurrent: 52.1, spm: 0.9, alerts24h: 5,
    evidence: [
      'Motor current +47% vs baseline followed by controller trip',
      'Stroke rate 0.9 SPM (setpoint 7.5 SPM)',
      'Dyno load range down 61% vs baseline card',
      'Production 23 bbl/day below expected',
    ],
  },
  {
    id: 'TX-UPTON-030', status: 'critical', fault: 'pump_off', confidence: 88,
    expected: 41, deferred: 22, runtime: 99, sla: '8h', repeat90d: 4, env: [2, 'Standard'],
    onsetHours: 96, fillage: 42, tubingP: 498, casingP: 146, flowlineP: 182, motorCurrent: 34.6, spm: 8.8, alerts24h: 3,
    action: 'Increase POC idle time from 15 to 35 min; review setpoint vs. inflow',
    evidence: [
      'Pump fillage 42% (baseline 87%) with 99% runtime — pumping faster than inflow',
      'Casing pressure low and stable (146 psi) — fluid level at intake',
      'Dyno card shows full-stroke fluid pound signature',
      '4 pump-off episodes in 90 days — POC setpoint likely stale',
    ],
  },
  {
    id: 'TX-HOWARD-071', status: 'critical', fault: 'tubing_leak', confidence: 79,
    expected: 37, deferred: 19, runtime: 94, sla: '8h', repeat90d: 1, env: [5, 'Near stock tank battery'],
    onsetHours: 70, fillage: 83, tubingP: 356, casingP: 241, flowlineP: 158, motorCurrent: 33.9, spm: 7.6, alerts24h: 3,
    evidence: [
      'Tubing pressure declined 17% over 72h (431 → 356 psi)',
      'Upstroke load reduced 11% vs baseline card',
      'Runtime normal (94%), fillage normal (83%)',
      'Production 19 bbl/day below expected',
    ],
  },
  {
    id: 'TX-LOVING-012', status: 'critical', fault: 'fluid_pound', confidence: 90,
    expected: 33, deferred: 16, runtime: 98, sla: '12h', repeat90d: 3, env: [3, 'Standard'],
    onsetHours: 30, fillage: 48, tubingP: 472, casingP: 118, flowlineP: 166, motorCurrent: 41.2, spm: 9.1, alerts24h: 4,
    evidence: [
      'Pump fillage 48% (baseline 85%) — sharp downstroke load drop at 48% stroke',
      'Rod load impact events 212/hr — accelerated rod & coupling wear',
      'Stroke rate 9.1 SPM exceeds design for current inflow',
      'Production 16 bbl/day below expected',
    ],
  },
  {
    id: 'TX-ANDREWS-052', status: 'warning', fault: 'gas_interference', confidence: 82,
    expected: 49, deferred: 18, runtime: 93, sla: '12h', repeat90d: 2, env: [3, 'Standard'],
    onsetHours: 40, fillage: 61, baselineFillage: 88, tubingP: 455, casingP: 392, flowlineP: 181, motorCurrent: 36.5, spm: 8.0, alerts24h: 3,
    evidence: [
      'Casing pressure variance up 31% over 24h',
      'Pump fillage down from 88% to 61%',
      'Gradual (not sharp) downstroke unloading on dyno card',
      'Production 18 bbl/day below expected',
    ],
  },
  {
    id: 'TX-MARTIN-017', status: 'warning', fault: 'fluid_pound', confidence: 86,
    expected: 45, deferred: 18, runtime: 97, sla: '24h', repeat90d: 1, env: [2, 'Standard'],
    onsetHours: 60, fillage: 64, tubingP: 486, casingP: 132, flowlineP: 172, motorCurrent: 39.8, spm: 8.6, alerts24h: 2,
    action: 'Adjust controller: reduce SPM 8.6 → 7.4 and extend idle time',
    evidence: [
      'Pump fillage 64% (baseline 86%)',
      'Sharp downstroke load drop at 64% of stroke — fluid pound signature',
      'Casing pressure low (132 psi) — minimal gas contribution',
      'Production 18 bbl/day below expected',
    ],
  },
  {
    id: 'TX-MIDLAND-104', status: 'warning', fault: 'gas_interference', confidence: 71,
    expected: 39, deferred: 11, runtime: 95, sla: '24h', repeat90d: 2, env: [2, 'Standard'],
    onsetHours: 28, fillage: 67, tubingP: 438, casingP: 371, flowlineP: 169, motorCurrent: 35.1, spm: 7.9, alerts24h: 2,
    evidence: [
      'Casing pressure variance up 24%',
      'Pump fillage down from 85% to 67%',
      'Rounded downstroke unloading on dyno card',
      'Production 11 bbl/day below expected',
    ],
  },
  {
    id: 'TX-REEVES-077', status: 'warning', fault: 'gas_interference', confidence: 68,
    expected: 36, deferred: 10, runtime: 92, sla: '24h', repeat90d: 1, env: [6, 'H₂S area'],
    onsetHours: 20, fillage: 69, tubingP: 446, casingP: 362, flowlineP: 164, motorCurrent: 34.2, spm: 7.7, alerts24h: 2,
    evidence: [
      'Casing pressure variance up 19%',
      'Pump fillage down from 84% to 69%',
      'Production 10 bbl/day below expected',
    ],
  },
  {
    id: 'TX-GLASSCOCK-008', status: 'warning', fault: 'fluid_pound', confidence: 80,
    expected: 31, deferred: 9, runtime: 97, sla: '24h', repeat90d: 2, env: [1, 'Standard'],
    onsetHours: 44, fillage: 68, tubingP: 468, casingP: 124, flowlineP: 158, motorCurrent: 37.4, spm: 8.3, alerts24h: 2,
    evidence: [
      'Pump fillage 68% (baseline 84%)',
      'Sharp downstroke load drop — fluid pound signature',
      'Production 9 bbl/day below expected',
    ],
  },
  {
    id: 'TX-WINKLER-046', status: 'warning', fault: 'pump_off', confidence: 76,
    expected: 28, deferred: 8, runtime: 98, sla: '24h', repeat90d: 3, env: [2, 'Standard'],
    onsetHours: 36, fillage: 54, tubingP: 480, casingP: 110, flowlineP: 160, motorCurrent: 33.0, spm: 8.4, alerts24h: 2,
    evidence: [
      'Pump fillage 54% with 98% runtime',
      'Fluid level at pump intake (casing 110 psi)',
      'Production 8 bbl/day below expected',
    ],
  },
  {
    id: 'TX-MARTIN-059', status: 'warning', fault: 'fluid_pound', confidence: 73,
    expected: 27, deferred: 7, runtime: 96, sla: '48h', repeat90d: 0, env: [1, 'Standard'],
    onsetHours: 22, fillage: 71, tubingP: 462, casingP: 128, flowlineP: 162, motorCurrent: 35.8, spm: 8.0, alerts24h: 1,
    evidence: [
      'Pump fillage 71% (baseline 85%)',
      'Downstroke load drop at 71% of stroke',
      'Production 7 bbl/day below expected',
    ],
  },
  {
    id: 'TX-UPTON-092', status: 'warning', fault: 'tubing_leak', confidence: 58,
    expected: 34, deferred: 6, runtime: 95, sla: '48h', repeat90d: 0, env: [2, 'Standard'],
    onsetHours: 30, fillage: 84, tubingP: 418, casingP: 236, flowlineP: 165, motorCurrent: 34.4, spm: 7.8, alerts24h: 1,
    evidence: [
      'Tubing pressure declined 8% over 36h — below 15% rule threshold',
      'Fillage and runtime normal',
      'Production 6 bbl/day below expected — early indicator, monitor',
    ],
  },
  {
    id: 'TX-HOWARD-015', status: 'warning', fault: 'pump_off', confidence: 70,
    expected: 24, deferred: 5, runtime: 99, sla: '48h', repeat90d: 2, env: [1, 'Standard'],
    onsetHours: 18, fillage: 58, tubingP: 474, casingP: 104, flowlineP: 156, motorCurrent: 32.1, spm: 8.2, alerts24h: 1,
    evidence: [
      'Pump fillage 58% with 99% runtime',
      'Production 5 bbl/day below expected',
    ],
  },
  {
    id: 'TX-CRANE-019', status: 'warning', fault: 'gauge_anomaly', confidence: 74,
    expected: 38, deferred: 3, runtime: 96, sla: '24h', repeat90d: 1, env: [2, 'Standard'],
    onsetHours: 14, fillage: 85, tubingP: 612, casingP: 305, flowlineP: 188, motorCurrent: 36.0, spm: 7.8, alerts24h: 2,
    evidence: [
      'CV tubing gauge reads 740 psi vs transmitter 612 psi (+21%)',
      'Two consecutive inspections disagree beyond 10% band',
      'Dyno card and production consistent with normal operation — suspect transmitter drift',
    ],
  },
  {
    id: 'TX-ECTOR-033', status: 'warning', fault: 'gauge_anomaly', confidence: 63,
    expected: 30, deferred: 0, runtime: 95, sla: '48h', repeat90d: 0, env: [1, 'Standard'],
    onsetHours: 26, fillage: 84, tubingP: 548, casingP: 286, flowlineP: 179, motorCurrent: 34.9, spm: 7.5, alerts24h: 1,
    evidence: [
      'Casing transmitter flat-lined at 286.0 psi for 26h (zero variance)',
      'CV casing gauge reading 318 psi — low confidence (glare)',
      'Production on target',
    ],
  },
  // offline wells — no telemetry, deferral estimated from last known rate
  ...(['TX-WARD-061', 'TX-REAGAN-027', 'TX-LOVING-038', 'TX-CRANE-083', 'TX-WINKLER-006'] as const).map(
    (id, i): Curated => ({
      id, status: 'offline', fault: 'comms_loss', confidence: 99,
      expected: [29, 24, 22, 26, 19][i], deferred: [14, 12, 9, 11, 8][i], runtime: [41, 38, 52, 45, 50][i],
      sla: '12h', repeat90d: [2, 1, 3, 0, 1][i], env: [[3, 'Standard'], [2, 'Standard'], [4, 'Remote lease road'], [2, 'Standard'], [2, 'Standard']][i] as [number, string],
      onsetHours: [3.2, 7.5, 11, 4.4, 16][i], fillage: 0, tubingP: 0, casingP: 0, flowlineP: 0, motorCurrent: 0, spm: 0,
      alerts24h: [2, 1, 2, 1, 1][i],
      evidence: [
        `No telemetry packets for ${[3.2, 7.5, 11, 4.4, 16][i]} h`,
        'Last known state: running normally',
        'Deferral estimated from last 7-day average and expected downtime',
      ],
    }),
  ),
];

// ---------- fleet generation ----------
const UNITS = ['C-228D-246-86', 'C-320D-256-120', 'C-456D-305-144', 'C-640D-365-168'];
const LEASES = ['Pecos Valley', 'Sand Draw', 'Red Bluff', 'Mesa Ranch', 'Cottonwood', 'Spraberry Unit', 'Hackberry', 'Salt Flat', 'Coyote Draw', 'Big Lake'];

function priorityOf(status: Status, deferred: number, confidence: number, repeat: number, env: number): PriorityBreakdown {
  return {
    productionLoss: round1(Math.min(40, (deferred / 42) * 40)),
    severity: { critical: 25, warning: 12, offline: 10, normal: 0 }[status],
    confidence: status === 'normal' ? 0 : round1((confidence / 100) * 15),
    repeatFailure: Math.min(10, repeat * 2.5),
    environmental: env,
  };
}

function hoursAgo(h: number) {
  return new Date(NOW.getTime() - h * 3600_000);
}

function buildWells(): Well[] {
  const curatedIds = new Set(CURATED.map((c) => c.id));
  const byCounty: Record<string, number> = {};
  const wells: Well[] = [];

  const make = (id: string, county: County, c?: Curated): Well => {
    const [col, row] = COUNTY_GRID[county];
    const x = (col + rnd(0.12, 0.88)) / 5;
    const y = (row + rnd(0.28, 0.88)) / 3; // keep clear of county labels
    const unit = UNITS[Math.floor(rng() * UNITS.length)];
    const stroke = Number(unit.split('-')[3]);
    const pumpDepth = Math.round(rnd(6800, 9800) / 50) * 50;
    const lease = `${LEASES[Math.floor(rng() * LEASES.length)]} ${Math.ceil(rnd(1, 30))}`;
    const pad = `Pad ${String.fromCharCode(65 + Math.floor(rng() * 8))}`;

    if (c) {
      const actual = c.expected - c.deferred;
      const breakdown = priorityOf(c.status, c.deferred, c.confidence, c.repeat90d, c.env[0]);
      const def = FAULTS[c.fault];
      return {
        id, county, lease, pad, x, y, unit, stroke, pumpDepth,
        status: c.status, fault: c.fault, confidence: c.confidence, runtime: c.runtime,
        expected: c.expected, actual, deferred: c.deferred,
        tubingP: c.tubingP, casingP: c.casingP, flowlineP: c.flowlineP, motorCurrent: c.motorCurrent, spm: c.spm,
        fillage: c.fillage, baselineFillage: c.baselineFillage ?? 86,
        breakdown, priority: round1(Object.values(breakdown).reduce((a, b) => a + b, 0)),
        lastEvent: hoursAgo(c.onsetHours), onsetHours: c.onsetHours,
        action: c.action ?? def.defaultAction, sla: c.sla, repeat90d: c.repeat90d, envRisk: c.env[1],
        alerts24h: c.alerts24h,
        diagnosis: c.fault === 'comms_loss' ? `No telemetry for ${c.onsetHours} h; unit state unknown.` : `Likely ${def.label.toLowerCase()}, ${c.confidence}% confidence.`,
        evidence: c.evidence,
      };
    }

    const expected = Math.round(rnd(14, 62));
    const actual = round1(expected * rnd(0.975, 1.03));
    const deferred = round1(Math.max(0, expected - actual));
    const tubingP = Math.round(rnd(470, 640));
    const repeat = rng() < 0.2 ? 1 : 0;
    const env = Math.round(rnd(0, 3));
    const breakdown = priorityOf('normal', deferred, 0, repeat, env);
    return {
      id, county, lease, pad, x, y, unit, stroke, pumpDepth,
      status: 'normal', fault: 'normal', confidence: Math.round(rnd(92, 99)),
      runtime: Math.round(rnd(79, 97)), expected, actual, deferred,
      tubingP, casingP: Math.round(rnd(150, 320)), flowlineP: Math.round(rnd(150, 205)),
      motorCurrent: round1(rnd(28, 42)), spm: round1(rnd(6.5, 9)),
      fillage: Math.round(rnd(82, 94)), baselineFillage: 86,
      breakdown, priority: round1(Object.values(breakdown).reduce((a, b) => a + b, 0)),
      lastEvent: hoursAgo(rnd(30, 400)), onsetHours: 0,
      action: FAULTS.normal.defaultAction, sla: '—', repeat90d: repeat, envRisk: env >= 3 ? 'Near stock tank battery' : 'Standard',
      alerts24h: rng() < 0.12 ? 1 : 0,
      diagnosis: 'Normal operation. All rule checks within configured bands.',
      evidence: ['Dyno card matches baseline shape', 'Pump fillage and runtime within band', 'Production within 3% of expected'],
    };
  };

  for (const c of CURATED) {
    const county = c.id.split('-')[1];
    const name = (county[0] + county.slice(1).toLowerCase()) as County;
    wells.push(make(c.id, name, c));
  }

  let i = 0;
  while (wells.length < 126) {
    const county = COUNTIES[i % COUNTIES.length];
    i++;
    byCounty[county] = (byCounty[county] ?? 0) + 1;
    const num = String(Math.floor(rnd(1, 120))).padStart(3, '0');
    const id = `TX-${county.toUpperCase()}-${num}`;
    if (curatedIds.has(id) || wells.some((w) => w.id === id)) continue;
    wells.push(make(id, county));
  }
  return wells.sort((a, b) => b.priority - a.priority);
}

export const WELLS: Well[] = buildWells();
export const WELL_BY_ID: Record<string, Well> = Object.fromEntries(WELLS.map((w) => [w.id, w]));

// ---------- time series ----------
export interface ProdPoint { day: string; expected: number; actual: number }
export interface TelemetryPoint { t: string; tubing: number | null; casing: number | null; current: number | null; spm: number | null }

const seriesCache = new Map<string, unknown>();
function cached<T>(key: string, fn: () => T): T {
  if (!seriesCache.has(key)) seriesCache.set(key, fn());
  return seriesCache.get(key) as T;
}
function hashId(id: string) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });

export function productionSeries(w: Well, days = 30): ProdPoint[] {
  return cached(`prod-${w.id}-${days}`, () => {
    const r = mulberry32(hashId(w.id));
    const onsetDays = w.status === 'normal' ? 999 : Math.max(1, Math.ceil(w.onsetHours / 24));
    const pts: ProdPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const expected = w.expected * (1 + 0.0035 * i);
      let actual: number;
      if (i === 0) actual = w.actual;
      else if (i < onsetDays) {
        const frac = 1 - i / onsetDays;
        const ratio = w.actual / w.expected;
        actual = expected * (1 - (1 - ratio) * frac) * (1 + (r() - 0.5) * 0.04);
      } else actual = expected * (0.985 + (r() - 0.5) * 0.06);
      pts.push({ day: dayLabel(new Date(NOW.getTime() - i * 86400_000)), expected: round1(expected), actual: round1(actual) });
    }
    return pts;
  });
}

export function telemetrySeries(w: Well): TelemetryPoint[] {
  return cached(`tel-${w.id}`, () => {
    const r = mulberry32(hashId(w.id) ^ 0x9e37);
    const n = 96; // 24h at 15-min
    const onsetIdx = w.onsetHours > 0 ? Math.max(0, n - 1 - Math.round(w.onsetHours * 4)) : n + 1;
    const offlineIdx = w.status === 'offline' ? n - Math.round(w.onsetHours * 4) : n + 1;
    const noise = (s: number) => (r() - 0.5) * 2 * s;
    // baselines before onset
    const base = {
      tubing: w.fault === 'stuck_pump' ? 612 : w.status === 'offline' ? 540 : w.tubingP,
      casing: w.fault === 'gas_interference' ? w.casingP * 0.92 : w.status === 'offline' ? 240 : w.casingP,
      current: w.fault === 'stuck_pump' ? 36 : w.status === 'offline' ? 35 : w.motorCurrent,
      spm: w.fault === 'stuck_pump' ? 8.4 : w.status === 'offline' ? 7.8 : w.spm,
    };
    const pts: TelemetryPoint[] = [];
    for (let i = 0; i < n; i++) {
      const t = new Date(NOW.getTime() - (n - 1 - i) * 15 * 60_000);
      const label = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
      if (i >= offlineIdx) {
        pts.push({ t: label, tubing: null, casing: null, current: null, spm: null });
        continue;
      }
      const k = i < onsetIdx ? 0 : Math.min(1, (i - onsetIdx) / Math.max(1, n - 1 - onsetIdx));
      let tubing = base.tubing, casing = base.casing, current = base.current, spm = base.spm;
      switch (w.fault) {
        case 'stuck_pump': {
          const since = i - onsetIdx;
          if (since >= 0) {
            current = since < 3 ? 71 - since * 3 : since < 8 ? 36 + (since % 2 ? 30 : 4) : w.motorCurrent + noise(1.5);
            spm = since < 2 ? 5 : since < 8 ? (since % 2 ? 3.2 : 0.2) : w.spm;
            tubing = base.tubing - (base.tubing - w.tubingP) * Math.min(1, since / 10);
          }
          break;
        }
        case 'tubing_leak':
          tubing = w.tubingP * (1.1 - (0.1 * i) / (n - 1));
          break;
        case 'gas_interference':
          casing = base.casing + (w.casingP - base.casing) * k + noise(8 + 32 * (i >= onsetIdx ? 1 : 0.2));
          current = base.current + noise(i >= onsetIdx ? 3 : 1);
          break;
        case 'fluid_pound':
        case 'pump_off':
          current = base.current + noise(i >= onsetIdx ? 3.5 : 1.2) + (i >= onsetIdx ? 2 : 0);
          break;
        case 'gauge_anomaly':
          if (w.id === 'TX-ECTOR-033' && i >= onsetIdx) casing = 286;
          break;
      }
      pts.push({
        t: label,
        tubing: Math.round(tubing + (w.fault === 'stuck_pump' || w.fault === 'tubing_leak' ? noise(6) : noise(10))),
        casing: Math.round(w.id === "TX-ECTOR-033" && i >= onsetIdx ? casing : casing + noise(2.5)),
        current: round1(w.fault === 'stuck_pump' ? current : current + noise(1)),
        spm: round1(w.fault === 'stuck_pump' ? spm : spm + noise(0.15)),
      });
    }
    // light smoothing (except for abrupt stuck-pump events) so sensor noise reads as a signal
    if (w.fault !== 'stuck_pump') {
      (['tubing', 'casing', 'current', 'spm'] as const).forEach((k) => {
        if (w.id === 'TX-ECTOR-033' && k === 'casing') return;
        const raw = pts.map((p) => p[k]);
        pts.forEach((p, i) => {
          if (raw[i] == null) return;
          const win = raw.slice(Math.max(0, i - 2), i + 3).filter((v): v is number => v != null);
          const avg = win.reduce((a, b) => a + b, 0) / win.length;
          p[k] = k === 'current' || k === 'spm' ? round1(avg) : Math.round(avg);
        });
      });
    }
    return pts;
  });
}

/** Surface dynamometer card: position (0-1 of stroke) vs polished rod load (klbs). */
export interface CardPoint { x: number; load: number }

export function dynoCard(fault: FaultType, fillage: number, seed = 1): CardPoint[] {
  const r = mulberry32(seed);
  const pts: CardPoint[] = [];
  const N = 60;
  let fMin = 6.5, fMax = 17.5;
  if (fault === 'stuck_pump') { fMin = 10.8; fMax = 13.6; }
  if (fault === 'tubing_leak') { fMax = 15.2; }
  const fill = Math.max(0.1, Math.min(1, fillage / 100));
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const wobble = (x: number) => Math.sin(x * Math.PI * 6) * 0.35 + (r() - 0.5) * 0.15;
  // upstroke
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const loadRamp = fault === 'tubing_leak' ? smooth(0, 0.35, x) : fault === 'stuck_pump' ? smooth(0, 0.5, x) : smooth(0, 0.12, x);
    pts.push({ x, load: fMin + (fMax - fMin) * loadRamp + wobble(x) * (fault === 'stuck_pump' ? 0.3 : 1) });
  }
  // downstroke
  for (let i = N; i >= 0; i--) {
    const x = i / N;
    let unload: number;
    switch (fault) {
      case 'fluid_pound':
      case 'pump_off':
        unload = 1 - smooth(fill - 0.06, fill + 0.01, x);
        break;
      case 'gas_interference':
        unload = 1 - smooth(fill - 0.3, 1.0, x);
        break;
      case 'stuck_pump':
        unload = 1 - smooth(0.4, 1.0, x);
        break;
      default:
        unload = 1 - smooth(0.86, 1.0, x);
    }
    pts.push({ x, load: fMax - (fMax - fMin) * unload + wobble(x) * (fault === 'stuck_pump' ? 0.3 : 0.8) });
  }
  if (fault === 'stuck_pump') return pts.map((p) => ({ x: 0.35 + p.x * 0.22, load: p.load }));
  return pts;
}

// ---------- fleet aggregates ----------
export function fleetProduction(days = 14): { day: string; expected: number; actual: number; deferred: number }[] {
  return cached(`fleet-${days}`, () => {
    const acc: { day: string; expected: number; actual: number; deferred: number }[] = [];
    WELLS.forEach((w) => {
      productionSeries(w, 30).slice(-days).forEach((p, i) => {
        if (!acc[i]) acc[i] = { day: p.day, expected: 0, actual: 0, deferred: 0 };
        acc[i].expected += p.expected;
        acc[i].actual += p.actual;
        acc[i].deferred += Math.max(0, p.expected - p.actual);
      });
    });
    // today's deferred must equal the sum of well deferrals shown elsewhere
    acc[acc.length - 1].deferred = WELLS.reduce((a, w) => a + w.deferred, 0);
    return acc.map((p) => ({ ...p, expected: Math.round(p.expected), actual: Math.round(p.actual), deferred: Math.round(p.deferred) }));
  });
}

export function fmtAgo(d: Date) {
  const h = (NOW.getTime() - d.getTime()) / 3600_000;
  if (h < 1) return `${Math.round(h * 60)} min ago`;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
export function fmtTime(d: Date) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
}
