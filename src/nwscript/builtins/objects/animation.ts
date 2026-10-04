import * as THREE from "three";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ExperienceType } from "@/enums/engine/ExperienceType";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { TalentObjectType } from "@/enums/engine/TalentObjectType";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";
import EngineLocation from "@/engine/EngineLocation";
import { GameState } from "@/GameState";
import { ResourceLoader } from "@/loaders";
import type { ModuleArea, ModuleCreature, ModuleItem, ModuleObject, ModulePlaceable, ModuleStore, ModuleTrigger } from "@/module";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { AudioEngine } from "@/audio/AudioEngine";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, locationParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";
export const PlayAnimation = defineAction({
  id: 300,
  name: "PlayAnimation",
  comment: "300: Play nAnimation immediately (adds to front of queue).",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nAnimation"),
    floatParam("fSpeed", { optional: true, default: 1.0 }),
    floatParam("fSeconds", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, nAnimation, fSpeed, fSeconds) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      const action = new GameState.ActionFactory.ActionPlayAnimation();
      action.setParameter(0, ActionParameterType.INT, this.caller.getAnimationNameById(nAnimation));
      action.setParameter(1, ActionParameterType.FLOAT, fSpeed);
      action.setParameter(2, ActionParameterType.FLOAT, fSeconds);
      this.caller.actionQueue.addFront(action);
    }
  },
});

export const SetLightsaberPowered = defineAction({
  id: 421,
  name: "SetLightsaberPowered",
  comment: "421: SetLightsaberPowered\nAllows a script to set the state of the lightsaber.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("bOverride"),
    intParam("bPowered", { optional: true, default: 1 }),
    intParam("bUnkown", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, bOverride, bPowered, bUnkown) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      (oCreature as ModuleCreature).weaponPowered(true);
    }
  },
});

export const PlayRoomAnimation = defineAction({
  id: 738,
  name: "PlayRoomAnimation",
  comment: "738: PlayRoomAnimation\nPlays a looping animation on a room.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("sRoomName"), intParam("nAnimation")] as const,
  kotor(this: NWScriptInstance, sRoomName, nAnimation) {
    for (let i = 0, len = GameState.module.area.rooms.length; i < len; i++) {
      const room = GameState.module.area.rooms[i];
      if (room.roomName.toLowerCase() === sRoomName.toLowerCase()) {
        if (room.model) {
          room.model.playAnimation("scriptloop" + Utility.PadInt(nAnimation, 2));
        }
        break;
      }
    }
  },
});

export const animationObjectActions = [
  PlayAnimation,
  SetLightsaberPowered,
  PlayRoomAnimation,
] as const;
