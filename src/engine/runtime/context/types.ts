export interface DeserializeRuntimeContext {
  actionFromStruct?: (struct: any) => any | undefined;
  effectFromStruct?: (struct: any) => any | undefined;
  gameKey?: 'k1' | 'k2';
  controlledNpcIndex?: number;
}

export interface ModuleSimulationContext {
  getModule(): any | undefined;
  isReadyToProcessEvents(): boolean;
  getPauseDay(): number;
  getPauseTime(): number;
  addEvent(event: any): void;
  nextEffectId(): number;
  getMode(): any;
  getGameKey(): 'k1' | 'k2';
  getAiScheduler(): any | undefined;
  toDeserializeContext(): DeserializeRuntimeContext;
  isLoadingSave(): boolean;
}

export interface PartyContext {
  getParty(): any[];
  getCurrentPlayer(): any | undefined;
  getControlledNpcIndex(): number;
  getGold(): number;
  addGold(amount: number): void;
}

export interface ObjectRegistryContext {
  register(obj: any): void;
  remove(obj: any): void;
  getById(id: number): any | undefined;
  getNextPlayerId?(): number;
}

export interface GameFactoriesContext {
  createAction(name: string, ...args: any[]): any | undefined;
  actionFromStruct(struct: any): any | undefined;
  effectFromStruct(struct: any): any | undefined;
  createSignalEvent(): any;
  createTrigger(): any | undefined;
  createMiniGamePlayer?(template?: any): any | undefined;
}

export interface RulesDataContext {
  getTrapRow?(id: number): any;
  getStringById?(id: number): string | undefined;
  getSWRuleSet?(): any | undefined;
  getRules?(): any | undefined;
}

export interface PresentationContext {
  getGroup(): any;
  getCutsceneMode(): any;
  areShadowsEnabled(): boolean;
  getCurrentCameraPosition(): any | undefined;
  cancelTimingBarFor(object: any): void;
  getAreaTransitionController(): {
    setTransitionObject(object: any): void;
    unsetTransitionObject(object: any): void;
  } | undefined;
}

export type GameObjectRuntimeContext = ModuleSimulationContext &
  ObjectRegistryContext &
  GameFactoriesContext &
  Partial<PartyContext> &
  RulesDataContext &
  Partial<PresentationContext>;
