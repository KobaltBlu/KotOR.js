import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton, GUIControl } from "../../../gui";
import { GameState } from "../../../GameState";
import type { ModuleCreature } from "../../../module";

/**
 * MenuLevelUp class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuLevelUp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuLevelUp extends GameMenu {

  LBL_BG: GUILabel;
  BTN_BACK: GUIButton;
  LBL_5: GUIControl;
  LBL_4: GUIControl;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  LBL_NUM1: GUILabel;
  LBL_NUM2: GUILabel;
  LBL_NUM3: GUILabel;
  LBL_NUM4: GUILabel;
  LBL_NUM5: GUILabel;
  BTN_STEPNAME4: GUIButton;
  BTN_STEPNAME1: GUIButton;
  BTN_STEPNAME2: GUIButton;
  BTN_STEPNAME3: GUIButton;
  BTN_STEPNAME5: GUIButton;

  /** Creature currently levelling up. */
  creature: ModuleCreature;

  /** HP that will be added when the level-up is confirmed. */
  pendingHP: number = 0;
  /** True when the new level grants +1 ability score. */
  pendingAbilityPoint: boolean = false;
  /** Number of new skill points available at this level. */
  pendingSkillPoints: number = 0;
  /** Number of bonus feat slots at this level. */
  pendingFeatSlots: number = 0;
  /** Number of Force-power slots (for spellcaster classes). */
  pendingForcePowerSlots: number = 0;

  /** Tracks which steps the player has completed before confirming. */
  stepsCompleted: boolean[] = [false, false, false, false, false];

  constructor(){
    super();
    this.gui_resref = 'leveluppnl';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      // BTN_BACK – confirm level-up once all required steps are viewed, or cancel
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.allRequiredStepsDone()){
          this.applyLevelUp();
        }else{
          GameState.CharGenManager.isLevelUpMode = false;
          this.close();
        }
      });

      // Step 1 – Class advancement (no choice needed; just marks step complete)
      this.BTN_STEPNAME1.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stepsCompleted[0] = true;
        this.updateStepUI();
        this.updateBackButtonLabel();
      });

      // Step 2 – Ability score (+1 every 4 levels)
      this.BTN_STEPNAME2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.pendingAbilityPoint){
          this.stepsCompleted[1] = true;
          this.updateStepUI();
          this.updateBackButtonLabel();
          return;
        }
        GameState.MenuManager.CharGenAbilities.setCreature(this.creature);
        GameState.MenuManager.CharGenAbilities.manager = this.manager;
        GameState.MenuManager.CharGenAbilities.open();
      });

      // Step 3 – Skill points
      this.BTN_STEPNAME3.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.MenuManager.CharGenSkills.manager = this.manager;
        GameState.MenuManager.CharGenSkills.open();
      });

      // Step 4 – Feat selection
      this.BTN_STEPNAME4.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.MenuManager.CharGenFeats.setCreature(this.creature);
        GameState.MenuManager.CharGenFeats.manager = this.manager;
        GameState.MenuManager.CharGenFeats.open();
      });

      // Step 5 – Force powers
      this.BTN_STEPNAME5.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.pendingForcePowerSlots){
          this.stepsCompleted[4] = true;
          this.updateStepUI();
          this.updateBackButtonLabel();
          return;
        }
        if(GameState.MenuManager.MenuPowerLevelUp){
          GameState.MenuManager.MenuPowerLevelUp.manager = this.manager;
          GameState.MenuManager.MenuPowerLevelUp.setCreatureAndSlots(this.creature, this.pendingForcePowerSlots);
          GameState.MenuManager.MenuPowerLevelUp.open();
        }else{
          this.stepsCompleted[4] = true;
          this.updateStepUI();
          this.updateBackButtonLabel();
        }
      });

      // Track sub-menu completion via their close events (registered once here).
      GameState.MenuManager.CharGenAbilities.addEventListener('close', () => {
        if(GameState.CharGenManager.isLevelUpMode && this.bVisible){
          this.stepsCompleted[1] = true;
          this.updateStepUI();
          this.updateBackButtonLabel();
        }
      });

      GameState.MenuManager.CharGenSkills.addEventListener('close', () => {
        if(GameState.CharGenManager.isLevelUpMode && this.bVisible){
          this.stepsCompleted[2] = true;
          this.updateStepUI();
          this.updateBackButtonLabel();
        }
      });

      GameState.MenuManager.CharGenFeats.addEventListener('close', () => {
        if(GameState.CharGenManager.isLevelUpMode && this.bVisible){
          this.stepsCompleted[3] = true;
          this.updateStepUI();
          this.updateBackButtonLabel();
        }
      });

      if(GameState.MenuManager.MenuPowerLevelUp){
        GameState.MenuManager.MenuPowerLevelUp.addEventListener('close', () => {
          if(GameState.CharGenManager.isLevelUpMode && this.bVisible){
            this.stepsCompleted[4] = true;
            this.updateStepUI();
            this.updateBackButtonLabel();
          }
        });
      }

      resolve();
    });
  }

  /**
   * Open the level-up panel for the given creature (defaults to the active player).
   */
  open() {
    const player = GameState.getCurrentPlayer() as ModuleCreature;
    if(!player || !player.canLevelUp()) return;
    this.creature = player;
    this.stepsCompleted = [false, false, false, false, false];
    this.initLevelUpState();
    super.open();
    this.updateStepUI();
    this.updateBackButtonLabel();
  }

  /**
   * Compute and cache the pending stat changes for this level.
   * Also primes CharGenManager so the ability / skill sub-menus are ready.
   */
  initLevelUpState() {
    const mainClass = this.creature.getMainClass();
    if(!mainClass) return;

    const newLevel = this.creature.getTotalClassLevel() + 1;
    const conMod = Math.floor((this.creature.getCON() - 10) / 2);
    this.pendingHP = Math.max(1, mainClass.hitdie + conMod);
    this.pendingAbilityPoint = (newLevel % 4 === 0);

    const intMod = Math.floor((this.creature.getINT() - 10) / 2);
    this.pendingSkillPoints = Math.max(1, mainClass.skillpointbase + intMod);

    const featGainPoints = mainClass.featGainPoints;
    const classGrantedFeats = featGainPoints ? (featGainPoints[newLevel] || 0) : 0;
    const defaultFeatSlot = (newLevel % 3 === 0) ? 1 : 0;
    this.pendingFeatSlots = classGrantedFeats || defaultFeatSlot;

    const spellGainPoints = mainClass.spellGainPoints;
    this.pendingForcePowerSlots = (spellGainPoints && spellGainPoints[newLevel]) ? spellGainPoints[newLevel] : 0;

    // Prime CharGenManager for level-up sub-menus.
    GameState.CharGenManager.isLevelUpMode = true;
    GameState.CharGenManager.selectedCreature = this.creature as any;

    // Ability scores – allow adding exactly 1 point above current values.
    GameState.CharGenManager.str = this.creature.str;
    GameState.CharGenManager.dex = this.creature.dex;
    GameState.CharGenManager.con = this.creature.con;
    GameState.CharGenManager.wis = this.creature.wis;
    GameState.CharGenManager.int = this.creature.int;
    GameState.CharGenManager.cha = this.creature.cha;
    GameState.CharGenManager.availPoints = this.pendingAbilityPoint ? 1 : 0;

    // Skills – initialise from current ranks; only additions are allowed.
    GameState.CharGenManager.availSkillPoints = this.pendingSkillPoints;
    const skills = this.creature.skills;
    GameState.CharGenManager.computerUse  = skills[0]?.rank ?? 0;
    GameState.CharGenManager.demolitions  = skills[1]?.rank ?? 0;
    GameState.CharGenManager.stealth      = skills[2]?.rank ?? 0;
    GameState.CharGenManager.awareness    = skills[3]?.rank ?? 0;
    GameState.CharGenManager.persuade     = skills[4]?.rank ?? 0;
    GameState.CharGenManager.repair       = skills[5]?.rank ?? 0;
    GameState.CharGenManager.security     = skills[6]?.rank ?? 0;
    GameState.CharGenManager.treatInjury  = skills[7]?.rank ?? 0;
    // Record the floor values so CharGenSkills cannot subtract below them.
    GameState.CharGenManager.baseSkillValues = [
      GameState.CharGenManager.computerUse,
      GameState.CharGenManager.demolitions,
      GameState.CharGenManager.stealth,
      GameState.CharGenManager.awareness,
      GameState.CharGenManager.persuade,
      GameState.CharGenManager.repair,
      GameState.CharGenManager.security,
      GameState.CharGenManager.treatInjury,
    ];
  }

  /**
   * Returns true when every step that has real content has been visited.
   */
  allRequiredStepsDone(): boolean {
    // Step 1 (class) must always be confirmed.
    if(!this.stepsCompleted[0]) return false;
    // Step 2 (abilities) required only when a point is available.
    if(this.pendingAbilityPoint && !this.stepsCompleted[1]) return false;
    // Step 3 (skills) required when points > 0.
    if(this.pendingSkillPoints > 0 && !this.stepsCompleted[2]) return false;
    // Step 4 (feats) required when feat slots > 0.
    if(this.pendingFeatSlots > 0 && !this.stepsCompleted[3]) return false;
    // Step 5 (powers) required only for spellcasters.
    if(this.pendingForcePowerSlots > 0 && !this.stepsCompleted[4]) return false;
    return true;
  }

  /**
   * Applies the level-up to the creature and closes the menu.
   */
  applyLevelUp() {
    if(!this.creature || !this.creature.canLevelUp()) return;
    const mainClass = this.creature.getMainClass();
    if(!mainClass) return;

    // Advance class level.
    mainClass.level += 1;

    // Increase max HP (at least +1).
    this.creature.maxHitPoints += this.pendingHP;

    // Apply ability score changes chosen in CharGenAbilities.
    this.creature.str = GameState.CharGenManager.str;
    this.creature.dex = GameState.CharGenManager.dex;
    this.creature.con = GameState.CharGenManager.con;
    this.creature.wis = GameState.CharGenManager.wis;
    this.creature.int = GameState.CharGenManager.int;
    this.creature.cha = GameState.CharGenManager.cha;

    // Skills were applied directly to the creature by CharGenSkills.BTN_ACCEPT.
    // Feats were granted by CharGenFeats.addGrantedFeats().

    GameState.CharGenManager.isLevelUpMode = false;
    this.close();
  }

  /**
   * Updates the visual state of each step button to show completion.
   */
  updateStepUI() {
    const stepBtns = [
      this.BTN_STEPNAME1,
      this.BTN_STEPNAME2,
      this.BTN_STEPNAME3,
      this.BTN_STEPNAME4,
      this.BTN_STEPNAME5,
    ];
    const stepNums = [
      this.LBL_NUM1,
      this.LBL_NUM2,
      this.LBL_NUM3,
      this.LBL_NUM4,
      this.LBL_NUM5,
    ];

    // Mark step numbers to reflect completion (tick via text change).
    for(let i = 0; i < 5; i++){
      if(stepNums[i] && this.stepsCompleted[i]){
        stepNums[i].setText('✓');
      }
    }

    // Disable step 5 if not applicable.
    if(stepBtns[4]){
      if(this.pendingForcePowerSlots > 0){
        stepBtns[4].show();
      }else{
        stepBtns[4].hide();
        if(this.LBL_5) this.LBL_5.hide();
        if(stepNums[4]) stepNums[4].hide();
      }
    }
  }

  /**
   * Changes the BTN_BACK label to "Confirm" once all required steps are done.
   */
  updateBackButtonLabel() {
    if(!this.BTN_BACK) return;
    if(this.allRequiredStepsDone()){
      const confirmStr = GameState.TLKManager?.GetStringById(4246)?.Value;
      this.BTN_BACK.setText(confirmStr || 'Confirm');
    }else{
      const cancelStr = GameState.TLKManager?.GetStringById(40217)?.Value;
      this.BTN_BACK.setText(cancelStr || 'Cancel');
    }
  }
  
}
