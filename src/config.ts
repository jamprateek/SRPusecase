/**
 * Swap-in points for real imagery. Everything renders as a labelled placeholder
 * while these are null. Drop files into /public/images and point these at them.
 */

/** Regional map background, e.g. a licensed Google Maps static image. */
export const MAP_IMAGE_URL: string | null = null;
/** Geographic bounds the map image covers: [south, west, north, east]. Required when MAP_IMAGE_URL is set. */
export const MAP_IMAGE_BOUNDS: [number, number, number, number] | null = null;

/** Live / burst frame for an SRP. Return a URL to show a real camera frame. */
export function cameraFrameUrl(_srpId: string, _frame: number): string | null {
  return null; // e.g. `images/${_srpId}/frame_${String(_frame).padStart(3, '0')}.jpg`
}

/** Annotated overlay frame (rod detection + contamination mask). */
export function annotatedFrameUrl(_srpId: string, _frame: number): string | null {
  return null;
}

export const DEMO_USER = { name: 'Alex Morgan', role: 'Production Reliability Engineer', initials: 'AM' };

export const BURST_SECONDS = 60;
export const FRAMES_PER_SECOND = 3;
export const FRAMES_PER_BURST = BURST_SECONDS * FRAMES_PER_SECOND; // 180
export const UPLOAD_INTERVAL_MIN = 20;
export const MODEL_VERSION = 'RodVision v2.3';
