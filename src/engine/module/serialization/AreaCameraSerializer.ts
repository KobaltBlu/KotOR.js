import { GFFObject } from '@core/resource/GFFObject';
import type { AreaCamera } from '@engine/module/AreaCamera';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addFloat,
  addInt,
  addOrientation,
  addVector,
  readFloat,
  readInt,
  readOrientation,
  readVector,
} from '@engine/module/serialization/gffHelpers';

/**
 * Area camera GIT serializer (struct type 14).
 * VECTOR Position, ORIENTATION quaternion, FLOAT fov/height/pitch/micRange.
 */
export class AreaCameraSerializer implements GameObjectSerializer<AreaCamera, GFFObject, GFFObject> {
  deserialize(target: AreaCamera, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);

    if (root.hasField('CameraID')) target.cameraID = readInt(root, 'CameraID');
    if (root.hasField('FieldOfView')) target.fov = readFloat(root, 'FieldOfView');
    if (root.hasField('Height')) target.height = readFloat(root, 'Height');
    if (root.hasField('MicRange')) target.micRange = readFloat(root, 'MicRange');

    const orientation = readOrientation(root, 'Orientation');
    if (orientation) {
      target.orientation.set(orientation.x, orientation.y, orientation.z, orientation.w);
    }

    if (root.hasField('Pitch')) target.pitch = readFloat(root, 'Pitch');

    const position = readVector(root, 'Position');
    if (position) {
      target.position.set(position.x, position.y, position.z);
    }

  }

  serialize(source: AreaCamera, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.type = 14;

    addInt(gff.RootNode, 'CameraID', source.cameraID);
    // SavePlaceableCameras — FieldOfView / Height / Pitch are FLOAT
    addFloat(gff.RootNode, 'FieldOfView', source.fov);
    addFloat(gff.RootNode, 'Height', source.height);
    addFloat(gff.RootNode, 'MicRange', source.micRange);
    addOrientation(gff.RootNode, 'Orientation', {
      x: source.orientation.x,
      y: source.orientation.y,
      z: source.orientation.z,
      w: source.orientation.w,
    });
    addFloat(gff.RootNode, 'Pitch', source.pitch);
    addVector(gff.RootNode, 'Position', {
      x: source.position.x,
      y: source.position.y,
      z: source.position.z,
    });

    return gff;
  }
}

export const areaCameraSerializer = new AreaCameraSerializer();
