import { glyphSvg, type PadButton, type PadFamily } from "@engine/controls/gamepad-glyphs";

/** Control bounds in centered, y-up GUI space (the space of `GUIControl.box`). */
export interface GlyphControlBox {
  min: { x: number; y: number };
  max: { x: number; y: number };
}

export interface GlyphTarget {
  button: PadButton;
  control: { box: GlyphControlBox };
}

/** How GUI space maps onto the overlay's CSS pixels. */
export interface GlyphViewport {
  /** GUI viewport size. */
  width: number;
  height: number;
  /** CSS pixels per GUI unit. */
  scaleX: number;
  scaleY: number;
  /** Canvas offset inside the overlay host, in CSS pixels. */
  offsetX: number;
  offsetY: number;
}

export interface GlyphPlacement {
  buttons: PadButton[];
  /** Top-left of the glyph group, CSS pixels inside the host. */
  left: number;
  top: number;
  /** Glyph size in CSS pixels. */
  size: number;
}

const MIN_SIZE = 18;
const MAX_SIZE = 28;
const GAP = 3;

/**
 * Where to draw each control's button symbols. A control with room gets its
 * symbols inside its left edge; a small one (arrow, icon) gets them just
 * above it, centered. Several buttons bound to one control share a group.
 */
export function placeButtonGlyphs(targets: GlyphTarget[], viewport: GlyphViewport): GlyphPlacement[] {
  const groups = new Map<GlyphTarget['control'], PadButton[]>();
  for(const t of targets){
    if(!t?.control?.box) continue;
    const list = groups.get(t.control);
    if(list){
      if(!list.includes(t.button)) list.push(t.button);
    }else{
      groups.set(t.control, [t.button]);
    }
  }

  const placements: GlyphPlacement[] = [];
  groups.forEach((buttons, control) => {
    const box = control.box;
    const w = (box.max.x - box.min.x) * viewport.scaleX;
    const h = (box.max.y - box.min.y) * viewport.scaleY;
    if(!(w > 0) || !(h > 0)) return;
    // GUI space is centered and y-up; CSS is top-left and y-down.
    const left = (box.min.x + viewport.width / 2) * viewport.scaleX + viewport.offsetX;
    const top = (viewport.height / 2 - box.max.y) * viewport.scaleY + viewport.offsetY;
    const size = Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, h * 0.8)));
    const groupW = buttons.length * size + (buttons.length - 1) * GAP;
    if(w >= groupW + size * 2 && h >= size){
      placements.push({ buttons, size, left: Math.round(left + Math.max(4, (h - size) / 2)), top: Math.round(top + (h - size) / 2) });
    }else{
      placements.push({ buttons, size, left: Math.round(left + (w - groupW) / 2), top: Math.round(top - size - 2) });
    }
  });
  return placements;
}

const LAYER_STYLE = [
  'position:absolute',
  'left:0',
  'top:0',
  'width:100%',
  'height:100%',
  'pointer-events:none',
  'user-select:none',
  'overflow:hidden',
  'z-index:10',
].join(';');

/**
 * Draws pad button symbols on the menu controls they press, so a screen
 * reads like a console menu: the close button carries B, defaults carries Y.
 */
export class GamepadButtonGlyphs {
  element: HTMLDivElement | undefined;
  private lastKey: string = '';

  private ensureElement(host: HTMLElement | null | undefined): HTMLDivElement | undefined {
    if(typeof document === 'undefined' || !host) return undefined;
    if(!this.element){
      const el = document.createElement('div');
      el.className = 'kotorjs-pad-glyphs';
      el.setAttribute('style', LAYER_STYLE);
      el.setAttribute('aria-hidden', 'true');
      this.element = el;
    }
    if(this.element.parentElement !== host){
      if(getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.appendChild(this.element);
      this.lastKey = '';
    }
    return this.element;
  }

  update(host: HTMLElement | null | undefined, placements: GlyphPlacement[], family: PadFamily){
    if(!placements.length){
      this.hide();
      return;
    }
    const el = this.ensureElement(host);
    if(!el) return;
    const key = family + '|' + placements.map((p) => `${p.buttons.join('+')}@${p.left},${p.top},${p.size}`).join(';');
    el.style.display = 'block';
    if(key === this.lastKey) return;
    this.lastKey = key;
    el.innerHTML = placements.map((p) => {
      const icons = p.buttons.map((b) => glyphSvg(b, family, p.size)).join('');
      return `<div style="position:absolute;left:${p.left}px;top:${p.top}px;display:flex;gap:${GAP}px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">${icons}</div>`;
    }).join('');
  }

  hide(){
    if(this.element && this.lastKey !== ''){
      this.element.style.display = 'none';
      this.element.innerHTML = '';
      this.lastKey = '';
    }
  }
}
