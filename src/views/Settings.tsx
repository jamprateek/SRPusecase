import { useState } from 'react';
import { DEFAULT_RULES, LATEST_BATCH_TIME } from '../data';
import { UPLOAD_INTERVAL_MIN, FRAMES_PER_BURST, MODEL_VERSION } from '../config';
import { useStore } from '../store';
import type { ModelRules } from '../types';
import { Icon, fmtTime } from '../ui';

interface RuleDef {
  key: keyof ModelRules;
  label: string;
  help: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  group: 'Contamination' | 'Movement' | 'Data quality';
}

const RULES: RuleDef[] = [
  { key: 'contaminationWarning', label: 'Contamination warning threshold', help: 'Blackness-weighted contamination of the relevant rod ROI above which a warning event is raised.', unit: '%', min: 5, max: 40, step: 1, group: 'Contamination' },
  { key: 'contaminationCritical', label: 'Contamination critical threshold', help: 'Above this value the event is escalated to critical (possible pump leakage).', unit: '%', min: 15, max: 60, step: 1, group: 'Contamination' },
  { key: 'deviationWarning', label: 'Movement deviation warning threshold', help: 'Deviation index between expected and detected rod path (0 = identical, 1 = no movement match).', unit: 'index', min: 0.05, max: 0.5, step: 0.01, group: 'Movement' },
  { key: 'deviationCritical', label: 'Movement deviation critical threshold', help: 'Escalates pump-off / stuck-pump evidence to critical.', unit: 'index', min: 0.1, max: 0.8, step: 0.01, group: 'Movement' },
  { key: 'consecutiveUploads', label: 'Consecutive uploads to confirm', help: 'Number of consecutive bursts the evidence must persist before an event is raised.', unit: 'uploads', min: 1, max: 6, step: 1, group: 'Movement' },
  { key: 'minFramesPerBurst', label: 'Minimum frames required per burst', help: `Bursts with fewer usable frames (of ${FRAMES_PER_BURST}) are not classified.`, unit: 'frames', min: 60, max: 180, step: 5, group: 'Data quality' },
  { key: 'imageQualityThreshold', label: 'Poor image quality threshold', help: 'Model confidence below this value raises a data-quality event instead of a pump fault.', unit: '% conf.', min: 20, max: 90, step: 1, group: 'Data quality' },
  { key: 'uploadDelayMinutes', label: 'Upload delay threshold', help: `Camera is marked offline if no burst arrives within this time (normal cadence ${UPLOAD_INTERVAL_MIN} min).`, unit: 'min', min: 20, max: 180, step: 5, group: 'Data quality' },
];

export function Settings() {
  const { rules, setRules, rulesVersion, toast, srps } = useStore();
  const [draft, setDraft] = useState<ModelRules>(rules);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);
  const invalid = draft.contaminationCritical <= draft.contaminationWarning || draft.deviationCritical <= draft.deviationWarning;

  const impact = {
    cw: srps.filter((s) => s.contamination > draft.contaminationWarning && s.contamination <= draft.contaminationCritical).length,
    cc: srps.filter((s) => s.contamination > draft.contaminationCritical).length,
    dw: srps.filter((s) => s.deviation > draft.deviationWarning && s.deviation <= draft.deviationCritical).length,
    dc: srps.filter((s) => s.deviation > draft.deviationCritical).length,
    dq: srps.filter((s) => s.severity !== 'Offline' && s.confidence < draft.imageQualityThreshold).length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Model rules</h1>
          <p className="muted">Detection thresholds applied by the rules engine to every analysed burst · {MODEL_VERSION}</p>
        </div>
        <div className="row gap8">
          <span className="ruleset">Active ruleset <b>v1.{rulesVersion}</b></span>
          <button className="btn" disabled={!dirty} onClick={() => setDraft(rules)}>Discard</button>
          <button className="btn" onClick={() => setDraft(DEFAULT_RULES)}>Reset to defaults</button>
          <button className="btn btn-primary" disabled={!dirty || invalid} onClick={() => {
            setRules(draft);
            const next = new Date(LATEST_BATCH_TIME + UPLOAD_INTERVAL_MIN * 60_000);
            toast(`Ruleset v1.${rulesVersion + 1} published - applies from the ${fmtTime(next.getTime())} upload batch.`);
          }}><Icon name="check" size={14} />Publish rules</button>
        </div>
      </div>

      <div className="callout">
        <Icon name="sliders" size={18} />
        <div>
          <b>Previously hard-coded, now configurable.</b> These thresholds used to live inside the image-processing script and required a code release to change.
          They are now versioned rules that reliability engineers can tune and publish; every event records the ruleset it was evaluated against.
        </div>
      </div>

      <div className="settings-grid">
        {(['Contamination', 'Movement', 'Data quality'] as const).map((g) => (
          <section key={g} className="card">
            <div className="card-head"><h2><Icon name={g === 'Contamination' ? 'drop' : g === 'Movement' ? 'activity' : 'camera'} /> {g}</h2></div>
            {RULES.filter((r) => r.group === g).map((r) => {
              const v = draft[r.key];
              const changed = v !== rules[r.key];
              return (
                <div key={r.key} className={`rule ${changed ? 'changed' : ''}`}>
                  <div className="rule-head">
                    <label htmlFor={r.key}>{r.label}</label>
                    <div className="rule-val">
                      <input id={r.key} type="number" min={r.min} max={r.max} step={r.step} value={v}
                        onChange={(e) => setDraft({ ...draft, [r.key]: Number(e.target.value) })} />
                      <span>{r.unit}</span>
                    </div>
                  </div>
                  <input type="range" min={r.min} max={r.max} step={r.step} value={v} onChange={(e) => setDraft({ ...draft, [r.key]: Number(e.target.value) })} />
                  <div className="rule-help">{r.help}{changed && <span className="was"> · published: {rules[r.key]}</span>}</div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <section className="card">
        <div className="card-head"><h2><Icon name="gauge" /> Impact preview on latest batch</h2><span className="muted small">Draft thresholds against {srps.length} most recent bursts</span></div>
        {invalid && <div className="warn-line"><Icon name="alert" size={14} />Critical thresholds must be higher than warning thresholds.</div>}
        <div className="impact">
          <div><span>Contamination warning</span><b className="t-warning">{impact.cw}</b></div>
          <div><span>Contamination critical</span><b className="t-critical">{impact.cc}</b></div>
          <div><span>Movement deviation warning</span><b className="t-warning">{impact.dw}</b></div>
          <div><span>Movement deviation critical</span><b className="t-critical">{impact.dc}</b></div>
          <div><span>Data-quality events</span><b className="t-dq">{impact.dq}</b></div>
        </div>
      </section>
    </div>
  );
}
