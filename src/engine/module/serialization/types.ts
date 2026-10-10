import type { GFFObject } from '@core/resource/GFFObject';
import type { GFFStruct } from '@core/resource/GFFStruct';

/**
 * Context for Serializer.deserialize — no registration, I/O, or script execution.
 */
export interface DeserializeContext {
  /** Optional game key when K1/K2 field differences are known. */
  gameKey?: 'k1' | 'k2';
}

/**
 * Context for Serializer.serialize — emit fresh GFF from runtime fields only.
 */
export interface SerializeContext {
  /** Optional game key when K1/K2 field differences are known. */
  gameKey?: 'k1' | 'k2';
}

/**
 * Populate an already-constructed runtime object from GFF, and emit fresh GFF
 * from runtime fields. Serializers must not touch GameState, ResourceLoader,
 * NWScript, scene graph, or filesystem.
 */
export interface GameObjectSerializer<
  TObject,
  TSource = GFFObject | GFFStruct,
  TOutput = GFFObject,
> {
  deserialize(target: TObject, source: TSource, context?: DeserializeContext): void;
  serialize(source: TObject, context?: SerializeContext): TOutput;
}

/** Source root: GFFObject.RootNode or a list child GFFStruct. */
export type GffRoot = {
  hasField: (label: string) => boolean;
  getFieldByLabel: (label: string) => {
    getValue: () => any;
    getCExoLocString?: () => any;
    getChildStructs?: () => GFFStruct[];
    getOrientation?: () => { x: number; y: number; z: number; w: number };
    getVector?: () => { x: number; y: number; z: number };
  };
  type?: number;
};

export function gffRootOf(source: GFFObject | GFFStruct): GffRoot {
  const anySource = source as any;
  if (anySource?.RootNode) {
    return anySource.RootNode as GffRoot;
  }
  return source as GffRoot;
}
