/**
 * Blueprint preparation preserves the instance-first merge contract.
 * @jest-environment node
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { ResourceLoader } from '@engine/loaders';
import { GameObjectLoadPipeline } from '@engine/module/serialization/GameObjectLoadPipeline';

describe('GameObjectLoadPipeline', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps instance fields, fills missing blueprint fields, and merges in place', () => {
    const instance = new GFFObject();
    instance.RootNode.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef'))
      .setValue('test_blueprint');
    instance.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag'))
      .setValue('instance_tag');

    const blueprint = new GFFObject();
    blueprint.FileType = 'UTP ';
    blueprint.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag'))
      .setValue('blueprint_tag');
    blueprint.RootNode.addField(new GFFField(GFFDataType.INT, 'HP')).setValue(25);
    jest.spyOn(ResourceLoader, 'loadCachedResource')
      .mockReturnValue(blueprint.getExportBuffer());

    const prepared = GameObjectLoadPipeline.prepareMergedSource(instance, {
      refField: 'TemplateResRef',
      resourceKey: 'utp',
    });

    expect(prepared).toBe(instance);
    expect(instance.RootNode.getFieldByLabel('Tag').getValue()).toBe('instance_tag');
    expect(instance.RootNode.getFieldByLabel('HP').getValue()).toBe(25);
    // Current behavior is intentionally in-place; callers retain the merged template.
    expect(instance.RootNode.getFields().filter((field) => field.label === 'Tag')).toHaveLength(2);
  });
});
