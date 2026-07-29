import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { TalentObject } from "@/talents/TalentObject";
import type { ModuleObject } from "@/module";
import { OdysseyModel3D } from "@/three/odyssey";
import { TwoDAManager } from "@/managers/TwoDAManager";
import { ActionType } from "@/enums/actions/ActionType";
import { ActionCombat } from "@/actions/ActionCombat";
import { CombatRoundAction, ExcitedDurationRow, isWithinSpellCastRange, resolveSpellCastRange, resolveSpellCastTarget } from "@/combat";
import { canTargetSpellCastByPerception } from "@/combat/spell-cast-gates";
import { getSpellCastAnimState, getSpellConjureAnimState } from "@/combat/spell-cast-anims";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { CombatActionType } from "@/enums/combat/CombatActionType";
import { TalentObjectType } from "@/enums/engine/TalentObjectType";
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
    const spells = TwoDAManager.datatables.get('spells');
    // Must use parseTwoDARow — raw Object.assign leaves **** strings and breaks
    // forcehostile / forcefriendly self-target gates.
    if(spells?.rows?.[this.id]){
      this.parseTwoDARow(spells.rows[this.id]);
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
    if(this.castanim == 'throw' || this.conjanim == 'throw'){
      if(this.id == 4 || this.id == 46){
        return 'throwsablp';
      }else{
        return '';
      }
    }

    if(this.castanim == 'up' || this.conjanim == 'up'){
      return 'castoutlp3';
    }
    return 'castoutlp1';
  }

  /** Retail conjure SetAnimation id from spells.2da ConjAnim. */
  getConjureAnimState(){
    return getSpellConjureAnimState(this.conjanim);
  }

  /** Retail cast SetAnimation id from spells.2da CastAnim (0 = skip). */
  getCastAnimState(){
    return getSpellCastAnimState(this.castanim || this.conjanim);
  }

  getCasterAnimation(){
    
  }

  getImpactAnimation(){
    
  }

  /**
   * Queue a cast via combat round (retail AddCastSpellActions / GUI ForceMenuAction).
   * @param options.isUserAction — player HUD/input (CombatRoundAction.isUserAction)
   */
  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject, options?: { isUserAction?: boolean }){
    // Retail GetSelfForcePowers / range P — never cast personal/friendly HUD
    // powers at the look-at party member.
    if(oCaster){
      oTarget = resolveSpellCastTarget(this, oTarget, oCaster, options);
    }

    super.useTalentOnObject(oTarget, oCaster);

    // Retail AddCastSpellActions visibility (non-party field426==0)
    if(oTarget && oTarget !== oCaster){
      const isPartyUI = !!(
        (oCaster as any).isPartyMember?.() ||
        (oCaster as any).isPlayer ||
        (oCaster as any).isPM
      );
      const entry = (oCaster as any).perceptionList?.find(
        (o: any) => o.object === oTarget || o.objectId === oTarget.id
      );
      if(!canTargetSpellCastByPerception(entry?.data, {
        isPartyOrPlayerUI: isPartyUI,
        isSelf: false,
      })){
        return;
      }
    }

    oCaster.combatData.lastSpellTarget = oTarget;
    oTarget.combatData.lastSpellAttacker = oCaster;
    if(this.hostilesetting == 1){
      // Retail hostile cast → ActivityManager(1) + BroadcastCombatStateToParty
      if(typeof (oCaster as any).activityManager === 'function'){
        (oCaster as any).activityManager(1);
      }
      if(typeof (oCaster as any).broadcastCombatStateToParty === 'function'){
        (oCaster as any).broadcastCombatStateToParty(oCaster);
        (oCaster as any).setExcitedState?.(ExcitedDurationRow.SpellCast);
        (oCaster as any).setCombatState?.(true, ExcitedDurationRow.SpellCast);
        (oCaster as any).removeCombatInvisibilityEffects?.();
      }else if(typeof (oCaster as any).setCombatEngaged === 'function'){
        (oCaster as any).setCombatEngaged(ExcitedDurationRow.SpellCast);
      }else{
        oCaster.resetExcitedDuration();
      }
    }else if(typeof (oCaster as any).activityManager === 'function'){
      (oCaster as any).activityManager(2);
    }

    const combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.CAST_SPELL;
    combatAction.target = oTarget;
    combatAction.setSpell(this);
    combatAction.animation = this.getConjureAnimState();
    combatAction.animationName = this.getConjureAnimation();
    combatAction.animationTime = 1500;
    combatAction.isUserAction = !!options?.isUserAction;
    // Retail ForceMenuAction / AddCastSpellActions classIndex (Jedi 3/4/5 in first two slots)
    if(typeof (oCaster as any).getForceSpellClassIndex === 'function'){
      combatAction.spellClassIndex = (oCaster as any).getForceSpellClassIndex();
    }
    // SpellCastInstance is created later by ActionCastSpell.startSpellInstance
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
    return isWithinSpellCastRange(this.range, distance, false);
  }

  getCastRange(){
    return resolveSpellCastRange(this.range);
  }

  static From2DA( row: any ){
    const spell = new TalentSpell();
    spell.parseTwoDARow(row);
    return spell;
  }

  parseTwoDARow( row: any ){
    if (row.hasOwnProperty('__rowlabel'))
      this.id = TwoDAObject.normalizeValue(row.__rowlabel, 'number', 0);

    if (row.hasOwnProperty('label'))
      this.label = TwoDAObject.normalizeValue(row.label, 'string', '');

    if (row.hasOwnProperty('name'))
      this.name = TwoDAObject.normalizeValue(row.name, 'number', -1);

    if (row.hasOwnProperty('spelldesc'))
      this.spelldesc = TwoDAObject.normalizeValue(row.spelldesc, 'number', -1);

    if (row.hasOwnProperty('forcepoints'))
      this.forcepoints = TwoDAObject.normalizeValue(row.forcepoints, 'number', -1);

    if (row.hasOwnProperty('goodevil'))
      this.goodEvil = TwoDAObject.normalizeValue(row.goodevil, 'string', '-');

    if (row.hasOwnProperty('usertype'))
      this.userType = TwoDAObject.normalizeValue(row.usertype, 'number', 0);

    if (row.hasOwnProperty('prerequisites'))
      this.prerequisites = underscoreParser(TwoDAObject.normalizeValue(row.prerequisites, 'string', ''));

    if (row.hasOwnProperty('masterspell'))
      this.masterspell = TwoDAObject.normalizeValue(row.masterspell, 'number', -1);

    if (row.hasOwnProperty('guardian'))
      this.guardian = TwoDAObject.normalizeValue(row.guardian, 'number', 0);

    if (row.hasOwnProperty('consular'))
      this.consular = TwoDAObject.normalizeValue(row.consular, 'number', 0);

    if (row.hasOwnProperty('sentinel'))
      this.sentinel = TwoDAObject.normalizeValue(row.sentinel, 'number', 0);

    if (row.hasOwnProperty('weaponmaster'))
      this.weaponmaster = TwoDAObject.normalizeValue(row.weaponmaster, 'number', 0);

    if (row.hasOwnProperty('jedimaster'))
      this.jedimaster = TwoDAObject.normalizeValue(row.jedimaster, 'number', 0);

    if (row.hasOwnProperty('watchman'))
      this.watchman = TwoDAObject.normalizeValue(row.watchman, 'number', 0);

    if (row.hasOwnProperty('marauder'))
      this.marauder = TwoDAObject.normalizeValue(row.marauder, 'number', 0);

    if (row.hasOwnProperty('sithlord'))
      this.sithlord = TwoDAObject.normalizeValue(row.sithlord, 'number', 0);

    if (row.hasOwnProperty('assassin'))
      this.assassin = TwoDAObject.normalizeValue(row.assassin, 'number', 0);

    if (row.hasOwnProperty('inate'))
      this.inate = TwoDAObject.normalizeValue(row.inate, 'number', 0);

    if (row.hasOwnProperty('maxcr'))
      this.maxCR = TwoDAObject.normalizeValue(row.maxcr, 'number', -1);

    if (row.hasOwnProperty('category'))
      this.category = TwoDAObject.normalizeValue(row.category, 'number', 0);

    if (row.hasOwnProperty('range'))
      this.range = TwoDAObject.normalizeValue(row.range, 'string', '');

    if (row.hasOwnProperty('iconresref'))
      this.iconresref = TwoDAObject.normalizeValue(row.iconresref, 'string', '');

    if (row.hasOwnProperty('impactscript'))
      this.impactscript = TwoDAObject.normalizeValue(row.impactscript, 'string', '');

    if (row.hasOwnProperty('conjtime'))
      this.conjtime = TwoDAObject.normalizeValue(row.conjtime, 'number', 0);

    if (row.hasOwnProperty('conjanim'))
      this.conjanim = TwoDAObject.normalizeValue(row.conjanim, 'string', '');

    if (row.hasOwnProperty('conjheadvisual'))
      this.conjheadvisual = TwoDAObject.normalizeValue(row.conjheadvisual, 'string', '');

    if (row.hasOwnProperty('conjhandvisual'))
      this.conjhandvisual = TwoDAObject.normalizeValue(row.conjhandvisual, 'string', '');

    if (row.hasOwnProperty('conjgrndvisual'))
      this.conjgrndvisual = TwoDAObject.normalizeValue(row.conjgrndvisual, 'string', '');

    if (row.hasOwnProperty('conjsoundvfx'))
      this.conjsoundvfx = TwoDAObject.normalizeValue(row.conjsoundvfx, 'string', '');

    if (row.hasOwnProperty('conjsoundmale'))
      this.conjsoundmale = TwoDAObject.normalizeValue(row.conjsoundmale, 'string', '');

    if (row.hasOwnProperty('conjsoundfemale'))
      this.conjsoundfemale = TwoDAObject.normalizeValue(row.conjsoundfemale, 'string', '');

    if (row.hasOwnProperty('castanim'))
      this.castanim = TwoDAObject.normalizeValue(row.castanim, 'string', 'self');

    if (row.hasOwnProperty('casttime'))
      this.casttime = TwoDAObject.normalizeValue(row.casttime, 'number', 0);

    if (row.hasOwnProperty('castheadvisual'))
      this.castheadvisual = TwoDAObject.normalizeValue(row.castheadvisual, 'string', '');

    if (row.hasOwnProperty('casthandvisual'))
      this.casthandvisual = TwoDAObject.normalizeValue(row.casthandvisual, 'string', '');

    if (row.hasOwnProperty('castgrndvisual'))
      this.castgrndvisual = TwoDAObject.normalizeValue(row.castgrndvisual, 'string', '');

    if (row.hasOwnProperty('castsound'))
      this.castsound = TwoDAObject.normalizeValue(row.castsound, 'string', '');
    
    if (row.hasOwnProperty('catchtime'))
      this.catchtime = TwoDAObject.normalizeValue(row.catchtime, 'number', 0);

    if (row.hasOwnProperty('catchanim'))
      this.catchanim = TwoDAObject.normalizeValue(row.catchanim, 'string', '');

    if (row.hasOwnProperty('proj'))
      this.proj = TwoDAObject.normalizeValue(row.proj, 'number', 0);

    if (row.hasOwnProperty('projmodel'))
      this.projmodel = TwoDAObject.normalizeValue(row.projmodel, 'string', '');

    if (row.hasOwnProperty('projtype'))
      this.projtype = TwoDAObject.normalizeValue(row.projtype, 'string', '');
    
    if (row.hasOwnProperty('projspwnpoint'))
      this.projspwnpoint = TwoDAObject.normalizeValue(row.projspwnpoint, 'string', '');
    
    if (row.hasOwnProperty('projsound'))
      this.projsound = TwoDAObject.normalizeValue(row.projsound, 'string', '');

    if (row.hasOwnProperty('projorientation'))
      this.projorientation = TwoDAObject.normalizeValue(row.projorientation, 'string', '');

    if (row.hasOwnProperty('immunitytype'))
      this.immunitytype = TwoDAObject.normalizeValue(row.immunitytype, 'string', '');
    
    if (row.hasOwnProperty('itemimmunity'))
      this.itemimmunity = TwoDAObject.normalizeValue(row.itemimmunity, 'string', '');
    
    if (row.hasOwnProperty('forcehostile'))
      this.forcehostile = TwoDAObject.normalizeValue(row.forcehostile, 'number', -1);
    
    if (row.hasOwnProperty('forcefriendly'))
      this.forcefriendly = TwoDAObject.normalizeValue(row.forcefriendly, 'number', -1);
    
    if (row.hasOwnProperty('forcepassive'))
      this.forcepassive = TwoDAObject.normalizeValue(row.forcepassive, 'number', -1);
    
    if (row.hasOwnProperty('forcepriority'))
      this.forcepriority = TwoDAObject.normalizeValue(row.forcepriority, 'number', -1);
    
    if (row.hasOwnProperty('dark_recom'))
      this.dark_recom = TwoDAObject.normalizeValue(row.dark_recom, 'number', -1);
    
    if (row.hasOwnProperty('light_recom'))
      this.light_recom = TwoDAObject.normalizeValue(row.light_recom, 'number', -1);
    
    if (row.hasOwnProperty('exclusion'))
      this.exclusion = TwoDAObject.normalizeValue(row.exclusion, 'number', 0);
    
    if (row.hasOwnProperty('requireitemmask'))
      this.requireitemmask = TwoDAObject.normalizeValue(row.requireitemmask, 'number', 0);
    
    if (row.hasOwnProperty('forbiditemmask'))
      this.forbiditemmask = TwoDAObject.normalizeValue(row.forbiditemmask, 'number', 0);
    
    if (row.hasOwnProperty('pips'))
      this.pips = TwoDAObject.normalizeValue(row.pips, 'number', -1);
    
    if (row.hasOwnProperty('itemtargeting'))
      this.itemtargeting = TwoDAObject.normalizeValue(row.itemtargeting, 'number', -1);
    
    if (row.hasOwnProperty('hostilesetting'))
      this.hostilesetting = TwoDAObject.normalizeValue(row.hostilesetting, 'number', -1);

    if (row.hasOwnProperty('formmask'))
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
    let spellStruct = new GFFStruct(3);
    spellStruct.addField( new GFFField(GFFDataType.WORD, 'Spell') ).setValue(this.getId());
    //spellStruct.addField( new GFFField(GFFDataType.SHORT, 'SpellFlags') ).setValue(this.getFlags());
    //spellStruct.addField( new GFFField(GFFDataType.SHORT, 'SpellMetaMagic') ).setValue(this.getMetaMagic());
    return spellStruct;
  }

}
