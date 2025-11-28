import { GameState } from "../../GameState";
import type { INIConfig } from "../../engine/INIConfig";
import { CreatureClass } from "../../combat/CreatureClass";
import { TalentFeat } from "../../talents/TalentFeat";
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

  static classes: CreatureClass[] = [];
  static classCount: number = 0;

  static racialtypes: SWRace[] = [];
  static racialTypeCount: number = 0;

  static effectIcons: SWEffectIcon[] = [];
  static effectIconCount: number = 0;

  static itemPropsDef: SWItemPropsDef[] = [];

  static pazaakDecks: PazaakDeck[] = [];
  static pazaakDeckCount: number = 0;

  static xpTable: SWXPTableEntry[] = [];
  static portraits: SWPortrait[] = [];
  static heads: SWHead[] = [];

  static feats: TalentFeat[] = [];
  static featCount: number = 0;
  static featGains: SWFeatGain;
  static featGainCount: number = 0;

  static spellGains: SWSpellGain;
  static spellGainCount: number = 0;
  static expTable: SWEXPTable;
  static difficulty: SWDifficulty[] = [];
  static currentDifficulty: number = 0;
  static bodyBags: SWBodyBag[] = [];
  static priorityGroups: SWPriorityGroup[] = [];

  static encounterDifficulties: SWEncounterDifficulty[] = [];
  static encounterDifficultyCount: number = 0;

  static Init(){

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
    const itemProps = GameState.TwoDAManager.datatables.get('itempropsdef');
    if(itemProps){
      SWRuleSet.itemPropsDef = new Array(itemProps.RowCount);
      for(let i = 0; i < itemProps.RowCount; i++){
        SWRuleSet.itemPropsDef[i] = SWItemPropsDef.From2DA(itemProps.rows[i]);
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
     * Initialize Encounter Difficulties
     */
    const encounterDifficulties = GameState.TwoDAManager.datatables.get('encdifficulty');
    if(encounterDifficulties){
      SWRuleSet.encounterDifficultyCount = encounterDifficulties.RowCount;
      SWRuleSet.encounterDifficulties = new Array(SWRuleSet.encounterDifficultyCount);
      for(let i = 0; i < encounterDifficulties.RowCount; i++){
        SWRuleSet.encounterDifficulties[i] = SWEncounterDifficulty.From2DA(encounterDifficulties.rows[i]);
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