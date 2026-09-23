import { useEffect, useMemo, useState } from 'react';
import { BURST_SECONDS, FRAMES_PER_BURST, FRAMES_PER_SECOND, MODEL_VERSION, UPLOAD_INTERVAL_MIN, cameraFrameUrl, cameraFrames, hasRealFootage } from '../config';
import {
  TECHNICIANS, contaminationBand, contaminationTrend, explanation, movementSeries, priorityCompare, rodProfile,
} from '../data';
import { BurstPlayer } from '../components/BurstPlayer';
import { ContaminationGauge, DeviationChart, MovementChart, RodIntensity, TrendChart } from '../components/Charts';
import { EmailPreview, SLA_OPTIONS, WorkOrderModal } from '../components/WorkOrderModal';
import { useStore } from '../store';
import type { WorkOrder } from '../types';
import { Icon, ImageSlot, SeverityBadge, SlaChip, WorkStatusChip, fmtAgo, fmtDateTime, fmtTime, isPortrait, useImageRatio } from '../ui';

export function Detail() {
  const { srps, srpId, navigate, rules, now, notes, addNote, updateSrp, logEvent, toast, workOrders } = useStore();

  const ranked = useMemo(
    () => srps.filter((s) => s.issue).sort(priorityCompare(now)),
    [srps, now],
  );
  const srp = srps.find((s) => s.id === srpId) ?? ranked[0];

  const series = useMemo(() => movementSeries(srp), [srp.id]);
  const profile = useMemo(() => rodProfile(srp), [srp.id]);
  const trend = useMemo(() => contaminationTrend(srp), [srp.id]);
  const [frame, setFrame] = useState(FRAMES_PER_BURST - 1);

  const [technician, setTechnician] = useState(srp.technician ?? TECHNICIANS[0]);
  const [sla, setSla] = useState(srp.slaHours || 4);
  const [noteText, setNoteText] = useState('');
  const [attached, setAttached] = useState(false);
  const [woOpen, setWoOpen] = useState(false);
  const [email, setEmail] = useState<{ wo: WorkOrder | null } | null>(null);

  useEffect(() => {
    setFrame(FRAMES_PER_BURST - 1);
    setTechnician(srp.technician ?? TECHNICIANS[0]);
    setSla(srp.slaHours || 4);
    setAttached(false);
    setNoteText('');
  }, [srp.id]);

  const band = contaminationBand(srp.contamination, rules);
  const detectedFrames = series.detected.filter((d) => d !== null).length;
  const detVals = series.detected.filter((d): d is number => d !== null).sort((a, b) => a - b);
  const stroke = detVals.length ? detVals[Math.floor(detVals.length * 0.97)] - detVals[Math.floor(detVals.length * 0.03)] : 0;
  const expVals = [...series.expected].sort((a, b) => a - b);
  const expStroke = expVals[expVals.length - 1] - expVals[0];
  const completeness = Math.min(100, Math.round((stroke / expStroke) * 100));
  const devBand = srp.deviation > rules.deviationCritical ? 'critical' : srp.deviation > rules.deviationWarning ? 'warning' : 'normal';
  const myNotes = notes.filter((n) => n.srpId === srp.id);
  const wo = workOrders.find((w) => w.srpId === srp.id);
  const keyframes = [0, 35, 71, 107, 143, 179];
  const photos = srp.severity === 'Offline' ? [] : cameraFrames(srp.id);
  const photoRatio = useImageRatio(photos[0]);
  // tall strut-camera photos make the image card taller; charts grow to keep the two cards balanced
  const tallFrames = photos.length > 0 && isPortrait(photoRatio);
  const photoIdx = photos.length ? Math.round((frame / (FRAMES_PER_BURST - 1)) * (photos.length - 1)) : 0;

  return (
    <div className="page">
      {/* A. Header */}
      <section className={`card detail-head head-${srp.severity === 'Critical' ? 'critical' : srp.severity === 'Warning' ? 'warning' : srp.severity === 'Data quality' ? 'dq' : 'normal'}`}>
        <div className="dh-left">
          <button className="btn btn-ghost back" onClick={() => navigate('dashboard')}><Icon name="back" size={14} />Dashboard</button>
          <div className="dh-title">
            <h1 className="id">{srp.name}</h1>
            <SeverityBadge severity={srp.severity} />
            {srp.issue && <span className="issue-pill">{srp.issue}</span>}
            <WorkStatusChip status={srp.workStatus} />
          </div>
          <div className="dh-sub">
            <span><Icon name="pin" size={13} />{srp.country} · {srp.region} · {srp.field} field</span>
            <span><Icon name="camera" size={13} />{srp.cameraId}</span>
            <span><Icon name="upload" size={13} />Last upload {fmtTime(srp.lastUpload)} ({fmtAgo(srp.lastUpload, now)}) · {srp.batchId}</span>
          </div>
        </div>
        <div className="dh-stats">
          <div className="stat"><span>SLA countdown</span><b><SlaChip srp={srp} now={now} /></b></div>
          <div className="stat"><span>Contamination</span><b className={`t-${band.cls}`}>{srp.contamination.toFixed(1)}%</b></div>
          <div className="stat"><span>Model confidence</span><b className={srp.confidence < rules.imageQualityThreshold ? 't-dq' : ''}>{srp.severity === 'Offline' ? '-' : srp.confidence + '%'}</b></div>
          <div className="stat"><span>Movement deviation</span><b className={`t-${devBand}`}>{srp.deviation.toFixed(2)}</b></div>
          <label className="stat switcher"><span>Switch SRP</span>
            <select value={srp.id} onChange={(e) => navigate('detail', e.target.value)}>
              {srps.some((s) => hasRealFootage(s.id)) && (
                <optgroup label="Real camera footage">
                  {srps.filter((s) => hasRealFootage(s.id)).map((s) => <option key={'rf-' + s.id} value={s.id}>{s.name} · {s.issue ?? s.severity}</option>)}
                </optgroup>
              )}
              <optgroup label="Open camera events">
                {ranked.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.issue}</option>)}
              </optgroup>
              <optgroup label="Other units">
                {srps.filter((s) => !s.issue).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.severity}</option>)}
              </optgroup>
            </select>
          </label>
        </div>
      </section>

      <div className="detail-grid-top">
        {/* B. Image stream */}
        <section className="card">
          <div className="card-head">
            <h2><Icon name="camera" /> Recent image burst</h2>
            <span className="muted small">{MODEL_VERSION}</span>
          </div>
          <BurstPlayer srp={srp} series={series} profile={profile} frame={frame} setFrame={setFrame} />
          <div className="burst-meta">
            <span><b>{FRAMES_PER_SECOND}</b> images/sec burst</span>
            <span>Uploaded every <b>{UPLOAD_INTERVAL_MIN}</b> min</span>
            <span><b>{srp.framesAnalyzed}</b> frames analyzed in latest burst ({BURST_SECONDS}s)</span>
          </div>
          {tallFrames ? (
            <div className="filmstrip" aria-label="Burst photos">
              {photos.map((url, i) => (
                <button key={url} className={`film ${i === photoIdx ? 'on' : ''}`} style={{ aspectRatio: `1 / ${photoRatio}` }}
                  title={`Photo ${i + 1} of ${photos.length}`}
                  onClick={() => setFrame(Math.round((i / Math.max(1, photos.length - 1)) * (FRAMES_PER_BURST - 1)))}>
                  <img src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
          <div className="keyframes">
            {keyframes.map((k) => (
              <button key={k} className={`kf ${Math.abs(frame - k) < 18 ? 'on' : ''}`} onClick={() => setFrame(k)}>
                <ImageSlot label="Captured SRP frame" hint={`#${k + 1}`} src={cameraFrameUrl(srp.id, k)} icon="image" />
              </button>
            ))}
          </div>
          )}
        </section>

        {/* C. Movement */}
        <section className="card">
          <div className="card-head">
            <h2><Icon name="activity" /> Rod movement · expected vs detected</h2>
            <div className="legend">
              <span><i className="sw sw-exp" />Expected cycle</span>
              <span><i className="sw sw-det dot" />Detected rod position</span>
            </div>
          </div>
          {srp.severity === 'Offline' ? (
            <div className="empty tall">No burst received in the last {Math.round((now - srp.lastUpload) / 60000)} min - movement cannot be evaluated.</div>
          ) : (
            <>
              <MovementChart s={series} frame={frame} height={tallFrames ? 410 : 310} />
              <div className="subchart-head">
                <span>Deviation · expected − detected (pts of stroke)</span>
                <div className="legend small">
                  <span><i className="sw sw-okbar" />within envelope</span>
                  <span><i className="sw sw-warnbar" />&gt; warning</span>
                  <span><i className="sw sw-critbar" />&gt; critical</span>
                </div>
              </div>
              <DeviationChart s={series} rules={rules} height={tallFrames ? 220 : 170} />
              <div className="grow" />
              <div className="mini-stats">
                <div><span>Expected rate</span><b>{srp.spm.toFixed(1)} SPM</b></div>
                <div><span>Detected rate</span><b>{srp.issue === 'Stuck pump' ? '0.0 SPM' : srp.issue === 'Pump-off' ? `${srp.spm.toFixed(1)} SPM · irregular` : `${srp.spm.toFixed(1)} SPM`}</b></div>
                <div><span>Stroke completeness</span><b className={completeness < 60 ? 't-critical' : completeness < 85 ? 't-warning' : ''}>{completeness}%</b></div>
                <div><span>Rod detected</span><b className={detectedFrames < rules.minFramesPerBurst ? 't-dq' : ''}>{detectedFrames}/{FRAMES_PER_BURST} frames</b></div>
                <div><span>Deviation index</span><b className={`t-${devBand}`}>{srp.deviation.toFixed(2)}</b></div>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="detail-grid-bottom">
        {/* D. Contamination */}
        <section className="card">
          <div className="card-head">
            <h2><Icon name="drop" /> Rod contamination · blackness analysis</h2>
            <span className="muted small">Grey/black intensity over relevant rod region</span>
          </div>
          <div className="contam">
            <div className="contam-score">
              <div className="cs-label">Contamination</div>
              <div className="cs-row">
                <div className={`cs-value t-${band.cls}`}>{srp.contamination.toFixed(1)}<small>%</small></div>
                <span className={`band band-${band.cls}`}>{band.label}</span>
              </div>
              <ContaminationGauge value={srp.contamination} rules={rules} />
              <div className="metrics">
                <div><span>Mean rod brightness</span><b>{srp.meanBrightness}<small> /255</small></b></div>
                <div><span>Brightness spread</span><b>σ {srp.brightnessSpread.toFixed(1)}</b></div>
                <div><span>Blackness ratio</span><b>{srp.blacknessRatio.toFixed(1)}%</b></div>
                <div><span>Relevant / irrelevant ROI</span><b>{srp.relevantRatio.toFixed(0)}% / {(100 - srp.relevantRatio).toFixed(0)}%</b></div>
              </div>
            </div>
            <div className="contam-viz">
              <div className="viz-label">Rod grey-level strip &amp; blackness by segment <span className="muted">(top: carrier bar → bottom: stuffing box)</span></div>
              <RodIntensity p={profile} rules={rules} />
            </div>
          </div>
          <div className="subchart-head">
            <span>Contamination · last 24 h ({trend.length} uploads)</span>
            <span className="muted small">{srp.trendFrom.toFixed(1)}% → {srp.contamination.toFixed(1)}%</span>
          </div>
          <TrendChart data={trend} rules={rules} height={140} label={srp.name} />
        </section>

        <div className="stack">
          {/* E. Explanation */}
          <section className="card explain">
            <div className="card-head"><h2><Icon name="eye" /> Why this event was raised</h2></div>
            <p className="explain-text">{explanation(srp)}</p>
            <div className="evidence">
              <span><Icon name="image" size={13} />Evidence: {srp.framesAnalyzed} frames · batch {srp.batchId}</span>
              {srp.eventTime && <span><Icon name="clock" size={13} />Event raised {fmtDateTime(srp.eventTime)}</span>}
            </div>
          </section>

          {/* F. Actions */}
          <section className="card actions">
            <div className="card-head">
              <h2><Icon name="wrench" /> Actions</h2>
              {wo && <span className="wo-tag"><Icon name="check" size={12} />{wo.id} · {wo.technician}</span>}
            </div>
            <div className="form-grid">
              <label className="field"><span>Assign to field technician</span>
                <select value={technician} onChange={(e) => { setTechnician(e.target.value); updateSrp(srp.id, { technician: e.target.value }); }}>
                  {TECHNICIANS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="field"><span>Select SLA</span>
                <select value={sla} onChange={(e) => setSla(Number(e.target.value))}>{SLA_OPTIONS.map((h) => <option key={h} value={h}>{h} hours</option>)}</select>
              </label>
              <label className="field span2"><span>Note</span>
                <textarea rows={2} placeholder="Add an inspection note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              </label>
            </div>
            {attached && (
              <div className="attached">
                <ImageSlot className="attach-thumb" label="Inspection image attachment" icon="image" />
                <div><b>Annotated frame #{frame + 1}</b><div className="muted small">{srp.id}_F{String(frame + 1).padStart(3, '0')}_annotated.jpg</div></div>
                <button className="icon-btn" onClick={() => setAttached(false)} aria-label="Remove"><Icon name="x" size={14} /></button>
              </div>
            )}
            <div className="action-btns">
              <button className="btn btn-primary" disabled={!srp.issue} onClick={() => setWoOpen(true)}><Icon name="wrench" size={14} />Create work order</button>
              <button className="btn" disabled={!srp.issue} onClick={() => {
                const id = `INC-${70000 + (srp.name.length * 131 + frame) % 9999}`;
                if (srp.workStatus === 'New') updateSrp(srp.id, { workStatus: 'Reviewed' });
                logEvent(srp.id, `Ticket ${id} raised`);
                toast(`Ticket ${id} raised for ${srp.name}.`);
              }}><Icon name="ticket" size={14} />Raise ticket</button>
              <button className="btn" disabled={!noteText.trim()} onClick={() => {
                addNote(srp.id, noteText.trim());
                logEvent(srp.id, 'Note added');
                setNoteText('');
                toast('Note added to event.');
              }}><Icon name="note" size={14} />Add note</button>
              <button className="btn" onClick={() => { setAttached(true); toast(`Annotated frame #${frame + 1} attached.`); }}><Icon name="clip" size={14} />Attach image/frame</button>
              <button className="btn" disabled={!srp.issue} onClick={() => setEmail({ wo: wo ?? null })}><Icon name="send" size={14} />Send email notification</button>
            </div>
            {myNotes.length > 0 && (
              <div className="notes">
                {myNotes.map((n, i) => <div key={i} className="note"><b>{n.author}</b> <span className="muted small">{fmtTime(n.time)}</span><div>{n.text}</div></div>)}
              </div>
            )}
          </section>
        </div>
      </div>

      {woOpen && srp.issue && (
        <WorkOrderModal srp={srp} frame={frame} defaults={{ technician, slaHours: sla, note: noteText, attach: attached }}
          onClose={() => setWoOpen(false)}
          onCreated={(w) => { setWoOpen(false); setTechnician(w.technician); setEmail({ wo: w }); }} />
      )}
      {email && (
        <EmailPreview srp={srp} wo={email.wo} frame={frame}
          onClose={() => { if (!email.wo) toast('Email notification prepared (demo - not sent).', 'info'); setEmail(null); }}
          onQueue={email.wo ? () => { setEmail(null); navigate('queue'); } : undefined} />
      )}
    </div>
  );
}
