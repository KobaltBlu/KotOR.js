import type { GameObjectRuntimeContext } from '@engine/runtime/context/types';

export function createTestRuntimeContext(
  overrides: Partial<GameObjectRuntimeContext> = {},
): GameObjectRuntimeContext {
  let effectId = 1;
  const objects = new Map<number, any>();

  return {
    getModule: () => undefined,
    isReadyToProcessEvents: () => false,
    getPauseDay: () => 0,
    getPauseTime: () => 0,
    addEvent: () => undefined,
    nextEffectId: () => effectId++,
    getMode: () => undefined,
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
    createAction: () => undefined,
    actionFromStruct: () => undefined,
    effectFromStruct: () => undefined,
    createSignalEvent: () => ({}),
    createTrigger: () => undefined,
    getTrapRow: () => undefined,
    getStringById: () => undefined,
    getGroup: () => undefined,
    getCutsceneMode: () => undefined,
    areShadowsEnabled: () => true,
    getCurrentCameraPosition: () => undefined,
    cancelTimingBarFor: () => undefined,
    getAreaTransitionController: () => undefined,
    ...overrides,
  };
}
