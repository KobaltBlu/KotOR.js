import { ModuleCreatureArmorSlot } from '@core/enums/module/ModuleCreatureArmorSlot';
import { ModuleCreatureAnimState } from '@core/enums/module/ModuleCreatureAnimState';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { WeaponType } from '@core/enums/combat/WeaponType';
import { WeaponWield } from '@core/enums/combat/WeaponWield';
import { GFFObject } from '@core/resource/GFFObject';
import { ExcitedDurationRow } from '@engine/combat/combat-engagement';
import { CombatInformation } from '@engine/combat/CombatInformation';
import { isGrenadeItemType } from '@engine/combat/item-cast-grenade';
import { getForceResistanceBonus } from '@engine/effects/effect-bonuses';
import { Item } from '@engine/module/Item';
import { OdysseyModel3D } from '@engine/render/three/odyssey';
import { GameState } from '@engine/runtime/GameState';
import type { Creature } from '@engine/module/Creature';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class CreatureEquipmentService {
  constructor(
    private readonly host: Creature,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  private static isMeleeWeaponItem(item: Item | undefined): boolean {
    if(!item?.baseItem) return false;
    const wield = item.baseItem.weaponWield;
    return (
      wield === WeaponWield.STUN_BATON ||
      wield === WeaponWield.ONE_HANDED_SWORD ||
      wield === WeaponWield.TWO_HANDED_SWORD
    );
  }

  private static isRangedWeaponItem(item: Item | undefined): boolean {
    if(!item?.baseItem || isGrenadeItemType(item.baseItem.itemType)) return false;
    const wield = item.baseItem.weaponWield;
    return (
      wield === WeaponWield.BLASTER_PISTOL ||
      wield === WeaponWield.BLASTER_RIFLE ||
      wield === WeaponWield.BLASTER_HEAVY
    );
  }

  private collectWeaponCandidates(equipped: Item | undefined): Item[] {
    const candidates = (this.host.getInventory() || []).filter((item): item is Item => !!item);
    if(equipped && candidates.indexOf(equipped) < 0){
      candidates.push(equipped);
    }
    const offHand = this.host.equipment?.LEFTHAND;
    if(offHand && candidates.indexOf(offHand) < 0){
      candidates.push(offHand);
    }
    return candidates;
  }

  private static pickMostDamagingWeapon(
    candidates: Item[],
    predicate: (item: Item) => boolean
  ): Item | undefined {
    let best: Item | undefined;
    let bestScore = -1;
    for(let i = 0; i < candidates.length; i++){
      const item = candidates[i];
      if(!item || !predicate(item)) continue;
      const score = (item.baseItem?.dieToRoll || 0) * (item.baseItem?.numDice || 0);
      if(!best || score > bestScore){
        best = item;
        bestScore = score;
      }
    }
    return best;
  }

  findMostDamagingMelee(offHand = false): Item | undefined {
    const equipped = offHand ? this.host.equipment.LEFTHAND : this.host.equipment.RIGHTHAND;
    const candidates = this.collectWeaponCandidates(equipped);
    return (
      CreatureEquipmentService.pickMostDamagingWeapon(candidates, CreatureEquipmentService.isMeleeWeaponItem) ||
      CreatureEquipmentService.pickMostDamagingWeapon(candidates, CreatureEquipmentService.isRangedWeaponItem)
    );
  }

  findMostDamagingRanged(): Item | undefined {
    const candidates = this.collectWeaponCandidates(this.host.equipment.RIGHTHAND);
    return (
      CreatureEquipmentService.pickMostDamagingWeapon(candidates, CreatureEquipmentService.isRangedWeaponItem) ||
      CreatureEquipmentService.pickMostDamagingWeapon(candidates, CreatureEquipmentService.isMeleeWeaponItem)
    );
  }

  updateItems(delta = 0){

    // Weapon meshes are updated via updateWeaponModels() after body animation so
    // saber trails see fresh bone matrices and are not double-ticked per frame.
    if(this.host.equipment.RIGHTHAND){
      this.host.equipment.RIGHTHAND.updatePoweredAnimation?.();
    }

    if(this.host.equipment.LEFTHAND){
      this.host.equipment.LEFTHAND.updatePoweredAnimation?.();
    }

    if(this.host.weaponGestureState?.active){
      this.host.weaponGestureState.remaining -= delta;
      if(this.host.weaponGestureState.remaining <= 0){
        this.host.weaponGestureState.active = false;
        this.host.resetWeaponGestureState();
        // OnFlourishClipFinished → RestoreWeaponPoweredState (keep on while combat).
        if(this.host.combatData.combatState){
          this.host.weaponPowered(true);
        }
      }
    }

    if(this.host.gestureState?.active){
      this.host.gestureState.remaining -= delta;
      if(this.host.gestureState.remaining <= 0){
        this.host.resetGestureState();
        if(this.host.combatData.combatState){
          this.host.weaponPowered(true);
          if(
            this.host.animationState.index == ModuleCreatureAnimState.MELEE_COMBAT_WIELD ||
            this.host.animationState.index == ModuleCreatureAnimState.FLOURISH
          ){
            this.host.setAnimationState(ModuleCreatureAnimState.READY);
          }
        }
      }
    }

  }

  updateWeaponModels(delta = 0){
    if(this.host.equipment.RIGHTHAND?.model instanceof OdysseyModel3D){
      this.host.equipment.RIGHTHAND.model.update(delta);
    }
    if(this.host.equipment.LEFTHAND?.model instanceof OdysseyModel3D){
      this.host.equipment.LEFTHAND.model.update(delta);
    }
  }

  /**
   * Tick non-weapon equipped items + hand powered state after body animation.
   * Mid-frame gesture/hand powered work stays in updateItems().
   */
  updateWearableEquipment(delta = 0){
    if(this.host.equipment.HEAD){
      this.host.equipment.HEAD.update(delta);
    }
    if(this.host.equipment.ARMS){
      this.host.equipment.ARMS.update(delta);
    }

    if(this.host.equipment.RIGHTARMBAND){
      this.host.equipment.RIGHTARMBAND.update(delta);
    }

    if(this.host.equipment.LEFTARMBAND){
      this.host.equipment.LEFTARMBAND.update(delta);
    }

    // Hands: powered/item logic only — model tick is updateWeaponModels after body anim.
    if(this.host.equipment.RIGHTHAND){
      this.host.equipment.RIGHTHAND.updatePoweredAnimation?.();
    }

    if(this.host.equipment.LEFTHAND){
      this.host.equipment.LEFTHAND.updatePoweredAnimation?.();
    }

    if(this.host.equipment.ARMOR){
      this.host.equipment.ARMOR.update(delta);
    }

    if(this.host.equipment.BELT){
      this.host.equipment.BELT.update(delta);
    }

    if(this.host.equipment.CLAW1){
      this.host.equipment.CLAW1.update(delta);
    }

    if(this.host.equipment.CLAW2){
      this.host.equipment.CLAW2.update(delta);
    }

    if(this.host.equipment.CLAW3){
      this.host.equipment.CLAW3.update(delta);
    }
  }

  hasWeapons(){
    let lWeapon = this.host.equipment.LEFTHAND;
    let rWeapon = this.host.equipment.RIGHTHAND;
    let cWeapon1 = this.host.equipment.CLAW1;
    let cWeapon2 = this.host.equipment.CLAW2;
    let cWeapon3 = this.host.equipment.CLAW3;
    return (lWeapon) || (rWeapon) || (cWeapon1) || (cWeapon2) || (cWeapon3);
  }

  getItemInSlot(slot = 0){
    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        return this.host.equipment.IMPLANT;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        return this.host.equipment.HEAD;
      break;
      case ModuleCreatureArmorSlot.ARMS:
        return this.host.equipment.ARMS;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        return this.host.equipment.LEFTARMBAND;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        return this.host.equipment.ARMOR;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        return this.host.equipment.RIGHTARMBAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        return this.host.equipment.LEFTHAND;
      break;
      case ModuleCreatureArmorSlot.BELT:
        return this.host.equipment.BELT;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        return this.host.equipment.RIGHTHAND;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        return this.host.equipment.CLAW1;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        return this.host.equipment.CLAW2;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        return this.host.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }
  }

  GetItemInSlot(slot = 0){

    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        return this.host.equipment.IMPLANT;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        return this.host.equipment.HEAD;
      break;
      case ModuleCreatureArmorSlot.ARMS:
        return this.host.equipment.ARMS;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        return this.host.equipment.LEFTARMBAND;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        return this.host.equipment.ARMOR;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        return this.host.equipment.RIGHTARMBAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        return this.host.equipment.LEFTHAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND2:
        return this.host.equipment.LEFTHAND2;
      break;
      case ModuleCreatureArmorSlot.BELT:
        return this.host.equipment.BELT;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        return this.host.equipment.RIGHTHAND;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND2:
        return this.host.equipment.RIGHTHAND2;
      break;
      case ModuleCreatureArmorSlot.HIDE:
        return this.host.equipment.HIDE;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        return this.host.equipment.CLAW1;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        return this.host.equipment.CLAW2;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        return this.host.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }

  }

  async equipItem(slot = 0x1, item: Item){
    if(!item){
      return;
    }

    // Skip appearance reload on unequip — ARMOR/HEAD re-equip awaits loadModel once.
    // An unawaited unequip reload races the awaited one and disposes hand weapons.
    this.host.unequipSlot(slot, false);
    if(GameState.module){
      GameState.module.lastItemEquipped = item;
    }
    item.onEquip(this.host);

    // Stamp hand slots before await so GN_GetWeaponType / attack resolve see the
    // new weapon immediately (ActionEquipItem does not await equipItem).
    switch(slot){
      case ModuleCreatureArmorSlot.RIGHTHAND:
        this.host.equipment.RIGHTHAND = item;
        await item.loadModel();
        if(item.model instanceof OdysseyModel3D)
          this.host.model?.rhand?.add(item.model);
        return;
      case ModuleCreatureArmorSlot.LEFTHAND:
        this.host.equipment.LEFTHAND = item;
        await item.loadModel();
        if(item.model instanceof OdysseyModel3D)
          this.host.model?.lhand?.add(item.model);
        return;
      case ModuleCreatureArmorSlot.RIGHTHAND2:
        this.host.equipment.RIGHTHAND2 = item;
        return;
      case ModuleCreatureArmorSlot.LEFTHAND2:
        this.host.equipment.LEFTHAND2 = item;
        return;
    }

    await item.loadModel();
    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        this.host.equipment.IMPLANT = item;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        this.host.equipment.HEAD = item;
        await this.host.loadModel();
      break;
      case ModuleCreatureArmorSlot.ARMS:
        this.host.equipment.ARMS = item;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        this.host.equipment.LEFTARMBAND = item;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        this.host.equipment.RIGHTARMBAND = item;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        this.host.equipment.ARMOR = item;
        await this.host.loadModel();
      break;
      case ModuleCreatureArmorSlot.BELT:
        this.host.equipment.BELT = item;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        this.host.equipment.CLAW1 = item;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        this.host.equipment.CLAW2 = item;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        this.host.equipment.CLAW3 = item;
      break;
      case ModuleCreatureArmorSlot.HIDE:
        this.host.equipment.HIDE = item;
      break;
    }
  }

  unequipSlot(slot = 0x1, reloadModel: boolean = true){
    try{
      switch(slot){
        case ModuleCreatureArmorSlot.IMPLANT:
          try{
            if(this.host.equipment.IMPLANT){
              const item = this.host.equipment.IMPLANT;
              this.host.equipment.IMPLANT = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.HEAD:
          if(this.host.equipment.HEAD){
            const item = this.host.equipment.HEAD;
            try{ item.model?.parent?.remove(item.model); }catch(e){}
            this.host.equipment.HEAD = undefined;
            item.onUnEquip(this.host);
            if(reloadModel){
              this.host.loadModel();
            }
          }
        break;
        case ModuleCreatureArmorSlot.ARMS:
          try{
            if(this.host.equipment.ARMS){
              const item = this.host.equipment.ARMS;
              this.host.equipment.ARMS = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTARMBAND:
          try{
            if(this.host.equipment.RIGHTARMBAND){
              const item = this.host.equipment.RIGHTARMBAND;
              this.host.equipment.RIGHTARMBAND = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTARMBAND:
          try{
            if(this.host.equipment.LEFTARMBAND){
              const item = this.host.equipment.LEFTARMBAND;
              this.host.equipment.LEFTARMBAND = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.ARMOR:

          if(this.host.equipment.ARMOR){
            this.host.equipment.ARMOR.onUnEquip(this.host);
          }

          this.host.equipment.ARMOR = undefined;
          if(reloadModel){
            this.host.loadModel();
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND:
          try{
            if(this.host.equipment.RIGHTHAND){
              const item = this.host.equipment.RIGHTHAND;
              try{ this.host.model?.rhand?.remove(item.model); }catch(e){}
              this.host.equipment.RIGHTHAND = undefined;
              // Return to inventory — do not destroy (AI weapon switches).
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND2:
          try{
            if(this.host.equipment.RIGHTHAND2){
              const item = this.host.equipment.RIGHTHAND2;
              this.host.equipment.RIGHTHAND2 = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.BELT:
          try{
            if(this.host.equipment.BELT){
              const item = this.host.equipment.BELT;
              try{ this.host.model?.rhand?.remove(item.model); }catch(e){}
              this.host.equipment.BELT = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTHAND:
          try{
            if(this.host.equipment.LEFTHAND){
              const item = this.host.equipment.LEFTHAND;
              try{ this.host.model?.lhand?.remove(item.model); }catch(e){}
              this.host.equipment.LEFTHAND = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTHAND2:
          try{
            if(this.host.equipment.LEFTHAND2){
              const item = this.host.equipment.LEFTHAND2;
              this.host.equipment.LEFTHAND2 = undefined;
              item.onUnEquip(this.host);
            }
          }catch(e){
            
          }
        break;
      }
    }catch(e){
      console.error('unequipItem', e);
    }
  }

  UnequipItems(){
    //this.host.unequipSlot(ModuleCreatureArmorSlot.ARMOR);
    this.host.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    this.host.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);
  }

  UnequipHeadItem(){
    this.host.unequipSlot(ModuleCreatureArmorSlot.HEAD);
  }

  hideEquippedItemsForDialog(unequipItems: boolean = false, unequipHead: boolean = false){
    if(!this.host.dialogEquipmentStash){
      this.host.dialogEquipmentStash = {};
    }
    if(unequipItems){
      if(this.host.equipment.RIGHTHAND && this.host.dialogEquipmentStash.RIGHTHAND === undefined){
        this.host.dialogEquipmentStash.RIGHTHAND = this.host.equipment.RIGHTHAND;
      }
      if(this.host.equipment.LEFTHAND && this.host.dialogEquipmentStash.LEFTHAND === undefined){
        this.host.dialogEquipmentStash.LEFTHAND = this.host.equipment.LEFTHAND;
      }
      this.host.UnequipItems();
    }
    if(unequipHead){
      if(this.host.equipment.HEAD && this.host.dialogEquipmentStash.HEAD === undefined){
        this.host.dialogEquipmentStash.HEAD = this.host.equipment.HEAD;
      }
      this.host.UnequipHeadItem();
    }
  }

  showEquippedItemsAfterDialog(){
    const stash = this.host.dialogEquipmentStash;
    if(!stash) return;
    const restore = (slot: number, item: Item | undefined) => {
      if(item){
        void this.host.equipItem(slot, item);
      }
    };
    restore(ModuleCreatureArmorSlot.RIGHTHAND, stash.RIGHTHAND);
    restore(ModuleCreatureArmorSlot.LEFTHAND, stash.LEFTHAND);
    restore(ModuleCreatureArmorSlot.HEAD, stash.HEAD);
    this.host.dialogEquipmentStash = undefined;
  }

  parseEquipmentSlots(){
    let slots = Object.keys(this.host.equipment);
    for(let i = 0; i < slots.length; i++){
      const slotKey = slots[i];
      let item: Item = (this.host.equipment as any)[slotKey];
      if(item){
        item.setPossessor(this.host);
        if(!item.load()){
          (this.host.equipment as any)[slotKey] = undefined;
          item.destroy();
        }
      }
    }
  }

  rebindCombatInfoEquipIds(){
    if(!this.host.combatInformation){
      return;
    }
    this.host.combatInformation.rightEquip =
      this.host.equipment.RIGHTHAND?.id ?? GameObjectConstant.OBJECT_INVALID;
    this.host.combatInformation.leftEquip =
      this.host.equipment.LEFTHAND?.id ?? GameObjectConstant.OBJECT_INVALID;
  }

  loadItem( template: GFFObject ){
    let item = new GameState.Module.Area.Item(template);
    item.initProperties();
    if(!item.load()){
      return;
    }
    let hasItem = this.host.getItemByTag(item.getTag());
    if(hasItem){
      hasItem.setStackSize(hasItem.getStackSize() + 1);
      return hasItem;
    }else{
      this.host.inventory.push(item);
      return item;
    }
  }

  syncCombatInformationForSave(){
    const info = this.host.combatInformation;
    if(!info) return;

    info.arcaneSpellFail = this.host.arcaneSpellFailure | 0;
    if(this.host.combatRound){
      info.numAttacks =
        ((this.host.combatRound.onHandAttacks || 0) + (this.host.combatRound.offHandAttacks || 0)) & 0xff;
    }

    const right = this.host.equipment.RIGHTHAND;
    const left = this.host.equipment.LEFTHAND;
    info.rightEquip = right?.id ?? GameObjectConstant.OBJECT_INVALID;
    info.leftEquip = left?.id ?? GameObjectConstant.OBJECT_INVALID;
    info.rightString = right?.getTag?.() || right?.getName?.() || '';
    info.leftString = left?.getTag?.() || left?.getName?.() || '';
    info.offHandWeaponEq = left ? 1 : 0;

    try{
      info.forceResistance = getForceResistanceBonus(this.host) & 0xff;
    }catch{
      /* keep prior */
    }

    if(right){
      info.onHandCritRng = right.getCriticalThreatRangeMin?.() ?? info.onHandCritRng;
      info.onHandCritMult = (right.getBaseItem?.()?.criticalHitMultiplier || 2) & 0xff;
    }else{
      // Unarmed defaults — CombatAttackData uses 1d4
      info.unarmedDamDice = info.unarmedDamDice || 1;
      info.unarmedDamDie = info.unarmedDamDie || 4;
      info.onHandCritRng = info.onHandCritRng || 20;
      info.onHandCritMult = info.onHandCritMult || 2;
    }

    if(left){
      info.offHandCritRng = left.getCriticalThreatRangeMin?.() ?? info.offHandCritRng;
      info.offHandCritMult = (left.getBaseItem?.()?.criticalHitMultiplier || info.offHandCritMult || 2) & 0xff;
    }

    // ACP: prefer prior loaded value; if zero and armor equipped with armorcheckpen flag, mark 1
    // (full armor.2da accheck magnitude remains Low residual)
    const armor = this.host.equipment.ARMOR;
    if(armor?.getBaseItem?.()?.armorCheckPen && !info.armorCheckPen){
      info.armorCheckPen = 1;
    }
  }
}
