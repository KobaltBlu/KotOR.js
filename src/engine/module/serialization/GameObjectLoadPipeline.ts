import { GFFObject } from '@core/resource/GFFObject';
import { ResourceLoader } from '@engine/loaders';
import { ResourceTypes } from '@core/resource/ResourceTypes';
import { gffRootOf } from '@engine/module/serialization/types';
import { readResRef } from '@engine/module/serialization/gffHelpers';

export type BlueprintResourceKey =
  | 'utc'
  | 'utd'
  | 'ute'
  | 'uti'
  | 'utm'
  | 'utp'
  | 'uts'
  | 'utt'
  | 'utw';

export type BlueprintRefField = 'TemplateResRef' | 'ResRef' | 'EquippedRes' | 'InventoryRes';

export interface BlueprintMergeOptions {
  /** Which field holds the blueprint resref on the instance GFF. */
  refField: BlueprintRefField;
  /** Resource type key in ResourceTypes. */
  resourceKey: BlueprintResourceKey;
  /** Prefer this runtime property when already seeded. */
  runtimeResRef?: string;
}

/**
 * Load-orchestration helpers that stay outside Serializer.deserialize.
 * Handles resref seeding and ut* blueprint preparation.
 */
export class GameObjectLoadPipeline {
  static seedResRefs(template: GFFObject | undefined): { templateResRef: string; resRef: string } {
    const root = template ? gffRootOf(template) : undefined;
    return {
      templateResRef: root ? readResRef(root, 'TemplateResRef') : '',
      resRef: root ? readResRef(root, 'ResRef') : '',
    };
  }

  static resolveBlueprintResRef(
    template: GFFObject | undefined,
    options: BlueprintMergeOptions,
  ): string {
    if (options.runtimeResRef) return options.runtimeResRef;
    if (!template) return '';
    const root = gffRootOf(template);
    return readResRef(root, options.refField);
  }

  /**
   * Merge blueprint fields into the instance template in place (existing load order).
   * Returns true when a blueprint buffer was found and merged.
   */
  static mergeBlueprint(
    template: GFFObject,
    options: BlueprintMergeOptions,
  ): boolean {
    const resRef = GameObjectLoadPipeline.resolveBlueprintResRef(template, options);
    if (!resRef) return false;
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes[options.resourceKey], resRef);
    if (!buffer) return false;
    const gff = new GFFObject(buffer);
    template.merge(gff);
    return true;
  }

  /**
   * Prepare an instance GFF with its referenced blueprint.
   *
   * This migration step intentionally merges in place. GFFObject.FromStruct
   * aliases the source fields, so using it as a clone could still mutate the
   * caller and could duplicate fields through mergeStruct.
   */
  static prepareMergedSource(
    instance: GFFObject,
    options: BlueprintMergeOptions,
  ): GFFObject {
    GameObjectLoadPipeline.mergeBlueprint(instance, options);
    return instance;
  }
}
