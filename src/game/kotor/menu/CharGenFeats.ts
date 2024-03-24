import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { GUIFeatItem } from "../gui/GUIFeatItem";
import type { ModuleCreature } from "../../../module";
import { TextureLoader } from "../../../loaders";
import { TalentFeat } from "../../../talents";
import { GameState } from "../../../GameState";

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

  constructor(){
    super();
    this.gui_resref = 'ftchrgen';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  show() {
    super.show();
    this.addGrantedFeats();
    this.LB_FEATS.GUIProtoItemClass = GUIFeatItem;
    this.LB_FEATS.clearItems();
    this.buildFeatList();
    TextureLoader.LoadQueue();
  }

  setCreature(creature: ModuleCreature){
    this.creature = creature;
  }

  addGrantedFeats() {
    let feats = GameState.TwoDAManager.datatables.get('feat').rows;
    let featCount = GameState.TwoDAManager.datatables.get('feat').RowCount;
    let granted = [];
    for (let i = 0; i < featCount; i++) {
      let feat = feats[i];
      if(this.creature){
        let mainClass = this.creature.getMainClass();
        if (mainClass && feat.constant != '****') {
          if (mainClass.isFeatAvailable(feat)) {
            let status = mainClass.getFeatStatus(feat);
            if (status == 3 && this.creature.getTotalClassLevel() >= mainClass.getFeatGrantedLevel(feat)) {
              if (!this.creature.getHasFeat(feat.__index)) {
                console.log('Feat Granted', feat);
                this.creature.addFeat(TalentFeat.From2DA(feat));
                granted.push(feat);
              }
            }
          }
        }
      }
    }
  }

  buildFeatList() {
    let feats = GameState.TwoDAManager.datatables.get('feat').rows;
    let featCount = GameState.TwoDAManager.datatables.get('feat').RowCount;
    let list = [];
    if(this.creature){
      let mainClass = this.creature.getMainClass();
      if(mainClass){
        for (let i = 0; i < featCount; i++) {
          let feat = feats[i];
          if (feat.constant != '****') {
            if (mainClass.isFeatAvailable(feat)) {
              let status = mainClass.getFeatStatus(feat);
              if (this.creature.getHasFeat(feat.__index) || status == 0 || status == 1) {
                list.push(feat);
              }
            }
          }
        }
      }
    }
    let groups = [];
    for (let i = 0; i < list.length; i++) {
      let feat = list[i];
      let group = [];
      let prereqfeat1 = GameState.TwoDAManager.datatables.get('feat').rows[feat.prereqfeat1];
      let prereqfeat2 = GameState.TwoDAManager.datatables.get('feat').rows[feat.prereqfeat2];
      if (!prereqfeat1 && !prereqfeat2) {
        group.push(feat);
        for (let j = 0; j < featCount; j++) {
          let chainFeat = feats[j];
          if (chainFeat.prereqfeat1 == feat.__index || chainFeat.prereqfeat2 == feat.__index) {
            if (chainFeat.prereqfeat1 != '****' && chainFeat.prereqfeat2 != '****') {
              group[2] = chainFeat;
            } else {
              group[1] = chainFeat;
            }
          }
        }
        this.LB_FEATS.addItem(group);
      }
      groups.push(group);
    }
    groups.sort((groupa, groupb) => groupa[0].toolscategories > groupb[0].toolscategories ? 1 : -1);
    console.log(groups);
  }
  
}
