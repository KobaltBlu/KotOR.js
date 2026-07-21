import { GameState } from "@/GameState";
import { GameEngineType } from "@/enums/engine";

/**
 * Compact save/load diagnostics so remaining fidelity gaps stay greppable.
 */
export class SaveLoadAudit {
  static PREFIX = '[SaveLoadAudit]';

  static summary(stage: string, extra: Record<string, number | string | boolean> = {}){
    const parts = Object.keys(extra).map(k => `${k}=${extra[k]}`);
    console.log(`${SaveLoadAudit.PREFIX} ${stage}${parts.length ? ' | ' + parts.join(', ') : ''}`);
  }

  static warnGap(field: string, detail: string){
    console.warn(`${SaveLoadAudit.PREFIX} gap: ${field} — ${detail}`);
  }

  static logExportSnapshot(directory: string){
    const gvm = GameState.GlobalVariableManager?.Globals;
    const influenceCount = GameState.PartyManager?.InfluenceMap?.size || 0;
    const tokenCount = GameState.module?.customTokens?.size || 0;
    SaveLoadAudit.summary('export', {
      dir: directory,
      module: GameState.module?.filename || '',
      bools: gvm?.Boolean?.size || 0,
      nums: gvm?.Number?.size || 0,
      strs: gvm?.String?.size || 0,
      locs: gvm?.Location?.size || 0,
      party: GameState.PartyManager?.party?.length || 0,
      inventory: GameState.InventoryManager?.inventory?.length || 0,
      journal: GameState.JournalManager?.Entries?.length || 0,
      tokens: tokenCount,
      influence: influenceCount,
      xpPool: GameState.PartyManager?.XPPool || 0,
      disableMap: !!GameState.PartyManager?.DisableMap,
      disableRegen: !!GameState.PartyManager?.DisableHealthRegen,
    });

    if(GameState.GameKey == GameEngineType.TSL && influenceCount == 0){
      SaveLoadAudit.warnGap('PT_INFLUENCE', 'InfluenceMap empty at export (may be fine early-game)');
    }
    if(!GameState.module?.customTokens?.size){
      // not necessarily a gap — many modules never set custom tokens
    }
  }

  static logLoadStage(stage: string, extra: Record<string, number | string | boolean> = {}){
    SaveLoadAudit.summary(`load:${stage}`, extra);
  }
}
