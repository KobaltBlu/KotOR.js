import * as KotOR from '@/apps/game/KotOR';
import { HotReloadManager } from '@/dev/HotReloadManager';
import { CharGenManager } from '@/managers/CharGenManager';
import { CurrentGame } from '@/engine/CurrentGame';
import { TalentFeat } from '@/talents';

function applyQuickCharacterStats(): void {
  const creature = CharGenManager.selectedCreature;
  const classData = KotOR.GameState.SWRuleSet.classes[CharGenManager.selectedClass];
  if (!creature || !classData) {
    throw new Error('CharGen quick-start stats unavailable');
  }
  const savingThrowLabel = classData.savingthrowtable.toLowerCase();
  const savingThrowData = KotOR.GameState.TwoDAManager.datatables.get(savingThrowLabel).rows[0];
  const featsTable = KotOR.GameState.SWRuleSet.feats;

  creature.str = classData.str;
  creature.dex = classData.dex;
  creature.con = classData.con;
  creature.wis = classData.wis;
  creature.int = classData.int;
  creature.cha = classData.cha;
  creature.fortbonus = parseInt(savingThrowData.fortsave, 10);
  creature.willbonus = parseInt(savingThrowData.willsave, 10);
  creature.refbonus = parseInt(savingThrowData.refsave, 10);
  creature.feats = [];
  for (let i = 0, len = featsTable.length; i < len; i++) {
    if (featsTable[i].getGranted(classData) === 1) {
      creature.feats.push(new TalentFeat(i));
    }
  }
}

declare global {
  interface Window {
    __KOTOR_PAGE_LOAD_ID__?: string;
    __KOTOR_HMR_TEST__?: {
      getPageLoadId(): string;
      getAcceptCount(): number;
      isSessionActive(): boolean;
      getLoopGeneration(): number;
      getProbeValue(): number;
      activateSession(): void;
      startQuickPlayToModule(moduleName: string): Promise<void>;
      snapshotSession(): {
        ready: boolean;
        module: string | null;
        area: string | null;
        player: { x: number; y: number; z: number } | null;
      };
    };
  }
}

function getProbeValue(): number {
  if (window.__KOTOR_HMR_PROBE_VALUE__ !== undefined) {
    return window.__KOTOR_HMR_PROBE_VALUE__;
  }
  return require('@/dev/HmrTestProbe').HMR_PROBE as number;
}

export function installHmrTestBridge(): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  window.__KOTOR_HMR_TEST__ = {
    getPageLoadId: () => window.__KOTOR_PAGE_LOAD_ID__ || '',
    getAcceptCount: () => HotReloadManager.getHotAcceptCount(),
    isSessionActive: () => KotOR.GameState.hmrIsSessionActive(),
    getLoopGeneration: () => KotOR.GameState.hmrLoopGeneration,
    getProbeValue: () => getProbeValue(),
    activateSession: () => {
      KotOR.GameState.Ready = true;
    },
    startQuickPlayToModule: async (moduleName: string) => {
      CharGenManager.selectedClass = 0;
      await CharGenManager.Init();
      applyQuickCharacterStats();
      const creature = CharGenManager.selectedCreature;
      if (!creature) {
        throw new Error('CharGen selectedCreature not initialized');
      }
      if (!creature.initialized) {
        creature.initProperties();
      }
      creature.playerCreated = true;
      if (creature.equipment) {
        creature.equipment.ARMOR = undefined;
      }
      const equipList = creature.template.getFieldByLabel('Equip_ItemList');
      if (equipList) {
        equipList.childStructs = [];
      }
      KotOR.GameState.GlobalVariableManager.Init();
      KotOR.GameState.PartyManager.PlayerTemplate = creature.save();
      KotOR.GameState.PartyManager.ActualPlayerTemplate = KotOR.GameState.PartyManager.PlayerTemplate;
      KotOR.GameState.PartyManager.AddPortraitToOrder(creature.getPortraitResRef());
      await CurrentGame.InitGameInProgressFolder(true);
      if (KotOR.GameState.MenuManager.LoadScreen) {
        KotOR.GameState.MenuManager.LoadScreen.setHintMessage('');
      }
      await KotOR.GameState.LoadModule(moduleName);
    },
    snapshotSession: () => {
      const player = KotOR.GameState.PartyManager?.party?.[0]
        || KotOR.GameState.PartyManager?.Player;
      return {
        ready: KotOR.GameState.Ready,
        module: KotOR.GameState.module?.filename ?? null,
        area: KotOR.GameState.module?.area?.name ?? null,
        player: player ? {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        } : null,
      };
    },
  };
}
