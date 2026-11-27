import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const GetLastPerceived = defineAction({
  id: 256,
  name: "GetLastPerceived",
  comment: "256: Get the object that was perceived.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.lastPerceived.object, ModuleObjectType.ModuleCreature)) {
      return this.lastPerceived.object;
    }
    return undefined;
  },
});

export const GetLastPerceptionHeard = defineAction({
  id: 257,
  name: "GetLastPerceptionHeard",
  comment: "257: Determine whether the object that was perceived was heard.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.lastPerceived.object, ModuleObjectType.ModuleObject)) {
      return !this.lastPerceived.object.isDead() || !!(this.lastPerceived.data & PerceptionMask.HEARD);
    }
    return 0;
  },
});

export const GetLastPerceptionInaudible = defineAction({
  id: 258,
  name: "GetLastPerceptionInaudible",
  comment: "258: Determine whether the object that was perceived has become inaudible.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.lastPerceived.object, ModuleObjectType.ModuleObject)) {
      return this.lastPerceived.object.isDead() || !!(this.lastPerceived.data & PerceptionMask.INAUDIBLE);
    }
    return 0;
  },
});

export const GetLastPerceptionSeen = defineAction({
  id: 259,
  name: "GetLastPerceptionSeen",
  comment: "259: Determine whether the object that was perceived was seen.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.lastPerceived.object, ModuleObjectType.ModuleCreature)) {
      return !this.lastPerceived.object.isDead() || !!(this.lastPerceived.data & PerceptionMask.SEEN);
    }
    return 0;
  },
});

export const GetIsListening = defineAction({
  id: 174,
  name: "GetIsListening",
  comment: "174: Return TRUE if oObject is listening for something.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    return oObject.getIsListening();
  },
});

export const SetListening = defineAction({
  id: 175,
  name: "SetListening",
  comment: "175: Set whether oObject is listening.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oObject"), intParam("bListening")] as const,
  kotor(this: NWScriptInstance, oObject, bListening) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      oObject.setListening(!!bListening);
    } else {
      console.log("SetListening", this.name, this.caller, oObject, bListening);
    }
  },
});

export const SetListenPattern = defineAction({
  id: 176,
  name: "SetListenPattern",
  comment: "176: Set the string for oObject to listen for.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oObject"), stringParam("sPattern"), intParam("nNumber")] as const,
  kotor(this: NWScriptInstance, oObject, sPattern, nNumber) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      oObject.setListeningPattern(sPattern, nNumber);
    } else {
      console.log("SetListenPattern", this.name, this.caller, oObject, sPattern, nNumber);
    }
  },
});

export const GetListenPatternNumber = defineAction({
  id: 195,
  name: "GetListenPatternNumber",
  comment: "195: Get the number of the string pattern matched.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.listenPatternNumber;
  },
});

export const perceptionActions = [
  GetLastPerceived,
  GetLastPerceptionHeard,
  GetLastPerceptionInaudible,
  GetLastPerceptionSeen,
  GetIsListening,
  SetListening,
  SetListenPattern,
  GetListenPatternNumber,
] as const;
