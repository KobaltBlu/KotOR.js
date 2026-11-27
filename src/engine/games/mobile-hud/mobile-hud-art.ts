import * as THREE from "three";

/**
 * Textures for touch HUD pieces the game files have no art for: round
 * buttons and the action list panel. Each is drawn
 * once into a 2D canvas and handed to GUI controls as a fill texture, so it
 * renders through the normal GUI pass in the game canvas.
 *
 * @file mobile-hud-art.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type HudArtKind =
  | 'gear'
  | 'save'
  | 'help'
  | 'close'
  | 'button'
  | 'backing'
  | 'panel'
  | 'row'
  | 'ring';

export type HudTint = { r: number; g: number; b: number };

const SIZES: Record<HudArtKind, [number, number]> = {
  'gear': [128, 128],
  'save': [128, 128],
  'help': [128, 128],
  'close': [128, 128],
  'button': [256, 64],
  'backing': [128, 180],
  'panel': [256, 256],
  'row': [256, 64],
  'ring': [128, 128],
};

const cache = new Map<string, THREE.Texture>();

const css = (t: HudTint, a = 1) => `rgba(${Math.round(t.r * 255)},${Math.round(t.g * 255)},${Math.round(t.b * 255)},${a})`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number){
  const rr = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function circleButton(ctx: CanvasRenderingContext2D, w: number, h: number, tint: HudTint, lit: boolean){
  const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 - 5;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = lit ? 'rgba(20,40,60,0.85)' : 'rgba(0,0,0,0.6)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = css(tint, lit ? 1 : 0.85);
  ctx.stroke();
}

function drawGear(ctx: CanvasRenderingContext2D, w: number, h: number, tint: HudTint){
  const cx = w / 2, cy = h / 2;
  const teeth = 8, outer = 36, inner = 27, hole = 11;
  ctx.beginPath();
  for(let i = 0; i < teeth * 2; i++){
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? outer : inner;
    ctx.lineTo(cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad);
    ctx.lineTo(cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad);
  }
  ctx.closePath();
  ctx.moveTo(cx + hole, cy);
  ctx.arc(cx, cy, hole, 0, Math.PI * 2, true);
  ctx.fillStyle = css(tint);
  ctx.fill('evenodd');
}

function drawSave(ctx: CanvasRenderingContext2D, w: number, h: number, tint: HudTint){
  const s = 52, x = (w - s) / 2, y = (h - s) / 2;
  ctx.fillStyle = css(tint);
  roundRect(ctx, x, y, s, s, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x + 12, y + 5, s - 24, 15);
  ctx.fillRect(x + 9, y + 28, s - 18, s - 33);
  ctx.fillStyle = css(tint);
  ctx.fillRect(x + s - 22, y + 7, 6, 11);
}

function drawHelp(ctx: CanvasRenderingContext2D, w: number, h: number, tint: HudTint){
  ctx.fillStyle = css(tint);
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', w / 2, h / 2 + 3);
}

function drawClose(ctx: CanvasRenderingContext2D, w: number, h: number, tint: HudTint){
  const cx = w / 2, cy = h / 2, d = 20;
  ctx.strokeStyle = css(tint);
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
  ctx.stroke();
}

function paint(kind: HudArtKind, ctx: CanvasRenderingContext2D, w: number, h: number, tint: HudTint, lit: boolean){
  ctx.clearRect(0, 0, w, h);
  switch(kind){
    case 'gear':
      circleButton(ctx, w, h, tint, lit);
      drawGear(ctx, w, h, tint);
      break;
    case 'save':
      circleButton(ctx, w, h, tint, lit);
      drawSave(ctx, w, h, tint);
      break;
    case 'help':
      circleButton(ctx, w, h, tint, lit);
      drawHelp(ctx, w, h, tint);
      break;
    case 'close':
      circleButton(ctx, w, h, tint, lit);
      drawClose(ctx, w, h, tint);
      break;
    case 'button':
      roundRect(ctx, 3, 3, w - 6, h - 6, 14);
      ctx.fillStyle = lit ? 'rgba(20,40,60,0.9)' : 'rgba(0,0,0,0.65)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = css(tint, lit ? 1 : 0.85);
      ctx.stroke();
      break;
    case 'backing':
      roundRect(ctx, 3, 3, w - 6, h - 6, 18);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = css(tint, 0.55);
      ctx.stroke();
      break;
    case 'panel': {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(4,10,16,0.93)');
      g.addColorStop(1, 'rgba(0,0,0,0.97)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css(tint, 0.9);
      ctx.fillRect(0, 0, 2, h);
      break;
    }
    case 'ring': {
      const rad = Math.min(w, h) / 2 - 5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2);
      ctx.fillStyle = lit ? css(tint, 0.18) : 'rgba(0,0,0,0.0)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = css(tint, lit ? 1 : 0.85);
      ctx.stroke();
      break;
    }
    case 'row':
      roundRect(ctx, 2, 2, w - 4, h - 4, 8);
      ctx.fillStyle = lit ? css(tint, 0.3) : 'rgba(255,255,255,0.04)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = css(tint, lit ? 0.9 : 0.35);
      ctx.stroke();
      break;
  }
}

/**
 * Texture for one HUD piece. `lit` is the pressed / hover look. Returns
 * undefined where there is no 2D canvas (tests, workers).
 */
export function hudArt(kind: HudArtKind, tint: HudTint, lit = false): THREE.Texture | undefined {
  const key = `${kind}:${tint.r.toFixed(3)},${tint.g.toFixed(3)},${tint.b.toFixed(3)}:${lit ? 1 : 0}`;
  const hit = cache.get(key);
  if(hit) return hit;
  if(typeof document === 'undefined') return undefined;
  const [w, h] = SIZES[kind];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if(!ctx) return undefined;
  paint(kind, ctx, w, h, tint, lit);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}
