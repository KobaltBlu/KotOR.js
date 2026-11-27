import { GameState } from "@engine/runtime/GameState";

/**
 * When the touch HUD is used. Stored in the INI so it survives reloads.
 *
 * @file touch-hud-setting.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** INI key: 0 = on for touch screens, 1 = always on, 2 = always off. */
export const INI_TOUCH_HUD = 'Game Options.Touch HUD';

export enum TouchHudMode { Auto = 0, On = 1, Off = 2 }

export const TOUCH_HUD_MODE_NAMES: Record<TouchHudMode, string> = {
  [TouchHudMode.Auto]: 'auto',
  [TouchHudMode.On]: 'on',
  [TouchHudMode.Off]: 'off',
};

let coarsePointer: MediaQueryList | undefined;

export function getTouchHudMode(): TouchHudMode {
  const v = Number(GameState.iniConfig?.getProperty?.(INI_TOUCH_HUD));
  return v === TouchHudMode.On || v === TouchHudMode.Off ? v : TouchHudMode.Auto;
}

export function setTouchHudMode(mode: TouchHudMode){
  GameState.iniConfig?.setProperty?.(INI_TOUCH_HUD, mode);
  GameState.iniConfig?.save?.();
}

/** Reads "auto", "on", "off" or 0-2; undefined when it is none of those. */
export function parseTouchHudMode(raw: string | undefined): TouchHudMode | undefined {
  switch((raw ?? '').trim().toLowerCase()){
    case 'auto': case '0': return TouchHudMode.Auto;
    case 'on': case '1': return TouchHudMode.On;
    case 'off': case '2': return TouchHudMode.Off;
    default: return undefined;
  }
}

/** A touch screen is the main pointer. */
export function isTouchScreen(): boolean {
  if(typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if(!coarsePointer) coarsePointer = window.matchMedia('(pointer: coarse)');
  return !!coarsePointer.matches;
}

/** Whether the touch HUD should be showing now. */
export function touchHudWanted(mode: TouchHudMode = getTouchHudMode(), touch: boolean = isTouchScreen()): boolean {
  if(mode === TouchHudMode.On) return true;
  if(mode === TouchHudMode.Off) return false;
  return touch;
}
