/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { CharGenAttribute } from "../../../enums/chargen/CharGenAttribute";
import { GameMenu, GUILabel, GUIButton, GUIListBox } from "../../../gui";
import { CharGenManager } from "../../../managers";
import type { ModuleCreature } from "../../../module";

/* @file
* The CharGenAbilities menu class.
*/

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

  creature: ModuleCreature;

  constructor(){
    super();
    this.gui_resref = 'abchrgen';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      //this.lbl_hint = this.getControlByName('LBL_HINT');

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();

        if(this.creature){
          this.creature.str = CharGenManager.str;
          this.creature.dex = CharGenManager.dex;
          this.creature.con = CharGenManager.con;
          this.creature.wis = CharGenManager.wis;
          this.creature.int = CharGenManager.int;
          this.creature.cha = CharGenManager.cha;
        }

        this.manager.CharGenMain.updateAttributes();

        this.close();
      });

      this.BTN_RECOMMENDED.addEventListener('click', (e: any) => {
        CharGenManager.availPoints = 0;
        if(this.creature){
          CharGenManager.str = parseInt(this.creature.classes[0].str);
          CharGenManager.dex = parseInt(this.creature.classes[0].dex);
          CharGenManager.con = parseInt(this.creature.classes[0].con);
          CharGenManager.wis = parseInt(this.creature.classes[0].wis);
          CharGenManager.int = parseInt(this.creature.classes[0].int);
          CharGenManager.cha = parseInt(this.creature.classes[0].cha);
        }

        this.updateButtonStates();
      });

      //MINUS Buttons
      this.STR_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();

        if(this.creature && CharGenManager.str > this.creature.str && CharGenManager.str > 8){
          let cost = this.getAttributeCost(CharGenAttribute.STR);
          CharGenManager.str -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.DEX_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && CharGenManager.dex > this.creature.dex && CharGenManager.dex > 8){
          let cost = this.getAttributeCost(CharGenAttribute.DEX);
          CharGenManager.dex -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });
      
      this.CON_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && CharGenManager.con > this.creature.con && CharGenManager.con > 8){
          let cost = this.getAttributeCost(CharGenAttribute.CON);
          CharGenManager.con -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.WIS_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && CharGenManager.wis > this.creature.wis && CharGenManager.wis > 8){
          let cost = this.getAttributeCost(CharGenAttribute.WIS);
          CharGenManager.wis -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.INT_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && CharGenManager.int > this.creature.int && CharGenManager.int > 8){
          let cost = this.getAttributeCost(CharGenAttribute.INT);
          CharGenManager.int -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.CHA_MINUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && CharGenManager.cha > this.creature.cha && CharGenManager.cha > 8){
          let cost = this.getAttributeCost(CharGenAttribute.CHA);
          CharGenManager.cha -= 1;
          CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });
      
      //PLUS Buttons
      this.STR_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.STR) <= CharGenManager.availPoints){
          CharGenManager.str += 1;
          let cost = this.getAttributeCost(CharGenAttribute.STR);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.DEX_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.DEX) <= CharGenManager.availPoints){
          CharGenManager.dex += 1;
          let cost = this.getAttributeCost(CharGenAttribute.DEX);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.CON_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.CON) <= CharGenManager.availPoints){
          CharGenManager.con += 1;
          let cost = this.getAttributeCost(CharGenAttribute.CON);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.WIS_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.WIS) <= CharGenManager.availPoints){
          CharGenManager.wis += 1;
          let cost = this.getAttributeCost(CharGenAttribute.WIS);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.INT_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.INT) <= CharGenManager.availPoints){
          CharGenManager.int += 1;
          let cost = this.getAttributeCost(CharGenAttribute.INT);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.CHA_PLUS_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.CHA) <= CharGenManager.availPoints){
          CharGenManager.cha += 1;
          let cost = this.getAttributeCost(CharGenAttribute.CHA);
          CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      resolve();
    });
  }

  show(){
    super.show();
    this.updateButtonStates();
  }

  setCreature(creature: ModuleCreature){
    this.creature = creature;
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

    if(CharGenManager.str <= 8 || this.creature.str == CharGenManager.str)
      this.STR_MINUS_BTN.hide();

    if(CharGenManager.dex <= 8 || this.creature.dex == CharGenManager.dex)
      this.DEX_MINUS_BTN.hide();

    if(CharGenManager.con <= 8 || this.creature.con == CharGenManager.con)
      this.CON_MINUS_BTN.hide();

    if(CharGenManager.wis <= 8 || this.creature.wis == CharGenManager.wis)
      this.WIS_MINUS_BTN.hide();

    if(CharGenManager.int <= 8 || this.creature.int == CharGenManager.int)
      this.INT_MINUS_BTN.hide();

    if(CharGenManager.cha <= 8 || this.creature.cha == CharGenManager.cha)
      this.CHA_MINUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.STR) > CharGenManager.availPoints)
      this.STR_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.DEX) > CharGenManager.availPoints)
      this.DEX_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.CON) > CharGenManager.availPoints)
      this.CON_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.WIS) > CharGenManager.availPoints)
      this.WIS_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.INT) > CharGenManager.availPoints)
      this.INT_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.CHA) > CharGenManager.availPoints)
      this.CHA_PLUS_BTN.hide();

    this.REMAINING_SELECTIONS_LBL.setText(CharGenManager.availPoints);
  }

  getAttributeCost(index = 0){
    let mod = 0;
    switch(index){
      case CharGenAttribute.STR:
        mod = Math.floor((CharGenManager.str - 10)/2);
      break;
      case CharGenAttribute.DEX:
        mod = Math.floor((CharGenManager.dex - 10)/2);
      break;
      case CharGenAttribute.CON:
        mod = Math.floor((CharGenManager.con - 10)/2);
      break;
      case CharGenAttribute.WIS:
        mod = Math.floor((CharGenManager.wis - 10)/2);
      break;
      case CharGenAttribute.INT:
        mod = Math.floor((CharGenManager.int - 10)/2);
      break;
      case CharGenAttribute.CHA:
        mod = Math.floor((CharGenManager.cha - 10)/2);
      break;
    }
    return Math.max(1, mod);
  }

  reset(){
    CharGenManager.availPoints = 30;
    if(this.creature){
      this.creature.str = 8;
      this.creature.dex = 8;
      this.creature.con = 8;
      this.creature.wis = 8;
      this.creature.int = 8;
      this.creature.cha = 8;
    }
  }
  
}
