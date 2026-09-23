export type IssueType =
  | 'Stuck pump'
  | 'Pump-off'
  | 'Pump leakage'
  | 'High rod contamination'
  | 'Poor image quality';

export const ISSUE_TYPES: IssueType[] = [
  'Stuck pump',
  'Pump-off',
  'Pump leakage',
  'High rod contamination',
  'Poor image quality',
];

/** Operational status of an SRP, derived from the latest camera burst. */
export type Severity = 'Critical' | 'Warning' | 'Data quality' | 'Normal' | 'Offline';

export type WorkStatus = 'New' | 'Reviewed' | 'Work order created' | 'Dispatched' | 'Resolved';

export const WORK_STATUSES: WorkStatus[] = [
  'New',
  'Reviewed',
  'Work order created',
  'Dispatched',
  'Resolved',
];

export type UploadStatus = 'Received' | 'Partial' | 'Missed';

export interface SRP {
  id: string; // SRP name doubles as ID in the demo
  name: string;
  country: string;
  region: string;
  field: string;
  lat: number;
  lng: number;
  cameraId: string;
  severity: Severity;
  issue: IssueType | null;
  lastUpload: number; // epoch ms
  uploadStatus: UploadStatus;
  framesAnalyzed: number;
  batchId: string;
  eventTime: number | null; // epoch ms
  slaHours: number;
  observation: string;
  contamination: number; // %
  trendFrom: number; // contamination % 24h ago
  confidence: number; // %
  deviation: number; // movement deviation index 0..1
  meanBrightness: number; // 0..255
  brightnessSpread: number; // std dev of grey level
  blacknessRatio: number; // % of dark pixels in relevant rod region
  relevantRatio: number; // % of visible rod that is relevant ROI
  spm: number; // strokes per minute, derived from image motion
  technician: string | null;
  workStatus: WorkStatus | null;
}

export interface WorkOrder {
  id: string;
  srpId: string;
  issue: IssueType;
  priority: 'P1 - Critical' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low';
  technician: string;
  note: string;
  attachFrame: boolean;
  slaHours: number;
  createdAt: number;
  emailTo: string[];
}

export interface HistoryEvent {
  id: string;
  time: number;
  srpId: string;
  issue: IssueType;
  contamination: number;
  confidence: number;
  batchId: string;
  reviewer: string;
  action: string;
  resolution: 'Open' | 'In progress' | 'Resolved' | 'Dismissed';
}

export interface Note {
  srpId: string;
  text: string;
  author: string;
  time: number;
}

export interface ModelRules {
  contaminationWarning: number;
  contaminationCritical: number;
  deviationWarning: number;
  deviationCritical: number;
  minFramesPerBurst: number;
  imageQualityThreshold: number;
  uploadDelayMinutes: number;
  consecutiveUploads: number;
}
