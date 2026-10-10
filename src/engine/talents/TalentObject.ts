import { TalentObjectType } from "@engine/enums/engine/TalentObjectType";
import type { GameObject } from "@engine/module/GameObject";

/**
 * TalentObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TalentObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TalentObject {
  id: number;
  objectType: number = TalentObjectType.TalentObject;
  category: number = -1;
  maxCR: number = 0;
  item: GameObject;
  itemPropertyIndex: number;
  casterLevel: number;
  metaMagic: number;
  oCaster: GameObject;
  oTarget: GameObject;

  constructor( id = -1 ){
    this.id = id;
    this.item = undefined;
    this.itemPropertyIndex = -1;
    this.casterLevel = 0;
    this.metaMagic = 0;
  }

  getId(){
    return this.id;
  }

  useTalentOnObject(oTarget: GameObject, oCaster: GameObject){
    this.oCaster = oCaster;
    this.oTarget = oTarget;
  }

  talentCombatRoundEnd(oTarget: GameObject, oCaster: GameObject){
    //console.log('talentCombatRoundEnd', oCaster, this, oTarget);
  }

  update(oTarget: GameObject, oCaster: GameObject, combatAction: any, delta: number = 0){

  }

  inRange(oTarget: GameObject, oCaster: GameObject){
    return true;
  }

  getCastRange(){
    return 1;
  }

  setItem( item: GameObject ){
    this.item = item;
  }

  setItemPropertyIndex( itemPropertyIndex = -1 ){
    this.itemPropertyIndex = itemPropertyIndex;
  }

  setCasterLevel( casterLevel = 0 ){
    this.casterLevel = casterLevel;
  }

  setMetaType( metaMagic = 0 ){
    this.metaMagic = metaMagic;
  }

}
