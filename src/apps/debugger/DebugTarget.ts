/**
 * Universal debugger navigation target.
 * Panels call DebuggerState.navigate(target); each view reacts to what it understands.
 */
export type DebugNavigateActivity = 'scene' | 'module' | 'objects' | 'globals' | 'scripts' | 'dialog';

export type DebugTarget = {
  activity?: DebugNavigateActivity;
  objectId?: number;
  scriptKey?: string;
  resref?: string;
  mapId?: string;
  instanceUuid?: string;
  /** Seek when opening / focusing a script instance. */
  instructionOffset?: number;
  /** Owner metadata for script filter when detail snapshot is not in hand. */
  ownerTag?: string;
  ownerLabel?: string;
  ownerKind?: string;
};
