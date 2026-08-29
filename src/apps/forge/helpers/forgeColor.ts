/**
 * Convert 0–1 RGB (GFF VECTOR) to hex / HSV for Forge color fields.
 *
 * @file forgeColor.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface ForgeRgb01 {
  r: number;
  g: number;
  b: number;
}

export interface ForgeHsv {
  h: number;
  s: number;
  v: number;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  if (n < 0) {
    return 0;
  }
  if (n > 1) {
    return 1;
  }
  return n;
}

export function rgb01ToByte(channel: number): number {
  return Math.round(clamp01(channel) * 255);
}

export function byteToRgb01(byte: number): number {
  if (!Number.isFinite(byte)) {
    return 0;
  }
  return clamp01(byte / 255);
}

export function rgb01ToHex(rgb: ForgeRgb01): string {
  const r = rgb01ToByte(rgb.r);
  const g = rgb01ToByte(rgb.g);
  const b = rgb01ToByte(rgb.b);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb01(hex: string): ForgeRgb01 | undefined {
  const match = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!match) {
    return undefined;
  }
  const n = parseInt(match[1], 16);
  return {
    r: byteToRgb01((n >> 16) & 0xff),
    g: byteToRgb01((n >> 8) & 0xff),
    b: byteToRgb01(n & 0xff),
  };
}

/** KotOR ARE/GIT DWORD colors are 0xBBGGRR (BGR packed). */
export function dwordToRgb01(dword: number): ForgeRgb01 {
  const n = (Number(dword) || 0) >>> 0;
  return {
    r: byteToRgb01(n & 0xff),
    g: byteToRgb01((n >> 8) & 0xff),
    b: byteToRgb01((n >> 16) & 0xff),
  };
}

export function rgb01ToDword(rgb: ForgeRgb01): number {
  const r = rgb01ToByte(rgb.r);
  const g = rgb01ToByte(rgb.g);
  const b = rgb01ToByte(rgb.b);
  return ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

export function rgb01ToHsv(rgb: ForgeRgb01): ForgeHsv {
  const r = clamp01(rgb.r);
  const g = clamp01(rgb.g);
  const b = clamp01(rgb.b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb01(hsv: ForgeHsv): ForgeRgb01 {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = clamp01(hsv.s);
  const v = clamp01(hsv.v);
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c; g = x;
  } else if (h < 120) {
    r = x; g = c;
  } else if (h < 180) {
    g = c; b = x;
  } else if (h < 240) {
    g = x; b = c;
  } else if (h < 300) {
    r = x; b = c;
  } else {
    r = c; b = x;
  }
  return { r: r + m, g: g + m, b: b + m };
}
