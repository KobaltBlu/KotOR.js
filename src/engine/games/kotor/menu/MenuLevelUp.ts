import { GameMenu } from "@engine/gui";
import type { GUILabel, GUIButton, GUIControl } from "@engine/gui";
import { GameState } from "@engine/runtime/GameState";
import { LevelUpManager } from "@engine/managers/LevelUpManager";
import type { Creature } from "@engine/module/Creature";
import { LevelUpAbilityIndex } from "@engine/rules/level-up";

/**
 * MenuLevelUp — (LEVELUPPNL).
 * Steps: Abilities / Skills / Feats / Powers / Accept (conditionally enabled).
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
  BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'leveluppnl';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_BACK?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelLevelUp();
      });
      this.BTN_CANCEL?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelLevelUp();
      });

      this.BTN_STEPNAME1?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openAbilitiesStep();
      });
      this.BTN_STEPNAME2?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSkillsStep();
      });
      this.BTN_STEPNAME3?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openFeatsStep();
      });
      this.BTN_STEPNAME4?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPowersStep();
      });
      this.BTN_STEPNAME5?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.acceptLevelUp();
      });


      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 100;
      this.recalculatePosition();
      resolve();
    });
  }

  /**
   * Prepare LEVELUPPNL as CharGenMain.childMenu.
   * Do not Add this menu to the stack — the MAINCG host owns visibility.
   */
  prepareFor(creature: Creature) {
    if(!LevelUpManager.active || LevelUpManager.creature !== creature){
      if(!LevelUpManager.begin(creature)) return;
    }
    this.applyStepVisibility();
  }

  /** @deprecated Prefer CharGenMain.openForLevelUp → prepareFor as childMenu. */
  openFor(creature: Creature) {
    this.prepareFor(creature);
    this.manager.CharGenMain?.openForLevelUp?.(creature);
  }

  cancelLevelUp() {
    LevelUpManager.clear();
    if(this.manager.CharGenMain?.levelUpMode){
      this.manager.CharGenMain.closeLevelUp();
    }
    this.close();
  }

  acceptLevelUp() {
    if(!LevelUpManager.canAccept()) return;
    const creature = LevelUpManager.creature;
    const ok = LevelUpManager.commit();
    if(this.manager.CharGenMain?.levelUpMode){
      this.manager.CharGenMain.closeLevelUp();
    }
    this.close();
    if(ok){
      GameState.MenuManager.MenuCharacter?.updateCharacterStats?.(creature);
    }
  }

  openAbilitiesStep() {
    const draft = LevelUpManager.draft;
    if(!draft?.hasAbilityStep) return;
    const menu = this.manager.CharGenAbilities;
    if(!menu) return;
    menu.levelUpMode = true;
    menu.setCreature(LevelUpManager.creature as any);
    menu.selectedAttribute = LevelUpManager.levelUpIndexToCharGenAttr(
      draft.attributeIndex >= 0 ? draft.attributeIndex : LevelUpAbilityIndex.STR
    );
    menu.levelUpAcceptCallback = () => {
      draft.attributeIndex = LevelUpManager.charGenAttrToLevelUpIndex(menu.selectedAttribute);
      LevelUpManager.abilityStepDone = true;
      menu.levelUpMode = false;
      this.applyStepVisibility();
      // Reshow MAINCG host (and this child panel)
      this.manager.CharGenMain?.show?.();
    };
    menu.open();
  }

  openSkillsStep() {
    const draft = LevelUpManager.draft;
    const creature = LevelUpManager.creature;
    if(!draft?.hasSkillsStep || !creature) return;
    const menu = this.manager.CharGenSkills;
    if(!menu) return;
    menu.levelUpMode = true;
    // Seed CharGen skill pool from draft budget; baseline = current ranks
    GameState.CharGenManager.availSkillPoints = draft.skillPointsRemaining;
    GameState.CharGenManager.skillRankBaseline = creature.skills.map((s) => s.rank | 0);
    for(let i = 0; i < creature.skills.length; i++){
      GameState.CharGenManager.setTempSkillRank?.(i, creature.skills[i].rank | 0);
    }
    menu.levelUpAcceptCallback = () => {
      // Diff temp ranks into draft
      for(let i = 0; i < creature.skills.length; i++){
        const baseline = creature.skills[i].rank | 0;
        const temp = GameState.CharGenManager.getTempSkillRank?.(i) ?? baseline;
        draft.skillRankChanges[i] = Math.max(0, (temp | 0) - baseline);
      }
      draft.skillPointsRemaining = GameState.CharGenManager.availSkillPoints | 0;
      LevelUpManager.skillsStepDone = true;
      menu.levelUpMode = false;
      this.applyStepVisibility();
      this.manager.CharGenMain?.show?.();
    };
    menu.open();
  }

  openFeatsStep() {
    const draft = LevelUpManager.draft;
    const creature = LevelUpManager.creature;
    if(!draft?.hasFeatsStep || !creature) return;
    const menu = this.manager.CharGenFeats;
    if(!menu) return;
    menu.levelUpMode = true;
    menu.setCreature(creature as any);
    menu.levelUpAcceptCallback = () => {
      // Feats already added to creature in CharGenFeats — move chosen into draft and revert live adds until commit
      const chosen = [...(menu.chosenFeats || [])];
      menu.revertChosenFeats?.();
      draft.feats = chosen;
      draft.featPicksRemaining = 0;
      LevelUpManager.featsStepDone = true;
      menu.levelUpMode = false;
      this.applyStepVisibility();
      this.manager.CharGenMain?.show?.();
    };
    menu.open();
  }

  openPowersStep() {
    const draft = LevelUpManager.draft;
    if(!draft?.hasPowersStep) return;
    const menu = this.manager.MenuPowerLevelUp;
    if(!menu) return;
    menu.openForLevelUp?.();
  }

  private stepSlot(i: number): { btn?: GUIButton; lbl?: GUIControl; num?: GUILabel } {
    switch(i){
      case 0: return { btn: this.BTN_STEPNAME1, lbl: this.LBL_1, num: this.LBL_NUM1 };
      case 1: return { btn: this.BTN_STEPNAME2, lbl: this.LBL_2, num: this.LBL_NUM2 };
      case 2: return { btn: this.BTN_STEPNAME3, lbl: this.LBL_3, num: this.LBL_NUM3 };
      case 3: return { btn: this.BTN_STEPNAME4, lbl: this.LBL_4, num: this.LBL_NUM4 };
      case 4: return { btn: this.BTN_STEPNAME5, lbl: this.LBL_5, num: this.LBL_NUM5 };
      default: return {};
    }
  }

  applyStepVisibility() {
    const d = LevelUpManager.draft;
    if(!d) return;

    const enabled = [
      d.hasAbilityStep,
      d.hasSkillsStep,
      d.hasFeatsStep,
      d.hasPowersStep,
      true, // accept always
    ];
    let num = 0;
    for(let i = 0; i < 5; i++){
      const { btn, lbl, num: numLbl } = this.stepSlot(i);
      if(enabled[i]){
        num++;
        btn?.show();
        lbl?.show();
        numLbl?.show();
        numLbl?.setText?.(String(num));
        if(btn) btn.disableSelection = false;
      }else{
        btn?.hide();
        lbl?.hide();
        numLbl?.hide();
        if(btn) btn.disableSelection = true;
      }
    }
  }

  show() {
    super.show();
    this.applyStepVisibility();
  }
}
