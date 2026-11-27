import { glyphName, glyphSvg, type PadButton, type PadFamily } from "@engine/controls/gamepad-glyphs";

export interface GamepadPrompt {
  button: PadButton;
  label: string;
}

/** What the pad currently controls, reduced to what the prompt bar needs. */
export interface GamepadPromptContext {
  screen: 'none' | 'ingame' | 'actionPanel' | 'menu' | 'dialog' | 'movie' | 'minigame';
  /** Menu has a cancel / back button bound to B. */
  menuHasBack?: boolean;
  /** Menu handles LB / RB tab switching. */
  menuHasTabs?: boolean;
  /** Dialog is showing a reply list. */
  dialogHasReplies?: boolean;
}

/** Button hints for the current screen. Only lists buttons that do something there. */
export function computePrompts(ctx: GamepadPromptContext): GamepadPrompt[] {
  switch(ctx.screen){
    case 'ingame':
      return [
        { button: 'a', label: 'Use' },
        { button: 'x', label: 'Switch Leader' },
        { button: 'y', label: 'Quick Menu' },
        { button: 'lt', label: 'Prev Target' },
        { button: 'rt', label: 'Next Target' },
        { button: 'dpad_horizontal', label: 'Actions' },
        { button: 'start', label: 'Options' },
      ];
    case 'actionPanel':
      return [
        { button: 'a', label: 'Use' },
        { button: 'b', label: 'Cancel' },
        { button: 'dpad_vertical', label: 'Choose' },
        { button: 'dpad_horizontal', label: 'Actions' },
      ];
    case 'menu': {
      const prompts: GamepadPrompt[] = [{ button: 'a', label: 'Select' }];
      if(ctx.menuHasBack) prompts.push({ button: 'b', label: 'Back' });
      if(ctx.menuHasTabs){
        prompts.push({ button: 'lb', label: 'Prev Tab' });
        prompts.push({ button: 'rb', label: 'Next Tab' });
      }
      return prompts;
    }
    case 'dialog':
      return ctx.dialogHasReplies
        ? [
          { button: 'dpad_vertical', label: 'Choose' },
          { button: 'a', label: 'Reply' },
        ]
        : [{ button: 'a', label: 'Skip' }];
    case 'movie':
      return [{ button: 'y', label: 'Skip' }];
    case 'minigame':
      return [
        { button: 'a', label: 'Fire' },
        { button: 'start', label: 'Pause' },
      ];
    default:
      return [];
  }
}

/** Escape text placed into the prompt bar markup. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>
  )[c]);
}

/** Markup for a row of prompts (symbol followed by its label). */
export function renderPromptsHtml(prompts: GamepadPrompt[], family: PadFamily, size: number = 22): string {
  return prompts.map((p) => (
    `<span class="kotorjs-pad-prompt" title="${escapeHtml(glyphName(p.button, family))}">` +
      glyphSvg(p.button, family, size) +
      `<span class="kotorjs-pad-prompt-label">${escapeHtml(p.label)}</span>` +
    `</span>`
  )).join('');
}

const BAR_STYLE = [
  'position:absolute',
  'right:16px',
  'bottom:14px',
  'display:flex',
  'flex-wrap:wrap',
  'justify-content:flex-end',
  'gap:6px 14px',
  'max-width:calc(100% - 32px)',
  'padding:6px 12px',
  'border-radius:8px',
  'background:rgba(0,0,0,0.55)',
  'color:#e8e8e8',
  "font:600 13px 'Roboto', Arial, sans-serif",
  'pointer-events:none',
  'user-select:none',
  'z-index:10',
].join(';');

const ITEM_STYLE = '.kotorjs-pad-prompt{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.kotorjs-pad-prompt svg{flex:none}';

/**
 * Small overlay in the corner of the game view that shows the buttons for the
 * current screen, drawn for the connected pad's family. Shown only while the
 * pad is the active input.
 */
export class GamepadPromptBar {
  element: HTMLDivElement | undefined;
  private lastKey: string = '';

  /** Attach to `host` (created on first use; no-op without a DOM). */
  private ensureElement(host: HTMLElement | null | undefined): HTMLDivElement | undefined {
    if(typeof document === 'undefined' || !host) return undefined;
    if(this.element && this.element.parentElement === host) return this.element;

    if(!this.element){
      const el = document.createElement('div');
      el.className = 'kotorjs-pad-prompts';
      el.setAttribute('style', BAR_STYLE);
      el.setAttribute('aria-live', 'polite');
      const style = document.createElement('style');
      style.textContent = ITEM_STYLE;
      el.appendChild(style);
      const row = document.createElement('div');
      row.className = 'kotorjs-pad-prompt-row';
      row.setAttribute('style', 'display:contents');
      el.appendChild(row);
      this.element = el;
    }
    if(getComputedStyle(host).position === 'static'){
      host.style.position = 'relative';
    }
    host.appendChild(this.element);
    this.lastKey = '';
    return this.element;
  }

  /** Show `prompts` for `family`, or hide the bar when `prompts` is empty. */
  update(host: HTMLElement | null | undefined, prompts: GamepadPrompt[], family: PadFamily){
    const visible = prompts.length > 0;
    if(!visible && !this.element) return;
    const el = this.ensureElement(host);
    if(!el) return;

    const key = visible ? family + '|' + prompts.map((p) => p.button + ':' + p.label).join(',') : '';
    if(key === this.lastKey) return;
    this.lastKey = key;

    el.style.display = visible ? 'flex' : 'none';
    const row = el.querySelector('.kotorjs-pad-prompt-row');
    if(row){
      row.innerHTML = visible ? renderPromptsHtml(prompts, family) : '';
    }
  }

  hide(){
    if(this.element && this.lastKey !== ''){
      this.element.style.display = 'none';
      this.lastKey = '';
    }
  }
}
