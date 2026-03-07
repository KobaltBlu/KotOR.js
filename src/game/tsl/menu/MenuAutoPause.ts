import { GameState } from "../../../GameState";
import type { GUILabel, GUICheckBox, GUIListBox, GUIButton } from "../../../gui";
import { MenuAutoPause as K1_MenuAutoPause } from "../../kotor/KOTOR";
import { AutoPauseState } from "../../../enums/engine/AutoPauseState";

const END_ROUND_DESC = 42445;
const ENEMY_SIGHTED_DESC = 42446;
const MINE_SIGHTED_DESC = 49117;
const PARTY_KILLED_DESC = 42447;
const ACTION_MENU_DESC = 48216;
const NEW_TARGET_DESC = 48214;

/**
 * MenuAutoPause class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuAutoPause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuAutoPause extends K1_MenuAutoPause {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare CB_ENEMYSIGHTED: GUICheckBox;
  declare CB_PARTYKILLED: GUICheckBox;
  declare CB_ACTIONMENU: GUICheckBox;
  declare LB_DETAILS: GUIListBox;
  declare CB_ENDROUND: GUICheckBox;
  declare CB_TRIGGERS: GUICheckBox;
  declare CB_MINESIGHTED: GUICheckBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optautopause_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.CB_ENDROUND.attachINIProperty('Autopause Options.End Of Combat Round');
      this.CB_ENEMYSIGHTED.attachINIProperty('Autopause Options.Enemy Sighted');
      this.CB_MINESIGHTED.attachINIProperty('Autopause Options.Mine Sighted');
      this.CB_PARTYKILLED.attachINIProperty('Autopause Options.Party Killed');
      this.CB_ACTIONMENU.attachINIProperty('Autopause Options.Action Menu');
      this.CB_TRIGGERS.attachINIProperty('Autopause Options.New Target Selected');

      this.CB_ENDROUND.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.End Of Combat Round') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, false);
        }
      };

      this.CB_ENDROUND.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(END_ROUND_DESC)?.Value);
      });

      this.CB_ENEMYSIGHTED.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.Enemy Sighted') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.EnemySighted, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.EnemySighted, false);
        }
      };
      
      this.CB_ENEMYSIGHTED.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(ENEMY_SIGHTED_DESC)?.Value);
      });

      this.CB_MINESIGHTED.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.Mine Sighted') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.MineSighted, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.MineSighted, false);
        }
      };
      
      this.CB_MINESIGHTED.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(MINE_SIGHTED_DESC)?.Value);
      });

      this.CB_PARTYKILLED.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.Party Killed') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.PartyMemberKilled, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.PartyMemberKilled, false);
        }
      };
      
      this.CB_PARTYKILLED.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(PARTY_KILLED_DESC)?.Value);
      });

      this.CB_ACTIONMENU.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.Action Menu') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.ActionMenuUsed, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.ActionMenuUsed, false);
        }
      };
      
      this.CB_ACTIONMENU.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(ACTION_MENU_DESC)?.Value);
      });

      this.CB_TRIGGERS.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.New Target Selected') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.NewTargetSelected, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.NewTargetSelected, false);
        }
      };
      
      this.CB_TRIGGERS.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(NEW_TARGET_DESC)?.Value);
      });

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CB_ENDROUND.setValue(false);
        this.CB_ENEMYSIGHTED.setValue(true);
        this.CB_MINESIGHTED.setValue(true);
        this.CB_PARTYKILLED.setValue(true);
        this.CB_ACTIONMENU.setValue(false);
        this.CB_TRIGGERS.setValue(true);
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      
      resolve();
    });
  }
  
}
