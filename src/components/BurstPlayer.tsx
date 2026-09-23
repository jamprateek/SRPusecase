import { useEffect, useState } from 'react';
import { annotatedFrameUrl, cameraFrameUrl, FRAMES_PER_BURST, FRAMES_PER_SECOND } from '../config';
import type { MovementSeries, RodProfile } from '../data';
import { ROD_SEGMENTS } from '../data';
import type { SRP } from '../types';
import { Icon, fmtTime } from '../ui';

const W = 640;
const H = 400;

/**
 * Burst playback. Until real frames are wired in (see src/config.ts) this draws a
 * schematic of the camera's view of the polished rod, driven by the detected
 * rod position so that playback reflects the analytics.
 */
export function BurstPlayer({ srp, series, profile, frame, setFrame }: {
  srp: SRP; series: MovementSeries; profile: RodProfile; frame: number; setFrame: (f: number | ((f: number) => number)) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [annotated, setAnnotated] = useState(false);
  const [speed, setSpeed] = useState(2);
  const offline = srp.severity === 'Offline';

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame((f) => {
      if (f >= FRAMES_PER_BURST - 1) { setPlaying(false); return f; }
      return f + 1;
    }), 1000 / (FRAMES_PER_SECOND * speed));
    return () => clearInterval(t);
  }, [playing, speed, setFrame]);

  useEffect(() => { setPlaying(false); }, [srp.id]);

  const det = series.detected[frame];
  const pos = det ?? series.expected[frame];
  const frameTime = srp.lastUpload - (FRAMES_PER_BURST - frame) * (1000 / FRAMES_PER_SECOND);
  const realSrc = annotated ? annotatedFrameUrl(srp.id, frame) ?? cameraFrameUrl(srp.id, frame) : cameraFrameUrl(srp.id, frame);
  const label = annotated ? 'Rod detection and contamination overlay' : 'Live SRP camera stream placeholder';

  // scene geometry
  const rodX = 300;
  const rodW = 26;
  const sbTop = 300; // stuffing box top
  const carrierY = 70 + (1 - pos / 100) * 150; // higher position -> carrier bar higher in frame
  const rodTop = carrierY + 18;
  const rodLen = sbTop - rodTop;
  const night = srp.issue === 'Poor image quality' && /night|contrast/i.test(srp.observation);
  const glare = srp.issue === 'Poor image quality' && /glare/i.test(srp.observation);
  const obstructed = srp.issue === 'Poor image quality' && /obstruct/i.test(srp.observation);

  // rod surface: map profile segments along the visible rod
  const segs = profile.segments;
  const segH = rodLen / ROD_SEGMENTS;

  return (
    <div className="player">
      <div className={`player-screen ${night ? 'night' : ''}`}>
        {realSrc ? (
          <img src={realSrc} alt={label} className="player-img" />
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="player-svg">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2b3a48" />
                <stop offset="1" stopColor="#1a232c" />
              </linearGradient>
              <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#7d8791" />
                <stop offset="0.45" stopColor="#c9d1d8" />
                <stop offset="1" stopColor="#6c757e" />
              </linearGradient>
              <radialGradient id="glare" cx="0.62" cy="0.3" r="0.45">
                <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <filter id="blur"><feGaussianBlur stdDeviation={glare || obstructed ? 1.6 : 0} /></filter>
            </defs>
            <g filter="url(#blur)">
              <rect width={W} height={H} fill="url(#sky)" />
              {/* strut / frame members in the camera's view */}
              <path d={`M40,0 L150,${H}`} className="scene-strut" />
              <path d={`M600,0 L520,${H}`} className="scene-strut" />
              <rect x={0} y={345} width={W} height={55} className="scene-ground" />
              {/* wellhead + stuffing box */}
              <rect x={rodX - 46} y={sbTop} width={92} height={26} rx={4} className="scene-sb" />
              <rect x={rodX - 62} y={sbTop + 26} width={124} height={20} rx={3} className="scene-wellhead" />
              <rect x={rodX - 30} y={sbTop + 46} width={60} height={60} className="scene-wellhead" />
              {/* polished rod with contamination bands */}
              {segs.map((s, i) => (
                <rect key={i} x={rodX - rodW / 2} y={rodTop + i * segH} width={rodW} height={segH + 0.6}
                  fill={`rgb(${s.intensity},${s.intensity},${Math.max(0, s.intensity - 6)})`} />
              ))}
              <rect x={rodX - rodW / 2} y={rodTop} width={rodW} height={rodLen} fill="url(#steel)" opacity={0.35} />
              {profile.streaks.map((i, k) => (
                <path key={k} d={`M${rodX - 6 + k * 5},${rodTop + (i - 4) * segH} q2,${segH * 3} 0,${segH * 7}`} className="scene-streak" />
              ))}
              {srp.issue === 'Pump leakage' && <ellipse cx={rodX} cy={sbTop + 2} rx={40} ry={6} className="scene-oil" />}
              {/* carrier bar + clamp */}
              <rect x={rodX - 90} y={carrierY} width={180} height={14} rx={2} className="scene-carrier" />
              <rect x={rodX - 16} y={carrierY - 18} width={32} height={18} rx={2} className="scene-clamp" />
              <line x1={rodX - 80} y1={carrierY} x2={rodX - 70} y2={0} className="scene-bridle" />
              <line x1={rodX + 80} y1={carrierY} x2={rodX + 70} y2={0} className="scene-bridle" />
            </g>
            {glare && <rect width={W} height={H} fill="url(#glare)" />}
            {obstructed && <path d={`M0,${H} L0,250 Q120,210 230,270 Q330,320 420,300 Q520,280 ${W},330 L${W},${H} Z`} className="scene-obstruction" />}
            {night && <rect width={W} height={H} className="scene-night" />}

            {annotated && !offline && (
              <g className="anno">
                <rect x={rodX - rodW / 2 - 8} y={rodTop + profile.relevantStart * segH} width={rodW + 16} height={(profile.relevantEnd - profile.relevantStart + 1) * segH} className="anno-roi" />
                <text x={rodX + rodW / 2 + 14} y={rodTop + profile.relevantStart * segH + 12} className="anno-text">Rod ROI · conf {(srp.confidence / 100).toFixed(2)}</text>
                {segs.map((s, i) =>
                  s.relevant && s.blackness > 20 ? (
                    <rect key={i} x={rodX - rodW / 2} y={rodTop + i * segH} width={rodW} height={segH + 0.6} className={s.blackness > 35 ? 'anno-crit' : 'anno-warn'} />
                  ) : null,
                )}
                <rect x={rodX - 96} y={carrierY - 22} width={192} height={40} className="anno-box" />
                <text x={rodX - 94} y={carrierY - 26} className="anno-text">Carrier bar · tracked</text>
                <rect x={rodX - 50} y={sbTop - 4} width={100} height={34} className="anno-box" />
                <text x={rodX - 48} y={sbTop + 44} className="anno-text">Stuffing box</text>
                <line x1={40} x2={W - 40} y1={carrierY + 7} y2={carrierY + 7} className="anno-pos" />
                <text x={W - 42} y={carrierY + 2} className="anno-text" textAnchor="end">
                  {det === null ? 'rod edge not resolved' : `pos ${det.toFixed(0)}% stroke`}
                </text>
                {profile.streaks.length > 0 && (
                  <text x={rodX - rodW / 2 - 14} y={rodTop + profile.streaks[0] * segH} className="anno-text anno-streak" textAnchor="end">oil streak</text>
                )}
              </g>
            )}
          </svg>
        )}

        {offline && <div className="player-nosignal"><Icon name="camera" size={28} />No burst received · camera offline</div>}
        <div className="player-label">{label}</div>
        <div className="player-osd">
          <span>{srp.cameraId}</span>
          <span>{fmtTime(frameTime)}:{String(Math.floor((frameTime / 1000) % 60)).padStart(2, '0')}</span>
          <span>F{String(frame + 1).padStart(3, '0')}/{FRAMES_PER_BURST}</span>
        </div>
        {playing && <div className="player-rec"><span className="rec-dot" />PLAYBACK {speed}×</div>}
      </div>

      <div className="player-controls">
        <button className="btn btn-primary" disabled={offline} onClick={() => { if (frame >= FRAMES_PER_BURST - 1) setFrame(0); setPlaying(true); }}><Icon name="play" size={14} />Play burst</button>
        <button className="btn" onClick={() => setPlaying(false)}><Icon name="pause" size={14} />Pause</button>
        <button className="btn icon-only" title="Previous frame" onClick={() => { setPlaying(false); setFrame((f) => Math.max(0, f - 1)); }}><Icon name="prev" size={14} /></button>
        <button className="btn icon-only" title="Next frame" onClick={() => { setPlaying(false); setFrame((f) => Math.min(FRAMES_PER_BURST - 1, f + 1)); }}><Icon name="next" size={14} /></button>
        <button className={`btn ${annotated ? 'btn-on' : ''}`} onClick={() => setAnnotated((a) => !a)}><Icon name="layers" size={14} />View annotated frame</button>
        <select className="speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed">
          {[1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
      </div>
      <input className="scrubber" type="range" min={0} max={FRAMES_PER_BURST - 1} value={frame} onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} aria-label="Frame" />
    </div>
  );
}
