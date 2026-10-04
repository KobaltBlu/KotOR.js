import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import { GUIFeatItem } from "@engine/games/kotor/gui/GUIFeatItem";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import { TalentFeat } from "@engine/talents";
import { GameState } from "@engine/runtime/GameState";
import { getFeatPicksForLevel } from "@engine/rules/level-up";
import {
  SkillFlowStatus,
  SKILL_FLOW_COLOR_YELLOW,
  getFeatId as resolveFeatId,
  isUnsetFeatPrereq,
} from "@engine/gui/protoitem/protoItemHelpers";

/** colorBlue for enabled Select button text. */
const COLOR_SELECT_ENABLED = { r: 0, g: 0.658824, b: 0.980392 };

/**
 * CharGenFeats class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenFeats.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenFeats extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  DESC_LBL: GUILabel;
  STD_SELECTIONS_REMAINING_LBL: GUILabel;
  STD_REMAINING_SELECTIONS_LBL: GUILabel;
  LB_FEATS: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_NAME: GUILabel;
  BTN_RECOMMENDED: GUIButton;
  BTN_SELECT: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;

  creature: ModuleCreature;
  selectedFeat: any = null;
  chosenFeats: number[] = [];
  selectionsRemaining: number = 1;
  levelUpMode: boolean = false;
  levelUpAcceptCallback?: () => void;

  constructor(){
    super();
    this.gui_resref = 'ftchrgen';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_BACK?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.revertChosenFeats();
        this.close();
      });

      this.BTN_ACCEPT?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selectionsRemaining > 0) return;
        if(this.levelUpMode){
          this.levelUpAcceptCallback?.();
          this.levelUpAcceptCallback = undefined;
          this.levelUpMode = false;
          this.close();
          return;
        }
        this.manager.CharGenCustomPanel?.featCreationCompleted?.();
        this.close();
      });

      this.BTN_SELECT?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelectButton();
      });

      this.BTN_RECOMMENDED?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyRecommendedFeats();
      });

      resolve();
    });
  }

  show() {
    super.show();
    if(this.levelUpMode){
      this.creature = GameState.LevelUpManager?.creature || this.creature;
    }else if(!this.creature){
      this.creature = GameState.CharGenManager.selectedCreature;
    }
    this.chosenFeats = [];
    // InitiateFeats
    const grantedIds = this.collectAndAddGrantedFeats();
    if(this.levelUpMode && GameState.LevelUpManager?.draft){
      this.selectionsRemaining = GameState.LevelUpManager.draft.featPicksRemaining | 0;
    }else{
      const classData = this.creature?.getMainClass?.() || this.creature?.classes?.[0];
      const picks = classData ? getFeatPicksForLevel(classData as any, 1) : 0;
      this.selectionsRemaining = picks > 0 ? picks : 0;
    }
    this.LB_FEATS.setProtoBuilder(this.getFeatItemClass());
    this.buildFeatList();
    this.updateSelectionsLabel();

    const finishIfNoPicks = () => {
      // : if no picks remain, auto OnAcceptButton
      if(this.selectionsRemaining <= 0 && !this.levelUpMode){
        this.manager.CharGenCustomPanel?.featCreationCompleted?.();
        this.close();
      }
    };

    const showGrantedThenFinish = () => {
      if(grantedIds.length && !this.levelUpMode){
        void this.showGrantedFeats(grantedIds).then(finishIfNoPicks);
      }else{
        finishIfNoPicks();
      }
    };

    // OnPanelAdded:
    // if granted flag: ShowTutorialWindow(0x12); if shown, SetCallback(ShowGranted);
    // else AddPanel(skill_info_box) immediately.
    if(grantedIds.length && !this.levelUpMode){
      const tutorialShown = GameState.TutorialManager?.showWindow?.(0x12) === true;
      if(tutorialShown){
        const confirm = GameState.MenuManager.InGameConfirm;
        if(confirm){
          confirm.onOk = () => {
            showGrantedThenFinish();
          };
        }else{
          showGrantedThenFinish();
        }
      }else{
        showGrantedThenFinish();
      }
    }else{
      finishIfNoPicks();
    }
  }

  /** AddGrantedFeats + return newly granted feat ids for ShowGranted. */
  collectAndAddGrantedFeats(): number[] {
    const granted: number[] = [];
    if(!this.creature) return granted;
    const featCount = GameState.SWRuleSet.featCount;
    for (let i = 0; i < featCount; i++) {
      const feat = GameState.SWRuleSet.feats[i];
      if(!feat || feat.constant == '****') continue;
      const mainClass = this.creature.getMainClass();
      if(!mainClass || !mainClass.isFeatAvailable?.(feat)) continue;
      const status = mainClass.getFeatStatus(feat);
      if (status == 3 && this.creature.getTotalClassLevel() >= mainClass.getFeatGrantedLevel(feat)) {
        if (!this.creature.getHasFeat(i)) {
          this.creature.addFeat(TalentFeat.From2DA(feat));
          granted.push(i);
        }
      }
    }
    return granted;
  }

  /** ShowGranted — TLK 0xa512 (42258). */
  async showGrantedFeats(featIds: number[]): Promise<void> {
    await GameState.MenuManager.EnsureSkillInfoMenu?.();
    const skillInfo = GameState.MenuManager.MenuSkillInfo;
    if(!skillInfo?.openWithContent) return;
    const message =
      GameState.TLKManager.GetStringById?.(42258)?.Value
      ?? GameState.TLKManager.TLKStrings?.[42258]?.Value
      ?? 'You have been granted the following feats:';
    // SetSkillList(feats, 1) — skill-entry feat branch.
    const feats = featIds
      .map((id) => GameState.SWRuleSet.feats[id])
      .filter((f): f is NonNullable<typeof f> => !!f);
    await new Promise<void>((resolve) => {
      skillInfo.openWithContent(message, feats, () => resolve());
    });
  }

  protected getFeatItemClass() {
    return GUIFeatItem;
  }

  setCreature(creature: ModuleCreature){
    this.creature = creature;
  }

  selectFeat(feat: any) {
    this.selectedFeat = feat;
    const name = feat?.name != null
      ? (GameState.TLKManager.GetStringById?.(feat.name)?.Value
        ?? GameState.TLKManager.TLKStrings?.[feat.name]?.Value
        ?? '')
      : '';
    const desc = feat?.description != null
      ? (GameState.TLKManager.GetStringById?.(feat.description)?.Value
        ?? GameState.TLKManager.TLKStrings?.[feat.description]?.Value
        ?? '')
      : '';
    this.LBL_NAME?.setText(name);
    this.LB_DESC?.setItem?.(desc);
    this.updateSelectButtonState();
    this.refreshFeatSlotVisuals();
  }

  /**
   * DetermineFeat / BuildButtons:
   * chosen-this-session → 4 / button Remove;
   * owned → 1; available (CanChooseFeat) → 0; else locked → 3.
   */
  getFeatSlotStatus(feat: any): SkillFlowStatus {
    if(!feat || !this.creature) return SkillFlowStatus.Locked;
    const featId = this.getFeatId(feat);
    if(this.chosenFeats.indexOf(featId) >= 0) return SkillFlowStatus.Chosen;
    if(this.creature.getHasFeat(featId)) return SkillFlowStatus.Owned;
    if(this.canChooseFeat(feat)) return SkillFlowStatus.Available;
    return SkillFlowStatus.Locked;
  }

  /**
   * OnEnterFeat — enable Select for Available (Add Feat) and Chosen (Remove Feat).
   * TLK 0x9637 "Add" / 0x9638 "Remove" + 0xa5f7 "Feat".
   */
  updateSelectButtonState(){
    const btn = this.BTN_SELECT;
    if(!btn) return;
    const status = this.getFeatSlotStatus(this.selectedFeat);
    const enabled = status === SkillFlowStatus.Available || status === SkillFlowStatus.Chosen;
    // disableSelection removes the control from MenuGetActiveUIElements — use only when disabled.
    btn.disableSelection = !enabled;
    const verbRef = status === SkillFlowStatus.Chosen ? 0x9638 : 0x9637;
    const verb =
      GameState.TLKManager.GetStringById?.(verbRef)?.Value
      ?? GameState.TLKManager.TLKStrings?.[verbRef]?.Value
      ?? (status === SkillFlowStatus.Chosen ? 'Remove' : 'Add');
    const noun =
      GameState.TLKManager.GetStringById?.(0xa5f7)?.Value
      ?? GameState.TLKManager.TLKStrings?.[0xa5f7]?.Value
      ?? 'Feat';
    btn.setText?.(`${verb} ${noun}`);
    if(enabled){
      btn.setBorderColor?.(
        SKILL_FLOW_COLOR_YELLOW.r,
        SKILL_FLOW_COLOR_YELLOW.g,
        SKILL_FLOW_COLOR_YELLOW.b,
      );
      btn.setTextColor?.(COLOR_SELECT_ENABLED.r, COLOR_SELECT_ENABLED.g, COLOR_SELECT_ENABLED.b);
    }else{
      btn.setTextColor?.(0.5, 0.5, 0.5);
    }
  }

  refreshFeatSlotVisuals(){
    const children = this.LB_FEATS?.children;
    if(!children) return;
    for(let i = 0; i < children.length; i++){
      const row = children[i] as any;
      if(typeof row.refreshSlotVisuals === 'function'){
        row.refreshSlotVisuals();
      }
    }
  }

  private getFeatId(feat: any): number {
    return resolveFeatId(feat);
  }

  /**
   * OnFeatPicked — Add (status 0) or Remove (status 1) chosen feat.
   */
  onSelectButton() {
    if(!this.creature || !this.selectedFeat) return;
    const status = this.getFeatSlotStatus(this.selectedFeat);
    if(status === SkillFlowStatus.Chosen){
      this.removeChosenFeat(this.getFeatId(this.selectedFeat));
      return;
    }
    if(status === SkillFlowStatus.Available){
      this.addChosenFeat(this.getFeatId(this.selectedFeat));
    }
  }

  /** @deprecated use onSelectButton */
  pickSelectedFeat() {
    this.onSelectButton();
  }

  /**
   * AddChosenFeat — move feat into session picks, spend a selection.
   */
  addChosenFeat(featId: number) {
    if(!this.creature || this.selectionsRemaining <= 0) return;
    if(this.chosenFeats.indexOf(featId) >= 0) return;
    if(this.creature.getHasFeat(featId) && this.chosenFeats.indexOf(featId) < 0){
      // Permanently owned — not a session pick.
      return;
    }
    const feat = GameState.SWRuleSet.feats[featId];
    if(!feat || !this.canChooseFeat(feat)) return;
    this.creature.addFeat(new TalentFeat(featId));
    this.chosenFeats.push(featId);
    this.selectionsRemaining--;
    this.updateSelectionsLabel();
    this.buildFeatList();
    // Keep focus on the feat just added so Remove Feat is available.
    this.selectFeat(feat);
  }

  /**
   * RemoveChosenFeat — unpick session feat and cascade dependents.
   */
  removeChosenFeat(featId: number) {
    if(!this.creature) return;
    const idx = this.chosenFeats.indexOf(featId);
    if(idx < 0) return;

    const removeOne = (id: number) => {
      const cIdx = this.chosenFeats.indexOf(id);
      if(cIdx < 0) return;
      this.chosenFeats.splice(cIdx, 1);
      const fIdx = this.creature.feats?.findIndex((f: any) => f.id == id) ?? -1;
      if(fIdx >= 0) this.creature.feats.splice(fIdx, 1);
      this.selectionsRemaining++;
    };

    removeOne(featId);

    // Cascade: drop chosen feats whose prereqs are no longer met.
    let changed = true;
    while(changed){
      changed = false;
      for(let i = this.chosenFeats.length - 1; i >= 0; i--){
        const id = this.chosenFeats[i];
        const feat = GameState.SWRuleSet.feats[id];
        if(!feat) continue;
        const p1 = feat.prereqFeat1 ?? feat.prereqfeat1;
        const p2 = feat.prereqFeat2 ?? feat.prereqfeat2;
        const hasP1 = isUnsetFeatPrereq(p1) || this.hasFeatOrChosen(p1 | 0);
        const hasP2 = isUnsetFeatPrereq(p2) || this.hasFeatOrChosen(p2 | 0);
        if(!hasP1 || !hasP2){
          removeOne(id);
          changed = true;
        }
      }
    }

    this.updateSelectionsLabel();
    this.buildFeatList();
    const feat = GameState.SWRuleSet.feats[featId];
    if(feat) this.selectFeat(feat);
  }

  /** Owned on creature or picked this session (FeatAcquired +). */
  private hasFeatOrChosen(featId: number): boolean {
    if(this.chosenFeats.indexOf(featId) >= 0) return true;
    return !!this.creature?.getHasFeat(featId);
  }

  /**
   * HasFeatPrereq + class list gate before adding a pick.
   * Tier-3 feats stay locked until tier-2 (prereq) is owned or chosen this session.
   */
  canChooseFeat(feat: any): boolean {
    if(!this.creature || !feat) return false;
    const mainClass = this.creature.getMainClass?.() || this.creature.classes?.[0];
    if(!mainClass) return false;
    if(mainClass.isFeatAvailable && !mainClass.isFeatAvailable(feat)) return false;
    const status = mainClass.getFeatStatus?.(feat);
    if(status === 4 || status === false) return false;
    const featId = this.getFeatId(feat);
    if(this.hasFeatOrChosen(featId)) return false;
    if(this.selectionsRemaining <= 0) return false;
    const p1 = feat.prereqFeat1 ?? feat.prereqfeat1;
    const p2 = feat.prereqFeat2 ?? feat.prereqfeat2;
    if(!isUnsetFeatPrereq(p1) && !this.hasFeatOrChosen(p1 | 0)) return false;
    if(!isUnsetFeatPrereq(p2) && !this.hasFeatOrChosen(p2 | 0)) return false;
    return true;
  }

  applyRecommendedFeats() {
    if(!this.creature) return;
    const classData = this.creature.getMainClass?.() || this.creature.classes?.[0];
    if(!classData) return;

    this.revertChosenFeats();
    const before = new Set((this.creature.feats || []).map((f: any) => f.id));
    GameState.CharGenManager.applyDefaultPackageFeats(
      this.creature as any,
      classData,
      this.selectionsRemaining
    );
    for(const feat of this.creature.feats || []){
      if(!before.has(feat.id)){
        this.chosenFeats.push(feat.id);
      }
    }
    this.selectionsRemaining = 0;
    this.updateSelectionsLabel();
    this.buildFeatList();
  }

  revertChosenFeats() {
    if(!this.creature?.feats) return;
    for(const featId of this.chosenFeats){
      const idx = this.creature.feats.findIndex((f: any) => f.id == featId);
      if(idx >= 0){
        this.creature.feats.splice(idx, 1);
      }
    }
    this.chosenFeats = [];
    const classData = this.creature?.getMainClass?.() || this.creature?.classes?.[0];
    const picks = classData ? getFeatPicksForLevel(classData as any, 1) : 0;
    this.selectionsRemaining = this.levelUpMode && GameState.LevelUpManager?.draft
      ? (GameState.LevelUpManager.draft.featPicksRemaining | 0)
      : (picks > 0 ? picks : 0);
  }

  updateSelectionsLabel() {
    this.STD_REMAINING_SELECTIONS_LBL?.setText(String(this.selectionsRemaining));
    this.STD_SELECTIONS_REMAINING_LBL?.setText(String(this.selectionsRemaining));
  }

  /** @deprecated use collectAndAddGrantedFeats */
  addGrantedFeats() {
    this.collectAndAddGrantedFeats();
  }

  buildFeatList() {
    const feats = GameState.SWRuleSet.feats;
    const featCount = GameState.SWRuleSet.featCount;
    const list = [];
    if(this.creature){
      const mainClass = this.creature.getMainClass();
      if(mainClass){
        for (let i = 0; i < featCount; i++) {
          const feat = feats[i];
          if (!feat || feat.constant == '****') continue;
          if (!mainClass.isFeatAvailable(feat)) continue;
          const status = mainClass.getFeatStatus(feat);
          if (this.creature.getHasFeat(i) || status == 0 || status == 1) {
            list.push(feat);
          }
        }
      }
    }

    const isUnsetPrereq = (id: any) => {
      if(id == null || id === '****') return true;
      const n = id | 0;
      return n < 0 || n === 0xFFFFFFFF || !feats[n];
    };
    const groups = [];
    for (let i = 0; i < list.length; i++) {
      const feat = list[i];
      // CreateFeatChart: only root feats (no prereq) start a group.
      if (!isUnsetPrereq(feat.prereqFeat1) || !isUnsetPrereq(feat.prereqFeat2)) continue;

      const group = [];
      group.push(feat);
      const rootId = this.getFeatId(feat);
      for (let j = 0; j < featCount; j++) {
        const chainFeat = feats[j];
        if (!chainFeat || chainFeat.constant == '****') continue;
        if (chainFeat.prereqFeat1 != rootId && chainFeat.prereqFeat2 != rootId) continue;
        if (!isUnsetPrereq(chainFeat.prereqFeat1) && !isUnsetPrereq(chainFeat.prereqFeat2)) {
          group[2] = chainFeat;
        } else {
          group[1] = chainFeat;
        }
      }
      if (group.length) {
        groups.push(group);
      }
    }
    groups.sort((groupa, groupb) => {
      const a = groupa[0]?.toolsCategories ?? 0;
      const b = groupb[0]?.toolsCategories ?? 0;
      return a > b ? 1 : -1;
    });
    this.LB_FEATS.setItems(groups);
    // Keep selection chrome after rebuild (e.g. after picking a prereq feat).
    if(this.selectedFeat){
      this.refreshFeatSlotVisuals();
      this.updateSelectButtonState();
    }else{
      const first = groups[0]?.[0];
      if(first) this.selectFeat(first);
    }
  }
  
}
