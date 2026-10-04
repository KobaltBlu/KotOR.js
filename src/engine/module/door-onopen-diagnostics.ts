import { GameState } from '@engine/runtime/GameState';
import type { ModuleObject } from '@engine/module/ModuleObject';

export type AlertzelkOnOpenDiagnostic = {
  doorTag: string;
  Tar_ZelkaRm: number | undefined;
  party0: {
    name: string | undefined;
    tag: string;
    npcId: number | undefined;
    isPlayer: boolean;
  } | undefined;
  firstPC: {
    name: string | undefined;
    npcId: number | undefined;
    isPlayer: boolean;
  } | undefined;
  firstPCEqualsParty0: boolean;
  lastOpenedBy: {
    name: string | undefined;
    tag: string;
  } | undefined;
};

/**
 * Zelka lab-door OnOpen (k_ptar_alertzelk): dump Tar_ZelkaRm and
 * GetFirstPC vs party[0] so the JumpToObject gather branch is observable.
 */
export function logAlertzelkOnOpen(
  door: { getTag?: () => string; tag?: string },
  opener: ModuleObject | undefined,
): AlertzelkOnOpenDiagnostic {
  const party = GameState.PartyManager?.party || [];
  const party0 = party[0];
  const firstPC = GameState.PartyManager?.getFirstPC?.();
  const diagnostic: AlertzelkOnOpenDiagnostic = {
    doorTag: door.getTag?.() || door.tag || '',
    Tar_ZelkaRm: GameState.GlobalVariableManager?.GetGlobalNumber?.('Tar_ZelkaRm'),
    party0: party0 && {
      name: party0.getName?.(),
      tag: party0.getTag?.() || party0.tag || '',
      npcId: party0.npcId,
      isPlayer: !!party0.isPlayer,
    },
    firstPC: firstPC && {
      name: firstPC.getName?.(),
      npcId: firstPC.npcId,
      isPlayer: !!firstPC.isPlayer,
    },
    firstPCEqualsParty0: firstPC === party0,
    lastOpenedBy: opener && {
      name: (opener as { getName?: () => string }).getName?.(),
      tag: opener.getTag?.() || opener.tag || '',
    },
  };
  console.log('[k_ptar_alertzelk OnOpen]', diagnostic);
  return diagnostic;
}

export function shouldLogAlertzelkOnOpen(scriptName: string | undefined): boolean {
  return (scriptName || '').toLowerCase() === 'k_ptar_alertzelk';
}
