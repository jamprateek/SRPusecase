import { useState } from 'react';
import { annotatedFrameUrl } from '../config';
import { TECHNICIANS } from '../data';
import { useStore } from '../store';
import type { SRP, WorkOrder } from '../types';
import { Icon, ImageSlot, Modal, fmtDateTime } from '../ui';

export const SLA_OPTIONS = [2, 4, 8, 12, 24, 48];
const PRIORITIES: WorkOrder['priority'][] = ['P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'];

export const techEmail = (t: string) => t.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@fieldops.example.com';

export function WorkOrderModal({ srp, frame, defaults, onClose, onCreated }: {
  srp: SRP;
  frame: number;
  defaults: { technician: string; slaHours: number; note: string; attach: boolean };
  onClose: () => void;
  onCreated: (wo: WorkOrder) => void;
}) {
  const { addWorkOrder, toast } = useStore();
  const [priority, setPriority] = useState<WorkOrder['priority']>(srp.severity === 'Critical' ? 'P1 - Critical' : srp.severity === 'Warning' ? 'P2 - High' : 'P3 - Medium');
  const [technician, setTechnician] = useState(defaults.technician);
  const [note, setNote] = useState(defaults.note || `${srp.observation} Please inspect ${srp.issue === 'Pump leakage' ? 'stuffing box packing and polished rod' : srp.issue === 'Stuck pump' ? 'pump and rod string; confirm unit is not stalled' : srp.issue === 'Poor image quality' ? 'camera lens and mounting' : 'rod movement and pump fillage'} on site.`);
  const [attach, setAttach] = useState(true);
  const [sla, setSla] = useState(defaults.slaHours);
  const [email, setEmail] = useState(true);

  const submit = () => {
    const wo = addWorkOrder({
      srpId: srp.id,
      issue: srp.issue!,
      priority,
      technician,
      note,
      attachFrame: attach,
      slaHours: sla,
      emailTo: email ? [techEmail(technician), 'field.supervisor@fieldops.example.com'] : [],
    });
    toast(`Work order ${wo.id} created${email ? ' and email notification prepared' : ''}.`);
    onCreated(wo);
  };

  return (
    <Modal title={<><Icon name="wrench" /> Create work order</>} onClose={onClose} width={640}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!technician}><Icon name="check" size={14} />Submit work order</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>SRP name</span><input value={srp.name} readOnly /></label>
        <label className="field"><span>Issue type</span><input value={srp.issue ?? ''} readOnly /></label>
        <label className="field"><span>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as WorkOrder['priority'])}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        <label className="field"><span>SLA</span>
          <select value={sla} onChange={(e) => setSla(Number(e.target.value))}>{SLA_OPTIONS.map((h) => <option key={h} value={h}>{h} hours</option>)}</select>
        </label>
        <label className="field span2"><span>Assigned technician</span>
          <select value={technician} onChange={(e) => setTechnician(e.target.value)}>{TECHNICIANS.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label className="field span2"><span>Note</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <div className="attach-row">
        <label className="check"><input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />Attach latest annotated image (frame #{frame + 1})</label>
        {attach && (
          <ImageSlot className="attach-thumb" label="Inspection image attachment" hint={`${srp.id}_F${String(frame + 1).padStart(3, '0')}_annotated.jpg`} icon="image" src={annotatedFrameUrl(srp.id, frame)} />
        )}
      </div>
      <label className="check"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />Prepare email notification to technician and field supervisor</label>
    </Modal>
  );
}

export function EmailPreview({ srp, wo, frame, onClose, onQueue }: { srp: SRP; wo: WorkOrder | null; frame: number; onClose: () => void; onQueue?: () => void }) {
  const tech = wo?.technician ?? srp.technician ?? 'Field operations';
  const to = wo?.emailTo.length ? wo.emailTo : [techEmail(tech), 'field.supervisor@fieldops.example.com'];
  const subject = wo
    ? `[${wo.priority.split(' ')[0]}] ${wo.id} · ${srp.name} · ${srp.issue}`
    : `[Camera event] ${srp.name} · ${srp.issue}`;
  return (
    <Modal title={<><Icon name="mail" /> Email notification prepared</>} onClose={onClose} width={620}
      footer={<>
        {onQueue && <button className="btn" onClick={onQueue}>View in work queue</button>}
        <button className="btn btn-primary" onClick={onClose}><Icon name="check" size={14} />Done</button>
      </>}>
      <div className="email">
        <div className="email-demo"><Icon name="alert" size={13} /> Demo: email is prepared for review only and is not sent.</div>
        <div className="email-row"><span>To</span>{to.join(', ')}</div>
        <div className="email-row"><span>Subject</span><b>{subject}</b></div>
        <div className="email-body">
          <p>{tech.split(' ').slice(-1)[0] === tech ? 'Team' : tech},</p>
          <p>
            The visual inspection model raised a <b>{srp.severity.toLowerCase()}</b> event for <b>{srp.name}</b> ({srp.field}, {srp.region}) from camera {srp.cameraId},
            upload batch {srp.batchId}.
          </p>
          <ul>
            <li>Issue: {srp.issue}</li>
            <li>Observation: {srp.observation}</li>
            <li>Contamination: {srp.contamination.toFixed(1)}% · Model confidence: {srp.confidence}% · Movement deviation: {srp.deviation.toFixed(2)}</li>
            {wo && <li>Work order {wo.id} · SLA {wo.slaHours} h (due {fmtDateTime(wo.createdAt + wo.slaHours * 3_600_000)})</li>}
            {wo?.note && <li>Note: {wo.note}</li>}
          </ul>
          <p className="muted">- SRP Visual Inspection Command Center</p>
        </div>
        {(wo?.attachFrame ?? true) && (
          <div className="email-attach">
            <ImageSlot className="attach-thumb" label="Inspection image attachment" icon="image" src={annotatedFrameUrl(srp.id, frame)} />
            <div><b>{srp.id}_F{String(frame + 1).padStart(3, '0')}_annotated.jpg</b><div className="muted small">Annotated frame · rod ROI and contamination overlay</div></div>
          </div>
        )}
      </div>
    </Modal>
  );
}
