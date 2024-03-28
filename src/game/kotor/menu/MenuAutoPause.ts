import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "../../../gui";;
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
export class MenuAutoPause extends GameMenu {

  LBL_TITLE: GUILabel;
  CB_ENEMYSIGHTED: GUICheckBox;
  CB_PARTYKILLED: GUICheckBox;
  CB_ACTIONMENU: GUICheckBox;
  LB_DETAILS: GUIListBox;
  CB_ENDROUND: GUICheckBox;
  CB_TRIGGERS: GUICheckBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  CB_MINESIGHTED: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optautopause';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
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
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, false);
        }
      };
      
      this.CB_ENEMYSIGHTED.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(ENEMY_SIGHTED_DESC)?.Value);
      });

      this.CB_MINESIGHTED.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.Mine Sighted') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, false);
        }
      };
      
      this.CB_MINESIGHTED.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(MINE_SIGHTED_DESC)?.Value);
      });

      this.CB_PARTYKILLED.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.Party Killed') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, false);
        }
      };
      
      this.CB_PARTYKILLED.addEventListener('hover', () => {
        this.LB_DETAILS.clearItems();
        this.LB_DETAILS.addItem(GameState.TLKManager.GetStringById(PARTY_KILLED_DESC)?.Value);
      });

      this.CB_ACTIONMENU.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Autopause Options.Action Menu') == 1){
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, true);
        }else{
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(AutoPauseState.CombatRoundEnd, false);
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

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      resolve();
    });
}
  
}
