import * as THREE from "three";
import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #104: upstream-body-changed. */
export const VectorMagnitude: INWScriptDefAction = {
    comment: "104: Get the magnitude of vVector; this can be used to determine the\ndistance between two points.\n* Return value on error: 0.0f\n",
    name: "VectorMagnitude",
    type: NWScriptDataType.FLOAT,
    args: [NWScriptDataType.VECTOR],
    action: function(this: NWScriptInstance, args: [THREE.Vector3]){
      if(!args[0]) return 0.0;
      return args[0].length();
    }
  };

/** Upstream 002dfe03, action #141: upstream-body-changed. */
export const PrintVector: INWScriptDefAction = {
    comment: "141: Output vVector to the logfile.\n- vVector\n- bPrepend: if this is TRUE, the message will be prefixed with 'PRINTVECTOR:'\n",
    name: "PrintVector",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.VECTOR, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [THREE.Vector3, number]){
      const v = args[0];
      if(!v) return;
      console.log(`${args[1] ? 'PRINTVECTOR:' : ''} x=${v.x} y=${v.y} z=${v.z}`);
      return;
    }
  };

/** Upstream 002dfe03, action #144: upstream-body-changed. */
export const AngleToVector: INWScriptDefAction = {
    comment: "144: Convert fAngle to a vector\n",
    name: "AngleToVector",
    type: NWScriptDataType.VECTOR,
    args: [NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [number]){
      const radians = (args[0] % 360) * Math.PI / 180;
      return new THREE.Vector3(Math.cos(radians), Math.sin(radians), 0.0);
    }
  };

/** Upstream 002dfe03, action #145: upstream-body-changed. */
export const VectorToAngle: INWScriptDefAction = {
    comment: "145: Convert vVector to an angle\n",
    name: "VectorToAngle",
    type: NWScriptDataType.FLOAT,
    args: [NWScriptDataType.VECTOR],
    action: function(this: NWScriptInstance, args: [THREE.Vector3]){
      if(!args[0]) return 0.0;
      let degrees = Math.atan2(args[0].y, args[0].x) * 180 / Math.PI;
      if(degrees < 0) degrees += 360;
      return degrees;
    }
  };
