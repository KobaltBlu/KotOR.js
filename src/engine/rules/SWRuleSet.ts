import { CreatureClass } from "@/combat/CreatureClass";
import type { INIConfig } from "@/engine/INIConfig";
import { PazaakDeck } from "@/engine/minigames/PazaakDeck";
import { SWBaseItem } from "@/engine/rules/SWBaseItem";
import { SWBodyBag } from "@/engine/rules/SWBodyBag";
import { SWCostTable } from "@/engine/rules/SWCostTable";
import { SWCreatureAppearance } from "@/engine/rules/SWCreatureAppearance";
import { SWCreatureSize } from "@/engine/rules/SWCreatureSize";
import { SWCreatureSpeed } from "@/engine/rules/SWCreatureSpeed";
import { SWDifficulty } from "@/engine/rules/SWDifficulty";
import { SWDoorAppearance } from "@/engine/rules/SWDoorAppearance";
import { SWEffectIcon } from "@/engine/rules/SWEffectIcon";
import { SWEncounterDifficulty } from "@/engine/rules/SWEncounterDifficulty";
import { SWEXPTable } from "@/engine/rules/SWEXPTable";
import { SWFaction } from "@/engine/rules/SWFaction";
import { SWFeatGain } from "@/engine/rules/SWFeatGain";
import { SWFootStep } from "@/engine/rules/SWFootStep";
import { SWGender } from "@/engine/rules/SWGender";
import { SWHead } from "@/engine/rules/SWHead";
import { SWItemPropsDef } from "@/engine/rules/SWItemPropsDef";
import { SWPhenotype } from "@/engine/rules/SWPhenotype";
import { SWPlaceableAppearance } from "@/engine/rules/SWPlaceableAppearance";
import { SWPortrait } from "@/engine/rules/SWPortrait";
import { SWPriorityGroup } from "@/engine/rules/SWPriorityGroup";
import { SWRace } from "@/engine/rules/SWRace";
import { SWRange } from "@/engine/rules/SWRange";
import { SWSoundSet } from "@/engine/rules/SWSoundSet";
import { SWSpellGain } from "@/engine/rules/SWSpellGain";
import { SWSubRace } from "@/engine/rules/SWSubRace";
import { SWWeaponSound } from "@/engine/rules/SWWeaponSound";
import { SWXPTableEntry } from "@/engine/rules/SWXPTableEntry";
import { GameState } from "@/GameState";
import { TalentFeat } from "@/talents/TalentFeat";
import { TalentSkill } from "@/talents/TalentSkill";
import { TalentSpell } from "@/talents/TalentSpell";

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

  static skills: TalentSkill[] = [];
  static skillCount: number = 0;

  static creatureAppearances: SWCreatureAppearance[] = [];
  static creatureAppearanceCount: number = 0;

  static doorAppearances: SWDoorAppearance[] = [];
  static doorAppearanceCount: number = 0;

  static placeableAppearances: SWPlaceableAppearance[] = [];
  static placeableAppearanceCount: number = 0;

  static footSteps: SWFootStep[] = [];
  static footStepCount: number = 0;

  static weaponSounds: SWWeaponSound[] = [];
  static weaponSoundCount: number = 0;

  static Init(){

    /**
     * Initialize Base Items
     */
    const baseItems = GameState.TwoDAManager.datatables.get('baseitems');
    if(baseItems){
      SWRuleSet.baseItemCount = baseItems.RowCount;
      SWRuleSet.baseItems = Array.from({ length: baseItems.RowCount }, (_, i) => SWBaseItem.From2DA(baseItems.rows[i]));
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
      SWRuleSet.xpTable = Array.from({ length: xpTable.RowCount }, (_, i) => SWXPTableEntry.From2DA(xpTable.rows[i]));
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
      SWRuleSet.spells = Array.from({ length: spells.RowCount }, (_, i) => TalentSpell.From2DA(spells.rows[i]));
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
      SWRuleSet.classes = Array.from({ length: classes.RowCount }, (_, i) => CreatureClass.From2DA(classes.rows[i]));
    }

    /**
     * Initialize Racial Types
     */
    const racialtypes = GameState.TwoDAManager.datatables.get('racialtypes');
    if(racialtypes){
      SWRuleSet.racialTypeCount = racialtypes.RowCount;
      SWRuleSet.racialtypes = Array.from({ length: racialtypes.RowCount }, (_, i) => SWRace.From2DA(racialtypes.rows[i]));
    }

    /**
     * Initialize Effect Icons
     */
    const effectIcons = GameState.TwoDAManager.datatables.get('effecticon');
    if(effectIcons){
      SWRuleSet.effectIconCount = effectIcons.RowCount;
      SWRuleSet.effectIcons = Array.from({ length: effectIcons.RowCount }, (_, i) => SWEffectIcon.From2DA(effectIcons.rows[i]));
    }

    /**
     * Initialize Feats
     */
    const feats = GameState.TwoDAManager.datatables.get('feat');
    if(feats){
      SWRuleSet.featCount = feats.RowCount;
      SWRuleSet.feats = Array.from({ length: feats.RowCount }, (_, i) => {
        const f = TalentFeat.From2DA(feats.rows[i]);
        f.id = i;
        return f;
      });

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
      SWRuleSet.itemPropsDef = Array.from({ length: itemProps.RowCount }, (_, i) => SWItemPropsDef.From2DA(itemProps.rows[i]));
    }

    /**
     * Initialize Cost Tables
     */
    const costTables = GameState.TwoDAManager.datatables.get('iprp_costtable');
    if(costTables){
      SWRuleSet.costTableCount = costTables.RowCount;
      SWRuleSet.costTables = Array.from({ length: costTables.RowCount }, (_, i) => SWCostTable.From2DA(costTables.rows[i]));
    }

    /**
     * Initialize Pazaak Decks
     */
    const pazaakdecks = GameState.TwoDAManager.datatables.get('pazaakdecks');
    if(pazaakdecks){
      SWRuleSet.pazaakDecks = Array.from({ length: pazaakdecks.RowCount }, (_, i) => PazaakDeck.From2DA(pazaakdecks.rows[i]));
      SWRuleSet.pazaakDeckCount = pazaakdecks.RowCount;
    }

    /**
     * Initialize Portraits
     */
    const portraits = GameState.TwoDAManager.datatables.get('portraits');
    if(portraits){
      SWRuleSet.portraits = Array.from({ length: portraits.RowCount }, (_, i) => SWPortrait.From2DA(portraits.rows[i]));
    }

    /**
     * Initialize Heads
     */
    const heads = GameState.TwoDAManager.datatables.get('heads');
    if(heads){
      SWRuleSet.heads = Array.from({ length: heads.RowCount }, (_, i) => SWHead.From2DA(heads.rows[i]));
    }

    const bodyBags = GameState.TwoDAManager.datatables.get('bodybag');
    if(bodyBags){
      SWRuleSet.bodyBags = Array.from({ length: bodyBags.RowCount }, (_, i) => SWBodyBag.From2DA(bodyBags.rows[i]));
    }

    /**
     * Initialize Priority Groups
     */
    const priorityGroups = GameState.TwoDAManager.datatables.get('prioritygroups');
    if(priorityGroups){
      SWRuleSet.priorityGroups = Array.from({ length: priorityGroups.RowCount }, (_, i) => SWPriorityGroup.From2DA(priorityGroups.rows[i]));
    }

    /**
     * Initialize Factions
     */
    const factions = GameState.TwoDAManager.datatables.get('repute');
    if(factions){
      SWRuleSet.factionCount = factions.RowCount;
      SWRuleSet.factions = Array.from({ length: factions.RowCount }, (_, i) => SWFaction.From2DA(factions.rows[i]));
    }

    /**
     * Initialize Genders
     */
    const genders = GameState.TwoDAManager.datatables.get('gender');
    if(genders){
      SWRuleSet.genderCount = genders.RowCount;
      SWRuleSet.genders = Array.from({ length: genders.RowCount }, (_, i) => SWGender.From2DA(genders.rows[i]));
    }

    /**
     * Initialize Phenotypes
     */
    const phenotypes = GameState.TwoDAManager.datatables.get('phenotype');
    if(phenotypes){
      SWRuleSet.phenotypeCount = phenotypes.RowCount;
      SWRuleSet.phenotypes = Array.from({ length: phenotypes.RowCount }, (_, i) => SWPhenotype.From2DA(phenotypes.rows[i]));
    }

    /**
     * Initialize Sub Races
     */
    const subRaces = GameState.TwoDAManager.datatables.get('subrace');
    if(subRaces){
      SWRuleSet.subRaceCount = subRaces.RowCount;
      SWRuleSet.subRaces = Array.from({ length: subRaces.RowCount }, (_, i) => SWSubRace.From2DA(subRaces.rows[i]));
    }

    /**
     * Initialize Sound Sets
     */
    const soundSets = GameState.TwoDAManager.datatables.get('soundset');
    if(soundSets){
      SWRuleSet.soundSetCount = soundSets.RowCount;
      SWRuleSet.soundSets = Array.from({ length: soundSets.RowCount }, (_, i) => SWSoundSet.From2DA(soundSets.rows[i]));
    }

    /**
     * Initialize Creature Sizes
     */
    const creatureSizes = GameState.TwoDAManager.datatables.get('creaturesize');
    if(creatureSizes){
      SWRuleSet.creatureSizeCount = creatureSizes.RowCount;
      SWRuleSet.creatureSizes = Array.from({ length: creatureSizes.RowCount }, (_, i) => SWCreatureSize.From2DA(creatureSizes.rows[i]));
    }

    /**
     * Initialize Creature Speeds
     */
    const creatureSpeeds = GameState.TwoDAManager.datatables.get('creaturespeed');
    if(creatureSpeeds){
      SWRuleSet.creatureSpeedCount = creatureSpeeds.RowCount;
      SWRuleSet.creatureSpeeds = Array.from({ length: creatureSpeeds.RowCount }, (_, i) => SWCreatureSpeed.From2DA(creatureSpeeds.rows[i]));
    }

    /**
     * Initialize Ranges
     */
    const ranges = GameState.TwoDAManager.datatables.get('ranges');
    if(ranges){
      SWRuleSet.rangeCount = ranges.RowCount;
      SWRuleSet.ranges = Array.from({ length: ranges.RowCount }, (_, i) => SWRange.From2DA(ranges.rows[i]));
    }

    /**
     * Initialize Skills
     */
    const skills = GameState.TwoDAManager.datatables.get('skills');
    if(skills){
      SWRuleSet.skillCount = skills.RowCount;
      SWRuleSet.skills = Array.from({ length: skills.RowCount }, (_, i) => TalentSkill.From2DA(skills.rows[i]));
    }

    /**
     * Initialize Foot Steps
     */
    const footSteps = GameState.TwoDAManager.datatables.get('footstepsounds');
    if(footSteps){
      SWRuleSet.footStepCount = footSteps.RowCount;
      SWRuleSet.footSteps = Array.from({ length: footSteps.RowCount }, (_, i) => SWFootStep.From2DA(footSteps.rows[i]));
    }

    /**
     * Initialize Weapon Sounds
     */
    const weaponSounds = GameState.TwoDAManager.datatables.get('weaponsounds');
    if(weaponSounds){
      SWRuleSet.weaponSoundCount = weaponSounds.RowCount;
      SWRuleSet.weaponSounds = Array.from({ length: weaponSounds.RowCount }, (_, i) => SWWeaponSound.From2DA(weaponSounds.rows[i]));
    }

    /**
     * Initialize Creature Appearances
     */
    const creatureAppearances = GameState.TwoDAManager.datatables.get('appearance');
    if(creatureAppearances){
      SWRuleSet.creatureAppearanceCount = creatureAppearances.RowCount;
      SWRuleSet.creatureAppearances = Array.from({ length: creatureAppearances.RowCount }, (_, i) => SWCreatureAppearance.From2DA(creatureAppearances.rows[i]));
    }

    /**
     * Initialize Door Appearances
     */
    const doorAppearances = GameState.TwoDAManager.datatables.get('genericdoors');
    if(doorAppearances){
      SWRuleSet.doorAppearanceCount = doorAppearances.RowCount;
      SWRuleSet.doorAppearances = Array.from({ length: doorAppearances.RowCount }, (_, i) => SWDoorAppearance.From2DA(doorAppearances.rows[i]));
    }

    /**
     * Initialize Placeable Appearances
     */
    const placeableAppearances = GameState.TwoDAManager.datatables.get('placeables');
    if(placeableAppearances){
      SWRuleSet.placeableAppearanceCount = placeableAppearances.RowCount;
      SWRuleSet.placeableAppearances = Array.from({ length: placeableAppearances.RowCount }, (_, i) => SWPlaceableAppearance.From2DA(placeableAppearances.rows[i]));
    }
  }

  /**
   * Loads values from the INIConfig
   * @param iniConfig - The INIConfig
   */
  static setIniConfig(iniConfig: INIConfig) {
    const difficultyVal = iniConfig.getProperty('Game Options.Difficulty Level');
    if (difficultyVal !== undefined && difficultyVal !== null) {
      const idx = typeof difficultyVal === 'number' ? difficultyVal : parseInt(String(difficultyVal), 10);
      if (!Number.isNaN(idx) && idx >= 0 && SWRuleSet.difficulty[idx]) {
        SWRuleSet.currentDifficulty = idx;
      }
    }
  }

}
