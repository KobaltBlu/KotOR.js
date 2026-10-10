/**
 * AreaCameraSerializer vector/quaternion field round-trip.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {},
}));

jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: {} }));

import { AreaCamera } from '@engine/module/AreaCamera';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFField } from '@core/resource/GFFField';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { areaCameraSerializer } from '@engine/module/serialization/AreaCameraSerializer';

describe('AreaCameraSerializer', () => {
  function makeTemplate(): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.addField(new GFFField(GFFDataType.INT, 'CameraID')).setValue(7);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'FieldOfView')).setValue(55);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Height')).setValue(1.8);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'MicRange')).setValue(10);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Pitch')).setValue(0.2);
    gff.RootNode.addField(new GFFField(GFFDataType.VECTOR, 'Position')).setValue({ x: 1, y: 2, z: 3 });
    gff.RootNode.addField(new GFFField(GFFDataType.ORIENTATION, 'Orientation')).setValue({
      x: 0, y: 0, z: 0, w: 1,
    });
    return gff;
  }

  it('deserializes camera id and transform fields', () => {
    const cam = new AreaCamera(makeTemplate());
    areaCameraSerializer.deserialize(cam, cam.template);
    expect(cam.cameraID).toBe(7);
    expect(cam.fov).toBeCloseTo(55, 5);
    expect(cam.position.x).toBeCloseTo(1, 5);
    expect(cam.position.y).toBeCloseTo(2, 5);
    expect(cam.position.z).toBeCloseTo(3, 5);
  });

  it('round-trips after runtime mutation', () => {
    const cam = new AreaCamera(makeTemplate());
    areaCameraSerializer.deserialize(cam, cam.template);
    cam.cameraID = 9;
    cam.fov = 70;
    cam.position.set(4, 5, 6);

    const out = areaCameraSerializer.serialize(cam);
    expect(out.RootNode.type).toBe(14);
    expect(out.RootNode.getFieldByLabel('CameraID').getValue()).toBe(9);
    expect(out.RootNode.getFieldByLabel('FieldOfView').getValue()).toBeCloseTo(70, 5);
  });
});
