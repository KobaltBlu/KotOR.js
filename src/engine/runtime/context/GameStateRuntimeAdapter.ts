import { GameState } from '@engine/runtime/GameState';
import type { GameObjectRuntimeContext } from '@engine/runtime/context/types';

/**
 * Compatibility adapter for runtime code that still stores its services on
 * GameState. Access remains late-bound so bootstrap can replace those services.
 */
export class GameStateRuntimeAdapter implements GameObjectRuntimeContext {
  getModule(): any | undefined {
    return GameState.module;
  }

  isReadyToProcessEvents(): boolean {
    return !!GameState.module?.readyToProcessEvents;
  }

  getPauseDay(): number {
    return GameState.module?.timeManager?.pauseDay ?? 0;
  }

  getPauseTime(): number {
    return GameState.module?.timeManager?.pauseTime ?? 0;
  }

  addEvent(event: any): void {
    GameState.module?.addEvent(event);
  }

  nextEffectId(): number {
    const module = GameState.module;
    if (!module) return 0;
    if (typeof module.effectNextId !== 'number' || Number.isNaN(module.effectNextId)) {
      module.effectNextId = 1;
    }
    return module.effectNextId++;
  }

  getMode(): any {
    return GameState.Mode;
  }

  getParty(): any[] {
    return GameState.PartyManager?.party ?? [];
  }

  getCurrentPlayer(): any | undefined {
    return GameState.PartyManager?.getCurrentPlayer?.();
  }

  getControlledNpcIndex(): number {
    return GameState.PartyManager?.ControlledNPC ?? -1;
  }

  getGold(): number {
    return GameState.PartyManager?.Gold ?? 0;
  }

  addGold(amount: number): void {
    GameState.PartyManager?.AddGold?.(amount);
  }

  register(obj: any): void {
    GameState.GameObjectManager?.RegisterObject(obj);
  }

  remove(obj: any): void {
    GameState.GameObjectManager?.RemoveObject(obj);
  }

  getById(id: number): any | undefined {
    return GameState.GameObjectManager?.GetObjectById(id);
  }

  getNextPlayerId(): number {
    return GameState.GameObjectManager?.GetNextPlayerId() ?? 0;
  }

  createAction(name: string): any | undefined {
    const Action = (GameState.ActionFactory as any)?.[name];
    return Action ? new Action() : undefined;
  }

  actionFromStruct(struct: any): any | undefined {
    return GameState.ActionFactory?.FromStruct(struct);
  }

  effectFromStruct(struct: any): any | undefined {
    return GameState.GameEffectFactory?.EffectFromStruct(struct);
  }

  createSignalEvent(): any {
    const SignalEvent = GameState.GameEventFactory?.EventSignalEvent;
    return SignalEvent ? new SignalEvent() : undefined;
  }

  createTrigger(): any | undefined {
    const Trigger = GameState.Module?.Area?.Trigger;
    return Trigger ? new Trigger() : undefined;
  }

  getTrapRow(id: number): any {
    return GameState.SWRuleSet?.traps?.[id];
  }

  getStringById(id: number): string | undefined {
    return GameState.TLKManager?.GetStringById?.(id)?.Value;
  }

  getGroup(): any {
    return GameState.group;
  }

  getCutsceneMode(): any {
    return GameState.CutsceneManager?.cutsceneMode;
  }

  areShadowsEnabled(): boolean {
    return GameState.areShadowsEnabled?.() ?? false;
  }

  getCurrentCameraPosition(): any | undefined {
    return GameState.currentCamera ? GameState.currentCameraPosition : undefined;
  }

  cancelTimingBarFor(object: any): void {
    GameState.GuiTimingBarManager?.cancelFor?.(object);
  }

  getAreaTransitionController(): any | undefined {
    return GameState.MenuManager?.InGameAreaTransition;
  }
}
