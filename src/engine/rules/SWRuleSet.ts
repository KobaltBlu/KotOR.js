import { GameState } from "../../GameState";
import type { INIConfig } from "../../engine/INIConfig";
import { CreatureClass } from "../../combat/CreatureClass";
import { TalentFeat } from "../../talents/TalentFeat";
import { TalentSpell } from "../../talents/TalentSpell";
import { SWRace } from "./SWRace";
import { SWEffectIcon } from "./SWEffectIcon";
import { SWItemPropsDef } from "./SWItemPropsDef";
import { PazaakDeck } from "../minigames/PazaakDeck";
import { SWXPTableEntry } from "./SWXPTableEntry";
import { SWPortrait } from "./SWPortrait";
import { SWFeatGain } from "./SWFeatGain";
import { SWSpellGain } from "./SWSpellGain";
import { SWEXPTable } from "./SWEXPTable";
import { SWDifficulty } from "./SWDifficulty";
import { SWBodyBag } from "./SWBodyBag";
import { SWHead } from "./SWHead";
import { SWPriorityGroup } from "./SWPriorityGroup";
import { SWEncounterDifficulty } from "./SWEncounterDifficulty";
import { SWGender } from "./SWGender";
import { SWPhenotype } from "./SWPhenotype";
import { SWSubRace } from "./SWSubRace";
import { SWSoundSet } from "./SWSoundSet";
import { SWCreatureSize } from "./SWCreatureSize";
import { SWCreatureSpeed } from "./SWCreatureSpeed";
import { SWRange } from "./SWRange";
import { SWSkill } from "./SWSkill";
import { SWFaction } from "./SWFaction";
import { SWBaseItem } from "./SWBaseItem";
import { SWCreatureAppearance } from "./SWCreatureAppearance";
import { SWDoorAppearance } from "./SWDoorAppearance";
import { SWPlaceableAppearance } from "./SWPlaceableAppearance";
import { SWCostTable } from "./SWCostTable";

/**
 * SWRuleSet class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWRuleSet.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWRuleSet {

  static baseItems: SWBaseItem[] = [];
  static baseItemCount: number = 0;

  static classes: CreatureClass[] = [];
  static classCount: number = 0;

  static racialtypes: SWRace[] = [];
  static racialTypeCount: number = 0;

  static effectIcons: SWEffectIcon[] = [];
  static effectIconCount: number = 0;

  static itemPropsDef: SWItemPropsDef[] = [];
  static costTables: SWCostTable[] = [];
  static costTableCount: number = 0;

  static pazaakDecks: PazaakDeck[] = [];
  static pazaakDeckCount: number = 0;

  static xpTable: SWXPTableEntry[] = [];
  static portraits: SWPortrait[] = [];
  static heads: SWHead[] = [];

  static feats: TalentFeat[] = [];
  static featCount: number = 0;
  static featGains: SWFeatGain;
  static featGainCount: number = 0;

  static spells: TalentSpell[] = [];
  static spellCount: number = 0;
  static spellGains: SWSpellGain;
  static spellGainCount: number = 0;
  static expTable: SWEXPTable;
  static difficulty: SWDifficulty[] = [];
  static currentDifficulty: number = 0;
  static bodyBags: SWBodyBag[] = [];
  static priorityGroups: SWPriorityGroup[] = [];
  static factions: SWFaction[] = [];
  static factionCount: number = 0;

  static encounterDifficulties: SWEncounterDifficulty[] = [];
  static encounterDifficultyCount: number = 0;

  static genders: SWGender[] = [];
  static genderCount: number = 0;

  static phenotypes: SWPhenotype[] = [];
  static phenotypeCount: number = 0;

  static subRaces: SWSubRace[] = [];
  static subRaceCount: number = 0;

  static soundSets: SWSoundSet[] = [];
  static soundSetCount: number = 0;

  static creatureSizes: SWCreatureSize[] = [];
  static creatureSizeCount: number = 0;

  static creatureSpeeds: SWCreatureSpeed[] = [];
  static creatureSpeedCount: number = 0;

  static ranges: SWRange[] = [];
  static rangeCount: number = 0;

  static skills: SWSkill[] = [];
  static skillCount: number = 0;

  static creatureAppearances: SWCreatureAppearance[] = [];
  static creatureAppearanceCount: number = 0;

  static doorAppearances: SWDoorAppearance[] = [];
  static doorAppearanceCount: number = 0;

  static placeableAppearances: SWPlaceableAppearance[] = [];
  static placeableAppearanceCount: number = 0;

  static Init(){

    /**
     * Initialize Base Items
     */
    const baseItems = GameState.TwoDAManager.datatables.get('baseitems');
    if(baseItems){
      SWRuleSet.baseItemCount = baseItems.RowCount;
      SWRuleSet.baseItems = new Array(SWRuleSet.baseItemCount);
      for(let i = 0; i < baseItems.RowCount; i++){
        SWRuleSet.baseItems[i] = SWBaseItem.From2DA(baseItems.rows[i]);
      }
    }
    /**
     * Initialize Difficulty
     */
    const difficulty = GameState.TwoDAManager.datatables.get('difficultyopt');
    if(difficulty){
      for(let i = 0; i < difficulty.RowCount; i++){
        SWRuleSet.difficulty[i] = SWDifficulty.From2DA(difficulty.rows[i]);
        if(SWRuleSet.difficulty[i].desc == 'Default'){
          SWRuleSet.currentDifficulty = i;
        }
      }
    }

    /**
     * Initialize EXP Table
     *  - Used to calculate the level of a creature based on the amount of experience they have
     */
    const expTable = GameState.TwoDAManager.datatables.get('exptable');
    if(expTable){
      SWRuleSet.expTable = SWEXPTable.From2DA(expTable);
    }

    /**
     * Initialize XP Table
     *  - Used to calculate the amount of experience to grant to a creature when they defeat an enemy
     */
    const xpTable = GameState.TwoDAManager.datatables.get('xptable'); 
    if(xpTable){
      SWRuleSet.xpTable = new Array(xpTable.RowCount);
      for(let i = 0; i < xpTable.RowCount; i++){
        SWRuleSet.xpTable[i] = SWXPTableEntry.From2DA(xpTable.rows[i]);
      }
    }

    /**
     * Initialize Feat Gains
     * - required by CreatureClass.apply2DA()
     */
    const featGains = GameState.TwoDAManager.datatables.get('featgain');
    if(featGains){
      SWRuleSet.featGainCount = featGains.RowCount;
      SWRuleSet.featGains = SWFeatGain.From2DA(featGains);
    }

    /**
     * Initialize Spells
     */
    const spells = GameState.TwoDAManager.datatables.get('spells');
    if(spells){
      SWRuleSet.spellCount = spells.RowCount;
      SWRuleSet.spells = new Array(SWRuleSet.spellCount);
      for(let i = 0; i < spells.RowCount; i++){
        SWRuleSet.spells[i] = TalentSpell.From2DA(spells.rows[i]);
      }
      for(let i = 0; i < SWRuleSet.spellCount; i++){
        const spell = SWRuleSet.spells[i];
        if(spell.prerequisites.length > 0){
          const parentSpellId = spell.prerequisites[spell.prerequisites.length - 1];
          const parentSpell = SWRuleSet.spells[parentSpellId];
          if(parentSpell){
            parentSpell.nextSpell = spell;
          }
        }
      }
    }

    /**
     * Initialize Spell Gains
     */
    const spellGains = GameState.TwoDAManager.datatables.get('classpowergain');
    if(spellGains){
      SWRuleSet.spellGainCount = spellGains.RowCount;
      SWRuleSet.spellGains = SWSpellGain.From2DA(spellGains);
    }

    /**
     * Initialize Classes
     */
    const classes = GameState.TwoDAManager.datatables.get('classes');
    if(classes){
      SWRuleSet.classCount = classes.RowCount;
      SWRuleSet.classes = new Array(SWRuleSet.classCount);
      for(let i = 0; i < classes.RowCount; i++){
        SWRuleSet.classes[i] = CreatureClass.From2DA(classes.rows[i]);
      }
    }

    /**
     * Initialize Racial Types
     */
    const racialtypes = GameState.TwoDAManager.datatables.get('racialtypes');
    if(racialtypes){
      SWRuleSet.racialTypeCount = racialtypes.RowCount;
      SWRuleSet.racialtypes = new Array(SWRuleSet.racialTypeCount);
      for(let i = 0; i < racialtypes.RowCount; i++){
        SWRuleSet.racialtypes[i] = SWRace.From2DA(racialtypes.rows[i]);
      }
    }

    /**
     * Initialize Effect Icons
     */
    const effectIcons = GameState.TwoDAManager.datatables.get('effecticon');
    if(effectIcons){
      SWRuleSet.effectIconCount = effectIcons.RowCount;
      SWRuleSet.effectIcons = new Array(SWRuleSet.effectIconCount);
      for(let i = 0; i < effectIcons.RowCount; i++){
        SWRuleSet.effectIcons[i] = SWEffectIcon.From2DA(effectIcons.rows[i]);
      }
    }

    /**
     * Initialize Feats
     */
    const feats = GameState.TwoDAManager.datatables.get('feat');
    if(feats){
      SWRuleSet.featCount = feats.RowCount;
      SWRuleSet.feats = new Array(SWRuleSet.featCount);
      for(let i = 0; i < feats.RowCount; i++){
        SWRuleSet.feats[i] = TalentFeat.From2DA(feats.rows[i]);
        SWRuleSet.feats[i].id = i;
      }

      //post-process feats
      for(let i = 0; i < SWRuleSet.featCount; i++){
        const feat = SWRuleSet.feats[i];
        const isLevel3 = feat.prereqFeat2 >=  0 && feat.prereqFeat1 >=  0;
        const isLevel2 = feat.prereqFeat2 == -1 && feat.prereqFeat1 >=  0;
        const isLevel1 = feat.prereqFeat2 == -1 && feat.prereqFeat1 == -1;
        const parentFeatId = isLevel3 ? feat.prereqFeat2 : isLevel2 ? feat.prereqFeat1 : -1;
        if(parentFeatId >= 0){
          const parentFeat = SWRuleSet.feats[parentFeatId];
          if(parentFeat){
            parentFeat.nextFeat = feat;
          }
        }
      }
    }

    /**
     * Initialize Item Properties
     */
    const itemProps = GameState.TwoDAManager.datatables.get('itempropdef');
    if(itemProps){
      SWRuleSet.itemPropsDef = new Array(itemProps.RowCount);
      for(let i = 0; i < itemProps.RowCount; i++){
        SWRuleSet.itemPropsDef[i] = SWItemPropsDef.From2DA(itemProps.rows[i]);
      }
    }

    /**
     * Initialize Cost Tables
     */
    const costTables = GameState.TwoDAManager.datatables.get('iprp_costtable');
    if(costTables){
      SWRuleSet.costTableCount = costTables.RowCount;
      SWRuleSet.costTables = new Array(SWRuleSet.costTableCount);
      for(let i = 0; i < costTables.RowCount; i++){
        SWRuleSet.costTables[i] = SWCostTable.From2DA(costTables.rows[i]);
      }
    }

    /**
     * Initialize Pazaak Decks
     */
    const pazaakdecks = GameState.TwoDAManager.datatables.get('pazaakdecks');
    if(pazaakdecks){
      SWRuleSet.pazaakDecks = new Array(pazaakdecks.RowCount);
      for(let i = 0; i < pazaakdecks.RowCount; i++){
        SWRuleSet.pazaakDecks[i] = PazaakDeck.From2DA(pazaakdecks.rows[i]);
      }
      SWRuleSet.pazaakDeckCount = pazaakdecks.RowCount;
    }

    /**
     * Initialize Portraits
     */
    const portraits = GameState.TwoDAManager.datatables.get('portraits');
    if(portraits){
      SWRuleSet.portraits = new Array(portraits.RowCount);
      for(let i = 0; i < portraits.RowCount; i++){
        SWRuleSet.portraits[i] = SWPortrait.From2DA(portraits.rows[i]);
      }
    }

    /**
     * Initialize Heads
     */
    const heads = GameState.TwoDAManager.datatables.get('heads');
    if(heads){
      SWRuleSet.heads = new Array(heads.RowCount);
      for(let i = 0; i < heads.RowCount; i++){
        SWRuleSet.heads[i] = SWHead.From2DA(heads.rows[i]);
      }
    }
    
    const bodyBags = GameState.TwoDAManager.datatables.get('bodybag');
    if(bodyBags){
      SWRuleSet.bodyBags = new Array(bodyBags.RowCount);
      for(let i = 0; i < bodyBags.RowCount; i++){
        SWRuleSet.bodyBags[i] = SWBodyBag.From2DA(bodyBags.rows[i]);
      }
    }

    /**
     * Initialize Priority Groups
     */
    const priorityGroups = GameState.TwoDAManager.datatables.get('prioritygroups');
    if(priorityGroups){
      SWRuleSet.priorityGroups = new Array(priorityGroups.RowCount);
      for(let i = 0; i < priorityGroups.RowCount; i++){
        SWRuleSet.priorityGroups[i] = SWPriorityGroup.From2DA(priorityGroups.rows[i]);
      }
    }

    /**
     * Initialize Factions
     */
    const factions = GameState.TwoDAManager.datatables.get('repute');
    if(factions){
      SWRuleSet.factionCount = factions.RowCount;
      SWRuleSet.factions = new Array(SWRuleSet.factionCount);
      for(let i = 0; i < factions.RowCount; i++){
        SWRuleSet.factions[i] = SWFaction.From2DA(factions.rows[i]);
      }
    }

    /**
     * Initialize Genders
     */
    const genders = GameState.TwoDAManager.datatables.get('gender');
    if(genders){
      SWRuleSet.genderCount = genders.RowCount;
      SWRuleSet.genders = new Array(SWRuleSet.genderCount);
      for(let i = 0; i < genders.RowCount; i++){
        SWRuleSet.genders[i] = SWGender.From2DA(genders.rows[i]);
      }
    }

    /**
     * Initialize Phenotypes
     */
    const phenotypes = GameState.TwoDAManager.datatables.get('phenotype');
    if(phenotypes){
      SWRuleSet.phenotypeCount = phenotypes.RowCount;
      SWRuleSet.phenotypes = new Array(SWRuleSet.phenotypeCount);
      for(let i = 0; i < phenotypes.RowCount; i++){
        SWRuleSet.phenotypes[i] = SWPhenotype.From2DA(phenotypes.rows[i]);
      }
    }

    /**
     * Initialize Sub Races
     */
    const subRaces = GameState.TwoDAManager.datatables.get('subrace');
    if(subRaces){
      SWRuleSet.subRaceCount = subRaces.RowCount;
      SWRuleSet.subRaces = new Array(SWRuleSet.subRaceCount);
      for(let i = 0; i < subRaces.RowCount; i++){
        SWRuleSet.subRaces[i] = SWSubRace.From2DA(subRaces.rows[i]);
      }
    }

    /**
     * Initialize Sound Sets
     */
    const soundSets = GameState.TwoDAManager.datatables.get('soundset');
    if(soundSets){
      SWRuleSet.soundSetCount = soundSets.RowCount;
      SWRuleSet.soundSets = new Array(SWRuleSet.soundSetCount);
      for(let i = 0; i < soundSets.RowCount; i++){
        SWRuleSet.soundSets[i] = SWSoundSet.From2DA(soundSets.rows[i]);
      }
    }

    /**
     * Initialize Creature Sizes
     */
    const creatureSizes = GameState.TwoDAManager.datatables.get('creaturesize');
    if(creatureSizes){
      SWRuleSet.creatureSizeCount = creatureSizes.RowCount;
      SWRuleSet.creatureSizes = new Array(SWRuleSet.creatureSizeCount);
      for(let i = 0; i < creatureSizes.RowCount; i++){
        SWRuleSet.creatureSizes[i] = SWCreatureSize.From2DA(creatureSizes.rows[i]);
      }
    }

    /**
     * Initialize Creature Speeds
     */
    const creatureSpeeds = GameState.TwoDAManager.datatables.get('creaturespeed');
    if(creatureSpeeds){
      SWRuleSet.creatureSpeedCount = creatureSpeeds.RowCount;
      SWRuleSet.creatureSpeeds = new Array(SWRuleSet.creatureSpeedCount);
      for(let i = 0; i < creatureSpeeds.RowCount; i++){
        SWRuleSet.creatureSpeeds[i] = SWCreatureSpeed.From2DA(creatureSpeeds.rows[i]);
      }
    }

    /**
     * Initialize Ranges
     */
    const ranges = GameState.TwoDAManager.datatables.get('ranges');
    if(ranges){
      SWRuleSet.rangeCount = ranges.RowCount;
      SWRuleSet.ranges = new Array(SWRuleSet.rangeCount);
      for(let i = 0; i < ranges.RowCount; i++){
        SWRuleSet.ranges[i] = SWRange.From2DA(ranges.rows[i]);
      }
    }

    /**
     * Initialize Skills
     */
    const skills = GameState.TwoDAManager.datatables.get('skills');
    if(skills){
      SWRuleSet.skillCount = skills.RowCount;
      SWRuleSet.skills = new Array(SWRuleSet.skillCount);
      for(let i = 0; i < skills.RowCount; i++){
        SWRuleSet.skills[i] = SWSkill.From2DA(skills.rows[i]);
      }
    }

    /**
     * Initialize Creature Appearances
     */
    const creatureAppearances = GameState.TwoDAManager.datatables.get('appearance');
    if(creatureAppearances){
      SWRuleSet.creatureAppearanceCount = creatureAppearances.RowCount;
      SWRuleSet.creatureAppearances = new Array(SWRuleSet.creatureAppearanceCount);
      for(let i = 0; i < creatureAppearances.RowCount; i++){
        SWRuleSet.creatureAppearances[i] = SWCreatureAppearance.From2DA(creatureAppearances.rows[i]);
      }
    }

    /**
     * Initialize Door Appearances
     */
    const doorAppearances = GameState.TwoDAManager.datatables.get('genericdoors');
    if(doorAppearances){
      SWRuleSet.doorAppearanceCount = doorAppearances.RowCount;
      SWRuleSet.doorAppearances = new Array(SWRuleSet.doorAppearanceCount);
      for(let i = 0; i < doorAppearances.RowCount; i++){
        SWRuleSet.doorAppearances[i] = SWDoorAppearance.From2DA(doorAppearances.rows[i]);
      }
    }

    /**
     * Initialize Placeable Appearances
     */
    const placeableAppearances = GameState.TwoDAManager.datatables.get('placeables');
    if(placeableAppearances){
      SWRuleSet.placeableAppearanceCount = placeableAppearances.RowCount;
      SWRuleSet.placeableAppearances = new Array(SWRuleSet.placeableAppearanceCount);
      for(let i = 0; i < placeableAppearances.RowCount; i++){
        SWRuleSet.placeableAppearances[i] = SWPlaceableAppearance.From2DA(placeableAppearances.rows[i]);
      }
    }
  }

  /**
   * Loads values from the INIConfig
   * @param iniConfig - The INIConfig
   */
  static setIniConfig(iniConfig: INIConfig) {
    if(iniConfig.getProperty('Game Options.Difficulty Level')){
      const difficulty = iniConfig.getProperty('Game Options.Difficulty Level');
      if(SWRuleSet.difficulty[difficulty]){
        SWRuleSet.currentDifficulty = difficulty;
      }
    }
  }

}