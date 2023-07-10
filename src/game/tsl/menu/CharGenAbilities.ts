/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { CharGenAbilities as K1_CharGenAbilities } from "../../kotor/KOTOR";
import { CharGenManager } from "../../../managers";
import { CharGenAttribute } from "../../../enums/chargen/CharGenAttribute";

/* @file
* The CharGenAbilities menu class.
*/

export class CharGenAbilities extends K1_CharGenAbilities {

  declare LBL_BONUS_CHA: GUILabel;
  declare LBL_BONUS_WIS: GUILabel;
  declare LBL_BONUS_INT: GUILabel;
  declare LBL_BONUS_CON: GUILabel;
  declare LBL_BONUS_DEX: GUILabel;
  declare LBL_BONUS_STR: GUILabel;
  declare COST_LBL: GUILabel;
  declare SELECTIONS_REMAINING_LBL: GUILabel;
  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare DEX_POINTS_BTN: GUIButton;
  declare DEX_LBL: GUILabel;
  declare DEX_MINUS_BTN: GUIButton;
  declare DEX_PLUS_BTN: GUIButton;
  declare CON_POINTS_BTN: GUIButton;
  declare CON_LBL: GUILabel;
  declare CON_MINUS_BTN: GUIButton;
  declare CON_PLUS_BTN: GUIButton;
  declare WIS_POINTS_BTN: GUIButton;
  declare WIS_LBL: GUILabel;
  declare WIS_MINUS_BTN: GUIButton;
  declare WIS_PLUS_BTN: GUIButton;
  declare INT_POINTS_BTN: GUIButton;
  declare INT_LBL: GUILabel;
  declare INT_MINUS_BTN: GUIButton;
  declare INT_PLUS_BTN: GUIButton;
  declare CHA_POINTS_BTN: GUIButton;
  declare CHA_LBL: GUILabel;
  declare CHA_MINUS_BTN: GUIButton;
  declare CHA_PLUS_BTN: GUIButton;
  declare LB_DESC: GUIListBox;
  declare STR_POINTS_BTN: GUIButton;
  declare STR_LBL: GUILabel;
  declare STR_MINUS_BTN: GUIButton;
  declare STR_PLUS_BTN: GUIButton;
  declare REMAINING_SELECTIONS_LBL: GUILabel;
  declare COST_POINTS_LBL: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_ACCEPT: GUIButton;
  declare BTN_RECOMMENDED: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'abchrgen_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

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
  
}
