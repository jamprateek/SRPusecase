/**
 * Real media discovered at build time from the /media folder.
 * Drop files into the folders described in media/README.md - no code changes needed.
 *
 *   media/srps/<SRP name>/frames/*.jpg      raw camera frames (any count, sorted by file name)
 *   media/srps/<SRP name>/annotated/*.jpg   annotated overlay frames from the model
 *   media/srps/<SRP name>/video/*.mp4       optional burst / stream recording
 *   media/maps/<country>/<region>/map.png   map image + bounds.json with its corner coordinates
 */

const IMG = /\.(jpe?g|png|webp|gif)$/i;
const VID = /\.(mp4|webm|mov|m4v)$/i;

const files = import.meta.glob('../media/**/*.{jpg,jpeg,png,webp,gif,mp4,webm,mov,m4v,JPG,JPEG,PNG,WEBP,MP4,MOV}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const boundsFiles = import.meta.glob('../media/maps/**/bounds.json', { eager: true, import: 'default' }) as Record<
  string,
  { south: number; west: number; north: number; east: number }
>;

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

interface SrpMedia {
  frames: string[];
  annotated: string[];
  video: string | null;
}

const srpMedia = new Map<string, SrpMedia>();
const mapImages = new Map<string, string>(); // "united-states/delaware-basin" -> url

for (const path of Object.keys(files).sort(byName)) {
  const parts = path.replace('../media/', '').split('/');
  if (parts[0] === 'srps' && parts.length >= 4) {
    const [, srpId, kind] = parts;
    const m = srpMedia.get(srpId) ?? { frames: [], annotated: [], video: null };
    if (kind === 'frames' && IMG.test(path)) m.frames.push(files[path]);
    else if (kind === 'annotated' && IMG.test(path)) m.annotated.push(files[path]);
    else if (kind === 'video' && VID.test(path) && !m.video) m.video = files[path];
    srpMedia.set(srpId, m);
  } else if (parts[0] === 'maps' && IMG.test(path)) {
    mapImages.set(parts.slice(1, -1).join('/'), files[path]);
  }
}

/** Spread however many real frames exist across the burst's frame positions. */
function pick(list: string[] | undefined, frame: number, total: number): string | null {
  if (!list || list.length === 0) return null;
  const i = Math.round((frame / Math.max(1, total - 1)) * (list.length - 1));
  return list[Math.min(list.length - 1, Math.max(0, i))];
}

export const mediaFrame = (srpId: string, frame: number, total: number) => pick(srpMedia.get(srpId)?.frames, frame, total);
export const mediaAnnotated = (srpId: string, frame: number, total: number) => pick(srpMedia.get(srpId)?.annotated, frame, total);
export const mediaVideo = (srpId: string) => srpMedia.get(srpId)?.video ?? null;

export const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface MapImage {
  url: string;
  bounds: [number, number, number, number]; // south, west, north, east
  key: string;
}

/** Most specific map image for the scope: field, then region, then the country-wide "all-regions" map. */
export function mediaMap(country: string, region: string, field: string): MapImage | null {
  const c = slug(country);
  const candidates = [
    region !== 'All' && field !== 'All' ? `${c}/${slug(region)}/${slug(field)}` : null,
    region !== 'All' ? `${c}/${slug(region)}` : null,
    `${c}/all-regions`,
  ].filter(Boolean) as string[];
  for (const key of candidates) {
    const url = mapImages.get(key);
    const b = boundsFiles[`../media/maps/${key}/bounds.json`];
    if (url && b && [b.south, b.west, b.north, b.east].every((v) => typeof v === 'number')) {
      return { url, key, bounds: [b.south, b.west, b.north, b.east] };
    }
  }
  return null;
}
