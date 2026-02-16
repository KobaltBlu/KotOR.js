import { TalentObject } from "@/talents/TalentObject";
import { OdysseyModel3D } from "@/three/odyssey";
import { ActionCombat } from "@/actions/ActionCombat";
import { CombatRoundAction, SpellCastInstance } from "@/combat";
import { ActionType } from "@/enums/actions/ActionType";
import { CombatActionType } from "@/enums/combat/CombatActionType";
import { TalentObjectType } from "@/enums/engine/TalentObjectType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { TwoDAManager } from "@/managers/TwoDAManager";
import type { ModuleObject } from "@/module";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);
import { TwoDAObject } from "@/resource/TwoDAObject";

const underscoreParser = (value: string = ''): number[] => {
  return value.split('_').map((val) => {
    return val != '' ? Number(val) : undefined; 
  }).filter((val) => typeof val !== 'undefined') || [];
}

export class TalentSpell extends TalentObject {
  flags: number;
  label: string = '';
  name: number = -1;
  spelldesc: number = -1;
  forcepoints: number = -1;

  /**
   * - = Neutral
   * G = Good
   * E = Evil
   */
  goodEvil: string = '-';

  /**
   * 1 = Spell
   * 2 = Special Ability
   * 3 = Feat
   * 4 = Item Power
   */
  userType: number = 0;
  prerequisites: number[] = [];
  masterspell: number = -1;
  guardian: number = 0;
  consular: number = 0;
  sentinel: number = 0;
  weaponmaster: number = 0;
  jedimaster: number = 0;
  watchman: number = 0;
  marauder: number = 0;
  sithlord: number = 0;
  assassin: number = 0;
  inate: number = 0;
  maxCR: number = -1;
  category: number = 0;
  range: string = '';
  iconresref: string = '';
  impactscript: string = '';
  conjtime: string = '0';
  conjanim: string = '';
  conjheadvisual: string = '';
  conjhandvisual: string = '';
  conjgrndvisual: string = '';
  conjsoundvfx: string = '';
  conjsoundmale: string = '';
  conjsoundfemale: string = '';
  castanim: string = 'self';
  casttime: number = 0;
  castheadvisual: string = '';
  casthandvisual: string = '';
  castgrndvisual: string = '';
  castsound: string = '';
  catchanim: string = '';
  catchheadvisual: string = '';
  catchhandvisual: string = '';
  catchgrndvisual: string = '';
  catchesound: string = '';
  catchtime: number = 0;
  proj: number = 0;
  projmodel: string = '';
  projtype: string = '';
  projspwnpoint: string = '';
  projsound: string = '';
  projorientation: string = '';
  immunitytype: string = '';
  itemimmunity: string = '';
  forcehostile: number = -1;
  forcefriendly: number = -1;
  forcepassive: number = -1;
  forcepriority: number = -1;
  dark_recom: number = -1;
  light_recom: number = -1;
  exclusion: number = 0;
  requireitemmask: number = 0;
  forbiditemmask: number = 0;
  pips: number = -1;
  itemtargeting: number = -1;
  hostilesetting: number = -1;
  formmask: number = 0;

  nextSpell: TalentSpell;

  constructor( id = 0 ){
    super(id);
    this.objectType = TalentObjectType.TalentObject | TalentObjectType.TalentSpell;

    const spells = TwoDAManager.datatables.get('spells');
    //Merge the spell properties from the spells.2da row with this spell
    if(spells && spells.rows[this.id]){
      this.parseTwoDARow(spells.rows[this.id]);
    }

  }

  setId( value = 0 ){
    this.id = value;
    //Merge the spell properties from the spells.2da row with this spell
    if(TwoDAManager.datatables.get('spells').rows[this.id]){
      Object.assign(this, TwoDAManager.datatables.get('spells').rows[this.id]);
    }
  }

  getConjureTime(){
    return this.conjtime;
  }

  getCastTime(){
    return this.casttime;
  }

  getCatchTime(){
    return this.catchtime;
  }

  getConjureAnimation(){
    if(this.conjanim == 'throw'){
      if(this.id == 4 || this.id == 46){
        return 'throwsab';
      }else{
        return 'throwgren';

        //throwgen1 is an unnder-handed throw. I think it's used if the target is close
        //this.conjanim = 'throwgen1';
      }
    }

    if(this.conjanim == 'up'){
      return 'castout3';
    }
    return 'castout1';
  }

  getCastingAnimation(){
    if(this.conjanim == 'throw'){
      if(this.id == 4 || this.id == 46){
        return 'throwsablp';
      }else{
        return '';

        //throwgen1 is an unnder-handed throw. I think it's used if the target is close
        //this.conjanim = 'throwgen1';
      }
    }

    if(this.conjanim == 'up'){
      return 'castoutlp3';
    }
    return 'castoutlp1';
  }

  getCasterAnimation(){
    
  }

  getImpactAnimation(){
    
  }

  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject){
    super.useTalentOnObject(oTarget, oCaster);

    log.info('Talent.useTalentOnObject', this);
    
    oCaster.combatData.lastSpellTarget = oTarget;
    oTarget.combatData.lastSpellAttacker = oCaster;
    if(this.hostilesetting == 1){
      oCaster.resetExcitedDuration();
    }

    const combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.CAST_SPELL;
    combatAction.target = oTarget;
    combatAction.setSpell(this);
    combatAction.animation = ModuleCreatureAnimState.CASTOUT1;
    combatAction.animationName = this.getConjureAnimation();
    combatAction.animationTime = 1500;

    combatAction.addSpellInstance(
      new SpellCastInstance(combatAction.owner, combatAction.target, this)
    );

    oCaster.combatRound.addAction(combatAction);

    if(!oCaster.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new ActionCombat(0xFFFF);
      oCaster.actionQueue.add(action);
    }

  }

  inRange(oTarget: ModuleObject, oCaster: ModuleObject){
    if(oTarget == oCaster){
      return true;
    }
    const distance = oCaster.position.distanceTo(oTarget.position);
    //Spell ranges are defined in the ranges.2da file
    switch(this.range){
      case 'L': //Large
        return distance < 28;
      case 'M': //Medium
        return distance < 15;
      case 'P': //Personal
        return true;
      case 'S': //Small
        return distance < 10;
      case 'T': //Touch
        return true;//distance < 2.25;
      case 'W': //Throw
        return distance < 15;
    }
    return true;
  }

  getCastRange(){
    switch(this.range){
      case 'L': //Large
        return 28;
      case 'M': //Medium
        return 15;
      case 'P': //Personal
        return Infinity;
      case 'S': //Small
        return 10;
      case 'T': //Touch
        return Infinity;//distance < 2.25;
      case 'W': //Throw
        return 15;
    }
  }

  static From2DA(row: ITwoDARowData | Record<string, string | number>) {
    const spell = new TalentSpell();
    spell.parseTwoDARow(row);
    return spell;
  }

  parseTwoDARow(row: ITwoDARowData | Record<string, string | number>) {
    if (Object.hasOwn(row,'__rowlabel'))
      this.id = TwoDAObject.normalizeValue(row.__rowlabel, 'number', 0);

    if (Object.hasOwn(row,'label'))
      this.label = TwoDAObject.normalizeValue(row.label, 'string', '');

    if (Object.hasOwn(row,'name'))
      this.name = TwoDAObject.normalizeValue(row.name, 'number', -1);

    if (Object.hasOwn(row,'spelldesc'))
      this.spelldesc = TwoDAObject.normalizeValue(row.spelldesc, 'number', -1);

    if (Object.hasOwn(row,'forcepoints'))
      this.forcepoints = TwoDAObject.normalizeValue(row.forcepoints, 'number', -1);

    if (Object.hasOwn(row,'goodevil'))
      this.goodEvil = TwoDAObject.normalizeValue(row.goodevil, 'string', '-');

    if (Object.hasOwn(row,'usertype'))
      this.userType = TwoDAObject.normalizeValue(row.usertype, 'number', 0);

    if (Object.hasOwn(row,'prerequisites'))
      this.prerequisites = underscoreParser(TwoDAObject.normalizeValue(row.prerequisites, 'string', ''));

    if (Object.hasOwn(row,'masterspell'))
      this.masterspell = TwoDAObject.normalizeValue(row.masterspell, 'number', -1);

    if (Object.hasOwn(row,'guardian'))
      this.guardian = TwoDAObject.normalizeValue(row.guardian, 'number', 0);

    if (Object.hasOwn(row,'consular'))
      this.consular = TwoDAObject.normalizeValue(row.consular, 'number', 0);

    if (Object.hasOwn(row,'sentinel'))
      this.sentinel = TwoDAObject.normalizeValue(row.sentinel, 'number', 0);

    if (Object.hasOwn(row,'weaponmaster'))
      this.weaponmaster = TwoDAObject.normalizeValue(row.weaponmaster, 'number', 0);

    if (Object.hasOwn(row,'jedimaster'))
      this.jedimaster = TwoDAObject.normalizeValue(row.jedimaster, 'number', 0);

    if (Object.hasOwn(row,'watchman'))
      this.watchman = TwoDAObject.normalizeValue(row.watchman, 'number', 0);

    if (Object.hasOwn(row,'marauder'))
      this.marauder = TwoDAObject.normalizeValue(row.marauder, 'number', 0);

    if (Object.hasOwn(row,'sithlord'))
      this.sithlord = TwoDAObject.normalizeValue(row.sithlord, 'number', 0);

    if (Object.hasOwn(row,'assassin'))
      this.assassin = TwoDAObject.normalizeValue(row.assassin, 'number', 0);

    if (Object.hasOwn(row,'inate'))
      this.inate = TwoDAObject.normalizeValue(row.inate, 'number', 0);

    if (Object.hasOwn(row,'maxcr'))
      this.maxCR = TwoDAObject.normalizeValue(row.maxcr, 'number', -1);

    if (Object.hasOwn(row,'category'))
      this.category = TwoDAObject.normalizeValue(row.category, 'number', 0);

    if (Object.hasOwn(row,'range'))
      this.range = TwoDAObject.normalizeValue(row.range, 'string', '');

    if (Object.hasOwn(row,'iconresref'))
      this.iconresref = TwoDAObject.normalizeValue(row.iconresref, 'string', '');

    if (Object.hasOwn(row,'impactscript'))
      this.impactscript = TwoDAObject.normalizeValue(row.impactscript, 'string', '');

    if (Object.hasOwn(row,'conjtime'))
      this.conjtime = TwoDAObject.normalizeValue(row.conjtime, 'number', 0);

    if (Object.hasOwn(row,'conjanim'))
      this.conjanim = TwoDAObject.normalizeValue(row.conjanim, 'string', '');

    if (Object.hasOwn(row,'conjheadvisual'))
      this.conjheadvisual = TwoDAObject.normalizeValue(row.conjheadvisual, 'string', '');

    if (Object.hasOwn(row,'conjhandvisual'))
      this.conjhandvisual = TwoDAObject.normalizeValue(row.conjhandvisual, 'string', '');

    if (Object.hasOwn(row,'conjgrndvisual'))
      this.conjgrndvisual = TwoDAObject.normalizeValue(row.conjgrndvisual, 'string', '');

    if (Object.hasOwn(row,'conjsoundvfx'))
      this.conjsoundvfx = TwoDAObject.normalizeValue(row.conjsoundvfx, 'string', '');

    if (Object.hasOwn(row,'conjsoundmale'))
      this.conjsoundmale = TwoDAObject.normalizeValue(row.conjsoundmale, 'string', '');

    if (Object.hasOwn(row,'conjsoundfemale'))
      this.conjsoundfemale = TwoDAObject.normalizeValue(row.conjsoundfemale, 'string', '');

    if (Object.hasOwn(row,'castanim'))
      this.castanim = TwoDAObject.normalizeValue(row.castanim, 'string', 'self');

    if (Object.hasOwn(row,'casttime'))
      this.casttime = TwoDAObject.normalizeValue(row.casttime, 'number', 0);

    if (Object.hasOwn(row,'castheadvisual'))
      this.castheadvisual = TwoDAObject.normalizeValue(row.castheadvisual, 'string', '');

    if (Object.hasOwn(row,'casthandvisual'))
      this.casthandvisual = TwoDAObject.normalizeValue(row.casthandvisual, 'string', '');

    if (Object.hasOwn(row,'castgrndvisual'))
      this.castgrndvisual = TwoDAObject.normalizeValue(row.castgrndvisual, 'string', '');

    if (Object.hasOwn(row,'castsound'))
      this.castsound = TwoDAObject.normalizeValue(row.castsound, 'string', '');
    
    if (Object.hasOwn(row,'catchtime'))
      this.catchtime = TwoDAObject.normalizeValue(row.catchtime, 'number', 0);

    if (Object.hasOwn(row,'catchanim'))
      this.catchanim = TwoDAObject.normalizeValue(row.catchanim, 'string', '');

    if (Object.hasOwn(row,'proj'))
      this.proj = TwoDAObject.normalizeValue(row.proj, 'number', 0);

    if (Object.hasOwn(row,'projmodel'))
      this.projmodel = TwoDAObject.normalizeValue(row.projmodel, 'string', '');

    if (Object.hasOwn(row,'projtype'))
      this.projtype = TwoDAObject.normalizeValue(row.projtype, 'string', '');
    
    if (Object.hasOwn(row,'projspwnpoint'))
      this.projspwnpoint = TwoDAObject.normalizeValue(row.projspwnpoint, 'string', '');
    
    if (Object.hasOwn(row,'projsound'))
      this.projsound = TwoDAObject.normalizeValue(row.projsound, 'string', '');

    if (Object.hasOwn(row,'projorientation'))
      this.projorientation = TwoDAObject.normalizeValue(row.projorientation, 'string', '');

    if (Object.hasOwn(row,'immunitytype'))
      this.immunitytype = TwoDAObject.normalizeValue(row.immunitytype, 'string', '');
    
    if (Object.hasOwn(row,'itemimmunity'))
      this.itemimmunity = TwoDAObject.normalizeValue(row.itemimmunity, 'string', '');
    
    if (Object.hasOwn(row,'forcehostile'))
      this.forcehostile = TwoDAObject.normalizeValue(row.forcehostile, 'number', -1);
    
    if (Object.hasOwn(row,'forcefriendly'))
      this.forcefriendly = TwoDAObject.normalizeValue(row.forcefriendly, 'number', -1);
    
    if (Object.hasOwn(row,'forcepassive'))
      this.forcepassive = TwoDAObject.normalizeValue(row.forcepassive, 'number', -1);
    
    if (Object.hasOwn(row,'forcepriority'))
      this.forcepriority = TwoDAObject.normalizeValue(row.forcepriority, 'number', -1);
    
    if (Object.hasOwn(row,'dark_recom'))
      this.dark_recom = TwoDAObject.normalizeValue(row.dark_recom, 'number', -1);
    
    if (Object.hasOwn(row,'light_recom'))
      this.light_recom = TwoDAObject.normalizeValue(row.light_recom, 'number', -1);
    
    if (Object.hasOwn(row,'exclusion'))
      this.exclusion = TwoDAObject.normalizeValue(row.exclusion, 'number', 0);
    
    if (Object.hasOwn(row,'requireitemmask'))
      this.requireitemmask = TwoDAObject.normalizeValue(row.requireitemmask, 'number', 0);
    
    if (Object.hasOwn(row,'forbiditemmask'))
      this.forbiditemmask = TwoDAObject.normalizeValue(row.forbiditemmask, 'number', 0);
    
    if (Object.hasOwn(row,'pips'))
      this.pips = TwoDAObject.normalizeValue(row.pips, 'number', -1);
    
    if (Object.hasOwn(row,'itemtargeting'))
      this.itemtargeting = TwoDAObject.normalizeValue(row.itemtargeting, 'number', -1);
    
    if (Object.hasOwn(row,'hostilesetting'))
      this.hostilesetting = TwoDAObject.normalizeValue(row.hostilesetting, 'number', -1);

    if (Object.hasOwn(row,'formmask'))
      this.formmask = TwoDAObject.normalizeValue(row.formmask, 'number', 0);
  }

  getFlags(){
    return 0;
  }

  getMetaMagic(){
    return this.metaMagic;
  }

  setFlags( flags = 0 ){
    this.flags = flags;
  }

  setMetaMagic( metaMagic = 0 ){
    this.metaMagic = metaMagic;
  }

  save(){
    const spellStruct = new GFFStruct(3);
    spellStruct.addField( new GFFField(GFFDataType.WORD, 'Spell') ).setValue(this.getId());
    //spellStruct.addField( new GFFField(GFFDataType.SHORT, 'SpellFlags') ).setValue(this.getFlags());
    //spellStruct.addField( new GFFField(GFFDataType.SHORT, 'SpellMetaMagic') ).setValue(this.getMetaMagic());
    return spellStruct;
  }

}
