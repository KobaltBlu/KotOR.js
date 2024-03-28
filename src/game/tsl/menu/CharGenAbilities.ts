import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { CharGenAbilities as K1_CharGenAbilities } from "../../kotor/KOTOR";
import { CharGenAttribute } from "../../../enums/chargen/CharGenAttribute";
import { GameState } from "../../../GameState";

/**
 * CharGenAbilities class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenAbilities.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();

        if(this.creature){
          this.creature.str = GameState.CharGenManager.str;
          this.creature.dex = GameState.CharGenManager.dex;
          this.creature.con = GameState.CharGenManager.con;
          this.creature.wis = GameState.CharGenManager.wis;
          this.creature.int = GameState.CharGenManager.int;
          this.creature.cha = GameState.CharGenManager.cha;
        }

        this.manager.CharGenMain.updateAttributes();

        this.close();
      });

      this.BTN_RECOMMENDED.addEventListener('click', (e) => {
        GameState.CharGenManager.availPoints = 0;
        if(this.creature){
          GameState.CharGenManager.str = parseInt(this.creature.classes[0].str as any);
          GameState.CharGenManager.dex = parseInt(this.creature.classes[0].dex as any);
          GameState.CharGenManager.con = parseInt(this.creature.classes[0].con as any);
          GameState.CharGenManager.wis = parseInt(this.creature.classes[0].wis as any);
          GameState.CharGenManager.int = parseInt(this.creature.classes[0].int as any);
          GameState.CharGenManager.cha = parseInt(this.creature.classes[0].cha as any);
        }

        this.updateButtonStates();
      });

      //MINUS Buttons
      this.STR_MINUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();

        if(this.creature && GameState.CharGenManager.str > this.creature.str && GameState.CharGenManager.str > 8){
          let cost = this.getAttributeCost(CharGenAttribute.STR);
          GameState.CharGenManager.str -= 1;
          GameState.CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.DEX_MINUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && GameState.CharGenManager.dex > this.creature.dex && GameState.CharGenManager.dex > 8){
          let cost = this.getAttributeCost(CharGenAttribute.DEX);
          GameState.CharGenManager.dex -= 1;
          GameState.CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });
      
      this.CON_MINUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && GameState.CharGenManager.con > this.creature.con && GameState.CharGenManager.con > 8){
          let cost = this.getAttributeCost(CharGenAttribute.CON);
          GameState.CharGenManager.con -= 1;
          GameState.CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.WIS_MINUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && GameState.CharGenManager.wis > this.creature.wis && GameState.CharGenManager.wis > 8){
          let cost = this.getAttributeCost(CharGenAttribute.WIS);
          GameState.CharGenManager.wis -= 1;
          GameState.CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.INT_MINUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && GameState.CharGenManager.int > this.creature.int && GameState.CharGenManager.int > 8){
          let cost = this.getAttributeCost(CharGenAttribute.INT);
          GameState.CharGenManager.int -= 1;
          GameState.CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });

      this.CHA_MINUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && GameState.CharGenManager.cha > this.creature.cha && GameState.CharGenManager.cha > 8){
          let cost = this.getAttributeCost(CharGenAttribute.CHA);
          GameState.CharGenManager.cha -= 1;
          GameState.CharGenManager.availPoints += cost;
        }
        this.updateButtonStates();
      });
      
      //PLUS Buttons
      this.STR_PLUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.STR) <= GameState.CharGenManager.availPoints){
          GameState.CharGenManager.str += 1;
          let cost = this.getAttributeCost(CharGenAttribute.STR);
          GameState.CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.DEX_PLUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.DEX) <= GameState.CharGenManager.availPoints){
          GameState.CharGenManager.dex += 1;
          let cost = this.getAttributeCost(CharGenAttribute.DEX);
          GameState.CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.CON_PLUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.CON) <= GameState.CharGenManager.availPoints){
          GameState.CharGenManager.con += 1;
          let cost = this.getAttributeCost(CharGenAttribute.CON);
          GameState.CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.WIS_PLUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.WIS) <= GameState.CharGenManager.availPoints){
          GameState.CharGenManager.wis += 1;
          let cost = this.getAttributeCost(CharGenAttribute.WIS);
          GameState.CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.INT_PLUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.INT) <= GameState.CharGenManager.availPoints){
          GameState.CharGenManager.int += 1;
          let cost = this.getAttributeCost(CharGenAttribute.INT);
          GameState.CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      this.CHA_PLUS_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.creature && this.getAttributeCost(CharGenAttribute.CHA) <= GameState.CharGenManager.availPoints){
          GameState.CharGenManager.cha += 1;
          let cost = this.getAttributeCost(CharGenAttribute.CHA);
          GameState.CharGenManager.availPoints -= cost;
        }
        this.updateButtonStates();
      });

      resolve();
    });
  }
  
}
