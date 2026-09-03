/**
 * Viewport idle / LOD helpers for large modules.
 *
 * @file ViewportPerfPolicy.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { prefersReducedMotion } from "@/apps/forge/module-editor/a11y/moduleEditorA11y";

export interface ViewportPerfPolicy {
  idleRenderHz: number;
  activeRenderHz: number;
  helperDistanceCull: number;
  prefetchBudgetMs: number;
}

export function defaultViewportPerfPolicy(): ViewportPerfPolicy {
  const reduced = prefersReducedMotion();
  return {
    idleRenderHz: reduced ? 5 : 15,
    activeRenderHz: reduced ? 30 : 60,
    helperDistanceCull: 128,
    prefetchBudgetMs: 8,
  };
}

/** True when the viewport should drop to idle render rate. */
export function shouldIdleRender(lastInteractionMs: number, now = Date.now()): boolean {
  return now - lastInteractionMs > 1500;
}
