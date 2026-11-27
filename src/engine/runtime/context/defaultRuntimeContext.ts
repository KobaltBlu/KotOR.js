import { GameStateRuntimeAdapter } from '@engine/runtime/context/GameStateRuntimeAdapter';
import type { GameObjectRuntimeContext } from '@engine/runtime/context/types';

let defaultRuntimeContext: GameObjectRuntimeContext | undefined;

export function getDefaultRuntimeContext(): GameObjectRuntimeContext {
  if (!defaultRuntimeContext) {
    defaultRuntimeContext = new GameStateRuntimeAdapter();
  }
  return defaultRuntimeContext;
}

export function setDefaultRuntimeContext(context: GameObjectRuntimeContext): void {
  defaultRuntimeContext = context;
}
