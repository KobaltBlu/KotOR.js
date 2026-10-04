import { GameState } from "@/GameState";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleObject } from "@/module";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, objectParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const EffectAssuredHit = defineAction({
  id: 51,
  name: "EffectAssuredHit",
  comment: "51: EffectAssuredHit\nCreate an Assured Hit effect, which guarantees that all attacks are successful\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectAssuredHit();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },
});

export const EffectAbilityIncrease = defineAction({
  id: 80,
  name: "EffectAbilityIncrease",
  comment: "80: Create an Ability Increase effect\n- bAbilityToIncrease: ABILITY_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAbility"), intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nAbility, nValue) {
    const effect = new GameState.GameEffectFactory.EffectAbilityIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nAbility);
    effect.setInt(1, nValue);
    return effect.initialize();
  },
});

export const EffectDamageResistance = defineAction({
  id: 81,
  name: "EffectDamageResistance",
  comment: "81: Create a Damage Resistance effect that removes the first nAmount points of\ndamage of type nDamageType, up to nLimit (or infinite if nLimit is 0)\n- nDamageType: DAMAGE_TYPE_*\n- nAmount\n- nLimit\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nDamageType"), intParam("nAmount"), intParam("nLimit")] as const,
  kotor(this: NWScriptInstance, nDamageType, nAmount, nLimit) {
    const effect = new GameState.GameEffectFactory.EffectDamageResistance();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nDamageType);
    effect.setInt(1, nAmount);
    effect.setInt(2, nLimit);
    return effect.initialize();
  },
});

export const EffectACIncrease = defineAction({
  id: 115,
  name: "EffectACIncrease",
  comment: "115: Create an AC Increase effect\n- nValue: size of AC increase\n- nModifyType: AC_*_BONUS\n- nDamageType: DAMAGE_TYPE_*\n* Default value for nDamageType should only ever be used in this function prototype.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nValue"), intParam("nModifyType"), intParam("nDamageType")] as const,
  kotor(this: NWScriptInstance, nValue, nModifyType, nDamageType) {
    const effect = new GameState.GameEffectFactory.EffectACIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nModifyType);
    effect.setInt(1, nValue);
    effect.setInt(2, GameState.SWRuleSet.racialTypeCount);
    effect.setInt(5, nDamageType);
    return effect.initialize();
  },
});

export const EffectSavingThrowIncrease = defineAction({
  id: 117,
  name: "EffectSavingThrowIncrease",
  comment: "117: Create an AC Decrease effect\n- nSave: SAVING_THROW_* (not SAVING_THROW_TYPE_*)\n- nValue: size of AC decrease\n- nSaveType: SAVING_THROW_TYPE_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nSave"), intParam("nValue"), intParam("nSaveType")] as const,
  kotor(this: NWScriptInstance, nSave, nValue, nSaveType) {
    const effect = new GameState.GameEffectFactory.EffectSavingThrowIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nValue);
    effect.setInt(1, nSave);
    effect.setInt(2, nSaveType);
    effect.setInt(3, GameState.SWRuleSet.racialTypeCount);
    return effect.initialize();
  },
});

export const EffectAttackIncrease = defineAction({
  id: 118,
  name: "EffectAttackIncrease",
  comment: "118: Create an Attack Increase effect\n- nBonus: size of attack bonus\n- nModifierType: ATTACK_BONUS_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nBonus"), intParam("nModifierType")] as const,
  kotor(this: NWScriptInstance, nBonus, nModifierType) {
    const effect = new GameState.GameEffectFactory.EffectAttackIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nBonus);
    effect.setInt(1, nModifierType);
    return effect.initialize();
  },
});

export const EffectDamageReduction = defineAction({
  id: 119,
  name: "EffectDamageReduction",
  comment: "119: Create a Damage Reduction effect\n- nAmount: amount of damage reduction\n- nDamagePower: DAMAGE_POWER_*\n- nLimit: How much damage the effect can absorb before disappearing.\nSet to zero for infinite\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAmount"), intParam("nDamagePower"), intParam("nLimit")] as const,
  kotor(this: NWScriptInstance, nAmount, nDamagePower, nLimit) {
    const effect = new GameState.GameEffectFactory.EffectDamageReduction();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nAmount);
    effect.setInt(1, nDamagePower);
    effect.setInt(2, nLimit);
    return effect.initialize();
  },
});

export const EffectDamageIncrease = defineAction({
  id: 120,
  name: "EffectDamageIncrease",
  comment: "120: Create a Damage Increase effect\n- nBonus: DAMAGE_BONUS_*\n- nDamageType: DAMAGE_TYPE_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nBonus"), intParam("nDamageType")] as const,
  kotor(this: NWScriptInstance, nBonus, nDamageType) {
    const effect = new GameState.GameEffectFactory.EffectDamageIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nBonus);
    effect.setInt(1, nDamageType);
    effect.setInt(2, GameState.SWRuleSet.racialTypeCount);
    return effect.initialize();
  },
});

export const EffectDeath = defineAction({
  id: 133,
  name: "EffectDeath",
  comment: "133: Create a Death effect\n- nSpectacularDeath: if this is TRUE, the creature to which this effect is\napplied will die in an extraordinary fashion\n- nDisplayFeedback\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nSpectacularDeath"), intParam("nDisplayFeedback"), intParam("nNoFadeAway", { availability: "tsl", optional: true, default: 0 })] as const,
  kotor(this: NWScriptInstance, nSpectacularDeath, nDisplayFeedback) {
    const effect = new GameState.GameEffectFactory.EffectDeath();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nSpectacularDeath);
    effect.setInt(1, nDisplayFeedback);
    return effect.initialize();
  },
});

export const EffectKnockdown = defineAction({
  id: 134,
  name: "EffectKnockdown",
  comment: "134: Create a Knockdown effect\nThis effect knocks creatures off their feet, they will sit until the effect\nis removed. This should be applied as a temporary effect with a 3 second\nduration minimum (1 second to fall, 1 second sitting, 1 second to get up).\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectKnockdown();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },
});

export const EffectParalyze = defineAction({
  id: 148,
  name: "EffectParalyze",
  comment: "148: Create a Paralyze effect\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 5);
    return effect.initialize();
  },
});

export const EffectSpellImmunity = defineAction({
  id: 149,
  name: "EffectSpellImmunity",
  comment: "149: Create a Spell Immunity effect.\nThere is a known bug with this function. There *must* be a parameter specified\nwhen this is called (even if the desired parameter is SPELL_ALL_SPELLS),\notherwise an effect of type EFFECT_TYPE_INVALIDEFFECT will be returned.\n- nImmunityToSpell: SPELL_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nImmunityToSpell is\ninvalid.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nImmunityToSpell")] as const,
  kotor(this: NWScriptInstance, nImmunityToSpell) {
    const effect = new GameState.GameEffectFactory.EffectSpellImmunity();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nImmunityToSpell);
    return effect.initialize();
  },
});

export const EffectForceJump = defineAction({
  id: 153,
  name: "EffectForceJump",
  comment: "153: EffectForceJump\nThe effect required for force jumping\n",
  returnType: NWScriptDataType.EFFECT,
  params: [objectParam<ModuleObject>("oTarget"), intParam("nUnknown")] as const,
  kotor(this: NWScriptInstance, oTarget, nUnknown) {
    const effect = new GameState.GameEffectFactory.EffectForceJump();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nUnknown);
    effect.setObject(0, oTarget);
    return effect.initialize();
  },
});

export const EffectSleep = defineAction({
  id: 154,
  name: "EffectSleep",
  comment: "154: Create a Sleep effect\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 6);
    return effect.initialize();
  },
});

export const EffectTemporaryForcePoints = defineAction({
  id: 156,
  name: "EffectTemporaryForcePoints",
  comment: "156: This was previously EffectCharmed();\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nForcePoints")] as const,
  kotor(this: NWScriptInstance, nForcePoints) {
    if (nForcePoints < 0) {
      return undefined;
    }
    const effect = new GameState.GameEffectFactory.EffectTemporaryForce();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nForcePoints);
    return effect.initialize();
  },
});

export const EffectConfused = defineAction({
  id: 157,
  name: "EffectConfused",
  comment: "157: Create a Confuse effect\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 1);
    return effect.initialize();
  },
});

export const EffectFrightened = defineAction({
  id: 158,
  name: "EffectFrightened",
  comment: "158: Create a Frighten effect\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 2);
    return effect.initialize();
  },
});

export const EffectChoke = defineAction({
  id: 159,
  name: "EffectChoke",
  comment: "159: Choke the bugger...\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 7);
    return effect.initialize();
  },
});

export const EffectStunned = defineAction({
  id: 161,
  name: "EffectStunned",
  comment: "161: Create a Stun effect\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 4);
    return effect.initialize();
  },
});

export const EffectRegenerate = defineAction({
  id: 164,
  name: "EffectRegenerate",
  comment: "164: Create a Regenerate effect.\n- nAmount: amount of damage to be regenerated per time interval\n- fIntervalSeconds: length of interval in seconds\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAmount"), floatParam("fIntervalSeconds")] as const,
  kotor(this: NWScriptInstance, nAmount, fIntervalSeconds) {
    const effect = new GameState.GameEffectFactory.EffectRegenerate();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nAmount);
    effect.setInt(1, Math.floor(fIntervalSeconds * 1000));
    return effect.initialize();
  },
});

export const EffectMovementSpeedIncrease = defineAction({
  id: 165,
  name: "EffectMovementSpeedIncrease",
  comment: "165: Create a Movement Speed Increase effect.\n- nNewSpeedPercent: This works in a dodgy way so please read this notes carefully.\nIf you supply an integer under 100, 100 gets added to it to produce the final speed.\ne.g. if you supply 50, then the resulting speed is 150% of the original speed.\nIf you supply 100 or above, then this is used directly as the resulting speed.\ne.g. if you specify 100, then the resulting speed is 100% of the original speed that is,\nit is unchanged.\nHowever if you specify 200, then the resulting speed is double the original speed.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nNewSpeedPercent")] as const,
  kotor(this: NWScriptInstance, nNewSpeedPercent) {
    const effect = new GameState.GameEffectFactory.EffectMovementSpeedIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nNewSpeedPercent);
    return effect.initialize();
  },
});

export const EffectAreaOfEffect = defineAction({
  id: 171,
  name: "EffectAreaOfEffect",
  comment: "171: Create an Area Of Effect effect in the area of the creature it is applied to.\nIf the scripts are not specified, default ones will be used.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAreaEffectId"), stringParam("sOnEnter"), stringParam("sHeartbeat"), stringParam("sOnExit")] as const,
  kotor(this: NWScriptInstance, nAreaEffectId, sOnEnter, sHeartbeat, sOnExit) {
    const effect = new GameState.GameEffectFactory.EffectAreaOfEffect();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nAreaEffectId);
    effect.setString(0, sOnEnter);
    effect.setString(1, sHeartbeat);
    effect.setString(2, sOnExit);
    return effect.initialize();
  },
});

export const EffectVisualEffect = defineAction({
  id: 180,
  name: "EffectVisualEffect",
  comment: "180: * Create a Visual Effect that can be applied to an object.\n- nVisualEffectId\n- nMissEffect: if this is TRUE, a random vector near or past the target will\nbe generated, on which to play the effect\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nVisualEffectId"), intParam("nMissEffect")] as const,
  kotor(this: NWScriptInstance, nVisualEffectId, nMissEffect) {
    const effect = new GameState.GameEffectFactory.EffectVisualEffect();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nVisualEffectId);
    effect.setInt(2, nMissEffect ? 1 : 0);
    return effect.initialize();
  },
});

export const EffectBeam = defineAction({
  id: 207,
  name: "EffectBeam",
  comment: "207: Create a Beam effect.\n- nBeamVisualEffect: VFX_BEAM_*\n- oEffector: the beam is emitted from this creature\n- nBodyPart: BODY_NODE_*\n- bMissEffect: If this is TRUE, the beam will fire to a random vector near or\npast the target\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nBeamVisualEffect is\nnot valid.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nBeamVisualEffect"), objectParam<ModuleObject>("oEffector"), intParam("nBodyPart"), intParam("bMissEffect")] as const,
  kotor(this: NWScriptInstance, nBeamVisualEffect, oEffector, nBodyPart, bMissEffect) {
    const effect = new GameState.GameEffectFactory.EffectBeam();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nBeamVisualEffect);
    effect.setInt(1, nBodyPart);
    effect.setInt(2, bMissEffect);
    effect.setObject(0, oEffector);
    return effect.initialize();
  },
});

export const EffectForceResistanceIncrease = defineAction({
  id: 212,
  name: "EffectForceResistanceIncrease",
  comment: "212: Create a Force Resistance Increase effect.\n- nValue: size of Force Resistance increase\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nValue) {
    const effect = new GameState.GameEffectFactory.EffectForceResistanceIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nValue);
    return effect.initialize();
  },
});

export const EffectPoison = defineAction({
  id: 250,
  name: "EffectPoison",
  comment: "250: Create a Poison effect.\n- nPoisonType: POISON_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nPoisonType")] as const,
  kotor(this: NWScriptInstance, nPoisonType) {
    const effect = new GameState.GameEffectFactory.EffectPoison();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nPoisonType);
    return effect.initialize();
  },
});

export const EffectAssuredDeflection = defineAction({
  id: 252,
  name: "EffectAssuredDeflection",
  comment: "252: Assured Deflection\nThis effect ensures that all projectiles shot at a jedi will be deflected\nwithout doing an opposed roll.  It takes an optional parameter to say whether\nthe deflected projectile will return to the attacker and cause damage\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("bReturnToAttacker")] as const,
  kotor(this: NWScriptInstance, bReturnToAttacker) {
    const effect = new GameState.GameEffectFactory.EffectAssuredDeflection();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, bReturnToAttacker);
    return effect.initialize();
  },
});

export const EffectHaste = defineAction({
  id: 270,
  name: "EffectHaste",
  comment: "270: Create a Haste effect.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectHaste();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },
});

export const EffectImmunity = defineAction({
  id: 273,
  name: "EffectImmunity",
  comment: "273: Create an Immunity effect.\n- nImmunityType: IMMUNITY_TYPE_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nImmunityType")] as const,
  kotor(this: NWScriptInstance, nImmunityType) {
    const effect = new GameState.GameEffectFactory.EffectImmunity();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nImmunityType);
    return effect.initialize();
  },
});

export const EffectDamageImmunityIncrease = defineAction({
  id: 275,
  name: "EffectDamageImmunityIncrease",
  comment: "275: Creates a Damage Immunity Increase effect.\n- nDamageType: DAMAGE_TYPE_*\n- nPercentImmunity\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nDamageType"), intParam("nPercentImmunity")] as const,
  kotor(this: NWScriptInstance, nDamageType, nPercentImmunity) {
    const effect = new GameState.GameEffectFactory.EffectDamageImmunityIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nDamageType);
    effect.setInt(1, nPercentImmunity);
    return effect.initialize();
  },
});

export const EffectSkillIncrease = defineAction({
  id: 351,
  name: "EffectSkillIncrease",
  comment: "351: Create a Skill Increase effect.\n- nSkill: SKILL_*\n- nValue\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nSkill"), intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nSkill, nValue) {
    const effect = new GameState.GameEffectFactory.EffectSkillIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nSkill);
    effect.setInt(1, nValue);
    effect.setInt(2, GameState.SWRuleSet.racialTypeCount);
    return effect.initialize();
  },
});

export const EffectDamageForcePoints = defineAction({
  id: 372,
  name: "EffectDamageForcePoints",
  comment: "372: Damages the creatures force points\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAmount")] as const,
  kotor(this: NWScriptInstance, nAmount) {
    const effect = new GameState.GameEffectFactory.EffectDamageForcePoints();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nAmount);
    return effect.initialize();
  },
});

export const EffectHealForcePoints = defineAction({
  id: 373,
  name: "EffectHealForcePoints",
  comment: "373: Heals the creatures force points\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAmount")] as const,
  kotor(this: NWScriptInstance, nAmount) {
    const effect = new GameState.GameEffectFactory.EffectHealForcePoints();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nAmount);
    return effect.initialize();
  },
});

export const EffectDroidStun = defineAction({
  id: 391,
  name: "EffectDroidStun",
  comment: "391: Stunn the droid\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 3);
    return effect.initialize();
  },
});

export const EffectForcePushed = defineAction({
  id: 392,
  name: "EffectForcePushed",
  comment: "392: Force push the creature...\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectForcePushed();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },
});

export const EffectAbilityDecrease = defineAction({
  id: 446,
  name: "EffectAbilityDecrease",
  comment: "446: Create an Ability Decrease effect.\n- nAbility: ABILITY_*\n- nModifyBy: This is the amount by which to decrement the ability\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAbility"), intParam("nModifyBy")] as const,
  kotor(this: NWScriptInstance, nAbility, nModifyBy) {
    const effect = new GameState.GameEffectFactory.EffectAbilityDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nAbility);
    effect.setInt(1, nModifyBy);
    return effect.initialize();
  },
});

export const EffectAttackDecrease = defineAction({
  id: 447,
  name: "EffectAttackDecrease",
  comment: "447: Create an Attack Decrease effect.\n- nPenalty\n- nModifierType: ATTACK_BONUS_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nPenalty"), intParam("nModifierType")] as const,
  kotor(this: NWScriptInstance, nPenalty, nModifierType) {
    const effect = new GameState.GameEffectFactory.EffectAttackDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nPenalty);
    effect.setInt(1, nModifierType);
    return effect.initialize();
  },
});

export const EffectDamageDecrease = defineAction({
  id: 448,
  name: "EffectDamageDecrease",
  comment: "448: Create a Damage Decrease effect.\n- nPenalty\n- nDamageType: DAMAGE_TYPE_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nPenalty"), intParam("nDamageType")] as const,
  kotor(this: NWScriptInstance, nPenalty, nDamageType) {
    const effect = new GameState.GameEffectFactory.EffectDamageDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nPenalty);
    effect.setInt(1, nDamageType);
    effect.setInt(2, GameState.SWRuleSet.racialTypeCount);
    return effect.initialize();
  },
});

export const EffectDamageImmunityDecrease = defineAction({
  id: 449,
  name: "EffectDamageImmunityDecrease",
  comment: "449: Create a Damage Immunity Decrease effect.\n- nDamageType: DAMAGE_TYPE_*\n- nPercentImmunity\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nDamageType"), intParam("nPercentImmunity")] as const,
  kotor(this: NWScriptInstance, nDamageType, nPercentImmunity) {
    const effect = new GameState.GameEffectFactory.EffectDamageImmunityDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nDamageType);
    effect.setInt(1, nPercentImmunity);
    return effect.initialize();
  },
});

export const EffectACDecrease = defineAction({
  id: 450,
  name: "EffectACDecrease",
  comment: "450: Create an AC Decrease effect.\n- nValue\n- nModifyType: AC_*\n- nDamageType: DAMAGE_TYPE_*\n* Default value for nDamageType should only ever be used in this function prototype.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nValue"), intParam("nModifyType"), intParam("nDamageType")] as const,
  kotor(this: NWScriptInstance, nValue, nModifyType, nDamageType) {
    const effect = new GameState.GameEffectFactory.EffectACDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nModifyType);
    effect.setInt(1, nValue);
    effect.setInt(2, GameState.SWRuleSet.racialTypeCount);
    effect.setInt(5, nDamageType);
    return effect.initialize();
  },
});

export const EffectMovementSpeedDecrease = defineAction({
  id: 451,
  name: "EffectMovementSpeedDecrease",
  comment: "451: Create a Movement Speed Decrease effect.\n- nPercentChange: This is expected to be a positive integer between 1 and 99 inclusive.\nIf a negative integer is supplied then a movement speed increase will result,\nand if a number >= 100 is supplied then the effect is deleted.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nPercentChange")] as const,
  kotor(this: NWScriptInstance, nPercentChange) {
    const effect = new GameState.GameEffectFactory.EffectMovementSpeedDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nPercentChange);
    return effect.initialize();
  },
});

export const EffectSavingThrowDecrease = defineAction({
  id: 452,
  name: "EffectSavingThrowDecrease",
  comment: "452: Create a Saving Throw Decrease effect.\n- nSave\n- nValue\n- nSaveType: SAVING_THROW_TYPE_*\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nSave"), intParam("nValue"), intParam("nSaveType")] as const,
  kotor(this: NWScriptInstance, nSave, nValue, nSaveType) {
    const effect = new GameState.GameEffectFactory.EffectSavingThrowDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nValue);
    effect.setInt(1, nSave);
    effect.setInt(2, nSaveType);
    effect.setInt(3, GameState.SWRuleSet.racialTypeCount);
    return effect.initialize();
  },
});

export const EffectSkillDecrease = defineAction({
  id: 453,
  name: "EffectSkillDecrease",
  comment: "453: Create a Skill Decrease effect.\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nSkill"), intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nSkill, nValue) {
    const effect = new GameState.GameEffectFactory.EffectSkillDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nSkill);
    effect.setInt(1, nValue);
    effect.setInt(2, GameState.SWRuleSet.racialTypeCount);
    return effect.initialize();
  },
});

export const EffectForceResistanceDecrease = defineAction({
  id: 454,
  name: "EffectForceResistanceDecrease",
  comment: "454: Create a Force Resistance Decrease effect.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nValue) {
    const effect = new GameState.GameEffectFactory.EffectForceResistanceDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nValue);
    return effect.initialize();
  },
});

export const EffectInvisibility = defineAction({
  id: 457,
  name: "EffectInvisibility",
  comment: "457: Create an Invisibility effect.\n- nInvisibilityType: INVISIBILITY_TYPE_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nInvisibilityType\nis invalid.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nInvisibilityType")] as const,
  kotor(this: NWScriptInstance, nInvisibilityType) {
    const effect = new GameState.GameEffectFactory.EffectInvisibility();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nInvisibilityType);
    return effect.initialize();
  },
});

export const EffectConcealment = defineAction({
  id: 458,
  name: "EffectConcealment",
  comment: "458: Create a Concealment effect.\n- nPercentage: 1-100 inclusive\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or\nnPercentage > 100.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nPercentage")] as const,
  kotor(this: NWScriptInstance, nPercentage) {
    const effect = new GameState.GameEffectFactory.EffectConcealment();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nPercentage);
    return effect.initialize();
  },
});

export const EffectForceShield = defineAction({
  id: 459,
  name: "EffectForceShield",
  comment: "459: Create a Force Shield that has parameters from the guven index into the forceshields.2da\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nForceShieldIndex")] as const,
  kotor(this: NWScriptInstance, nForceShieldIndex) {
    const forceshield = GameState.TwoDAManager.datatables.get("forceshields").rows[nForceShieldIndex];
    if (forceshield) {
      const effect = new GameState.GameEffectFactory.EffectForceShield();
      effect.setCreator(this.caller);
      effect.setSpellId(this.getSpellId());
      effect.setInt(0, nForceShieldIndex);
      return effect.initialize();
    }
    return undefined;
  },
});

export const EffectBlasterDeflectionIncrease = defineAction({
  id: 469,
  name: "EffectBlasterDeflectionIncrease",
  comment: "469: Increase the blaster deflection rate, i think...\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nValue) {
    const effect = new GameState.GameEffectFactory.EffectBlasterDeflectionIncrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nValue);
    return effect.initialize();
  },
});

export const EffectBlasterDeflectionDecrease = defineAction({
  id: 470,
  name: "EffectBlasterDeflectionDecrease",
  comment: "470:decrease the blaster deflection rate\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nValue) {
    const effect = new GameState.GameEffectFactory.EffectBlasterDeflectionDecrease();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nValue);
    return effect.initialize();
  },
});

export const EffectHorrified = defineAction({
  id: 471,
  name: "EffectHorrified",
  comment: "471: Make the creature horified. BOO!\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    console.log("EffectHorrified", this.caller);
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 8);
    return effect.initialize();
  },
});

export const EffectMissChance = defineAction({
  id: 477,
  name: "EffectMissChance",
  comment: "477: Create a Miss Chance effect.\n- nPercentage: 1-100 inclusive\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or\nnPercentage > 100.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nPercentage")] as const,
  kotor(this: NWScriptInstance, nPercentage) {
    const effect = new GameState.GameEffectFactory.EffectMissChance();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nPercentage);
    effect.setInt(1, GameState.SWRuleSet.racialTypeCount);
    return effect.initialize();
  },
});

export const EffectWhirlWind = defineAction({
  id: 703,
  name: "EffectWhirlWind",
  comment: "703.\ncreates the effect of a whirl wind.\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 10);
    return effect.initialize();
  },
});

export const EffectCutSceneHorrified = defineAction({
  id: 754,
  name: "EffectCutSceneHorrified",
  comment: "754: EffectCutSceneHorrified\nGet a horrified effect for cutscene purposes (ie. this effect will ignore immunities).\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 8);
    effect.setInt(1, 1);
    return effect.initialize();
  },
});

export const EffectCutSceneParalyze = defineAction({
  id: 755,
  name: "EffectCutSceneParalyze",
  comment: "755: EffectCutSceneParalyze\nGet a paralyze effect for cutscene purposes (ie. this effect will ignore immunities).\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 5);
    effect.setInt(1, 1);
    return effect.initialize();
  },
});

export const EffectCutSceneStunned = defineAction({
  id: 756,
  name: "EffectCutSceneStunned",
  comment: "756: EffectCutSceneStunned\nGet a stun effect for cutscene purposes (ie. this effect will ignore immunities).\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectSetState();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 4);
    effect.setInt(1, 1);
    return effect.initialize();
  },
});

export const effectsLegacyActions = [
  EffectAssuredHit,
  EffectAbilityIncrease,
  EffectDamageResistance,
  EffectACIncrease,
  EffectSavingThrowIncrease,
  EffectAttackIncrease,
  EffectDamageReduction,
  EffectDamageIncrease,
  EffectDeath,
  EffectKnockdown,
  EffectParalyze,
  EffectSpellImmunity,
  EffectForceJump,
  EffectSleep,
  EffectTemporaryForcePoints,
  EffectConfused,
  EffectFrightened,
  EffectChoke,
  EffectStunned,
  EffectRegenerate,
  EffectMovementSpeedIncrease,
  EffectAreaOfEffect,
  EffectVisualEffect,
  EffectBeam,
  EffectForceResistanceIncrease,
  EffectPoison,
  EffectAssuredDeflection,
  EffectHaste,
  EffectImmunity,
  EffectDamageImmunityIncrease,
  EffectSkillIncrease,
  EffectDamageForcePoints,
  EffectHealForcePoints,
  EffectDroidStun,
  EffectForcePushed,
  EffectAbilityDecrease,
  EffectAttackDecrease,
  EffectDamageDecrease,
  EffectDamageImmunityDecrease,
  EffectACDecrease,
  EffectMovementSpeedDecrease,
  EffectSavingThrowDecrease,
  EffectSkillDecrease,
  EffectForceResistanceDecrease,
  EffectInvisibility,
  EffectConcealment,
  EffectForceShield,
  EffectBlasterDeflectionIncrease,
  EffectBlasterDeflectionDecrease,
  EffectHorrified,
  EffectMissChance,
  EffectWhirlWind,
  EffectCutSceneHorrified,
  EffectCutSceneParalyze,
  EffectCutSceneStunned,
] as const;
