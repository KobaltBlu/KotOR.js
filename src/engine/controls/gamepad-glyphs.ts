/**
 * Controller button symbols.
 *
 * Works out which button family a pad belongs to from its `Gamepad.id` and
 * draws matching symbols: lettered face buttons and LB/RB/LT/RT for
 * Xbox-style pads, shape face buttons and L1/R1/L2/R2 for PlayStation-style
 * pads. Pads that match neither use the Xbox-style set. Button names follow
 * the browser's standard layout, where the bottom face button is index 0.
 *
 * @file gamepad-glyphs.ts
 */

export type PadFamily = 'xbox' | 'playstation';

/** Glyph override setting: 0 = follow the connected pad, 1 = Xbox, 2 = PlayStation. */
export type PadGlyphOverride = 0 | 1 | 2;

export type PadButton =
  | 'a' | 'b' | 'x' | 'y'
  | 'lb' | 'rb' | 'lt' | 'rt'
  | 'back' | 'start'
  | 'ls' | 'rs'
  | 'dpad' | 'dpad_up' | 'dpad_down' | 'dpad_left' | 'dpad_right' | 'dpad_vertical' | 'dpad_horizontal';

const PLAYSTATION_ID = /054c|playstation|dualshock|dualsense|\bps[345]\b|sony/i;
const XBOX_ID = /045e|xbox|xinput|microsoft/i;

/** Pad family from a `Gamepad.id` string (vendor id or product name). */
export function detectPadFamily(id: string | undefined | null): PadFamily {
  const text = String(id || '');
  if(PLAYSTATION_ID.test(text)) return 'playstation';
  if(XBOX_ID.test(text)) return 'xbox';
  return 'xbox';
}

/** Apply the glyph setting on top of the detected family. */
export function resolvePadFamily(id: string | undefined | null, override: number = 0): PadFamily {
  if(override === 1) return 'xbox';
  if(override === 2) return 'playstation';
  return detectPadFamily(id);
}

const NAMES: Record<PadFamily, Record<PadButton, string>> = {
  xbox: {
    a: 'A', b: 'B', x: 'X', y: 'Y',
    lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT',
    back: 'View', start: 'Menu',
    ls: 'LS', rs: 'RS',
    dpad: 'D-pad', dpad_up: 'D-pad Up', dpad_down: 'D-pad Down', dpad_left: 'D-pad Left', dpad_right: 'D-pad Right',
    dpad_vertical: 'D-pad Up/Down', dpad_horizontal: 'D-pad Left/Right',
  },
  playstation: {
    a: 'Cross', b: 'Circle', x: 'Square', y: 'Triangle',
    lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2',
    back: 'Create', start: 'Options',
    ls: 'L3', rs: 'R3',
    dpad: 'D-pad', dpad_up: 'D-pad Up', dpad_down: 'D-pad Down', dpad_left: 'D-pad Left', dpad_right: 'D-pad Right',
    dpad_vertical: 'D-pad Up/Down', dpad_horizontal: 'D-pad Left/Right',
  },
};

/** Readable button name, used for accessible labels and text fallbacks. */
export function glyphName(button: PadButton, family: PadFamily): string {
  return NAMES[family]?.[button] ?? NAMES.xbox[button] ?? String(button);
}

const XBOX_FACE_COLORS: Partial<Record<PadButton, string>> = {
  a: '#5fb846', b: '#e2463d', x: '#3b82e0', y: '#f0b52a',
};

const PS_FACE_COLORS: Partial<Record<PadButton, string>> = {
  a: '#7fb0ea', b: '#ef6a6a', x: '#dc8fd0', y: '#4fcfac',
};

const DARK = '#1e1f22';
const LIGHT = '#f2f2f2';

function svg(size: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>`;
}

function textAt(text: string, fontSize: number, fill: string): string {
  return `<text x="12" y="12" dy="0.36em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="${fill}">${text}</text>`;
}

function psShape(button: PadButton, color: string): string {
  switch(button){
    case 'a': return `<path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'b': return `<circle cx="12" cy="12" r="5" fill="none" stroke="${color}" stroke-width="2.2"/>`;
    case 'x': return `<rect x="7.3" y="7.3" width="9.4" height="9.4" fill="none" stroke="${color}" stroke-width="2.2"/>`;
    case 'y': return `<path d="M12 6.6l5.6 9.6H6.4z" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>`;
  }
  return '';
}

function dpad(highlight: PadButton): string {
  const on = '#f2f2f2';
  const off = '#6b6e75';
  const arm = (d: string, lit: boolean) => `<path d="${d}" fill="${lit ? on : off}"/>`;
  const up = highlight === 'dpad_up' || highlight === 'dpad_vertical';
  const down = highlight === 'dpad_down' || highlight === 'dpad_vertical';
  const left = highlight === 'dpad_left' || highlight === 'dpad_horizontal';
  const right = highlight === 'dpad_right' || highlight === 'dpad_horizontal';
  const all = highlight === 'dpad';
  return [
    `<circle cx="12" cy="12" r="11" fill="${DARK}"/>`,
    arm('M9.6 3.5h4.8v5.4L12 11.3 9.6 8.9z', all || up),
    arm('M9.6 20.5h4.8v-5.4L12 12.7l-2.4 2.4z', all || down),
    arm('M3.5 9.6v4.8h5.4L11.3 12 8.9 9.6z', all || left),
    arm('M20.5 9.6v4.8h-5.4L12.7 12l2.4-2.4z', all || right),
  ].join('');
}

/** Inline SVG markup for a button in the given family's style. */
export function glyphSvg(button: PadButton, family: PadFamily, size: number = 24): string {
  const title = glyphName(button, family);
  switch(button){
    case 'a': case 'b': case 'x': case 'y': {
      if(family === 'playstation'){
        return svg(size, `<circle cx="12" cy="12" r="11" fill="${DARK}"/>` + psShape(button, PS_FACE_COLORS[button]!), title);
      }
      return svg(size, `<circle cx="12" cy="12" r="11" fill="${DARK}"/>` + textAt(title, 13, XBOX_FACE_COLORS[button]!), title);
    }
    case 'lb': case 'rb': case 'lt': case 'rt': {
      const trigger = button === 'lt' || button === 'rt';
      const shape = trigger
        ? `<path d="M4 6.5Q4 3 7.5 3h9Q20 3 20 6.5V21H4z" fill="${DARK}"/>`
        : `<rect x="1.5" y="6" width="21" height="12" rx="5" fill="${DARK}"/>`;
      return svg(size, shape + textAt(title, title.length > 2 ? 7.5 : 9, LIGHT), title);
    }
    case 'back': case 'start': {
      let icon: string;
      if(family === 'playstation'){
        icon = button === 'start'
          ? `<path d="M8 8.5h8M8 12h8M8 15.5h8" stroke="${LIGHT}" stroke-width="1.8" stroke-linecap="round"/>`
          : `<path d="M12 7v7M9 10l3-3 3 3M8 15.5h8" stroke="${LIGHT}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        return svg(size, `<rect x="4" y="5" width="16" height="14" rx="4" fill="${DARK}"/>` + icon, title);
      }
      icon = button === 'start'
        ? `<path d="M8 9h8M8 12h8M8 15h8" stroke="${LIGHT}" stroke-width="1.8" stroke-linecap="round"/>`
        : `<rect x="7" y="7.5" width="7" height="6" rx="1" fill="none" stroke="${LIGHT}" stroke-width="1.5"/><rect x="10" y="10.5" width="7" height="6" rx="1" fill="${DARK}" stroke="${LIGHT}" stroke-width="1.5"/>`;
      return svg(size, `<circle cx="12" cy="12" r="11" fill="${DARK}"/>` + icon, title);
    }
    case 'ls': case 'rs': {
      const ring = `<circle cx="12" cy="12" r="11" fill="${DARK}"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="#6b6e75" stroke-width="1.5"/>`;
      return svg(size, ring + textAt(title, title.length > 1 ? 8 : 10, LIGHT), title);
    }
    default:
      return svg(size, dpad(button), title);
  }
}
