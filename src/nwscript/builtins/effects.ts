import { GameState } from "@/GameState";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { DamageType } from "@/enums/combat/DamageType";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import EngineLocation from "@/engine/EngineLocation";
import { defineAction, intParam, locationParam, objectParam } from "@/nwscript/builtins/actionBuilder";
import { ModuleObject } from "@/module/ModuleObject";

export const EffectHeal = defineAction({
  id: 78,
  name: "EffectHeal",
  comment:
    "78: Create a Heal effect. This should be applied as an instantaneous effect.\n" +
    "* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nDamageToHeal < 0.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    intParam("nDamageToHeal"),
  ] as const,

  kotor(this: NWScriptInstance, nDamageToHeal) {
    const effect = new GameState.GameEffectFactory.EffectHeal();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nDamageToHeal);
    return effect.initialize();
  },
});

export const EffectDamage = defineAction({
  id: 79,
  name: "EffectDamage",
  comment:
    "79: Create a Damage effect.\n" +
    "- nDamageAmount: amount of damage to be dealt.\n" +
    "- nDamageType: DAMAGE_TYPE_*\n" +
    "- nDamagePower: DAMAGE_POWER_*",
  returnType: NWScriptDataType.EFFECT,
  params: [
    intParam("nDamageAmount"),
    intParam("nDamageType"),
    intParam("nDamagePower"),
  ] as const,

  kotor(this: NWScriptInstance, nDamageAmount, nDamageType, nDamagePower) {
    const effect = new GameState.GameEffectFactory.EffectDamage();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());

    const damageTypeIndex = Math.log2(nDamageType);
    // NWScript damage types are flags; the effect stores amounts by slot.
    // Physical combinations (e.g. 1 | 2 | 4) and unsupported masks retain
    // the legacy physical fallback, never a fractional/out-of-range array key.
    // Slot 14 is physical damage, NOT an additional total: filling both it
    // and a typed slot would apply the same scripted damage twice.
    const damageSlot = Number.isInteger(damageTypeIndex) &&
      damageTypeIndex >= DamageType.BLUDGEONING && damageTypeIndex <= DamageType.ENERGY
      ? damageTypeIndex
      : DamageType.PHYSICAL;
    effect.setInt(damageSlot, nDamageAmount);
    effect.setInt(16, 1000);
    effect.setInt(17, nDamageType);
    effect.setInt(18, nDamagePower);

    return effect.initialize();
  },
});

export const EffectResurrection = defineAction({
  id: 82,
  name: "EffectResurrection",
  comment: "82: Create a Resurrection effect. This should be applied as an instantaneous effect.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    intParam("nHPPercent", {
      availability: "tsl",
      optional: true,
      default: 100,
      description: "TSL-only extra parameter for percent HP restored.",
    }),
  ] as const,

  kotor(this: NWScriptInstance, nHPPercent) {
    const effect = new GameState.GameEffectFactory.EffectResurrection();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },

  tsl(this: NWScriptInstance, nHPPercent) {
    const effect = new GameState.GameEffectFactory.EffectResurrection();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },
});

export const EffectTemporaryHitpoints = defineAction({
  id: 314,
  name: "EffectTemporaryHitpoints",
  comment:
    "314: Create a Temporary Hitpoints effect.\n" +
    "- nHitPoints: a positive integer\n" +
    "* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nHitPoints < 0.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    intParam("nHitPoints"),
  ] as const,

  kotor(this: NWScriptInstance, nHitPoints) {
    if (nHitPoints < 0) {
      return undefined;
    }

    const effect = new GameState.GameEffectFactory.EffectTemporaryHitPoints();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nHitPoints);
    return effect.initialize();
  },
});

export const EffectForceResisted = defineAction({
  id: 402,
  name: "EffectForceResisted",
  comment:
    "402: Effect that will play an animation and display a visual effect to indicate the target has resisted a force power.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    objectParam<ModuleObject>("oResistingObject"),
  ] as const,

  kotor(this: NWScriptInstance, oResistingObject) {
    const effect = new GameState.GameEffectFactory.EffectForceResisted();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setObject(0, oResistingObject);
    effect.initialize();
    return effect;
  },
});

export const EffectForcePushTargeted = defineAction({
  id: 269,
  name: "EffectForcePushTargeted",
  comment:
    "269: EffectForcePushTargeted\n" +
    "This effect is exactly the same as force push, except it takes a location\n" +
    "parameter that specifies where the location of the force push is to be done from.\n" +
    "AMF: The new ignore test direct line variable should be used with extreme caution.\n" +
    "It overrides geometry checks for force pushes.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    locationParam<EngineLocation>("lLocation"),
    intParam("bIgnoreTestDirectLine", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, lLocation, bIgnoreTestDirectLine) {
    const effect = new GameState.GameEffectFactory.EffectForcePushed();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 1);
    effect.setInt(1, bIgnoreTestDirectLine);
    effect.setFloat(0, lLocation.position.x);
    effect.setFloat(1, lLocation.position.y);
    effect.setFloat(2, lLocation.position.z);
    return effect.initialize();
  },
});

export const EffectForceFizzle = defineAction({
  id: 420,
  name: "EffectForceFizzle",
  comment:
    "420:\n" +
    "Effect that will display a visual effect on the specified object's hand to\n" +
    "indicate a force power has fizzled out.",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectForceFizzle();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    return effect.initialize();
  },
});

export const EffectDisguise = defineAction({
  id: 463,
  name: "EffectDisguise",
  comment: "463: Create a Disguise effect.\n- nDisguiseAppearance: DISGUISE_TYPE_*",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nDisguiseAppearance")] as const,
  kotor(this: NWScriptInstance, nDisguiseAppearance) {
    const effect = new GameState.GameEffectFactory.EffectDisguise();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, nDisguiseAppearance);
    return effect.initialize();
  },
});

export const EffectPsychicStatic = defineAction({
  id: 676,
  name: "EffectPsychicStatic",
  comment: "676: EffectPsychicStatic\n",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const effect = new GameState.GameEffectFactory.EffectTemporaryForce();
    effect.setCreator(this.caller);
    effect.setSpellId(this.getSpellId());
    effect.setInt(0, 0);
    return effect.initialize();
  },
});

export const effectsActions = [
  EffectHeal,
  EffectDamage,
  EffectResurrection,
  EffectTemporaryHitpoints,
  EffectForceResisted,
  EffectForcePushTargeted,
  EffectForceFizzle,
  EffectDisguise,
  EffectPsychicStatic,
] as const;