/**
 * Resource type heuristics.
 * Resolve resource type from file extension or buffer content for use in loaders and Forge.
 * Keys align with ResourceTypes IDs used when resolving archives and streams.
 *
 * @file ResourceHeuristics.ts
 */

import { ResourceTypes } from '@/resource/ResourceTypes';
import { detectTPCFormat } from '@/resource/TPCObject';
import { detectTwoDAFormat } from '@/resource/TwoDAObject';

/** Extension to ResourceTypes key (lowercase, no leading dot). */
const EXT_TO_KEY: Record<string, string> = {
  '2da': '2da',
  are: 'are',
  bif: 'bif',
  bik: 'bik',
  bmp: 'bmp',
  bwm: 'bwm',
  dds: 'dds',
  dlg: 'dlg',
  erf: 'erf',
  fac: 'fac',
  gff: 'gff',
  git: 'git',
  gui: 'gui',
  ifo: 'ifo',
  jrl: 'jrl',
  key: 'key',
  lip: 'lip',
  ltr: 'ltr',
  lyt: 'lyt',
  mdl: 'mdl',
  ncs: 'ncs',
  nss: 'nss',
  pth: 'pth',
  rim: 'rim',
  ssf: 'ssf',
  tga: 'tga',
  tlk: 'tlk',
  tpc: 'tpc',
  txi: 'txi',
  utc: 'utc',
  utd: 'utd',
  ute: 'ute',
  uti: 'uti',
  utm: 'utm',
  utp: 'utp',
  uts: 'uts',
  utt: 'utt',
  utw: 'utw',
  vis: 'vis',
  wav: 'wav',
};

/**
 * Get resource type (ResType number) from file extension.
 * Extension can be with or without leading dot; comparison is case-insensitive.
 * Returns ResourceTypes.NA if unknown.
 */
export function getResourceTypeFromExtension(extension: string): number {
  const ext = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
  const key = EXT_TO_KEY[ext];
  if (key) {
    const v = (ResourceTypes as Record<string, number>)[key];
    return typeof v === 'number' ? v : 0xffff;
  }
  const direct = (ResourceTypes as Record<string, number>)[ext];
  return typeof direct === 'number' ? direct : 0xffff;
}

/**
 * Infer resource type from buffer content when extension is unknown or ambiguous.
 * Uses existing format detectors (2DA, TPC/TGA/DDS, VIS, WAV, TXI).
 * Returns ResType number or null if not recognized.
 */
export function detectResourceTypeFromBuffer(buffer: Uint8Array): number | null {
  if (!buffer || buffer.length < 4) return null;

  const twoDA = detectTwoDAFormat(buffer);
  if (twoDA !== 'invalid') return (ResourceTypes as Record<string, number>)['2da'] ?? null;

  // Check WAV (RIFF / SFX) before TPC so RIFF header is not misdetected as TGA
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return (ResourceTypes as Record<string, number>)['wav'] ?? null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xf3) {
    return (ResourceTypes as Record<string, number>)['wav'] ?? null;
  }
  // BMP magic "BM" before TPC so it is not misdetected as TGA
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return (ResourceTypes as Record<string, number>)['bmp'] ?? null;
  }

  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, Math.min(256, buffer.length)));
  const lower = decoded.toLowerCase();

  // TXI: keyword-based heuristic before TGA so text buffers are not misdetected as TGA.
  const txiKeywords = [
    'blending',
    'proceduretype',
    'compresstexture',
    'mipmap',
    'isbumpmap',
    'downsamplemin',
    'downsamplemax',
    'envmaptexture',
    'bumpmaptexture',
    'wateralpha',
  ];
  if (txiKeywords.some((kw) => lower.includes(kw))) {
    return (ResourceTypes as Record<string, number>)['txi'] ?? null;
  }

  const tpc = detectTPCFormat(buffer);
  if (tpc === 'tpc') return (ResourceTypes as Record<string, number>)['tpc'] ?? null;
  if (tpc === 'dds') return (ResourceTypes as Record<string, number>)['dds'] ?? null;
  if (tpc === 'bmp') return (ResourceTypes as Record<string, number>)['bmp'] ?? null;
  // Only accept TGA when buffer is long enough to be a plausible TGA header (avoid false positive for short unknown buffers)
  if (tpc === 'tga' && buffer.length >= 18) return (ResourceTypes as Record<string, number>)['tga'] ?? null;

  if (lower.includes('room') && (/\d+\s*\n\s*\w+/.test(decoded) || /^\s*[\w.]+\s+\d+/.test(decoded))) {
    return (ResourceTypes as Record<string, number>)['vis'] ?? null;
  }

  if (buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 0 && buffer[3] === 0 && buffer.length >= 12) {
    return (ResourceTypes as Record<string, number>)['mdl'] ?? null;
  }

  return null;
}

/**
 * Resolve resource type: prefer extension if given and recognized, else try buffer detection.
 * extension can be ".2da", "2da", etc.
 */
export function resolveResourceType(buffer: Uint8Array, extension?: string): number {
  if (extension != null && extension !== '') {
    const fromExt = getResourceTypeFromExtension(extension);
    if (fromExt !== 0xffff) return fromExt;
  }
  const fromBuf = detectResourceTypeFromBuffer(buffer);
  return fromBuf ?? 0xffff;
}
