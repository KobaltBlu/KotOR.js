import * as KotOR from '@/apps/game/KotOR';
import { HotReloadManager } from '@/dev/HotReloadManager';
import { CurrentGame } from '@/engine/CurrentGame';

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

function portraitResRefFromTemplate(template: InstanceType<typeof KotOR.GFFObject>): string {
  const portraitId = template.getFieldByLabel('PortraitId')?.getValue?.() ?? 0;
  const portrait = KotOR.GameState.SWRuleSet.portraits?.[portraitId];
  return portrait?.baseresref || 'po_player';
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
      KotOR.GameState.GlobalVariableManager.Init();
      const template = KotOR.GameState.PartyManager.GeneratePlayerTemplate();
      KotOR.GameState.PartyManager.PlayerTemplate = template;
      KotOR.GameState.PartyManager.ActualPlayerTemplate = template;
      KotOR.GameState.PartyManager.AddPortraitToOrder(portraitResRefFromTemplate(template));
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
