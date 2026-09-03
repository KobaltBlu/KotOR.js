/**
 * SoundExists is not authored. On save it is derived from voice fields.
 *
 * @file dlgSoundExists.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { ForgeDLGNode } from "@/apps/forge/dlg/ForgeDLGTypes";

export const DLG_SOUND_EXISTS_DEFAULT = 0x80;
export const DLG_SOUND_EXISTS_ALIEN = 0x03;

function hasResRef(value: string | undefined): boolean {
  return !!(value && value.trim());
}

/** VO / extra sound keep the default byte; empty lines with a K2 alien race set bits 0 and 1. */
export function inferDlgSoundExists(
  node: ForgeDLGNode,
  context: { k2Present: boolean; alienRaceOwner: number },
): number {
  if (hasResRef(node.sound) || hasResRef(node.voResRef)) {
    return DLG_SOUND_EXISTS_DEFAULT;
  }
  const k2 = context.k2Present || node.k2Present;
  if (!k2) {
    return 0;
  }
  let race = node.alienRaceNode;
  if (race <= 0 && !hasResRef(node.speaker)) {
    race = context.alienRaceOwner;
  }
  if (race > 0) {
    return DLG_SOUND_EXISTS_DEFAULT | DLG_SOUND_EXISTS_ALIEN;
  }
  return 0;
}
