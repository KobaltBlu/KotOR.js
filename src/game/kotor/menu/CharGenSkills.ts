/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, GUIListBox } from "../../../gui";

/* @file
* The CharGenSkills menu class.
*/

export class CharGenSkills extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  COMPUTER_USE_POINTS_BTN: GUIButton;
  COMPUTER_USE_LBL: GUILabel;
  COM_MINUS_BTN: GUIButton;
  COM_PLUS_BTN: GUIButton;
  DEMOLITIONS_POINTS_BTN: GUIButton;
  DEM_MINUS_BTN: GUIButton;
  DEMOLITIONS_LBL: GUILabel;
  DEM_PLUS_BTN: GUIButton;
  STEALTH_POINTS_BTN: GUIButton;
  STEALTH_LBL: GUILabel;
  STE_MINUS_BTN: GUIButton;
  STE_PLUS_BTN: GUIButton;
  AWARENESS_POINTS_BTN: GUIButton;
  AWARENESS_LBL: GUILabel;
  AWA_MINUS_BTN: GUIButton;
  AWA_PLUS_BTN: GUIButton;
  PERSUADE_POINTS_BTN: GUIButton;
  PER_PLUS_BTN: GUIButton;
  PERSUADE_LBL: GUILabel;
  PER_MINUS_BTN: GUIButton;
  REPAIR_POINTS_BTN: GUIButton;
  REPAIR_LBL: GUILabel;
  REP_MINUS_BTN: GUIButton;
  REP_PLUS_BTN: GUIButton;
  DESC_LBL: GUILabel;
  COST_LBL: GUILabel;
  COST_POINTS_LBL: GUILabel;
  SECURITY_POINTS_BTN: GUIButton;
  SEC_PLUS_BTN: GUIButton;
  SEC_MINUS_BTN: GUIButton;
  SECURITY_LBL: GUILabel;
  TREAT_INJURY_POINTS_BTN: GUIButton;
  TRE_MINUS_BTN: GUIButton;
  TREAT_INJURY_LBL: GUILabel;
  LB_DESC: GUIListBox;
  CLASSSKL_LBL: GUILabel;
  BTN_RECOMMENDED: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;
  TRE_PLUS_BTN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'skchrgen';
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
  this.updateButtonStates();
}

updateButtonStates() {
  this.COMPUTER_USE_POINTS_BTN.setText(this.computerUse);
  this.DEMOLITIONS_POINTS_BTN.setText(this.demolitions);
  this.STEALTH_POINTS_BTN.setText(this.stealth);
  this.AWARENESS_POINTS_BTN.setText(this.awareness);
  this.PERSUADE_POINTS_BTN.setText(this.persuade);
  this.REPAIR_POINTS_BTN.setText(this.repair);
  this.SECURITY_POINTS_BTN.setText(this.security);
  this.TREAT_INJURY_POINTS_BTN.setText(this.treatInjury);
  this.REMAINING_SELECTIONS_LBL.setText(this.availPoints);
}

reset() {
  this.availPoints = this.getMaxSkillPoints();
  this.resetPoints();
}

resetPoints() {
  for (let i = 0; i < 8; i++) {
    GameState.getCurrentPlayer().skills[i].rank = 0;
  }
  this.computerUse = GameState.getCurrentPlayer().skills[0].rank;
  this.demolitions = GameState.getCurrentPlayer().skills[1].rank;
  this.stealth = GameState.getCurrentPlayer().skills[2].rank;
  this.awareness = GameState.getCurrentPlayer().skills[3].rank;
  this.persuade = GameState.getCurrentPlayer().skills[4].rank;
  this.repair = GameState.getCurrentPlayer().skills[5].rank;
  this.security = GameState.getCurrentPlayer().skills[6].rank;
  this.treatInjury = GameState.getCurrentPlayer().skills[7].rank;
}

getMaxSkillPoints() {
  return 10 + parseInt(GameState.player.classes[0].skillpointbase);
}

getSkillTableColumn() {
  return GameState.player.classes[0].skillstable.toLowerCase() + '_class';
}

getSkillTableColumnRecommended() {
  return GameState.player.classes[0].skillstable.toLowerCase() + '_reco';
}

getRecommendedOrder() {
  let skillOrder = {
    '0': -1,
    '1': -1,
    '2': -1,
    '3': -1,
    '4': -1,
    '5': -1,
    '6': -1,
    '7': -1
  };
  for (let i = 0; i < 8; i++) {
    let value = Global.kotor2DA.skills.rows[i][this.getSkillTableColumnRecommended()];
    if (value != '****') {
      skillOrder[value - 1] = i;
    }
  }
  return skillOrder;
}
  
}
