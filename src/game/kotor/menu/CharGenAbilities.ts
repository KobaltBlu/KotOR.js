/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton, GUIListBox, MenuManager } from "../../../gui";
import { CharGenManager } from "../../../managers/CharGenManager";
import { ModuleCreature } from "../../../module";

/* @file
* The CharGenAbilities menu class.
*/

enum ATTRIBUTE {
  STR = 0,
  DEX = 1,
  CON = 2,
  WIS = 3,
  INT = 4,
  CHA = 5,
}

export class CharGenAbilities extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  DEX_POINTS_BTN: GUIButton;
  DEX_LBL: GUILabel;
  DEX_MINUS_BTN: GUIButton;
  DEX_PLUS_BTN: GUIButton;
  CON_POINTS_BTN: GUIButton;
  CON_PLUS_BTN: GUIButton;
  CON_MINUS_BTN: GUIButton;
  CON_LBL: GUILabel;
  WIS_POINTS_BTN: GUIButton;
  WIS_LBL: GUILabel;
  WIS_MINUS_BTN: GUIButton;
  WIS_PLUS_BTN: GUIButton;
  INT_POINTS_BTN: GUIButton;
  INT_PLUS_BTN: GUIButton;
  INT_MINUS_BTN: GUIButton;
  INT_LBL: GUILabel;
  CHA_POINTS_BTN: GUIButton;
  CHA_PLUS_BTN: GUIButton;
  CHA_MINUS_BTN: GUIButton;
  CHA_LBL: GUILabel;
  DESC_LBL: GUILabel;
  COST_LBL: GUILabel;
  COST_POINTS_LBL: GUILabel;
  LBL_MODIFIER: GUILabel;
  LBL_ABILITY_MOD: GUILabel;
  LB_DESC: GUIListBox;
  STR_POINTS_BTN: GUIButton;
  STR_LBL: GUILabel;
  STR_MINUS_BTN: GUIButton;
  STR_PLUS_BTN: GUIButton;
  BTN_RECOMMENDED: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'abchrgen';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      //this.lbl_hint = this.getControlByName('LBL_HINT');

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();

        let character = GameState.getCurrentPlayer();
        if(character instanceof ModuleCreature){
          character.str = CharGenManager.str;
          character.dex = CharGenManager.dex;
          character.con = CharGenManager.con;
          character.wis = CharGenManager.wis;
          character.int = CharGenManager.int;
          character.cha = CharGenManager.cha;
        }

        MenuManager.CharGenMain.updateAttributes();

        this.Close();
      });

      this.BTN_RECOMMENDED.addEventListener('click', (e: any) => {
        CharGenManager.availPoints = 0;
        CharGenManager.str = parseInt(GameState.getCurrentPlayer().classes[0].str);
        CharGenManager.dex = parseInt(GameState.getCurrentPlayer().classes[0].dex);
        CharGenManager.con = parseInt(GameState.getCurrentPlayer().classes[0].con);
        CharGenManager.wis = parseInt(GameState.getCurrentPlayer().classes[0].wis);
        CharGenManager.int = parseInt(GameState.getCurrentPlayer().classes[0].int);
        CharGenManager.cha = parseInt(GameState.getCurrentPlayer().classes[0].cha);

        this.updateButtonStates();
      });

      //MINUS Buttons
      this.STR_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(CharGenManager.str > GameState.getCurrentPlayer().str && CharGenManager.str > 8){
          let cost = this.getAttributeCost(ATTRIBUTE.STR);
          CharGenManager.str -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.DEX_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(CharGenManager.dex > GameState.getCurrentPlayer().dex && CharGenManager.dex > 8){
          let cost = this.getAttributeCost(ATTRIBUTE.DEX);
          CharGenManager.dex -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });
      
      this.CON_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(CharGenManager.con > GameState.getCurrentPlayer().con && CharGenManager.con > 8){
          let cost = this.getAttributeCost(ATTRIBUTE.CON);
          CharGenManager.con -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.WIS_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(CharGenManager.wis > GameState.getCurrentPlayer().wis && CharGenManager.wis > 8){
          let cost = this.getAttributeCost(ATTRIBUTE.WIS);
          CharGenManager.wis -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.INT_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(CharGenManager.int > GameState.getCurrentPlayer().int && CharGenManager.int > 8){
          let cost = this.getAttributeCost(ATTRIBUTE.INT);
          CharGenManager.int -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.CHA_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(CharGenManager.cha > GameState.getCurrentPlayer().cha && CharGenManager.cha > 8){
          let cost = this.getAttributeCost(ATTRIBUTE.CHA);
          CharGenManager.cha -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });
      
      //PLUS Buttons
      this.STR_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.getAttributeCost(ATTRIBUTE.STR) <= CharGenManager.availPoints){
          CharGenManager.str += 1;
          let cost = this.getAttributeCost(ATTRIBUTE.STR);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.DEX_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.getAttributeCost(ATTRIBUTE.DEX) <= CharGenManager.availPoints){
          CharGenManager.dex += 1;
          let cost = this.getAttributeCost(ATTRIBUTE.DEX);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.CON_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.getAttributeCost(ATTRIBUTE.CON) <= CharGenManager.availPoints){
          CharGenManager.con += 1;
          let cost = this.getAttributeCost(ATTRIBUTE.CON);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.WIS_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.getAttributeCost(ATTRIBUTE.WIS) <= CharGenManager.availPoints){
          CharGenManager.wis += 1;
          let cost = this.getAttributeCost(ATTRIBUTE.WIS);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.INT_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.getAttributeCost(ATTRIBUTE.INT) <= CharGenManager.availPoints){
          CharGenManager.int += 1;
          let cost = this.getAttributeCost(ATTRIBUTE.INT);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.CHA_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.getAttributeCost(ATTRIBUTE.CHA) <= CharGenManager.availPoints){
          CharGenManager.cha += 1;
          let cost = this.getAttributeCost(ATTRIBUTE.CHA);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      resolve();
    });
  }

  Show(){
    super.Show();
    this.updateButtonStates();
  }

  updateButtonStates(){
    this.STR_POINTS_BTN.setText(CharGenManager.str);
    this.DEX_POINTS_BTN.setText(CharGenManager.dex);
    this.CON_POINTS_BTN.setText(CharGenManager.con);
    this.WIS_POINTS_BTN.setText(CharGenManager.wis);
    this.INT_POINTS_BTN.setText(CharGenManager.int);
    this.CHA_POINTS_BTN.setText(CharGenManager.cha);

    //Selected Attribute Cost
    //this.COST_POINTS_LBL

    //Selected Attribute Modifier
    //this.LBL_ABILITY_MOD

    this.STR_MINUS_BTN.show();
    this.DEX_MINUS_BTN.show();
    this.CON_MINUS_BTN.show();
    this.WIS_MINUS_BTN.show();
    this.INT_MINUS_BTN.show();
    this.CHA_MINUS_BTN.show();

    this.STR_PLUS_BTN.show();
    this.DEX_PLUS_BTN.show();
    this.CON_PLUS_BTN.show();
    this.WIS_PLUS_BTN.show();
    this.INT_PLUS_BTN.show();
    this.CHA_PLUS_BTN.show();

    if(CharGenManager.str <= 8 || GameState.getCurrentPlayer().str == CharGenManager.str)
      this.STR_MINUS_BTN.hide();

    if(CharGenManager.dex <= 8 || GameState.getCurrentPlayer().dex == CharGenManager.dex)
      this.DEX_MINUS_BTN.hide();

    if(CharGenManager.con <= 8 || GameState.getCurrentPlayer().con == CharGenManager.con)
      this.CON_MINUS_BTN.hide();

    if(CharGenManager.wis <= 8 || GameState.getCurrentPlayer().wis == CharGenManager.wis)
      this.WIS_MINUS_BTN.hide();

    if(CharGenManager.int <= 8 || GameState.getCurrentPlayer().int == CharGenManager.int)
      this.INT_MINUS_BTN.hide();

    if(CharGenManager.cha <= 8 || GameState.getCurrentPlayer().cha == CharGenManager.cha)
      this.CHA_MINUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.STR) > CharGenManager.availPoints)
      this.STR_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.DEX) > CharGenManager.availPoints)
      this.DEX_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.CON) > CharGenManager.availPoints)
      this.CON_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.WIS) > CharGenManager.availPoints)
      this.WIS_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.INT) > CharGenManager.availPoints)
      this.INT_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.CHA) > CharGenManager.availPoints)
      this.CHA_PLUS_BTN.hide();

    this.REMAINING_SELECTIONS_LBL.setText(CharGenManager.availPoints);
  }

  getAttributeCost(index = 0){
    let mod = 0;
    switch(index){
      case ATTRIBUTE.STR:
        mod = Math.floor((CharGenManager.str - 10)/2);
      break;
      case ATTRIBUTE.DEX:
        mod = Math.floor((CharGenManager.dex - 10)/2);
      break;
      case ATTRIBUTE.CON:
        mod = Math.floor((CharGenManager.con - 10)/2);
      break;
      case ATTRIBUTE.WIS:
        mod = Math.floor((CharGenManager.wis - 10)/2);
      break;
      case ATTRIBUTE.INT:
        mod = Math.floor((CharGenManager.int - 10)/2);
      break;
      case ATTRIBUTE.CHA:
        mod = Math.floor((CharGenManager.cha - 10)/2);
      break;
    }
    return Math.max(1, mod);
  }

  reset(){
    CharGenManager.availPoints = 30;
    GameState.getCurrentPlayer().str = 8;
    GameState.getCurrentPlayer().dex = 8;
    GameState.getCurrentPlayer().con = 8;
    GameState.getCurrentPlayer().wis = 8;
    GameState.getCurrentPlayer().int = 8;
    GameState.getCurrentPlayer().cha = 8;
  }
  
}
