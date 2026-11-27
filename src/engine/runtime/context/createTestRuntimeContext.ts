import type { GameObjectRuntimeContext } from '@engine/runtime/context/types';

export function createTestRuntimeContext(
  overrides: Partial<GameObjectRuntimeContext> = {},
): GameObjectRuntimeContext {
  let effectId = 1;
  const objects = new Map<number, any>();

  const context: GameObjectRuntimeContext = {
    getModule: () => undefined,
    isReadyToProcessEvents: () => false,
    getPauseDay: () => 0,
    getPauseTime: () => 0,
    addEvent: () => undefined,
    nextEffectId: () => effectId++,
    getMode: () => undefined,
    getGameKey: () => 'k1',
    getAiScheduler: () => undefined,
    toDeserializeContext: () => ({
      actionFromStruct: (struct: any) => context.actionFromStruct(struct),
      effectFromStruct: (struct: any) => context.effectFromStruct(struct),
      gameKey: context.getGameKey(),
      controlledNpcIndex: context.getControlledNpcIndex?.() ?? -1,
    }),
    isLoadingSave: () => false,
    getParty: () => [],
    getCurrentPlayer: () => undefined,
    getControlledNpcIndex: () => -1,
    getGold: () => 0,
    addGold: () => undefined,
    register: (obj: any) => {
      if (obj?.id != null) objects.set(obj.id, obj);
    },
    remove: (obj: any) => {
      if (obj?.id != null) objects.delete(obj.id);
    },
    getById: (id: number) => objects.get(id),
    getNextPlayerId: () => 0,
    createAction: (_name: string, ..._args: any[]) => undefined,
    actionFromStruct: () => undefined,
    effectFromStruct: () => undefined,
    createSignalEvent: () => ({}),
    createTrigger: () => undefined,
    createMiniGamePlayer: () => undefined,
    getTrapRow: () => undefined,
    getStringById: () => undefined,
    getSWRuleSet: () => undefined,
    getRules: () => undefined,
    getGroup: () => undefined,
    getCutsceneMode: () => undefined,
    areShadowsEnabled: () => true,
    getCurrentCameraPosition: () => undefined,
    cancelTimingBarFor: () => undefined,
    getAreaTransitionController: () => undefined,
    ...overrides,
  };

  if (!overrides.toDeserializeContext) {
    context.toDeserializeContext = () => ({
      actionFromStruct: (struct: any) => context.actionFromStruct(struct),
      effectFromStruct: (struct: any) => context.effectFromStruct(struct),
      gameKey: context.getGameKey(),
      controlledNpcIndex: context.getControlledNpcIndex?.() ?? -1,
    });
  }

  if (!overrides.getRules && overrides.getSWRuleSet) {
    context.getRules = () => context.getSWRuleSet?.();
  } else if (!overrides.getSWRuleSet && overrides.getRules) {
    context.getSWRuleSet = () => context.getRules?.();
  } else if (!overrides.getRules) {
    context.getRules = () => context.getSWRuleSet?.();
  }

  return context;
}
