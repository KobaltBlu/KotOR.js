import { GameState } from '@/GameState';

let hotAcceptCount = 0;
let sessionPreserved = false;

/**
 * Coordinates dev HMR boundaries for the live game session.
 * Keeps Three.js / GameState alive across module hot swaps.
 */
export class HotReloadManager {
  static shouldSkipBootstrap(): boolean {
    return GameState.hmrIsSessionActive();
  }

  static onHotAccept(): void {
    hotAcceptCount += 1;
    sessionPreserved = GameState.hmrIsSessionActive();
    GameState.hmrInvalidateLoop();
    // Simulated/dev-only sessions may set Ready without running full Init() (no clock yet).
    if (GameState.hmrIsSessionActive() && GameState.clock) {
      GameState.Update();
    }
  }

  static preserveSession(): void {
    sessionPreserved = GameState.hmrIsSessionActive();
    GameState.hmrInvalidateLoop();
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
