import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import type { GffRoot } from '@engine/module/serialization/types';
import * as THREE from 'three';

export interface PartyFollowInfoDto {
  followObject: number;
  followLocation: THREE.Vector3;
  lastLeaderPos: THREE.Vector3;
  lastFollowerPos: THREE.Vector3;
  maxSpeed: number;
  stickToPos: number;
  result: number;
  timeElapsed: number;
  inSafetyRange: number;
}

export function createDefaultPartyFollowInfoDto(): PartyFollowInfoDto {
  return {
    followObject: GameObjectConstant.OBJECT_INVALID,
    followLocation: new THREE.Vector3(0, 0, 0),
    lastLeaderPos: new THREE.Vector3(0, 0, 0),
    lastFollowerPos: new THREE.Vector3(0, 0, 0),
    maxSpeed: 0,
    stickToPos: 0,
    result: 2,
    timeElapsed: 0,
    inSafetyRange: 0,
  };
}

/**
 * Party-member FollowInfo struct ↔ DTO.
 */
export class PartyFollowInfoSerializer {
  static read(root: GffRoot): PartyFollowInfoDto | undefined {
    if (!root.hasField('FollowInfo')) return undefined;
    const followStruct = root.getFieldByLabel('FollowInfo').getChildStructs?.()?.[0];
    if (!followStruct) return undefined;

    const info = createDefaultPartyFollowInfoDto();
    if (followStruct.hasField('FollowObject')) {
      info.followObject = followStruct.getFieldByLabel('FollowObject').getValue() >>> 0;
    }
    if (followStruct.hasField('FollowLocation')) {
      info.followLocation.copy(
        followStruct.getFieldByLabel('FollowLocation').getVector?.() as THREE.Vector3,
      );
    }
    if (followStruct.hasField('LastLeaderPos')) {
      info.lastLeaderPos.copy(
        followStruct.getFieldByLabel('LastLeaderPos').getVector?.() as THREE.Vector3,
      );
    }
    if (followStruct.hasField('LastFollowerPos')) {
      info.lastFollowerPos.copy(
        followStruct.getFieldByLabel('LastFollowerPos').getVector?.() as THREE.Vector3,
      );
    }
    if (followStruct.hasField('MaxSpeed')) {
      info.maxSpeed = followStruct.getFieldByLabel('MaxSpeed').getValue();
    }
    if (followStruct.hasField('StickToPos')) {
      info.stickToPos = followStruct.getFieldByLabel('StickToPos').getValue() | 0;
    }
    if (followStruct.hasField('Result')) {
      info.result = followStruct.getFieldByLabel('Result').getValue() >>> 0;
    }
    if (followStruct.hasField('TimeElapsed')) {
      info.timeElapsed = followStruct.getFieldByLabel('TimeElapsed').getValue() >>> 0;
    }
    if (followStruct.hasField('InSafetyRange')) {
      info.inSafetyRange = followStruct.getFieldByLabel('InSafetyRange').getValue() | 0;
    }
    return info;
  }

  static writeField(
    parent: { addField: (f: GFFField) => GFFField },
    follow: PartyFollowInfoDto,
  ): void {
    const followField = parent.addField(new GFFField(GFFDataType.STRUCT, 'FollowInfo'));
    const followStruct = new GFFStruct(0);
    followStruct
      .addField(new GFFField(GFFDataType.DWORD, 'FollowObject'))
      .setValue(follow.followObject >>> 0);
    followStruct
      .addField(new GFFField(GFFDataType.VECTOR, 'FollowLocation'))
      .setValue(follow.followLocation.clone());
    followStruct
      .addField(new GFFField(GFFDataType.VECTOR, 'LastLeaderPos'))
      .setValue(follow.lastLeaderPos.clone());
    followStruct
      .addField(new GFFField(GFFDataType.VECTOR, 'LastFollowerPos'))
      .setValue(follow.lastFollowerPos.clone());
    followStruct.addField(new GFFField(GFFDataType.FLOAT, 'MaxSpeed')).setValue(follow.maxSpeed);
    followStruct
      .addField(new GFFField(GFFDataType.BYTE, 'StickToPos'))
      .setValue(follow.stickToPos | 0);
    followStruct.addField(new GFFField(GFFDataType.DWORD, 'Result')).setValue(follow.result >>> 0);
    followStruct
      .addField(new GFFField(GFFDataType.DWORD, 'TimeElapsed'))
      .setValue(follow.timeElapsed >>> 0);
    followStruct
      .addField(new GFFField(GFFDataType.BYTE, 'InSafetyRange'))
      .setValue(follow.inSafetyRange | 0);
    followField.addChildStruct(followStruct);
  }
}
