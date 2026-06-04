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
      inspectCreatures(): {
        player: CreatureInspectSummary | null;
        headlessHumanoids: CreatureInspectSummary[];
        proneOrDead: CreatureInspectSummary[];
        animationMissing: CreatureInspectSummary[];
        totalCreatures: number;
      };
      nudgePlayer(dx: number, dy: number): void;
      isBootstrapReady(): boolean;
      isQuickPlayReady(): boolean;
      skipIntroMovies(): void;
      getBootstrapStatus(): {
        gameReady: boolean;
        twoDACount: number;
        hasHeadsTable: boolean;
        rulesetHeads: number;
      };
    };
  }
}

type CreatureInspectSummary = {
  tag: string;
  appearance: number;
  modeltype: string;
  normalhead: number;
  hasHead: boolean;
  headAttached: boolean;
  hasHeadhook: boolean;
  animState: number;
  animName: string | null;
  currentAnim: string | null;
  isDead: boolean;
};

function getProbeValue(): number {
  if (window.__KOTOR_HMR_PROBE_VALUE__ !== undefined) {
    return window.__KOTOR_HMR_PROBE_VALUE__;
  }
  return require('@/dev/HmrTestProbe').HMR_PROBE as number;
}

function waitForInGameModule(timeoutMs = 300000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      const gs = KotOR.GameState;
      const inGame = !gs.loadingModule
        && !!gs.module?.filename
        && gs.Mode === KotOR.EngineMode.INGAME
        && !!gs.module.readyToProcessEvents;
      if (inGame) {
        resolve();
        return;
      }
      if (performance.now() - started > timeoutMs) {
        reject(new Error(
          `Module not ready after ${timeoutMs}ms (loadingModule=${gs.loadingModule}, mode=${gs.Mode}, readyToProcessEvents=${gs.module?.readyToProcessEvents})`,
        ));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function getPlayerCreature(): any {
  return KotOR.GameState.PartyManager?.Player
    || KotOR.GameState.PartyManager?.party?.[0];
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
      const headsTable = KotOR.GameState.TwoDAManager.datatables.get('heads');
      if (!headsTable?.rows?.length) {
        throw new Error('Game bootstrap incomplete: 2DA tables not loaded yet');
      }
      if (!KotOR.GameState.SWRuleSet.heads?.length) {
        KotOR.GameState.SWRuleSet.Init();
        KotOR.GameState.AppearanceManager.Init();
      }
      if (!KotOR.GameState.Ready) {
        KotOR.GameState.Ready = true;
      }
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
      await waitForInGameModule();
    },
    snapshotSession: () => {
      const player = getPlayerCreature();
      const inGame = !KotOR.GameState.loadingModule
        && KotOR.GameState.Mode === KotOR.EngineMode.INGAME
        && !!KotOR.GameState.module?.readyToProcessEvents;
      return {
        ready: KotOR.GameState.Ready && inGame,
        module: KotOR.GameState.module?.filename ?? null,
        area: KotOR.GameState.module?.area?.name ?? null,
        player: player ? {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        } : null,
      };
    },
    inspectCreatures: () => {
      const summarize = (creature: any): CreatureInspectSummary => ({
        tag: creature.getTag?.() || creature.tag || '',
        appearance: creature.appearance ?? -1,
        modeltype: creature.creatureAppearance?.modeltype ?? '',
        normalhead: creature.creatureAppearance?.normalhead ?? -1,
        hasHead: !!creature.head,
        headAttached: !!creature.head?.parent,
        hasHeadhook: !!creature.model?.headhook,
        animState: creature.animationState?.index ?? -1,
        animName: creature.animationState?.animation?.name ?? null,
        currentAnim: creature.model?.getAnimationName?.() ?? null,
        isDead: !!creature.isDead?.(),
      });

      const creatures = (KotOR.GameState.module?.area?.creatures ?? []) as InstanceType<typeof KotOR.ModuleCreature>[];
      const summaries = creatures.map(summarize);
      const player = getPlayerCreature();

      return {
        player: player ? summarize(player as InstanceType<typeof KotOR.ModuleCreature>) : null,
        headlessHumanoids: summaries.filter(c => c.modeltype === 'B' && c.normalhead >= 0 && !c.hasHead),
        proneOrDead: summaries.filter(c => [10006, 10008, 10139, 10156].includes(c.animState) || c.isDead),
        animationMissing: summaries.filter(c => !c.animName && c.animState !== 10000),
        totalCreatures: summaries.length,
      };
    },
    nudgePlayer: (dx: number, dy: number) => {
      const player = getPlayerCreature();
      if (!player) {
        return;
      }
      player.position.x += dx;
      player.position.y += dy;
      if (player.container) {
        player.container.position.set(player.position.x, player.position.y, player.position.z);
      }
    },
    isBootstrapReady: () => KotOR.GameState.Ready,
    isQuickPlayReady: () => {
      const headsTable = KotOR.GameState.TwoDAManager?.datatables?.get('heads');
      if (!headsTable?.rows?.length) {
        return false;
      }
      if (!KotOR.GameState.SWRuleSet.heads?.length) {
        KotOR.GameState.SWRuleSet.Init();
        KotOR.GameState.AppearanceManager.Init();
      }
      return KotOR.GameState.SWRuleSet.heads?.length > 0;
    },
    skipIntroMovies: () => {
      const vm = KotOR.GameState.VideoManager ?? KotOR.VideoManager;
      vm?.clearMovieQueue?.();
      if (KotOR.GameState.Mode === KotOR.EngineMode.MOVIE) {
        KotOR.GameState.RestoreEnginePlayMode();
      }
    },
    getBootstrapStatus: () => ({
      gameReady: KotOR.GameState.Ready,
      twoDACount: KotOR.GameState.TwoDAManager?.datatables?.size ?? 0,
      hasHeadsTable: !!KotOR.GameState.TwoDAManager?.datatables?.get('heads')?.rows?.length,
      rulesetHeads: KotOR.GameState.SWRuleSet?.heads?.length ?? 0,
    }),
  };
}
