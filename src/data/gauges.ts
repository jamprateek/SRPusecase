import type { GaugeScenario } from '../AppState';
import { WELLS } from './wells';

export type GaugeKey = 'tubing' | 'casing' | 'flowline';
export type Agreement = 'agrees' | 'mismatch' | 'low_confidence';

export interface GaugeReading {
  key: GaugeKey;
  label: string;
  gauge: number; // psi read by CV
  telemetry: number; // psi from transmitter
  conf: number; // 0-1
  range: number; // full-scale psi
}

export interface Scenario {
  id: GaugeScenario;
  label: string;
  wellId: string;
  capture: string;
  source: string;
  primary: GaugeKey;
  readings: GaugeReading[];
  finding: string;
  next: string;
  highLimit?: number;
  glare?: boolean;
}

const normalWells = WELLS.filter((w) => w.status === 'normal');
const n1 = normalWells[3];
const n2 = normalWells[11];

export const SCENARIOS: Scenario[] = [
  {
    id: 'normal', label: 'Normal gauge', wellId: n1.id, capture: 'Sep 23 06:12', source: 'Operator mobile capture · route 7', primary: 'tubing',
    readings: [
      { key: 'tubing', label: 'Tubing pressure', gauge: n1.tubingP + 4, telemetry: n1.tubingP, conf: 0.96, range: 1000 },
      { key: 'casing', label: 'Casing pressure', gauge: n1.casingP - 3, telemetry: n1.casingP, conf: 0.95, range: 1000 },
      { key: 'flowline', label: 'Flowline pressure', gauge: n1.flowlineP + 2, telemetry: n1.flowlineP, conf: 0.93, range: 500 },
    ],
    finding: 'All three gauges agree with telemetry within ±2%. No action required.',
    next: 'Reading archived to well history as a calibration reference point.',
  },
  {
    id: 'high_tubing', label: 'High tubing pressure', wellId: n2.id, capture: 'Sep 23 05:47', source: 'Fixed wellhead camera · cam-02', primary: 'tubing', highLimit: 800,
    readings: [
      { key: 'tubing', label: 'Tubing pressure', gauge: 865, telemetry: 858, conf: 0.95, range: 1000 },
      { key: 'casing', label: 'Casing pressure', gauge: 228, telemetry: 224, conf: 0.93, range: 1000 },
      { key: 'flowline', label: 'Flowline pressure', gauge: 402, telemetry: 396, conf: 0.91, range: 500 },
    ],
    finding: 'Tubing pressure 865 psi exceeds 800 psi high limit; gauge and transmitter agree. Elevated flowline pressure suggests a downstream restriction.',
    next: 'Rule engine raised a warning: check flowline valve position and paraffin build-up.',
  },
  {
    id: 'gas', label: 'Gas interference', wellId: 'TX-ANDREWS-052', capture: 'Sep 23 06:05', source: 'Operator mobile capture · route 2', primary: 'casing',
    readings: [
      { key: 'tubing', label: 'Tubing pressure', gauge: 458, telemetry: 455, conf: 0.94, range: 1000 },
      { key: 'casing', label: 'Casing pressure', gauge: 396, telemetry: 392, conf: 0.92, range: 1000 },
      { key: 'flowline', label: 'Flowline pressure', gauge: 183, telemetry: 181, conf: 0.9, range: 500 },
    ],
    finding: 'Casing gauge confirms elevated casing pressure (396 psi). Independent evidence supporting the gas interference diagnosis.',
    next: 'Evidence attached to TX-ANDREWS-052 diagnosis; confidence unchanged at 82%.',
  },
  {
    id: 'dirty', label: 'Low-confidence dirty gauge', wellId: 'TX-ECTOR-033', capture: 'Sep 23 06:21', source: 'Operator mobile capture · route 5', primary: 'casing', glare: true,
    readings: [
      { key: 'tubing', label: 'Tubing pressure', gauge: 552, telemetry: 548, conf: 0.88, range: 1000 },
      { key: 'casing', label: 'Casing pressure', gauge: 318, telemetry: 286, conf: 0.41, range: 1000 },
      { key: 'flowline', label: 'Flowline pressure', gauge: 181, telemetry: 179, conf: 0.57, range: 500 },
    ],
    finding: 'Casing dial partly obscured by glare and condensation. Needle localisation unreliable; reading withheld from diagnosis.',
    next: 'Re-capture requested on next route visit (clean lens, shade the dial).',
  },
  {
    id: 'mismatch', label: 'Sensor mismatch', wellId: 'TX-CRANE-019', capture: 'Sep 23 06:31', source: 'Fixed wellhead camera · cam-01', primary: 'tubing',
    readings: [
      { key: 'tubing', label: 'Tubing pressure', gauge: 740, telemetry: 612, conf: 0.94, range: 1000 },
      { key: 'casing', label: 'Casing pressure', gauge: 315, telemetry: 305, conf: 0.92, range: 1000 },
      { key: 'flowline', label: 'Flowline pressure', gauge: 190, telemetry: 188, conf: 0.9, range: 500 },
    ],
    finding: 'Tubing gauge reads 740 psi vs. transmitter 612 psi (+21%). Second inspection in 24 h with the same disagreement: likely transmitter drift.',
    next: 'Gauge anomaly flagged for I&E: verify transmitter calibration before relying on tubing-pressure rules for this well.',
  },
];

export function agreement(r: GaugeReading): Agreement {
  if (r.conf < 0.6) return 'low_confidence';
  if (Math.abs(r.gauge - r.telemetry) / r.telemetry > 0.1) return 'mismatch';
  return 'agrees';
}

export const AGREEMENT_LABEL: Record<Agreement, string> = { agrees: 'Agrees', mismatch: 'Mismatch', low_confidence: 'Low confidence' };

/** Latest CV cross-check shown on the well detail page. */
export function crossCheckFor(wellId: string, tubingP: number): { text: string; state: Agreement; capture: string } | null {
  const s = SCENARIOS.find((x) => x.wellId === wellId);
  if (s) {
    const r = s.readings.find((x) => x.key === s.primary)!;
    return { text: `${r.label}: gauge ${r.gauge} psi vs. sensor ${r.telemetry} psi`, state: agreement(r), capture: s.capture };
  }
  if (wellId === 'TX-REEVES-041') return { text: `Tubing pressure: gauge 190 psi vs. sensor ${tubingP} psi — confirms loss of lift`, state: 'agrees', capture: 'Sep 23 05:58' };
  return null;
}
