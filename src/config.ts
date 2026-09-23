import { mediaAnnotated, mediaFrame, mediaFrames, mediaMap, mediaVideo, type MapImage } from './media';

/**
 * Swap-in points for real imagery. By default these read whatever has been
 * uploaded to the /media folder (see media/README.md); anything missing renders
 * as a labelled placeholder. Override here to point at another source (CDN, API).
 */

export const DEMO_USER = { name: 'Alex Morgan', role: 'Production Reliability Engineer', initials: 'AM' };

export const BURST_SECONDS = 60;
export const FRAMES_PER_SECOND = 3;
export const FRAMES_PER_BURST = BURST_SECONDS * FRAMES_PER_SECOND; // 180
export const UPLOAD_INTERVAL_MIN = 20;
export const MODEL_VERSION = 'RodVision v2.3';

/** Regional map background (e.g. a licensed Google Maps image) for the selected scope. */
export function mapImageFor(country: string, region: string, field: string): MapImage | null {
  return mediaMap(country, region, field);
}

/** Raw camera frame for an SRP at a burst frame index (0-179). */
export function cameraFrameUrl(srpId: string, frame: number): string | null {
  return mediaFrame(srpId, frame, FRAMES_PER_BURST);
}

/** All uploaded raw frames for an SRP, in burst order. */
export function cameraFrames(srpId: string): string[] {
  return mediaFrames(srpId);
}

/** Annotated overlay frame (rod detection + contamination mask). */
export function annotatedFrameUrl(srpId: string, frame: number): string | null {
  return mediaAnnotated(srpId, frame, FRAMES_PER_BURST);
}

/** True when real camera photos or video have been uploaded for the SRP. */
export function hasRealFootage(srpId: string): boolean {
  return mediaFrames(srpId).length > 0 || !!mediaVideo(srpId);
}

/** Recorded burst or stream clip for an SRP (MP4/WebM). */
export function cameraVideoUrl(srpId: string): string | null {
  return mediaVideo(srpId);
}
