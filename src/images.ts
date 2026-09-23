/**
 * Image slots used across the demo. Every slot renders a clean labelled
 * placeholder until a path is set here. To add a real image, drop the file in
 * `public/images/` and set its path, e.g. pumpjack: 'images/pumpjack.jpg'.
 */
export const IMAGES = {
  pumpjack: { src: '', label: 'Pumpjack field photo' },
  wellhead: { src: '', label: 'Wellhead / surface equipment photo' },
  gauge: { src: '', label: 'Analog pressure gauge' },
  cabinet: { src: '', label: 'Control cabinet / IoT equipment' },
  fieldMap: { src: '', label: 'Field overview map' },
  architecture: { src: '', label: 'Architecture / modernization visual' },
} as const;

export type ImageKey = keyof typeof IMAGES;
