import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import * as THREE from 'three';
import { GameState } from "../GameState";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { GameEffect } from "./GameEffect";

/**
 * EffectForcePushed class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectForcePushed.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectForcePushed extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForcePushed;

    //intList[0] : bIsForcePushedTargeted
    //intList[1] : bIgnoreTestDirectLine

    //floatList[0] : fTargetedLocationX
    //floatList[1] : fTargetedLocationY
    //floatList[2] : fTargetedLocationZ
  }

  update(delta: number = 0){
    super.update(delta);

    if(this.durationEnded && this.getDurationType() == GameEffectDurationType.TEMPORARY){
      return;
    }
  }

  onApply(){
    if(this.applied)
      return;
    
    super.onApply();

    if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature)){

      if(!this.getInt(0)){

        const fpDirX = -Math.cos(this.object.facing + Math.PI/2);
        const fpDirY = -Math.sin(this.object.facing + Math.PI/2);
        let fPushDistance = 5.0;
        this.setFloat(0, this.object.position.x + (fPushDistance * fpDirX));
        this.setFloat(1, this.object.position.y + (fPushDistance* fpDirY));
        this.setFloat(2, this.object.position.z + 0.0);

        const destination = new THREE.Vector3(this.getFloat(0), this.getFloat(1), this.getFloat(2));
        let validated = this.validateWalkablePosition(destination);

        while(!validated.face && fPushDistance > 0){
          fPushDistance -= 1;
          this.setFloat(0, this.object.position.x + (fPushDistance * fpDirX));
          this.setFloat(1, this.object.position.y + (fPushDistance * fpDirY));
          this.setFloat(2, this.object.position.z + 0.0);
          destination.set(this.getFloat(0), this.getFloat(1), this.getFloat(2));
          validated = this.validateWalkablePosition(destination);
        }

        //TODO: Test collision with world obstacles if bIgnoreTestDirectLine is false

        if(validated.face){
          this.setFloat(0, validated.closestPoint.x);
          this.setFloat(1, validated.closestPoint.y);
          this.setFloat(2, validated.closestPoint.z + 0.005);
        }

      }

      this.object.fp_push_played = false;
      this.object.fp_land_played = false;
      this.object.fp_getup_played = false;

      const eSetState = new GameState.GameEffectFactory.EffectSetState();
      eSetState.setDurationType(GameEffectDurationType.TEMPORARY);
      const eFutureTime = GameState.module.timeManager.getFutureTimeFromSeconds(3);
      eSetState.setExpireDay(eFutureTime.day);
      eSetState.setExpireTime(eFutureTime.pauseTime);
      eSetState.setDuration(3);
      eSetState.setCreator(this.object);
      eSetState.setSpellId(this.getSpellId());
      eSetState.setSkipOnLoad(true);
      eSetState.setInt(0, 9); // Force Pushed State
      eSetState.setFloat(0, this.object.position.x);
      eSetState.setFloat(1, this.object.position.y);
      eSetState.setFloat(2, this.object.position.z);
      eSetState.setFloat(3, this.getFloat(0));
      eSetState.setFloat(4, this.getFloat(1));
      eSetState.setFloat(5, this.getFloat(2));
      eSetState.setFloat(6, Math.sqrt( Math.abs( this.object.position.x - this.getFloat(0) ) + Math.abs( this.object.position.y - this.getFloat(1) ) ) );
      eSetState.initialize();
      this.object.addEffect(eSetState);

    }

  }

  validateWalkablePosition( position = new THREE.Vector3 ){
    let face;
    let room;
    let surfaceId = -1;
    let closestPoint = new THREE.Vector3();
    for(let i = 0, il = GameState.module.area.rooms.length; i < il; i++){
      room = GameState.module.area.rooms[i];
      if(room.collisionData.walkmesh){
        for(let j = 0, jl = room.collisionData.walkmesh.walkableFaces.length; j < jl; j++){
          face = room.collisionData.walkmesh.walkableFaces[j];
          if(face.triangle.containsPoint(position)){
            surfaceId = face.walkIndex;
            face.triangle.closestPointToPoint(position, closestPoint);
            return {
              face: face,
              surfaceId: surfaceId,
              closestPoint: closestPoint
            };
          }
        }
      }
    }
    return {
      face: undefined,
      surfaceId: -1,
      closestPoint: undefined
    };
  }

}

