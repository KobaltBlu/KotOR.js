import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GUIFeatItem } from "@/game/kotor/gui/GUIFeatItem";
import type { ModuleCreature } from "@/module";
import { TalentFeat } from "@/talents";
import { GameState } from "@/GameState";
import { getFeatPicksForLevel } from "@/engine/rules/level-up";

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
        this.pickSelectedFeat();
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
    if(this.levelUpMode && GameState.LevelUpManager?.draft){
      this.selectionsRemaining = GameState.LevelUpManager.draft.featPicksRemaining | 0;
    }else{
      const classData = this.creature?.getMainClass?.() || this.creature?.classes?.[0];
      const picks = classData ? getFeatPicksForLevel(classData as any, 1) : 1;
      this.selectionsRemaining = picks > 0 ? picks : 1;
    }
    this.addGrantedFeats();
    this.LB_FEATS.setProtoBuilder(this.getFeatItemClass());
    this.buildFeatList();
    this.updateSelectionsLabel();
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
  }

  private getFeatId(feat: any): number {
    return typeof feat?.id === 'number' ? feat.id : (feat?.__index | 0);
  }

  pickSelectedFeat() {
    if(!this.creature || !this.selectedFeat || this.selectionsRemaining <= 0) return;
    const featId = this.getFeatId(this.selectedFeat);
    if(this.creature.getHasFeat(featId)) return;
    if(!this.canChooseFeat(this.selectedFeat)) return;
    this.creature.addFeat(new TalentFeat(featId));
    this.chosenFeats.push(featId);
    this.selectionsRemaining--;
    this.updateSelectionsLabel();
    this.buildFeatList();
  }

  /** Prereq + class list gate before adding a pick. */
  canChooseFeat(feat: any): boolean {
    if(!this.creature || !feat) return false;
    const mainClass = this.creature.getMainClass?.() || this.creature.classes?.[0];
    if(!mainClass) return false;
    if(mainClass.isFeatAvailable && !mainClass.isFeatAvailable(feat)) return false;
    const status = mainClass.getFeatStatus?.(feat);
    if(status === 4 || status === false) return false;
    const p1 = feat.prereqFeat1 | 0;
    const p2 = feat.prereqFeat2 | 0;
    if(p1 >= 0 && p1 !== 0xFFFFFFFF && p1 !== -1 && !this.creature.getHasFeat(p1)) return false;
    if(p2 >= 0 && p2 !== 0xFFFFFFFF && p2 !== -1 && !this.creature.getHasFeat(p2)) return false;
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
    const picks = classData ? getFeatPicksForLevel(classData as any, 1) : 1;
    this.selectionsRemaining = this.levelUpMode && GameState.LevelUpManager?.draft
      ? (GameState.LevelUpManager.draft.featPicksRemaining | 0)
      : (picks > 0 ? picks : 1);
  }

  updateSelectionsLabel() {
    this.STD_REMAINING_SELECTIONS_LBL?.setText(String(this.selectionsRemaining));
    this.STD_SELECTIONS_REMAINING_LBL?.setText(String(this.selectionsRemaining));
  }

  addGrantedFeats() {
    const featCount = GameState.SWRuleSet.featCount;
    for (let i = 0; i < featCount; i++) {
      const feat = GameState.SWRuleSet.feats[i];
      if(this.creature){
        const mainClass = this.creature.getMainClass();
        if (mainClass && feat.constant != '****') {
          if (mainClass.isFeatAvailable(feat)) {
            const status = mainClass.getFeatStatus(feat);
            if (status == 3 && this.creature.getTotalClassLevel() >= mainClass.getFeatGrantedLevel(feat)) {
              if (!this.creature.getHasFeat(i)) {
                this.creature.addFeat(TalentFeat.From2DA(feat));
              }
            }
          }
        }
      }
    }
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
      // Retail CreateFeatChart: only root feats (no prereq) start a group.
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
  }
  
}
