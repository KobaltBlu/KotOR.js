/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The CharGenFeats menu class.
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

  constructor(){
    super();
    this.gui_resref = 'ftchrgen';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  this.addGrantedFeats();
  this.LB_FEATS.GUIProtoItemClass = GUIFeatItem;
  this.LB_FEATS.clearItems();
  this.buildFeatList();
  TextureLoader.LoadQueue();
}

addGrantedFeats() {
  let feats = Global.kotor2DA.feat.rows;
  let featCount = Global.kotor2DA.feat.RowCount;
  let granted = [];
  for (let i = 0; i < featCount; i++) {
    let feat = feats[i];
    let character = GameState.getCurrentPlayer();
    let mainClass = character.getMainClass();
    if (feat.constant != '****') {
      if (mainClass.isFeatAvailable(feat)) {
        let status = mainClass.getFeatStatus(feat);
        if (status == 3 && character.getTotalClassLevel() >= mainClass.getFeatGrantedLevel(feat)) {
          if (!character.getHasFeat(feat.__index)) {
            console.log('Feat Granted', feat);
            character.addFeat(TalentFeat.From2DA(feat));
            granted.push(feat);
          }
        }
      }
    }
  }
}

buildFeatList() {
  let feats = Global.kotor2DA.feat.rows;
  let featCount = Global.kotor2DA.feat.RowCount;
  let list = [];
  let character = GameState.getCurrentPlayer();
  let mainClass = character.getMainClass();
  for (let i = 0; i < featCount; i++) {
    let feat = feats[i];
    if (feat.constant != '****') {
      if (mainClass.isFeatAvailable(feat)) {
        let status = mainClass.getFeatStatus(feat);
        if (character.getHasFeat(feat.__index) || status == 0 || status == 1) {
          list.push(feat);
        }
      }
    }
  }
  let groups = [];
  for (let i = 0; i < list.length; i++) {
    let feat = list[i];
    let group = [];
    let prereqfeat1 = Global.kotor2DA.feat.rows[feat.prereqfeat1];
    let prereqfeat2 = Global.kotor2DA.feat.rows[feat.prereqfeat2];
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
