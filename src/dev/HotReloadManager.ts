import { GameState } from '@/GameState';

let hotAcceptCount = 0;
let sessionPreserved = false;

/**
 * Coordinates dev HMR boundaries for the live game session.
 * Keeps Three.js / GameState alive across module hot swaps.
 */
export class HotReloadManager {
  static shouldSkipBootstrap(): boolean {
    return GameState.hmrIsSessionActive() || HotReloadManager.isBootstrapInProgress();
  }

  static isBootstrapInProgress(): boolean {
    try {
      // Lazy require avoids a circular import with AppState at module load time.
      const { AppState } = require('@/apps/game/states/AppState') as typeof import('@/apps/game/states/AppState');
      return AppState.initStarted;
    } catch {
      return false;
    }
  }

  static onHotAccept(): void {
    hotAcceptCount += 1;
    sessionPreserved = GameState.hmrIsSessionActive();
    GameState.hmrInvalidateLoop();
    GameState.module?.area?.invalidateAreaObjectScriptSlots();
    GameState.ensureUpdateLoop();
  }

  static preserveSession(): void {
    sessionPreserved = GameState.hmrIsSessionActive();
    GameState.hmrInvalidateLoop();
    GameState.ensureUpdateLoop();
  }

  static wasSessionPreserved(): boolean {
    return sessionPreserved;
  }

  static getHotAcceptCount(): number {
    return hotAcceptCount;
  }

  static resetForTests(): void {
    hotAcceptCount = 0;
    sessionPreserved = false;
  }
}
