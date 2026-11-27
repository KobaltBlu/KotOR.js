import { GamePad, radialDeadZone } from "@engine/controls/GamePad";
import { detectPadFamily, glyphName, resolvePadFamily, type PadButton, type PadFamily } from "@engine/controls/gamepad-glyphs";
import { GameState } from "@engine/runtime/GameState";

/**
 * Debug helpers for game controllers: what the browser reports, what the
 * engine reads from it after dead zones, and the prompt / glyph settings.
 * Used by the debug console panel and the `pad*` console commands.
 *
 * @file gamepad-debug.ts
 */

export const INI_CONTROLLER_GLYPHS = 'Game Options.Controller Glyphs';
export const INI_CONTROLLER_PROMPTS = 'Game Options.Controller Prompts';

/** Standard-layout button index → symbol key. Index 16 is the home button. */
export const STANDARD_BUTTONS: (PadButton | 'home')[] = [
  'a', 'b', 'x', 'y',
  'lb', 'rb', 'lt', 'rt',
  'back', 'start',
  'ls', 'rs',
  'dpad_up', 'dpad_down', 'dpad_left', 'dpad_right',
  'home',
];

export interface PadButtonState {
  index: number;
  name: string;
  pressed: boolean;
  value: number;
}

export interface PadDebugInfo {
  index: number;
  id: string;
  mapping: string;
  connected: boolean;
  active: boolean;
  family: PadFamily;
  buttonCount: number;
  axisCount: number;
  canRumble: boolean;
}

export interface ActivePadDebugState extends PadDebugInfo {
  /** Family after the glyph setting is applied. */
  shownFamily: PadFamily;
  buttons: PadButtonState[];
  axes: number[];
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  leftTrigger: number;
  rightTrigger: number;
}

export interface GamepadDebugSnapshot {
  supported: boolean;
  pads: PadDebugInfo[];
  active?: ActivePadDebugState;
  glyphOverride: number;
  promptsEnabled: boolean;
  /** Family of the simulated pad, or undefined when it is off. */
  simulatedFamily?: PadFamily;
  /** The pad is the current input (software cursor hidden, prompts shown). */
  padIsActiveInput: boolean;
}

/** Real pads the browser reports, plus the simulated one while it is on. */
function listPads(): Gamepad[] {
  const real = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
    ? Array.from(navigator.getGamepads() || []).filter((p): p is Gamepad => !!p && p.connected)
    : [];
  return GamePad.simulatedFamily ? [...real, GamePad.getSimulatedPad()] : real;
}

function canRumble(pad: Gamepad): boolean {
  return typeof (pad as any).vibrationActuator?.playEffect === 'function';
}

export function getGlyphOverride(): number {
  const raw = Number(GameState.iniConfig?.getProperty?.(INI_CONTROLLER_GLYPHS));
  return raw === 1 || raw === 2 ? raw : 0;
}

export function getPromptsEnabled(): boolean {
  const raw = GameState.iniConfig?.getProperty?.(INI_CONTROLLER_PROMPTS);
  return raw === undefined || raw === null || raw === '' || Number(raw) !== 0;
}

/** Button name for a standard-layout index, in the given family's terms. */
export function padButtonName(index: number, family: PadFamily): string {
  const key = STANDARD_BUTTONS[index];
  if(!key) return `Button ${index}`;
  if(key === 'home') return family === 'playstation' ? 'PS' : 'Guide';
  return glyphName(key, family);
}

function describePad(pad: Gamepad, activeIndex: number): PadDebugInfo {
  return {
    index: pad.index,
    id: pad.id,
    mapping: pad.mapping || '(none)',
    connected: pad.connected,
    active: pad.index === activeIndex,
    family: detectPadFamily(pad.id),
    buttonCount: pad.buttons.length,
    axisCount: pad.axes.length,
    canRumble: canRumble(pad),
  };
}

/** One reading of every connected pad plus the live state of the active one. */
export function getGamepadDebugSnapshot(): GamepadDebugSnapshot {
  const supported = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
  const pads = listPads();
  const activeIndex = GamePad.CurrentGamePadIndex;
  const glyphOverride = getGlyphOverride();
  const controls: any = GameState.controls;
  const snapshot: GamepadDebugSnapshot = {
    supported,
    pads: pads.map((p) => describePad(p, activeIndex)),
    glyphOverride,
    promptsEnabled: getPromptsEnabled(),
    simulatedFamily: GamePad.simulatedFamily,
    padIsActiveInput: (!!controls?.controllerHidesCursor || !!GamePad.simulatedFamily) && !controls?.touchInputActive,
  };
  const pad = pads.find((p) => p.index === activeIndex);
  if(pad){
    const shownFamily = resolvePadFamily(pad.id, glyphOverride);
    const axis = (i: number) => Number.isFinite(pad.axes[i]) ? pad.axes[i] : 0;
    snapshot.active = {
      ...describePad(pad, activeIndex),
      shownFamily,
      buttons: pad.buttons.map((b, i) => ({
        index: i,
        name: padButtonName(i, shownFamily),
        pressed: !!b?.pressed,
        value: b?.value ?? 0,
      })),
      axes: pad.axes.map((_, i) => axis(i)),
      leftStick: radialDeadZone(axis(0), axis(1)),
      rightStick: radialDeadZone(axis(2), axis(3)),
      leftTrigger: pad.buttons[6]?.value ?? 0,
      rightTrigger: pad.buttons[7]?.value ?? 0,
    };
  }
  return snapshot;
}

/** Make the pad at `index` the one the game reads. Returns false if it is not connected. */
export function selectActivePad(index: number): boolean {
  const pad = listPads().find((p) => p.index === index);
  if(!pad) return false;
  // Picking a real pad turns the simulated one off, since it would win otherwise.
  if(index !== GamePad.SIMULATED_PAD_INDEX) GamePad.setSimulatedFamily(undefined);
  GamePad.CurrentGamePadIndex = pad.index;
  GamePad.CurrentGamePad = pad;
  return true;
}

/**
 * Pretend a pad of `family` is plugged in (undefined turns it off). It sends
 * no input; it only makes the game show pad prompts and button symbols.
 */
export function setSimulatedPad(family: PadFamily | undefined){
  GamePad.setSimulatedFamily(family);
}

/** 0 = follow the pad, 1 = Xbox, 2 = PlayStation. Saved to the ini. */
export function setGlyphOverride(value: number){
  const v = value === 1 || value === 2 ? value : 0;
  GameState.iniConfig?.setProperty?.(INI_CONTROLLER_GLYPHS, v);
  GameState.iniConfig?.save?.();
}

export function setPromptsEnabled(enabled: boolean){
  GameState.iniConfig?.setProperty?.(INI_CONTROLLER_PROMPTS, enabled ? 1 : 0);
  GameState.iniConfig?.save?.();
}

/**
 * Rumble the active pad. Resolves false when there is no pad or it cannot
 * rumble.
 */
export async function rumbleActivePad(durationMs: number = 400, strong: number = 1, weak: number = 1): Promise<boolean> {
  const pad = GamePad.pollActive();
  const actuator: any = pad && (pad as any).vibrationActuator;
  if(!actuator || typeof actuator.playEffect !== 'function') return false;
  const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
  try{
    await actuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration: Math.max(0, Math.min(5000, durationMs | 0)),
      strongMagnitude: clamp(strong),
      weakMagnitude: clamp(weak),
    });
    return true;
  }catch(e){
    console.warn('rumbleActivePad failed', e);
    return false;
  }
}

/** Text lines describing the pads, for the console. */
export function describeGamepadsForConsole(snapshot: GamepadDebugSnapshot = getGamepadDebugSnapshot()): string[] {
  if(!snapshot.supported) return ['Gamepad: not supported by this browser'];
  const glyphs = ['auto', 'xbox', 'playstation'][snapshot.glyphOverride] ?? 'auto';
  const sim = snapshot.simulatedFamily ? `, simulating ${snapshot.simulatedFamily}` : '';
  const lines = [
    `Gamepads: ${snapshot.pads.length} connected${sim}, glyphs ${glyphs}, prompts ${snapshot.promptsEnabled ? 'on' : 'off'}, pad input ${snapshot.padIsActiveInput ? 'active' : 'idle'}`,
  ];
  if(!snapshot.pads.length){
    lines.push('  No pad seen yet. Press a button on the pad so the browser reports it.');
  }
  for(const p of snapshot.pads){
    lines.push(`  ${p.active ? '*' : ' '}[${p.index}] ${p.id} (${p.mapping}, ${p.family}, ${p.buttonCount} buttons, ${p.axisCount} axes${p.canRumble ? ', rumble' : ''})`);
  }
  const a = snapshot.active;
  if(a){
    const held = a.buttons.filter((b) => b.pressed).map((b) => b.name);
    const f = (n: number) => n.toFixed(2);
    lines.push(`  Held: ${held.length ? held.join(', ') : 'none'}`);
    lines.push(`  L (${f(a.leftStick.x)}, ${f(a.leftStick.y)})  R (${f(a.rightStick.x)}, ${f(a.rightStick.y)})  LT ${f(a.leftTrigger)}  RT ${f(a.rightTrigger)}`);
  }
  return lines;
}
