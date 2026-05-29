import * as KotOR from '@/apps/game/KotOR';
import { HotReloadManager } from '@/dev/HotReloadManager';

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
    snapshotSession: () => {
      const player = KotOR.GameState.PartyManager?.party?.[0]
        || KotOR.GameState.PartyManager?.Player;
      return {
        ready: KotOR.GameState.Ready,
        module: KotOR.GameState.module?.name ?? null,
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
