import { glyphSvg, type PadFamily } from "@engine/controls/gamepad-glyphs";

/** Shortcuts on the pad quick menu (Y in play), left to right. */
export type QuickMenuEntry = 'freelook' | 'close' | 'solo' | 'stealth' | 'quicksave' | 'menu' | 'switchweapons';

export const QUICK_MENU_ENTRIES: readonly QuickMenuEntry[] = [
  'freelook', 'close', 'solo', 'stealth', 'quicksave', 'menu', 'switchweapons',
];

export interface QuickMenuAvailability {
  /** Current leader can enter stealth. */
  stealth: boolean;
  /** Game has weapon sets to swap between. */
  switchWeapons: boolean;
  /** Party is in solo mode (changes the label of the solo entry). */
  soloMode: boolean;
}

/** Label shown for an entry. */
export function quickMenuLabel(entry: QuickMenuEntry, availability: QuickMenuAvailability): string {
  switch(entry){
    case 'freelook': return 'Free Look';
    case 'close': return 'Close';
    case 'solo': return availability.soloMode ? 'Party Mode' : 'Solo Mode';
    case 'stealth': return 'Stealth';
    case 'quicksave': return 'Quick Save';
    case 'menu': return 'Menu';
    case 'switchweapons': return 'Switch Weapons';
  }
}

/** Entry can be chosen right now. */
export function quickMenuEntryEnabled(entry: QuickMenuEntry, availability: QuickMenuAvailability): boolean {
  if(entry === 'stealth') return availability.stealth;
  if(entry === 'switchweapons') return availability.switchWeapons;
  return true;
}

/**
 * Index of the entry `step` places from `index`, wrapping around and
 * skipping entries that cannot be used.
 */
export function stepQuickMenu(index: number, step: number, availability: QuickMenuAvailability): number {
  const n = QUICK_MENU_ENTRIES.length;
  let i = index;
  for(let tries = 0; tries < n; tries++){
    i = ((i + step) % n + n) % n;
    if(quickMenuEntryEnabled(QUICK_MENU_ENTRIES[i], availability)) return i;
  }
  return index;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>
  )[c]);
}

const PANEL_STYLE = [
  'position:absolute',
  'left:50%',
  'bottom:64px',
  'transform:translateX(-50%)',
  'display:flex',
  'flex-direction:column',
  'align-items:center',
  'gap:8px',
  'padding:10px 14px',
  'border-radius:10px',
  'background:rgba(0,0,0,0.72)',
  'color:#e8e8e8',
  "font:600 14px 'Roboto', Arial, sans-serif",
  'pointer-events:none',
  'user-select:none',
  'z-index:11',
].join(';');

const PANEL_CSS = [
  '.kotorjs-quickmenu-row{display:flex;gap:6px}',
  '.kotorjs-quickmenu-item{padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);white-space:nowrap}',
  '.kotorjs-quickmenu-item.on{background:rgba(70,140,230,0.55);border-color:#9cc8ff;color:#fff}',
  '.kotorjs-quickmenu-item.off{opacity:0.35}',
  '.kotorjs-quickmenu-hint{display:flex;gap:14px;font-size:12px;opacity:0.85}',
  '.kotorjs-quickmenu-hint span{display:inline-flex;align-items:center;gap:5px}',
].join('');

/**
 * Pad quick menu: a row of shortcuts picked with left / right and A.
 * Up / down change the party leader without closing it.
 */
export class GamepadQuickMenu {
  isOpen: boolean = false;
  index: number = QUICK_MENU_ENTRIES.indexOf('close');
  /** The menu paused the game when it opened, so it unpauses on close. */
  pausedOnOpen: boolean = false;
  element: HTMLDivElement | undefined;
  private lastKey: string = '';

  get entry(): QuickMenuEntry {
    return QUICK_MENU_ENTRIES[this.index];
  }

  open(availability: QuickMenuAvailability){
    this.isOpen = true;
    if(!quickMenuEntryEnabled(this.entry, availability)){
      this.index = QUICK_MENU_ENTRIES.indexOf('close');
    }
  }

  close(){
    this.isOpen = false;
    this.hide();
  }

  step(step: number, availability: QuickMenuAvailability){
    this.index = stepQuickMenu(this.index, step, availability);
  }

  /** Draw the menu in `host`, or remove it when closed. */
  render(host: HTMLElement | null | undefined, availability: QuickMenuAvailability, family: PadFamily){
    if(!this.isOpen){
      this.hide();
      return;
    }
    if(typeof document === 'undefined' || !host) return;
    if(!this.element){
      const el = document.createElement('div');
      el.className = 'kotorjs-quickmenu';
      el.setAttribute('style', PANEL_STYLE);
      el.setAttribute('role', 'menu');
      const style = document.createElement('style');
      style.textContent = PANEL_CSS;
      el.appendChild(style);
      const body = document.createElement('div');
      body.className = 'kotorjs-quickmenu-body';
      body.setAttribute('style', 'display:contents');
      el.appendChild(body);
      this.element = el;
    }
    if(this.element.parentElement !== host){
      if(getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.appendChild(this.element);
      this.lastKey = '';
    }
    const key = [this.index, family, availability.stealth, availability.switchWeapons, availability.soloMode].join('|');
    this.element.style.display = 'flex';
    if(key === this.lastKey) return;
    this.lastKey = key;

    const items = QUICK_MENU_ENTRIES.map((entry, i) => {
      const enabled = quickMenuEntryEnabled(entry, availability);
      const cls = 'kotorjs-quickmenu-item' + (i === this.index ? ' on' : '') + (enabled ? '' : ' off');
      return `<span class="${cls}" role="menuitem" aria-selected="${i === this.index}">${escapeHtml(quickMenuLabel(entry, availability))}</span>`;
    }).join('');
    const hint = (button: Parameters<typeof glyphSvg>[0], label: string) =>
      `<span>${glyphSvg(button, family, 18)}${escapeHtml(label)}</span>`;
    const body = this.element.querySelector('.kotorjs-quickmenu-body');
    if(body){
      body.innerHTML =
        `<div class="kotorjs-quickmenu-row">${items}</div>` +
        `<div class="kotorjs-quickmenu-hint">${hint('dpad_horizontal', 'Choose')}${hint('dpad_vertical', 'Party')}${hint('a', 'Select')}${hint('b', 'Close')}</div>`;
    }
  }

  hide(){
    if(this.element){
      this.element.style.display = 'none';
      this.lastKey = '';
    }
  }
}
