import { GameState } from "@/GameState";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
// import { TwoDAManager, TLKManager } from "@/managers";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { TwoDAObject } from "@/resource/TwoDAObject";
import type { TalentSpell } from "@/talents/TalentSpell";
import { SWSavingThrow } from "@/engine/rules/SWSavingThrow";
import { SWAttackBonus } from "@/engine/rules/SWAttackBonus";

/**
 * CreatureClass class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CreatureClass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CreatureClass {

  id: number = -1;
  label: string = '';
  name: number = -1;
  plural: number = -1;
  lower: number = -1;
  description: number = -1;
  icon: string = '';
  hitdie: number = 8;
  attackbonustable: 'CLS_ATK_1'|'CLS_ATK_2'|'CLS_ATK_3' = 'CLS_ATK_1';
  featstable: string = '';
  savingthrowtable: string = '';
  skillstable: string = '';
  skillpointbase: number = 0;
  spellgaintable: string = '';
  spellknowntable: string ='';
  playerclass: boolean = false;
  spellcaster: boolean = false;
  str: number = 10;
  dex: number = 10;
  con: number = 10;
  wis: number = 10;
  int: number = 10;
  cha: number = 10;
  primaryabil: 'STR'|'DEX'|'WIS'|'CON'|'INT'|'CHA' = 'STR';
  alignrestrict: number = 0;
  alignrstrcttype: number = 0;
  constant: string = '';

  effectiveCRLevel_1: number = 1;
  effectiveCRLevel_2: number = 1;
  effectiveCRLevel_3: number = 1;
  effectiveCRLevel_4: number = 1;
  effectiveCRLevel_5: number = 1;
  effectiveCRLevel_6: number = 1;
  effectiveCRLevel_7: number = 1;
  effectiveCRLevel_8: number = 1;
  effectiveCRLevel_9: number = 1;
  effectiveCRLevel_10: number = 1;
  effectiveCRLevel_11: number = 1;
  effectiveCRLevel_12: number = 1;
  effectiveCRLevel_13: number = 1;
  effectiveCRLevel_14: number = 1;
  effectiveCRLevel_15: number = 1;
  effectiveCRLevel_16: number = 1;
  effectiveCRLevel_17: number = 1;
  effectiveCRLevel_18: number = 1;
  effectiveCRLevel_19: number = 1;
  effectiveCRLevel_20: number = 1;

  forcedie: number = 0;
  armorclasscolumn: string = '';
  featgain: string = '';

  level: number;
  /** Retail classes[i].negative_levels — drained levels (EffectNegativeLevel). */
  negativeLevels: number = 0;
  spells: TalentSpell[] = [];

  savingThrows: SWSavingThrow[] = [];
  attackBonuses: SWAttackBonus[] = [];
  featGainPoints: number[] = [];
  /** featgain.2da *_bon columns — retail CalcLevelUpNumberFeats second out. */
  featGainBonuses: number[] = [];
  spellGainPoints: number[] = [];
  acbonuses: number[] = [];

  constructor(id = -1){
    this.id = id;
    this.level = 0;
    this.spells = [];
    if(id >= 0)
      this.apply2DA(GameState.TwoDAManager.datatables.get('classes').rows[this.id]);
  }

  getName(){
    return GameState.TLKManager.GetStringById(this.name).Value;
  }

  getDescription(){
    return GameState.TLKManager.GetStringById(this.description).Value;
  }

  setLevel(nLevel = 0){
    this.level = nLevel;
  }

  addSpell(tSpell: TalentSpell){
    if(!tSpell){ return; }
    this.spells.push(tSpell);
  }

  getSpells(){
    return this.spells;
  }

  getBaseAttackBonus(){
    return this.attackBonuses[this.level].bab;
  }

  getACBonus(){
    return this.acbonuses[this.level];
  }

  /** Retail GetFortSaveBonus — fort_saves[level-1]. */
  getFortSaveBonus(){
    if(this.level <= 0) return 0;
    return this.savingThrows[this.level - 1]?.fortsave ?? 0;
  }

  /** Retail GetRefSaveBonus. */
  getRefSaveBonus(){
    if(this.level <= 0) return 0;
    return this.savingThrows[this.level - 1]?.refsave ?? 0;
  }

  /** Retail GetWillSaveBonus. */
  getWillSaveBonus(){
    if(this.level <= 0) return 0;
    return this.savingThrows[this.level - 1]?.willsave ?? 0;
  }

  /** Resolve class feat list column (TalentFeat.getList or legacy 2DA row key). */
  private resolveFeatListStatus(feat: any): number {
    if(typeof feat === 'undefined' || feat === null) return -1;
    if(typeof feat.getList === 'function'){
      const status = feat.getList(this);
      return typeof status === 'number' && !isNaN(status) ? status : -1;
    }
    const status = parseInt(feat[this.featstable.toLowerCase() + '_list'], 10);
    return isNaN(status) ? -1 : status;
  }

  /** Resolve class feat granted level (TalentFeat.getGranted or legacy 2DA row key). */
  private resolveFeatGrantedLevel(feat: any): number {
    if(typeof feat === 'undefined' || feat === null) return -1;
    if(typeof feat.getGranted === 'function'){
      const granted = feat.getGranted(this);
      return typeof granted === 'number' && !isNaN(granted) ? granted : -1;
    }
    const granted = parseInt(feat[this.featstable.toLowerCase() + '_granted'], 10);
    return isNaN(granted) ? -1 : granted;
  }

  isFeatAvailable( feat: any ){
    const status = this.resolveFeatListStatus(feat);
    if(status < 0) return false;
    return status != 4; // UNAVAILABLE
  }

  getFeatStatus( feat: any ){
    const status = this.resolveFeatListStatus(feat);
    if(status < 0) return false;
    return status;
  }

  getFeatGrantedLevel( feat: any ){
    return this.resolveFeatGrantedLevel(feat);
  }

  static FromCreatureClassStruct(cls_struct: GFFStruct){
    if(typeof cls_struct != 'undefined'){
      let cls = new CreatureClass(cls_struct.getFieldByLabel('Class').getValue());
      cls.setLevel(cls_struct.getFieldByLabel('ClassLevel').getValue());
      let known_struct = cls_struct.getFieldByLabel('KnownList0');
      if(known_struct){
        let known_spell_structs = known_struct.getChildStructs();
        for(let i = 0; i < known_spell_structs.length; i++){

          let known_spell_struct = known_spell_structs[i];
          let spell = undefined;

          if(known_spell_struct.hasField('Spell')){
            spell = new GameState.TalentSpell(
              known_spell_struct.getFieldByLabel('Spell').getValue()
            );
          }

          if(typeof spell != 'undefined'){
            if(known_spell_struct.hasField('SpellFlags'))
              spell.setFlags(known_spell_struct.getFieldByLabel('SpellFlags').getValue());
        
            if(known_spell_struct.hasField('SpellMetaMagic'))
              spell.setMetaMagic(known_spell_struct.getFieldByLabel('SpellMetaMagic').getValue());

            cls.addSpell(spell);
          }

        }
      }
      return cls;
    }
    return undefined;
  }

  apply2DA(row: any){
    this.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      this.label = TwoDAObject.normalizeValue(row.label, 'string', '');

    if(row.hasOwnProperty('name'))
      this.name = TwoDAObject.normalizeValue(row.name, 'number', -1);

    if(row.hasOwnProperty('description'))
      this.description = TwoDAObject.normalizeValue(row.description, 'number', -1);

    if(row.hasOwnProperty('icon'))
      this.icon = TwoDAObject.normalizeValue(row.icon, 'string', '');

    if(row.hasOwnProperty('hitdie'))
      this.hitdie = TwoDAObject.normalizeValue(row.hitdie, 'number', 8);

    if(row.hasOwnProperty('attackbonustable'))
      this.attackbonustable = TwoDAObject.normalizeValue(row.attackbonustable, 'string', 'CLS_ATK_1');

    if(row.hasOwnProperty('featstable'))
      this.featstable = TwoDAObject.normalizeValue(row.featstable, 'string', 'SOL');

    if(row.hasOwnProperty('savingthrowtable'))
      this.savingthrowtable = TwoDAObject.normalizeValue(row.savingthrowtable, 'string', 'CLS_ST_SOL');

    if(row.hasOwnProperty('skillstable'))
      this.skillstable = TwoDAObject.normalizeValue(row.skillstable, 'string', 'CLS_SK_SOL');

    if(row.hasOwnProperty('skillpointbase'))
      this.skillpointbase = TwoDAObject.normalizeValue(row.skillpointbase, 'number', 1);

    if(row.hasOwnProperty('spellgaintable'))
      this.spellgaintable = TwoDAObject.normalizeValue(row.spellgaintable, 'string', ''); 

    if(row.hasOwnProperty('spellknowntable'))
      this.spellknowntable = TwoDAObject.normalizeValue(row.spellknowntable, 'string', '');

    if(row.hasOwnProperty('playerclass'))
      this.playerclass = TwoDAObject.normalizeValue(row.playerclass, 'boolean', false);

    if(row.hasOwnProperty('spellcaster'))
      this.spellcaster = TwoDAObject.normalizeValue(row.spellcaster, 'boolean', false);

    if(row.hasOwnProperty('str'))
      this.str = TwoDAObject.normalizeValue(row.str, 'number', 10);

    if(row.hasOwnProperty('dex'))
      this.dex = TwoDAObject.normalizeValue(row.dex, 'number', 10);

    if(row.hasOwnProperty('con'))
      this.con = TwoDAObject.normalizeValue(row.con, 'number', 10); 

    if(row.hasOwnProperty('wis'))
      this.wis = TwoDAObject.normalizeValue(row.wis, 'number', 10);

    if(row.hasOwnProperty('int'))
      this.int = TwoDAObject.normalizeValue(row.int, 'number', 10); 

    if(row.hasOwnProperty('cha'))
      this.cha = TwoDAObject.normalizeValue(row.cha, 'number', 10);

    if(row.hasOwnProperty('primaryabil'))
      this.primaryabil = TwoDAObject.normalizeValue(row.primaryabil, 'string', 'STR');  

    if(row.hasOwnProperty('alignrestrict'))
      this.alignrestrict = TwoDAObject.normalizeValue(row.alignrestrict, 'number', 0);

    if(row.hasOwnProperty('alignrstrcttype'))
      this.alignrstrcttype = TwoDAObject.normalizeValue(row.alignrstrcttype, 'number', 0);  

    if(row.hasOwnProperty('constant'))
      this.constant = TwoDAObject.normalizeValue(row.constant, 'string', 'CCLASS_SOLDIER');

    if(row.hasOwnProperty('forcedie'))
      this.forcedie = TwoDAObject.normalizeValue(row.forcedie, 'number', 0);

    if(row.hasOwnProperty('armorclasscolumn'))
      this.armorclasscolumn = TwoDAObject.normalizeValue(row.armorclasscolumn, 'string', 'SOL');

    if(row.hasOwnProperty('featgain'))
      this.featgain = TwoDAObject.normalizeValue(row.featgain, 'string', 'SOL');

    if(this.savingthrowtable){
      const savingThrows = GameState.TwoDAManager.datatables.get(this.savingthrowtable.toLowerCase());
      if(savingThrows){
        this.savingThrows = Object.values(savingThrows.rows).map((row: any) => SWSavingThrow.From2DA(row));
      }
    }

    if(this.attackbonustable){
      const attackBonuses = GameState.TwoDAManager.datatables.get(this.attackbonustable.toLowerCase());
      if(attackBonuses){
        this.attackBonuses = Object.values(attackBonuses.rows).map((row: any) => SWAttackBonus.From2DA(row));
      }
    }

    let featGain = GameState.SWRuleSet.featGains;
    if(featGain){
      this.featGainPoints = featGain.getRegular(this.featgain);
      this.featGainBonuses = featGain.getBonus(this.featgain);
    }

    let spellGain = GameState.SWRuleSet.spellGains;
    if(spellGain){
      this.spellGainPoints = spellGain.getSpellGain(this.spellgaintable);
    }

    const acbonuses = GameState.TwoDAManager.datatables.get('acbonus');
    if(acbonuses){
      this.acbonuses = Object.values(acbonuses.rows).map((row: any) => {
        const col = row[this.armorclasscolumn.toLowerCase()];
        return col ? TwoDAObject.normalizeValue(col, 'number', 0) : 0;
      });
    }

  }

  static From2DA(row: any){
    const cls = new CreatureClass();
    cls.apply2DA(row);
    return cls;
  }

  /**
   * Retail IsJedi — K1: 3/4/5; TSL also 0xB–0x10 (prestige Jedi).
   */
  isJedi(): boolean {
    const id = this.id | 0;
    if(id === 3 || id === 4 || id === 5) return true;
    if(GameState.GameKey === GameEngineType.TSL){
      return id === 0xb || id === 0xc || id === 0xd ||
        id === 0xe || id === 0xf || id === 0x10;
    }
    return false;
  }

  save(){
    let _class = new GFFStruct(2);
    _class.addField( new GFFField(GFFDataType.INT, 'Class') ).setValue(this.id);
    _class.addField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).setValue(this.level);

    // Retail SaveClassInfo: SpellsPerDayList only for Jedi classes
    if(this.isJedi()){
      let spellsPerDay = _class.addField( new GFFField(GFFDataType.LIST, 'SpellsPerDayList') );
      let spellsPerDayStruct = new GFFStruct(17767);
      spellsPerDayStruct.addField( new GFFField(GFFDataType.BYTE, "NumSpellsLeft").setValue(0));
      spellsPerDay.addChildStruct(spellsPerDayStruct);
    }

    // Retail SaveClassInfo: KnownList0 only when known_spells.size > 0
    if(this.spells.length > 0){
      let knownList0 = _class.addField( new GFFField(GFFDataType.LIST, 'KnownList0') );
      for(let i = 0; i < this.spells.length; i++){
        knownList0.addChildStruct(this.spells[i].save());
      }
    }

    return _class;
  }

}