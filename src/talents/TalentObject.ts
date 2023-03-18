import { ModuleObject } from "../module";

export class TalentObject {
  id: number;
  type: number;
  category: number;
  item: ModuleObject;
  itemPropertyIndex: number;
  casterLevel: number;
  metaMagic: number;
  oCaster: ModuleObject;
  oTarget: ModuleObject;

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

  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject){
    this.oCaster = oCaster;
    this.oTarget = oTarget;
    //console.log('useTalentOnObject', oCaster, this, oTarget);
  }

  talentCombatRoundEnd(oTarget: ModuleObject, oCaster: ModuleObject){
    //console.log('talentCombatRoundEnd', oCaster, this, oTarget);
  }

  update(oTarget: ModuleObject, oCaster: ModuleObject, combatAction: any, delta: number = 0){

  }

  inRange(oTarget: ModuleObject, oCaster: ModuleObject){
    return true;
  }

  getCastRange(){
    return 1;
  }

  setItem( item: ModuleObject ){
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
