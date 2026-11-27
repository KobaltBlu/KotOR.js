/**
 * In-game interface scale (GUI Options). Stored in the INI as a decimal string.
 *
 * @file guiScaleSetting.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GameState } from "@engine/runtime/GameState";

export const INI_GUI_SCALE = 'Graphics Options.GUI Scale';
export const GUI_SCALE_MIN = 0.5;
export const GUI_SCALE_MAX = 2.0;
export const GUI_SCALE_DEFAULT = 1.0;
/** Slider snaps to this step so the value reads cleanly (0.50, 0.55, ...). */
export const GUI_SCALE_STEP = 0.05;

export function clampGUIScale(scale: number): number {
  if(!Number.isFinite(scale)) return GUI_SCALE_DEFAULT;
  const snapped = Math.round(scale / GUI_SCALE_STEP) * GUI_SCALE_STEP;
  return Math.min(GUI_SCALE_MAX, Math.max(GUI_SCALE_MIN, Number(snapped.toFixed(2))));
}

/** Saved interface scale, or the default when unset or invalid. */
export function getGUIScale(): number {
  const raw = GameState.iniConfig?.getProperty?.(INI_GUI_SCALE);
  if(raw === undefined || raw === null || raw === '') return GUI_SCALE_DEFAULT;
  return clampGUIScale(Number(raw));
}

export function setGUIScale(scale: number): number {
  const value = clampGUIScale(scale);
  GameState.iniConfig?.setProperty?.(INI_GUI_SCALE, value.toFixed(2));
  return value;
}

/** Slider position (0..1) → scale, linear across [min, max]. */
export function sliderToGUIScale(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return clampGUIScale(GUI_SCALE_MIN + t * (GUI_SCALE_MAX - GUI_SCALE_MIN));
}

export function guiScaleToSlider(scale: number): number {
  return (clampGUIScale(scale) - GUI_SCALE_MIN) / (GUI_SCALE_MAX - GUI_SCALE_MIN);
}

/** Apply the saved scale to the in-game HUD, if it is loaded. */
export function applyGUIScale(scale: number = getGUIScale()): void {
  const overlay = GameState.MenuManager?.InGameOverlay;
  if(overlay?.tGuiPanel){
    overlay.setScale(scale);
  }
}
