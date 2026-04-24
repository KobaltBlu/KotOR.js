import type { IOdysseyModelLoaderOptions } from '@/interface/odyssey';
import type { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';
import type { OdysseyModel } from '@/odyssey/OdysseyModel';
import type { Object3D } from 'three';

/**
 * Mutable parse-time flags (not part of {@link IOdysseyModelLoaderOptions}) so loader options
 * stay immutable during MDL → THREE conversion.
 */
export interface NodeParseFlags {
  /** True once a node matches `modelName + 'a'` (animation dummy root for merged room models). */
  isChildrenDynamic: boolean;
}

/**
 * Static methods on {@link OdysseyModel3D} passed in to avoid a circular import between
 * the parser module and {@link OdysseyModel3D}.
 */
export interface OdysseyModel3DParseBuilders {
  NodeMeshBuilder: (
    odysseyModel: OdysseyModel3D,
    parentNode: Object3D,
    odysseyNode: any,
    options: IOdysseyModelLoaderOptions
  ) => void;
  NodeLightBuilder: (
    odysseyModel: OdysseyModel3D,
    parentNode: Object3D,
    odysseyNode: any,
    options: IOdysseyModelLoaderOptions
  ) => any;
  FromMDL: (model: OdysseyModel, options?: IOdysseyModelLoaderOptions) => Promise<OdysseyModel3D>;
}

/**
 * Context for {@link parseOdysseyNode}: frozen loader options, parse-scoped flags, and
 * {@link OdysseyModel3D} builder hooks (injected from {@link OdysseyModel3D.FromMDL}).
 */
export interface NodeParseContext {
  readonly options: IOdysseyModelLoaderOptions;
  flags: NodeParseFlags;
  readonly builders: OdysseyModel3DParseBuilders;
}

export function createNodeParseContext(
  options: IOdysseyModelLoaderOptions,
  builders: OdysseyModel3DParseBuilders
): NodeParseContext {
  return {
    options,
    flags: { isChildrenDynamic: false },
    builders,
  };
}
