import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #45: upstream-body-changed. */
export const SetCameraFacing: INWScriptDefAction = {
    comment: "45: Change the direction in which the camera is facing\n- fDirection is expressed as anticlockwise degrees from Due East.\n(0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South)\nThis can be used to change the way the camera is facing after the player\nemerges from an area transition.\n",
    name: "SetCameraFacing",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [number]){
      const camera: any = GameState.currentCamera;
      if(camera && camera.rotation){
        camera.rotation.z = (args[0] % 360) * Math.PI / 180;
      }
      return;
    }
  };

/** Upstream 002dfe03, action #506: upstream-body-changed. */
export const SetLockHeadFollowInDialog: INWScriptDefAction = {
    comment: "506: SetLockHeadFollowInDialog\nAllows the locking and undlocking of head following for an object in dialog\n- oObject - Object\n- nValue - TRUE or FALSE\n",
    name: "SetLockHeadFollowInDialog",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        (args[0] as ModuleCreature).headTrackingEnabled = !args[1];
      }
    }
  };
