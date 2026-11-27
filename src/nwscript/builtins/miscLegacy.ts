import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { defineAction, floatParam, intParam, objectParam, stringParam } from "@/nwscript/builtins/actionBuilder";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";

export const SwitchPlayerCharacter = defineAction({
  id: 11,
  name: "SwitchPlayerCharacter",
  comment: "11: Switches the main character to a specified NPC\n-1 specifies to switch back to the original PC\n",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNPCId")] as const,
  kotor(this: NWScriptInstance, nNPCId) {
    const creature = GameState.PartyManager.SwitchPlayerCharacter(nNPCId);
    if (creature) return true as any;
    return false as any;
  },
});

export const GetNearestCreature = defineAction({
  id: 38,
  name: "GetNearestCreature",
  comment: "38: Get the creature nearest to oTarget, subject to all the criteria specified.\n- nFirstCriteriaType: CREATURE_TYPE_*\n- nFirstCriteriaValue:\n-> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS\n-> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT\nor CREATURE_TYPE_HAS_SPELL_EFFECT\n-> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE\n-> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION\n-> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was\nCREATURE_TYPE_PLAYER_CHAR\n-> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE\n-> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION\nFor example, to get the nearest PC, use:\n(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)\n- oTarget: We're trying to find the creature of the specified type that is\nnearest to oTarget\n- nNth: We don't have to find the first nearest: we can find the Nth nearest...\n- nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue\nto further specify the type of creature that we are looking for.\n- nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to\nfurther specify the type of creature that we are looking for.\n* Return value on error: OBJECT_INVALID\n",
  returnType: NWScriptDataType.OBJECT,
  params: [
    intParam("nFirstCriteriaType"),
    intParam("nFirstCriteriaValue"),
    objectParam<ModuleObject>("oTarget"),
    intParam("nNth"),
    intParam("nSecondCriteriaType"),
    intParam("nSecondCriteriaValue"),
    intParam("nThirdCriteriaType"),
    intParam("nThirdCriteriaValue"),
  ] as const,
  kotor(this: NWScriptInstance, nFirstCriteriaType, nFirstCriteriaValue, oTarget, nNth, nSecondCriteriaType, nSecondCriteriaValue, nThirdCriteriaType, nThirdCriteriaValue) {
    return GameState.ModuleObjectManager.GetNearestCreature(
      nFirstCriteriaType,
      nFirstCriteriaValue,
      oTarget,
      nNth,
      nSecondCriteriaType,
      nSecondCriteriaValue,
      nThirdCriteriaType,
    );
  },
});

export const ActionSpeakString = defineAction({
  id: 39,
  name: "ActionSpeakString",
  comment: "39: Add a speak action to the action subject.\n- sStringToSpeak: String to be spoken\n- nTalkVolume: TALKVOLUME_*\n",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("sStringToSpeak"), intParam("nTalkVolume")] as const,
  kotor(this: NWScriptInstance, sStringToSpeak, nTalkVolume) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      return;
    }

    const action = new GameState.ActionFactory.ActionSpeak();
    action.setParameter(0, ActionParameterType.STRING, sStringToSpeak);
    action.setParameter(1, ActionParameterType.INT, nTalkVolume);
    this.caller.actionQueue.add(action);
  },
});

export const ActionPlayAnimation = defineAction({
  id: 40,
  name: "ActionPlayAnimation",
  comment: "40: Cause the action subject to play an animation\n- nAnimation: ANIMATION_*\n- fSpeed: Speed of the animation\n- fDurationSeconds: Duration of the animation (this is not used for Fire and\nForget animations) If a time of -1.0f is specified for a looping animation\nit will loop until the next animation is applied.\n",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nAnimation"), floatParam("fSpeed"), floatParam("fDurationSeconds")] as const,
  kotor(this: NWScriptInstance, nAnimation, fSpeed, fDurationSeconds) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      return;
    }

    const action = new GameState.ActionFactory.ActionPlayAnimation();
    action.setParameter(0, ActionParameterType.INT, this.caller.getAnimationNameById(nAnimation));
    action.setParameter(1, ActionParameterType.FLOAT, fSpeed || 1.0);
    action.setParameter(2, ActionParameterType.FLOAT, fDurationSeconds);
    this.caller.actionQueue.add(action);
  },
});

export const ActionCastSpellAtObject = defineAction({
  id: 48,
  name: "ActionCastSpellAtObject",
  comment: "48: This action casts a spell at oTarget.\n- nSpell: SPELL_*\n- oTarget: Target for the spell\n- nMetamagic: METAMAGIC_*\n- bCheat: If this is TRUE, then the executor of the action doesn't have to be\nable to cast the spell.\n- nDomainLevel: TBD - SS\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n- bInstantSpell: If this is TRUE, the spell is cast immediately. This allows\nthe end-user to simulate a high-level magic-user having lots of advance\nwarning of impending trouble\n",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nSpell"),
    objectParam<ModuleObject>("oTarget"),
    intParam("nMetamagic"),
    intParam("bCheat"),
    intParam("nDomainLevel"),
    intParam("nProjectilePathType"),
    intParam("bInstantSpell"),
  ] as const,
  kotor(this: NWScriptInstance, nSpell, oTarget, nMetamagic, bCheat, nDomainLevel, nProjectilePathType, bInstantSpell) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      return;
    }

    const action = new GameState.ActionFactory.ActionCastSpell();
    action.setParameter(0, ActionParameterType.INT, nSpell);
    action.setParameter(1, ActionParameterType.INT, -1);
    action.setParameter(2, ActionParameterType.INT, nDomainLevel);
    action.setParameter(3, ActionParameterType.INT, 0);
    action.setParameter(4, ActionParameterType.INT, 0);
    action.setParameter(5, ActionParameterType.DWORD, oTarget.id);
    action.setParameter(6, ActionParameterType.FLOAT, oTarget.position.x);
    action.setParameter(7, ActionParameterType.FLOAT, oTarget.position.y);
    action.setParameter(8, ActionParameterType.FLOAT, oTarget.position.z);
    action.setParameter(9, ActionParameterType.INT, nProjectilePathType);
    action.setParameter(10, ActionParameterType.INT, -1);
    action.setParameter(11, ActionParameterType.INT, -1);
    this.caller.actionQueue.add(action);
  },
});

export const CancelCombat = defineAction({
  id: 54,
  name: "CancelCombat",
  comment: "54:\nCancels combat for the specified creature.\n",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oCreature")] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      if (GameState.PartyManager.party.indexOf(oCreature as ModuleCreature) >= 0) {
        for (let i = 0, len = GameState.PartyManager.party.length; i < len; i++) {
          GameState.PartyManager.party[i].cancelCombat();
        }
      } else {
        (oCreature as ModuleCreature).cancelCombat();
      }
    }
  },
});

export const GetSpellSaveDC = defineAction({
  id: 111,
  name: "GetSpellSaveDC",
  comment: "111: Get the DC to save against for a spell (10 + spell level + relevant ability\nbonus).  This can be called by a creature or by an Area of Effect object.\n",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).getSpellSaveDC();
    }

    return 10;
  },
});

export const GetIsDead = defineAction({
  id: 140,
  name: "GetIsDead",
  comment: "140: * Returns TRUE if oCreature is a dead NPC, dead PC or a dying PC.\n",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oCreature")] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return oCreature.isDead() ? NW_TRUE : NW_FALSE;
    } else {
      return 1;
    }
  },
});

export const GetIsPC = defineAction({
  id: 217,
  name: "GetIsPC",
  comment: "217: * Returns TRUE if oCreature is a Player Controlled character.\n",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oCreature")] as const,
  kotor(this: NWScriptInstance, oCreature) {
    return (GameState.PartyManager.party.indexOf(oCreature as any) >= 0 || GameState.PartyManager.Player == oCreature) ? NW_TRUE : NW_FALSE;
  },
});

export const miscLegacyActions = [
  SwitchPlayerCharacter,
  GetNearestCreature,
  ActionSpeakString,
  ActionPlayAnimation,
  ActionCastSpellAtObject,
  CancelCombat,
  GetSpellSaveDC,
  GetIsDead,
  GetIsPC,
] as const;
