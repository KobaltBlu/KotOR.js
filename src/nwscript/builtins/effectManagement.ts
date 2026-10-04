import { GameState } from "@/GameState";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import EngineLocation from "@/engine/EngineLocation";
import type { GameEffect } from "@/effects/GameEffect";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import {
  defineAction,
  effectParam,
  floatParam,
  intParam,
  locationParam,
  objectParam,
} from "@/nwscript/builtins/actionBuilder";

export const GetFirstEffect = defineAction({
  id: 85,
  name: "GetFirstEffect",
  comment: "85: Get the first in-game effect on oCreature.",
  returnType: NWScriptDataType.EFFECT,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      this.creatureEffectIndex.set(oCreature.id, 0);
      return oCreature.effects[0];
    }
    return undefined;
  },
});

export const GetNextEffect = defineAction({
  id: 86,
  name: "GetNextEffect",
  comment: "86: Get the next in-game effect on oCreature.",
  returnType: NWScriptDataType.EFFECT,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      const nextId = (this.creatureEffectIndex.get(oCreature.id) ?? 0) + 1;
      this.creatureEffectIndex.set(oCreature.id, nextId);
      return oCreature.effects[nextId];
    }

    console.warn("GetNextEffect called on non-creature object", oCreature, "of type", oCreature ? oCreature.type : typeof oCreature);
    return undefined;
  },
});

export const RemoveEffect = defineAction({
  id: 87,
  name: "RemoveEffect",
  comment: "87: Remove eEffect from oCreature.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, eEffect) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature) && typeof eEffect === "object" && eEffect) {
      oCreature.removeEffect(eEffect);
    }
  },
});

export const GetIsEffectValid = defineAction({
  id: 88,
  name: "GetIsEffectValid",
  comment: "88: * Returns TRUE if eEffect is a valid effect.",
  returnType: NWScriptDataType.INTEGER,
  params: [effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, eEffect) {
    return eEffect ? NW_TRUE : NW_FALSE;
  },
});

export const GetEffectDurationType = defineAction({
  id: 89,
  name: "GetEffectDurationType",
  comment: "89: Get the duration type (DURATION_TYPE_*) of eEffect.\n* Return value if eEffect is not valid: -1",
  returnType: NWScriptDataType.INTEGER,
  params: [effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, eEffect) {
    if (eEffect) {
      return eEffect.getDurationType() & 7;
    }
    return -1;
  },
});

export const GetEffectSubType = defineAction({
  id: 90,
  name: "GetEffectSubType",
  comment: "90: Get the subtype (SUBTYPE_*) of eEffect.\n* Return value on error: 0",
  returnType: NWScriptDataType.INTEGER,
  params: [effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, eEffect) {
    if (eEffect) {
      return eEffect.getSubType() & 24;
    }
    return 0;
  },
});

export const GetEffectCreator = defineAction({
  id: 91,
  name: "GetEffectCreator",
  comment: "91: Get the object that created eEffect.\n* Returns OBJECT_INVALID if eEffect is not a valid effect.",
  returnType: NWScriptDataType.OBJECT,
  params: [effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, eEffect) {
    if (eEffect) {
      return eEffect.creator;
    }
    return undefined;
  },
});

export const GetAC = defineAction({
  id: 116,
  name: "GetAC",
  comment: "116: If oObject is a creature, this will return that creature's armour class.\n- nForFutureUse: this parameter is not currently used\n* Return value if oObject is not a creature, item, door or placeable: -1",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    intParam("nForFutureUse", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oObject, nForFutureUse) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return oObject.getAC();
    }
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleItem) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleDoor) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModulePlaceable)
    ) {
      return 0;
    }
    return -1;
  },
});

export const GetEffectType = defineAction({
  id: 170,
  name: "GetEffectType",
  comment: "170: Get the effect type (EFFECT_TYPE_*) of eEffect.\n* Return value if eEffect is invalid: EFFECT_INVALIDEFFECT",
  returnType: NWScriptDataType.INTEGER,
  params: [effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, eEffect) {
    if (typeof eEffect !== "undefined") {
      return eEffect.type || GameEffectType.EffectInvalidEffect;
    }
    return GameEffectType.EffectInvalidEffect;
  },
});

export const EffectLinkEffects = defineAction({
  id: 199,
  name: "EffectLinkEffects",
  comment: "199: Link the two supplied effects, returning eChildEffect as a child of eParentEffect.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    effectParam<GameEffect | undefined>("eParentEffect", { optional: true, default: undefined }),
    effectParam<GameEffect | undefined>("eChildEffect", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, eParentEffect, eChildEffect) {
    const effect = new GameState.GameEffectFactory.EffectLink(eParentEffect, eChildEffect);
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },
});

export const ApplyEffectAtLocation = defineAction({
  id: 216,
  name: "ApplyEffectAtLocation",
  comment: "216: Apply eEffect at lLocation.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nDurationType"),
    effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined }),
    locationParam<EngineLocation>("lLocation"),
    floatParam("fDuration", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, nDurationType, eEffect, lLocation, fDuration) {
    if (eEffect) {
      eEffect.setDurationType(nDurationType);
      eEffect.setDuration(fDuration);
      GameState.module.addEffect(eEffect, lLocation);
    }
  },
});

export const ApplyEffectToObject = defineAction({
  id: 220,
  name: "ApplyEffectToObject",
  comment: "220: Apply eEffect to oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nDurationType"),
    effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    floatParam("fDuration", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, nDurationType, eEffect, oTarget, fDuration) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      if (eEffect) {
        eEffect.setDurationType(nDurationType);
        eEffect.setDuration(fDuration);
        if (nDurationType === GameEffectDurationType.TEMPORARY) {
          const future = GameState.module.timeManager.getFutureTimeFromSeconds(fDuration);
          eEffect.setExpireDay(future.pauseDay);
          eEffect.setExpireTime(future.pauseTime);
        }
        oTarget.addEffect(eEffect, nDurationType, fDuration);
      } else {
        console.error("ApplyEffectToObject", "Expected a GameEffect", [nDurationType, eEffect, oTarget, fDuration]);
      }
    } else {
      console.error("ApplyEffectToObject", "GameEffects must be applied to ModuleObjects");
    }
  },
});

export const GetHasSpellEffect = defineAction({
  id: 304,
  name: "GetHasSpellEffect",
  comment: "304: Determine if oObject has effects originating from nSpell.\n- nSpell: SPELL_*\n- oObject",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nSpell"),
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nSpell, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      for (let i = 0, len = oObject.effects.length; i < len; i++) {
        if (oObject.effects[i].getSpellId() === nSpell) {
          return NW_TRUE;
        }
      }
    }
    return NW_FALSE;
  },
});

export const GetEffectSpellId = defineAction({
  id: 305,
  name: "GetEffectSpellId",
  comment: "305: Get the spell (SPELL_*) that applied eSpellEffect.\n* Returns -1 if eSpellEffect was applied outside a spell script.",
  returnType: NWScriptDataType.INTEGER,
  params: [effectParam<GameEffect | undefined>("eSpellEffect", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, eSpellEffect) {
    if (eSpellEffect) {
      return eSpellEffect.getSpellId();
    }
    return -1;
  },
});

export const SetEffectIcon = defineAction({
  id: 552,
  name: "SetEffectIcon",
  comment: "552: Link the specified effect icon to the specified effect.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    effectParam<GameEffect | undefined>("eEffect", { optional: true, default: undefined }),
    intParam("nIcon"),
  ] as const,
  kotor(this: NWScriptInstance, eEffect, nIcon) {
    const eIcon = new GameState.GameEffectFactory.EffectIcon();
    eIcon.setCreator(this.caller);
    eIcon.setSpellId(this.getSpellId());
    eIcon.setInt(0, nIcon);
    eIcon.initialize();

    const eLink = new GameState.GameEffectFactory.EffectLink(eEffect, eIcon);
    eLink.setCreator(this.caller);
    eLink.setSpellId(this.getSpellId());
    return eLink.initialize();
  },
});

export const effectManagementActions = [
  GetFirstEffect,
  GetNextEffect,
  RemoveEffect,
  GetIsEffectValid,
  GetEffectDurationType,
  GetEffectSubType,
  GetEffectCreator,
  GetAC,
  GetEffectType,
  EffectLinkEffects,
  ApplyEffectAtLocation,
  ApplyEffectToObject,
  GetHasSpellEffect,
  GetEffectSpellId,
  SetEffectIcon,
] as const;
