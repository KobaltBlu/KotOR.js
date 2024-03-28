import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import type { ModuleCreature } from "../../../module";
import { CharGenAttribute } from "../../../enums/chargen/CharGenAttribute";
import { GameMenu } from "../../../gui";
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

  show(){
    super.show();
    this.updateButtonStates();
  }

  setCreature(creature: ModuleCreature){
    this.creature = creature;
  }

  updateButtonStates(){
    this.STR_POINTS_BTN.setText(GameState.CharGenManager.str);
    this.DEX_POINTS_BTN.setText(GameState.CharGenManager.dex);
    this.CON_POINTS_BTN.setText(GameState.CharGenManager.con);
    this.WIS_POINTS_BTN.setText(GameState.CharGenManager.wis);
    this.INT_POINTS_BTN.setText(GameState.CharGenManager.int);
    this.CHA_POINTS_BTN.setText(GameState.CharGenManager.cha);

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

    if(GameState.CharGenManager.str <= 8 || this.creature.str == GameState.CharGenManager.str)
      this.STR_MINUS_BTN.hide();

    if(GameState.CharGenManager.dex <= 8 || this.creature.dex == GameState.CharGenManager.dex)
      this.DEX_MINUS_BTN.hide();

    if(GameState.CharGenManager.con <= 8 || this.creature.con == GameState.CharGenManager.con)
      this.CON_MINUS_BTN.hide();

    if(GameState.CharGenManager.wis <= 8 || this.creature.wis == GameState.CharGenManager.wis)
      this.WIS_MINUS_BTN.hide();

    if(GameState.CharGenManager.int <= 8 || this.creature.int == GameState.CharGenManager.int)
      this.INT_MINUS_BTN.hide();

    if(GameState.CharGenManager.cha <= 8 || this.creature.cha == GameState.CharGenManager.cha)
      this.CHA_MINUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.STR) > GameState.CharGenManager.availPoints)
      this.STR_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.DEX) > GameState.CharGenManager.availPoints)
      this.DEX_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.CON) > GameState.CharGenManager.availPoints)
      this.CON_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.WIS) > GameState.CharGenManager.availPoints)
      this.WIS_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.INT) > GameState.CharGenManager.availPoints)
      this.INT_PLUS_BTN.hide();

    if(this.getAttributeCost(CharGenAttribute.CHA) > GameState.CharGenManager.availPoints)
      this.CHA_PLUS_BTN.hide();

    this.REMAINING_SELECTIONS_LBL.setText(GameState.CharGenManager.availPoints);
  }

  getAttributeCost(index = 0){
    let mod = 0;
    switch(index){
      case CharGenAttribute.STR:
        mod = Math.floor((GameState.CharGenManager.str - 10)/2);
      break;
      case CharGenAttribute.DEX:
        mod = Math.floor((GameState.CharGenManager.dex - 10)/2);
      break;
      case CharGenAttribute.CON:
        mod = Math.floor((GameState.CharGenManager.con - 10)/2);
      break;
      case CharGenAttribute.WIS:
        mod = Math.floor((GameState.CharGenManager.wis - 10)/2);
      break;
      case CharGenAttribute.INT:
        mod = Math.floor((GameState.CharGenManager.int - 10)/2);
      break;
      case CharGenAttribute.CHA:
        mod = Math.floor((GameState.CharGenManager.cha - 10)/2);
      break;
    }
    return Math.max(1, mod);
  }

  reset(){
    GameState.CharGenManager.availPoints = 30;
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
