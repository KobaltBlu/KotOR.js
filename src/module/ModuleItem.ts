import { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BaseItem } from "@/engine/BaseItem";
import { EffectDisguise } from "@/effects/EffectDisguise";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { WeaponType } from "@/enums/combat/WeaponType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleItemProperty } from "@/enums/module/ModuleItemProperty";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { CExoLocString } from "@/resource/CExoLocString";
import { MDLLoader, ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { TalentSpell } from "@/talents";
import { OdysseyModel3D } from "@/three/odyssey";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { BitWise } from "@/utility/BitWise";
import { Dice } from "@/utility/Dice";
import { ItemProperty } from "@/engine/ItemProperty";
import { getItemPropertyDescription } from "@/module/item-property-description";
import { GameState } from "@/GameState";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { ActionParameterType, ActionType, CombatActionType, GameEffectDurationType, ModuleCreatureAnimState, SkillType } from "@/enums";
import { CombatRoundAction, SpellCastInstance } from "@/combat";
import { castAmmunitionProjectile } from "@/combat/combat-projectile";
import { isGrenadeItemType } from "@/combat/item-cast-grenade";
import { resolveItemCastTiming } from "@/combat/item-cast-timing";
import {
  calculateLastSpellProjectileTimeMs,
  resolveSpellProjectilePathType,
  shouldDelaySpellImpactToLanding,
} from "@/combat/spell-projectile-time";
import {
  applyDecrementUses,
  getUsedActivePropertyUsesLeft,
  canTargetItemCastByPerception,
} from "@/combat/item-property-uses";
import type { SWWeaponSound } from "@/engine/rules/SWWeaponSound";

/** Retail InstantUseItem combat lockout (field436_0xab0 = 3000). */
export const INSTANT_ITEM_USE_COOLDOWN_MS = 3000;
/** TLK: one item per combat round (inventory InstantUseItem gate). */
export const TLK_ITEM_USE_COMBAT_ROUND = 42409;

/**
* ModuleItem class.
* 
* Class representing an item found in module areas, placeable, creatures, etc...
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleItem.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleItem extends ModuleObject {
  equippedRes: any;
  baseItemId: number;
  baseItem: BaseItem;
  addCost: number;
  cost: number;
  modelVariation: number;
  /** Retail item BodyVariation BYTE (A=1, B=2, …); used when baseItem.modelType == 1. */
  bodyVariation: number;
  textureVariation: number;
  palleteID: number;
  loaded: boolean;
  properties: ItemProperty[];
  possessor: any;
  descIdentified: any;
  stolen: any;
  infinite: any;
  inventoryRes: any;
  stackSize: any;
  charges: any;
  deleting: any;
  dropable: any;
  identified: any;
  maxCharges: any;
  newItem: any;
  nonEquippable: any;
  pickpocketable: any;

  upgradeItems: any = {};
  upgrades: number = 0;
  upgradeLevel: number = 0;
  upgradeSlot0: number = -1;
  upgradeSlot1: number = -1;
  upgradeSlot2: number = -1;
  upgradeSlot3: number = -1;
  upgradeSlot4: number = -1;
  upgradeSlot5: number = -1;
  weaponSound: SWWeaponSound;

  constructor ( gff = new GFFObject() ) {
    super();
    this.objectType |= ModuleObjectType.ModuleItem;

    if(typeof gff === 'string'){
      this.equippedRes = gff;
      this.template = new GFFObject();
      this.template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).setValue(gff);
    }else{
      this.template = gff;
    }

    // if(gff instanceof GFFObject && gff.RootNode.hasField('ObjectId')){
    //   this.id = gff.getFieldByLabel('ObjectId').getValue();
    // }else if(gff instanceof GFFObject && gff.RootNode.hasField('ID')){
    //   this.id = gff.getFieldByLabel('ID').getValue();
    // }else{
    //   this.id = -1;
    // }

    //this.id = -1;

    this.baseItemId = 0;
    this.addCost = 0;
    this.cost = 0;
    this.modelVariation = 0;
    this.bodyVariation = 0;
    this.textureVariation = 1;
    this.palleteID = 0;
    this.loaded = false;
    this.properties = [];
    this.upgradeItems = {};
    this.placedInWorld = false;
    this.possessor = undefined;

    this.initProperties();

  }

  clone(): ModuleItem {
    const nItem = new ModuleItem(this.template);
    nItem.initProperties();
    if(nItem.template){
      nItem.template.getFieldByLabel('StackSize')?.setValue(1);
    }
    nItem.stackSize = 1;
    nItem.copyUpgradeStateFrom(this);
    return nItem;
  }

  update(delta = 0){
    if(this.model instanceof OdysseyModel3D)
      this.model.update(delta);
  }

  getDescription(){
    if(this.descIdentified instanceof CExoLocString){
      return this.descIdentified.getValue();
    }
    return this.descIdentified;
  }

  /**
   * Retail CSWSItem::GetPropertyDescription — stats/properties + DescIdentified
   * for equip / inventory / store description panes.
   */
  getPropertyDescription(): string {
    return getItemPropertyDescription(this);
  }

  getBaseItemId(): number {
    return this.baseItemId;
  }

  getBaseItem(): BaseItem {
    return this.baseItem;
  }

  /** Appearance body letter from baseitems.2da (e.g. 'B'). */
  getBodyVariation(){
    return this.baseItem?.bodyVar;
  }

  /**
   * Retail SaveItem BodyVariation BYTE when modeltype == 1.
   * Falls back to bodyVar letter → A=1, B=2, …
   */
  getBodyVariationByte(): number {
    if(this.bodyVariation > 0) return this.bodyVariation | 0;
    const letter = this.baseItem?.bodyVar;
    if(typeof letter === 'string' && letter.length){
      return Math.max(0, letter.toUpperCase().charCodeAt(0) - 64);
    }
    return 0;
  }

  getModelVariation(){
    return this.modelVariation || 1;
  }

  getTextureVariation(){
    return this.textureVariation || 1;
  }

  getIcon(){
    return 'i'+this.baseItem.itemClass+'_'+("000" + this.getModelVariation()).slice(-3);
  }

  getWeaponWield(): WeaponWield{
    return this.baseItem.weaponWield;
  }

  getWeaponType(): WeaponType {
    return this.baseItem.weaponType;
  }

  isRangedWeapon(){
    // Retail grenade baseitems set RangedWeapon=1 but they are UseItem casts,
    // never equipped weapons — exclude ItemType 6 so inventory classifiers
    // cannot treat a grenade as a blaster.
    if(isGrenadeItemType(this.baseItem?.itemType)) return false;
    return this.baseItem.rangedWeapon;
  }

  /** baseitems ItemType 6 — inventory CastSpell grenades. */
  isGrenade(){
    return isGrenadeItemType(this.baseItem?.itemType);
  }

  isLightsaber(): boolean {
    // Base rows 8/9/10, or TSL ItemType 0x27/0x28/0x29 (short/double/standard).
    if(this.baseItemId == 8 || this.baseItemId == 9 || this.baseItemId == 10){
      return true;
    }
    const itemType = this.baseItem?.itemType | 0;
    return itemType === 0x27 || itemType === 0x28 || itemType === 0x29;
  }

  /** Whether this item should be transferred into a body bag. */
  isDropable(): boolean {
    return this.dropable === undefined || this.dropable === null ? true : !!this.dropable;
  }

  hasKeen(): boolean {
    for(let i = 0, len = this.properties.length; i < len; i++){
      if(this.properties[i].isUseable() && this.properties[i].is(ModuleItemProperty.Keen)){
        return true;
      }
    }
    return false;
  }

  isStolen(){
    return this.stolen;
  }

  isInfinite(){
    return !!(this.infinite | 0);
  }

  /** Retail item bit 2 (0x4) — store Infinite stock only; player copies clear this. */
  setInfinite(value: number = 0){
    this.infinite = value ? 1 : 0;
    if(this.template?.RootNode?.hasField?.('Infinite')){
      this.template.RootNode.getFieldByLabel('Infinite').setValue(this.infinite);
    }
  }

  /**
   * Retail CSWSItem::GetCost — plot items are worthless; otherwise
   * floor(Cost * baseitems.itemmultiplier), with results under 2 treated as 1.
   */
  getGoldPieceValue(): number {
    if(this.plot){
      return 0;
    }
    const multiplier = this.baseItem?.itemMultiplier ?? 1;
    const value = Math.floor((this.cost | 0) * multiplier);
    return value < 2 ? 1 : value;
  }

  getPropertiesList(){
    if(this.template.RootNode.hasField('PropertiesList')){
      return this.template.RootNode.getFieldByLabel('PropertiesList').getChildStructs();
    }
    return null;
  }

  isDisguise(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return true;
      }
    }
    return false;
  }

  getDisguiseAppearance(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDisguiseAppearanceId(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return property.subType;
      }
    }
    return -1;
  }

  getName(){
    return this.getLocalizedName();
  }

  getEquippedRes(){
    return this.equippedRes;
  }

  getInventoryRes(){
    return this.inventoryRes;
  }

  getStackSize(){
    return this.stackSize;
  }

  /**
   * Retail CSWSItem::GetUsedActivePropertyUsesLeft @ 00555a60.
   */
  getUsedActivePropertyUsesLeft(propertyIndex: number = 0): number {
    const prop = this.properties?.[propertyIndex | 0];
    return getUsedActivePropertyUsesLeft(prop, this.charges | 0, this.getStackSize() | 0);
  }

  /**
   * Active CastSpell property used by a combat-round item cast.
   */
  getActiveCastSpellProperty(propertyIndex: number = 0){
    const prop = this.properties?.[propertyIndex | 0];
    if(prop && prop.is?.(ModuleItemProperty.CastSpell)){
      return prop;
    }
    for(let i = 0; i < (this.properties?.length || 0); i++){
      if(this.properties[i]?.is?.(ModuleItemProperty.CastSpell)){
        return this.properties[i];
      }
    }
    return undefined;
  }

  setStackSize(value: number){
    return this.stackSize = value;
  }

  getLocalizedName(){
    return this.localizedName.getValue().replace(/\0[\s\S]*$/g,'');
  }

  getPalleteID(){
    return this.palleteID;
  }

  getTag(){
    return this.tag;
  }

  getACBonus(){
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Armor)){
        bonus += property.getValue();
      }
    }
    return this.baseItem.baseAC + bonus;
  }

  getDexBonus(){
    if(this.baseItemId){
      return this.baseItem.dexBonus || 0;
    }
    return 0;
  }

  getAttackBonus(): number {
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.AttackBonus)){
        bonus += property.getValue();
        break;
      }
    }

    if(BitWise.InstanceOfObject(this.possessor, ModuleObjectType.ModuleCreature)){
      switch(this.getWeaponWield()){
        case WeaponWield.BLASTER_PISTOL:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_BLASTER)){
            bonus += 1;
          }
        break;
        case WeaponWield.BLASTER_RIFLE:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_BLASTER_RIFLE)){
            bonus += 1;
          }
        break;
        case WeaponWield.BLASTER_HEAVY:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_HEAVY_WEAPONS)){
            bonus += 1;
          }
        break;
        case WeaponWield.ONE_HANDED_SWORD:
        case WeaponWield.TWO_HANDED_SWORD:
        case WeaponWield.STUN_BATON:
          if(this.baseItemId == 8 || this.baseItemId == 9 || this.baseItemId == 10){
            if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_LIGHTSABER)){
              bonus += 1;
            }
            // TSL Superior Weapon Focus: Lightsaber I/II/III → +1/+2/+3 (stacks with Focus)
            if(this.possessor.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_LIGHTSABER_III)){
              bonus += 3;
            }else if(this.possessor.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_LIGHTSABER_II)){
              bonus += 2;
            }else if(this.possessor.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_LIGHTSABER_I)){
              bonus += 1;
            }
          }else if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_MELEE_WEAPONS)){
            bonus += 1;
          }
        break;
      }
    }

    return bonus;
  }

  getBaseDamage(){
    if(this.baseItem.numDice){
      return Dice.roll(this.baseItem.numDice, this.baseItem.die);
    }
    return 0;
  }

  getBaseDamageType(): number {
    if(this.baseItem){
      return Math.log2(this.baseItem.damageFlags) & 0xFF;
    }
    return 0;
  }

  getMonsterDamage(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Monster_Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  hasDamageBonus(): boolean {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return true;
      }
    }
    return false;
  }

  getDamageBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDamageBonusType(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return property.getSubType()?.id || 0;
      }
    }
    return 0;
  }

  getDamageFlags(): number {
    return this.baseItem.damageFlags;
  }

  getCriticalThreatRangeMin(){
    return 21 - this.baseItem.criticalThreat;
  }

  getCriticalThreatRangeMax(){
    return 20;
  }

  getSTRBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 0)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDEXBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 1)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCONBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 2)){
        return property.getValue();
      }
    }
    return 0;
  }

  getINTBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 3)){
        return property.getValue();
      }
    }
    return 0;
  }

  getWISBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 4)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCHABonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 5)){
        return property.getValue();
      }
    }
    return 0;
  }

  isUpgradable(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.upgradeType >= 0 && property.upgradeType !== 255){
        return true;
      }
    }
    return this.upgradeLevel > 0;
  }

  getUpgradeSlot(index: number): number {
    switch(index){
      case 0: return this.upgradeSlot0;
      case 1: return this.upgradeSlot1;
      case 2: return this.upgradeSlot2;
      case 3: return this.upgradeSlot3;
      case 4: return this.upgradeSlot4;
      case 5: return this.upgradeSlot5;
      default: return -1;
    }
  }

  setUpgradeSlot(index: number, value: number): void {
    const slotValue = (typeof value === 'number' ? value : -1);
    switch(index){
      case 0: this.upgradeSlot0 = slotValue; break;
      case 1: this.upgradeSlot1 = slotValue; break;
      case 2: this.upgradeSlot2 = slotValue; break;
      case 3: this.upgradeSlot3 = slotValue; break;
      case 4: this.upgradeSlot4 = slotValue; break;
      case 5: this.upgradeSlot5 = slotValue; break;
    }
  }

  hasUpgradeBit(rowIndex: number): boolean {
    if(rowIndex < 0 || rowIndex > 31) return false;
    const flag = 1 << rowIndex;
    return ((this.upgrades || 0) & flag) === flag;
  }

  copyUpgradeStateFrom(source: ModuleItem): void {
    if(!source) return;
    this.upgrades = source.upgrades || 0;
    this.upgradeLevel = source.upgradeLevel || 0;
    for(let i = 0; i < 6; i++){
      this.setUpgradeSlot(i, source.getUpgradeSlot(i));
    }
  }

  castAmmunitionAtTarget(oCaster: ModuleObject, oTarget: ModuleObject){
    if(typeof oTarget == 'undefined') return;
    const ammunitiontype = this.baseItem?.ammunitionType;
    if(!(ammunitiontype >= 1)) return;
    castAmmunitionProjectile(oCaster, oTarget, this);
  }

  /**
   * Retail CSWSCreature::UseItem → AddItemCastSpellActions (mipc / PartyMenuUseItem).
   * Schedules ITEM_CAST_SPELL on the combat round, then ensures ActionCombat.
   */
  scheduleItemCastSpell(oCaster: ModuleCreature, oTarget: ModuleObject, spellId: number, options: { isUserAction?: boolean; activePropertyIndex?: number } = {}){
    if(!oCaster?.combatRound) return;

    // Retail AddItemCastSpellActions visibility (non-party field426==0)
    if(oTarget && oTarget !== oCaster){
      const isPartyUI = !!(oCaster.isPartyMember?.() || oCaster.isPlayer || oCaster.isPM);
      const entry = oCaster.perceptionList?.find((o) => o.object === oTarget || o.objectId === oTarget.id);
      if(!canTargetItemCastByPerception(entry?.data, {
        isPartyOrPlayerUI: isPartyUI,
        isSelf: false,
      })){
        return;
      }
    }

    const hadPending = oCaster.combatRound.getActionPending();
    const combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.ITEM_CAST_SPELL;
    combatAction.target = oTarget;
    combatAction.item = this;
    combatAction.activePropertyIndex = options.activePropertyIndex ?? 0;
    combatAction.domainLevel = 1;
    combatAction.isUserAction = !!options.isUserAction;
    combatAction.setSpell(new TalentSpell(spellId));
    // Grenade / medpac spells often have **** iconresref — use inventory icon
    const spellIcon = String(combatAction.spell?.iconresref || '').trim();
    if(!spellIcon || spellIcon === '****'){
      combatAction.iconResRef = this.getIcon?.() || combatAction.iconResRef;
    }

    const modeltype = oCaster.creatureAppearance?.modeltype;
    const distanceSq = oTarget
      ? oTarget.position.distanceToSquared(oCaster.position)
      : 0;
    const timing = resolveItemCastTiming(
      this.baseItem?.itemType,
      modeltype,
      distanceSq,
      1500
    );
    combatAction.animation = timing.animation;
    combatAction.animationTime = timing.pauseMs;

    oCaster.combatRound.addAction(combatAction);
    // Retail GetSpellCastItem field347 — stamp caster for spell scripts
    oCaster.spellCastItem = this;

    // Retail AddItemCastSpellActions (param_9==0): player with pending combat
    // action → ClearAllActions on the action queue (combat round list kept).
    if(hadPending && oCaster === GameState.getCurrentPlayer?.()){
      oCaster.actionQueue.clear();
    }

    if(!oCaster.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new GameState.ActionFactory.ActionCombat(0xFFFF);
      oCaster.actionQueue.add(action);
    }
  }

  /**
   * Retail CSWSItem::DecrementUses @ 0055de20 — cost_value drives stack /
   * charge / uses-per-day burn; may mark the property unusable and destroy.
   */
  decrementUses(oCaster?: ModuleCreature, propertyIndex: number = 0): void {
    if(GameState.infiniteUses) return;
    const prop =
      this.getActiveCastSpellProperty?.(propertyIndex) ||
      this.properties?.[propertyIndex | 0];
    if(!prop){
      // Fallback: legacy charges→stack when property missing
      if(this.charges > 1){
        this.charges -= 1;
        return;
      }
      if(this.charges === 1){
        this.removeFromCasterInventory(oCaster, 1);
        return;
      }
      const stack = this.getStackSize();
      if(stack <= 1){
        this.removeFromCasterInventory(oCaster, 1);
      }else{
        this.setStackSize(stack - 1);
      }
      return;
    }

    const result = applyDecrementUses({
      costValue: prop.costValue | 0,
      charges: this.charges | 0,
      stackSize: this.getStackSize() | 0,
      usesPerDay: prop.usesPerDay | 0,
      useable: prop.useable,
      itemType: this.baseItem?.itemType,
    });
    this.charges = result.charges;
    this.setStackSize(result.stackSize);
    prop.usesPerDay = result.usesPerDay;
    prop.useable = result.useable;
    if(result.destroyItem){
      this.removeFromCasterInventory(oCaster, 1);
    }
  }

  /**
   * Party inventory lives in InventoryManager; creature inventory on ModuleObject.
   */
  private removeFromCasterInventory(oCaster: ModuleCreature | undefined, nCount: number = 1): void {
    if(!oCaster) return;
    if(oCaster.isPartyMember?.() || oCaster.isPlayer || oCaster.isPM){
      GameState.InventoryManager.removeItem(this, nCount);
      return;
    }
    oCaster.removeItem?.(this, nCount);
  }

  /**
   * Retail InstantUseItem @ 004efe30 — inventory Use Item (immediate SpellCastAndImpact).
   * During combat sets a 3s lockout (TLK 42409 / one item per round).
   */
  instantUseItem(oCaster: ModuleCreature): boolean {
    if(!oCaster) return false;

    if(
      oCaster.isHostileCombatEngaged?.() &&
      (oCaster.instantItemCooldownMs || 0) > 0
    ){
      GameState.FeedbackMessageManager?.AddStrRef?.(TLK_ITEM_USE_COMBAT_ROUND);
      return false;
    }

    for(let i = 0, len = this.properties.length; i < len; i++){
      const property = this.properties[i];
      if(!property.isUseable() || !property.is(ModuleItemProperty.CastSpell) || property.subType == null){
        continue;
      }

      const spell = new TalentSpell(property.subType);
      oCaster.spellCastItem = this;
      const cast = new SpellCastInstance(oCaster, oCaster, spell);
      cast.applySpellData();
      cast.castItem = this;
      cast.conjureTime = 0;
      cast.allowCounterSpell = false;
      // Retail InstantUseItem still SpellCastAndImpact — stamp caster level /
      // GetSpellCastItem; delay impact when the spell is a throw / projectile.
      const lastClass = oCaster.classes?.[oCaster.classes.length - 1];
      oCaster.baseClassLevel = (lastClass?.level | 0);
      oCaster.itemSpellCastActive = true;
      spell.setCasterLevel?.(oCaster.baseClassLevel);

      if(shouldDelaySpellImpactToLanding(spell, false)){
        cast.impactAtProjectileLanding = true;
        const pathType = resolveSpellProjectilePathType(spell.projtype) || 6;
        // Self-target InstantUse — flight distance ~0; still honor path-6 hang
        const flightMs = calculateLastSpellProjectileTimeMs(0.01, pathType);
        cast.castTime = Math.max(1, flightMs);
        oCaster.area?.attachSpellInstance?.(cast);
        cast.init();
      }else{
        cast.castTime = 0;
        oCaster.area?.attachSpellInstance?.(cast);
        cast.init();
        cast.impact();
        cast.completed = true;
        oCaster.itemSpellCastActive = false;
      }

      this.decrementUses(oCaster);

      if(oCaster.combatData?.combatState){
        oCaster.instantItemCooldownMs = INSTANT_ITEM_USE_COOLDOWN_MS;
      }
      return true;
    }
    return false;
  }

  /**
   * Use item on a target. HUD / scripted UseItem uses combat-round cast;
   * non-CastSpell props keep direct action enqueue.
   */
  useItemOnObject(oCaster: ModuleCreature, oTarget: ModuleObject, options: { isUserAction?: boolean } = {}){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(!property.isUseable()){ continue; }

      if(property.is(ModuleItemProperty.CastSpell)){
        // Retail UseItem → AddItemCastSpellActions (combat round path)
        this.scheduleItemCastSpell(oCaster, oTarget, property.subType, {
          isUserAction: options.isUserAction,
          activePropertyIndex: i,
        });
      }else if(property.is(ModuleItemProperty.ThievesTools)){
        const action = new GameState.ActionFactory.ActionUnlockObject();
        action.setParameter(0, ActionParameterType.DWORD, oTarget);
        action.setParameter(1, ActionParameterType.DWORD, this);
        oCaster.actionQueue.add(action);
      }else if(property.is(ModuleItemProperty.Trap)){
        const action = new GameState.ActionFactory.ActionSetMine();
        action.setParameter(0, ActionParameterType.DWORD, this);
        action.setParameter(1, ActionParameterType.DWORD, oTarget);
        action.setParameter(2, ActionParameterType.FLOAT, oTarget.position.x);
        action.setParameter(3, ActionParameterType.FLOAT, oTarget.position.y);
        action.setParameter(4, ActionParameterType.FLOAT, oTarget.position.z);
        oCaster.actionQueue.add(action);
      }else if(property.is(ModuleItemProperty.Droid_Repair_Kit)){
        const skill = new GameState.TalentSkill(SkillType.REPAIR);
        skill.useTalentOnObject(oTarget, oCaster, 0, this);
      }else if(property.is(ModuleItemProperty.Computer_Spike)){
        // Consume spike and grant temporary Computer Use bonus (costValue from property table)
        const bonus = Math.max(1, property.getValue?.() || property.costValue || 1);
        const effect = new GameState.GameEffectFactory.EffectSkillIncrease();
        effect.setCreator(oCaster);
        effect.setInt(0, SkillType.COMPUTER_USE);
        effect.setInt(1, bonus);
        effect.setDurationType(GameEffectDurationType.TEMPORARY);
        effect.setDuration(120); // seconds — lasts through typical computer use
        oCaster.addEffect(effect);

        if(!GameState.infiniteUses){
          const inventory = oCaster.getInventory();
          if(inventory.includes(this)){
            const stack = this.getStackSize();
            if(stack <= 1){
              const idx = inventory.indexOf(this);
              if(idx >= 0) inventory.splice(idx, 1);
              this.destroy();
            }else{
              this.setStackSize(stack - 1);
            }
          }
        }
      }
    }
  }

  load(){
    if(!this.loaded && this.getEquippedRes()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], this.getEquippedRes());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        return true;
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
        return false;
      }
    }else if(!this.loaded && this.getInventoryRes()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], this.getInventoryRes());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        return true;
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
        return false;
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      // this.loadScripts();
      return true;
    }
  }

  async loadModel(): Promise<OdysseyModel3D> {
    if(!this.baseItem){ 
      this.model = new OdysseyModel3D;
      return this.model;
    }

    let itemclass = this.baseItem.itemClass;
    let defaultModel = this.baseItem.defaultModel;
    itemclass = itemclass.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
    defaultModel = defaultModel.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();

    if(defaultModel != 'i_null'){
      defaultModel = this.nthStringConverter(defaultModel, this.getModelVariation());
      if(!parseInt(defaultModel.substr(-3))){
        defaultModel = itemclass+'_'+(('000'+this.getModelVariation()).substr(-3));
      }
    }

    try{
      const mdl = await MDLLoader.loader.load(defaultModel);
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        lighting: true,
        // Retail SetEnvMap — baseitems.2da PartEnvMap flags item parts to receive the
        // area envmap ("DEFAULT" resolves to the area's DefaultEnvMap).
        envMapOverride: this.baseItem.partEnvMap ? 'DEFAULT' : undefined,
        //castShadow: false,
        //receiveShadow: false
      });
      this.model = model;
      return this.model;
    }catch(e){
      this.model = new OdysseyModel3D;
      return this.model;
    }
  }

  nthStringConverter(name = '', nth = 1){
    let value = nth.toString();
    name = name.substr(0, name.length - value.length);
    return name + value;
  }

  /** Desired PowerItem state — true while combat-powered (retail field40_0x19c). */
  poweredDesired: boolean = false;
  /** Queue looping `powered` after non-looping `powerup` finishes (PowerItem @ 00647130). */
  pendingPoweredAnim: boolean = false;

  /**
   * Set the weapon powered state and update the powered animation.
   * Retail PowerItem plays powerup then queues powered (flag 0x20 follow-up).
   * @param powered - Whether the weapon should be powered
   */
  setPowered(powered: boolean){
    if(!(this.model instanceof OdysseyModel3D)){ return; }
    this.poweredDesired = powered;
    const currentAnimL = this.model.animationManager.currentAnimation || this.model.odysseyAnimationMap.get('off');
    if(!currentAnimL){ return; }
    const name = (currentAnimL.name || '').toLowerCase();

    //power up
    if(powered){
      switch(name){
        case 'off':
        case 'powerdown':
          this.pendingPoweredAnim = true;
          this.model.playAnimation('powerup');
        break;
        case 'powerup':
          this.pendingPoweredAnim = true;
        break;
        case 'powered':
          this.pendingPoweredAnim = false;
        break;
        default:
          this.pendingPoweredAnim = false;
          this.model.playAnimation('powered', true);
        break;
      }
      return;
    }

    this.pendingPoweredAnim = false;
    //power down
    switch(name){
      case 'powered':
      case 'powerup':
        this.model.playAnimation('powerdown');
      break;
      case 'powerdown':
      break;
      default:
        this.model.playAnimation('off', true);
      break;
    }
  }

  /**
   * Advance powerup → powered chain after the item Gob updates.
   * Call each frame from creature updateItems while the model is ticking.
   */
  updatePoweredAnimation(){
    if(!this.pendingPoweredAnim || !(this.model instanceof OdysseyModel3D)){ return; }
    const anim = this.model.animationManager.currentAnimation;
    const name = (anim?.name || '').toLowerCase();
    // powerup finished (cleared) or already past it
    if(!anim || name !== 'powerup'){
      this.pendingPoweredAnim = false;
      if(this.poweredDesired){
        this.model.playAnimation('powered', true);
      }
    }
  }

  /**
   * Play a fire-forget gesture clip on this item Gob (retail AnimBaseWield path).
   * Used for weapon flourish while body drive continues on the creature model.
   */
  playWeaponGesture(clipName: string): boolean {
    if(!(this.model instanceof OdysseyModel3D) || !clipName){ return false; }
    const name = clipName.toLowerCase().trim();
    if(!this.model.odysseyAnimationMap?.has(name)){ return false; }
    this.model.playAnimation(name, false);
    return true;
  }

  static FromResRef(resRef: string): ModuleItem {
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], resRef);
    if(buffer){
      const item = new ModuleItem(new GFFObject(buffer));
      item.initProperties();
      return item;
    }
    return undefined;
  }

  getSpells(){
    let spells = [];

    //propertyName, subType, costTable, costValue, param1, param1Value, chanceAppear, usesPerDay, useable, upgradeType
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      //Activate Item
      if(property.propertyName == ModuleItemProperty.CastSpell){
        spells.push(new TalentSpell(property.subType));
      }
    }

    return spells;
  }

  initProperties(){

    if(this.loaded){
      return;
    }
    
    if(!this.initialized){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
      
      GameState.ModuleObjectManager.AddObjectById(this);
    }

    if(this.template.RootNode.hasField('AddCost'))
      this.addCost = parseInt(this.template.getFieldByLabel('AddCost').getValue());

    if(this.template.RootNode.hasField('BaseItem')){
      this.baseItemId = this.template.getFieldByLabel('BaseItem').getValue();
      this.baseItem = BaseItem.From2DA(this.baseItemId);
    }

    if(this.template.RootNode.hasField('BodyVariation')){
      this.bodyVariation = this.template.getFieldByLabel('BodyVariation').getValue();
    }else if(this.baseItem?.modelType == 1){
      // Retail LoadDataFromGff seeds body_variation from baseitems when modeltype == 1
      const letter = this.baseItem.bodyVar;
      if(typeof letter === 'string' && letter.length){
        this.bodyVariation = Math.max(0, letter.toUpperCase().charCodeAt(0) - 64);
      }
    }

    if(this.template.RootNode.hasField('Charges'))
      this.charges = this.template.getFieldByLabel('Charges').getValue();

    if(this.template.RootNode.hasField('Cost'))
      this.cost = parseInt(this.template.getFieldByLabel('Cost').getValue());

    if(this.template.RootNode.hasField('DELETING'))
      this.deleting = this.template.getFieldByLabel('DELETING').getValue();

    if(this.template.RootNode.hasField('DescIdentified'))
      this.descIdentified = this.template.getFieldByLabel('DescIdentified').getCExoLocString();

    if(this.template.RootNode.hasField('Description'))
      this.description = this.template.getFieldByLabel('Description').getCExoLocString();

    if(this.template.RootNode.hasField('Dropable'))
      this.dropable = this.template.getFieldByLabel('Dropable').getValue();
      
    if(this.template.RootNode.hasField('EquippedRes'))
      this.equippedRes = this.template.getFieldByLabel('EquippedRes').getValue();

    if(this.template.RootNode.hasField('Identified'))
      this.identified = this.template.getFieldByLabel('Identified').getValue();

    if(this.template.RootNode.hasField('Infinite'))
      this.infinite = this.template.getFieldByLabel('Infinite').getValue();

    if(this.template.RootNode.hasField('InventoryRes'))
      this.inventoryRes = this.template.getFieldByLabel('InventoryRes').getValue();
  
    if(this.template.RootNode.hasField('LocalizedName'))
      this.localizedName = this.template.RootNode.getFieldByLabel('LocalizedName').getCExoLocString();
        
    if(this.template.RootNode.hasField('MaxCharges'))
      this.maxCharges = this.template.RootNode.getFieldByLabel('MaxCharges').getValue();

    if(this.template.RootNode.hasField('ModelVariation'))
      this.modelVariation = this.template.RootNode.getFieldByLabel('ModelVariation').getValue();
    
    if(this.template.RootNode.hasField('NewItem'))
      this.newItem = this.template.RootNode.getFieldByLabel('NewItem').getValue();
        
    if(this.template.RootNode.hasField('NonEquippable'))
      this.nonEquippable = this.template.RootNode.getFieldByLabel('NonEquippable').getValue();
  
    if(this.template.RootNode.hasField('Pickpocketable'))
      this.pickpocketable = this.template.RootNode.getFieldByLabel('Pickpocketable').getValue();
      
    if(this.template.RootNode.hasField('Plot'))
      this.plot = this.template.getFieldByLabel('Plot').getValue();

    if(this.template.RootNode.hasField('PropertiesList')){
      let propertiesList = this.template.getFieldByLabel('PropertiesList').getChildStructs();
      this.properties = [];
      for(let i = 0, len = propertiesList.length; i < len; i++){
        this.properties.push( 
          new ItemProperty( 
            GFFObject.FromStruct( propertiesList[i] ), this 
          ) 
        );
      }
    }

    if(this.template.RootNode.hasField('StackSize'))
      this.stackSize = this.template.getFieldByLabel('StackSize').getValue();

    if(this.template.RootNode.hasField('Stolen'))
      this.stolen = this.template.getFieldByLabel('Stolen').getValue();

    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue().replace(/\0[\s\S]*$/g,'');

    if(this.template.RootNode.hasField('TextureVar'))
      this.textureVariation = this.template.getFieldByLabel('TextureVar').getValue();

    if(this.template.RootNode.hasField('Upgrades')){
      this.upgrades = this.template.getFieldByLabel('Upgrades').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeLevel')){
      this.upgradeLevel = this.template.getFieldByLabel('UpgradeLevel').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeSlot0')){
      const v = this.template.getFieldByLabel('UpgradeSlot0').getValue();
      this.upgradeSlot0 = (v === 255 ? -1 : v);
    }

    if(this.template.RootNode.hasField('UpgradeSlot1')){
      const v = this.template.getFieldByLabel('UpgradeSlot1').getValue();
      this.upgradeSlot1 = (v === 255 ? -1 : v);
    }

    if(this.template.RootNode.hasField('UpgradeSlot2')){
      const v = this.template.getFieldByLabel('UpgradeSlot2').getValue();
      this.upgradeSlot2 = (v === 255 ? -1 : v);
    }

    if(this.template.RootNode.hasField('UpgradeSlot3')){
      const v = this.template.getFieldByLabel('UpgradeSlot3').getValue();
      this.upgradeSlot3 = (v === 255 ? -1 : v);
    }

    if(this.template.RootNode.hasField('UpgradeSlot4')){
      const v = this.template.getFieldByLabel('UpgradeSlot4').getValue();
      this.upgradeSlot4 = (v === 255 ? -1 : v);
    }

    if(this.template.RootNode.hasField('UpgradeSlot5')){
      const v = this.template.getFieldByLabel('UpgradeSlot5').getValue();
      this.upgradeSlot5 = (v === 255 ? -1 : v);
    }

    if(this.template.RootNode.hasField('XPosition'))
      this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

    if(this.template.RootNode.hasField('YPosition'))
      this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

    if(this.template.RootNode.hasField('ZPosition'))
      this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();

    if(this.template.RootNode.hasField('XOrientation'))
      this.xOrientation = this.template.RootNode.getFieldByLabel('XOrientation').getValue();

    if(this.template.RootNode.hasField('YOrientation'))
      this.yOrientation = this.template.RootNode.getFieldByLabel('YOrientation').getValue();

    if(this.template.RootNode.hasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.getFieldByLabel('ZOrientation').getValue();

    if(this.template.RootNode.hasField('PaletteID'))
      this.palleteID = this.template.RootNode.getFieldByLabel('PaletteID').getValue();

    // Retail PlaySwingSound indexes weaponsounds by baseitems.weaponmattype
    this.weaponSound = GameState.SWRuleSet.weaponSounds[this.baseItem?.weaponMaterialType];

    this.initialized = true

  }

  setPossessor( oCreature: ModuleObject){
    this.possessor = oCreature;
  }

  getPossessor(){
    return this.possessor;
  }

  onEquip(oCreature: ModuleCreature){
    console.log('ModuleItem.onEquip', oCreature, this);
    if(this.isDisguise()){
      oCreature.removeEffectsByType( GameEffectType.EffectDisguise ); //EFFECT_DISGUISE
      let eDisguise = new EffectDisguise();
      eDisguise.setInt(0, this.getDisguiseAppearanceId());
      eDisguise.setCreator(this);
      eDisguise.setAttachedObject(oCreature);
      oCreature.addEffect( eDisguise );
    }
    if(GameState.PartyManager.party.indexOf(oCreature) >= 0){
      GameState.InventoryManager.removeItem(this);
    }else{
      oCreature.removeItem(this, this.getStackSize?.() ?? 1);
    }
    this.setPossessor(oCreature);
  }

  onUnEquip(oCreature: ModuleCreature){
    console.log('ModuleItem.onUnEquip', oCreature, this);
    oCreature.removeEffectsByCreator(this);
    if(GameState.PartyManager.party.indexOf(oCreature) >= 0){
      GameState.InventoryManager.addItem(this);
    }else{
      oCreature.addItem(this);
    }
    this.setPossessor(undefined);
  }

  destroy(): void {
    super.destroy();
    if(this.placedInWorld){
      if(this.area) this.area.detachObject(this);
    }
  }

  save(){
    let itemStruct = new GFFStruct(0);

    // Retail CSWSItem::SaveItem does not write ObjectId
    itemStruct.addField( new GFFField(GFFDataType.INT, 'BaseItem') ).setValue(this.getBaseItemId());
    itemStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Identified') ).setValue(this.identified);
    itemStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue(
      this.description instanceof CExoLocString ? this.description : new CExoLocString()
    );
    itemStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'DescIdentified') ).setValue(
      this.descIdentified instanceof CExoLocString ? this.descIdentified : new CExoLocString()
    );
    itemStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).setValue(
      this.localizedName instanceof CExoLocString ? this.localizedName : new CExoLocString()
    );
    itemStruct.addField( new GFFField(GFFDataType.WORD, 'StackSize') ).setValue(this.stackSize);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Stolen') ).setValue(this.stolen);
    itemStruct.addField( new GFFField(GFFDataType.DWORD, 'Upgrades') ).setValue(this.upgrades);
    // TSL-only upgrade slots (K1 has no UpgradeLevel / UpgradeSlot* strings)
    if(GameState.GameKey == GameEngineType.TSL){
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeLevel') ).setValue(this.upgradeLevel);
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeSlot0') ).setValue(this.upgradeSlot0 == -1 ? 255 : this.upgradeSlot0);
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeSlot1') ).setValue(this.upgradeSlot1 == -1 ? 255 : this.upgradeSlot1);
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeSlot2') ).setValue(this.upgradeSlot2 == -1 ? 255 : this.upgradeSlot2);
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeSlot3') ).setValue(this.upgradeSlot3 == -1 ? 255 : this.upgradeSlot3);
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeSlot4') ).setValue(this.upgradeSlot4 == -1 ? 255 : this.upgradeSlot4);
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeSlot5') ).setValue(this.upgradeSlot5 == -1 ? 255 : this.upgradeSlot5);
    }
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Dropable') ).setValue(this.dropable);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Pickpocketable') ).setValue(this.pickpocketable ? 1 : 0);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'ModelVariation') ).setValue(this.modelVariation);
    // Retail SaveItem: BodyVariation + TextureVar only when baseitems.modeltype == 1
    if(this.baseItem?.modelType == 1){
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'BodyVariation') ).setValue(this.getBodyVariationByte());
      itemStruct.addField( new GFFField(GFFDataType.BYTE, 'TextureVar') ).setValue(this.getTextureVariation());
    }
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Charges') ).setValue(this.charges);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'MaxCharges') ).setValue(this.maxCharges);
    itemStruct.addField( new GFFField(GFFDataType.DWORD, 'Cost') ).setValue(this.cost);
    itemStruct.addField( new GFFField(GFFDataType.DWORD, 'AddCost') ).setValue(this.addCost);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Plot') ).setValue(this.plot);

    let propertiesList = itemStruct.addField( new GFFField(GFFDataType.LIST, 'PropertiesList') );
    for(let i = 0; i < this.properties.length; i++){
      const propStruct = this.properties[i].save();
      // Retail SaveItemProperties: list element struct id = index
      propStruct.setType(i);
      propertiesList.addChildStruct( propStruct );
    }

    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(this.xOrientation);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(this.yOrientation);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(this.zOrientation);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'NonEquippable') ).setValue(this.nonEquippable);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'NewItem') ).setValue(this.newItem);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'DELETING') ).setValue(this.deleting ? 1 : 0);

    return itemStruct;
  }

}
