import { GameState } from "@/GameState";
import type { SWDifficulty } from "@/engine/rules/SWDifficulty";
import type { GUILabel, GUICheckBox, GUIButton, GUIListBox } from "@/gui";
import { MenuGameplay as K1_MenuGameplay } from "@/game/kotor/KOTOR";

/**
 * gameplay options description TLKs (ctor custom_value / OnEnterSlot).
 */
const TLK_DESC_DIFFICULTY = 0xa519;
const TLK_DESC_LEVELUP = 0xa51a;
const TLK_DESC_INVERTCAM = 0xbe39;
const TLK_DESC_AUTOSAVE = 0x9496;
const TLK_DESC_REVERSE = 0xbe3b;
const TLK_DESC_REVERSE_INGAME = 0x19ffa;
const TLK_DESC_DISABLEMOVE = 0xa5f4;
const TLK_DESC_MOUSE = 0xbe50;
const TLK_DESC_KEYMAP = 0xbe53;

/**
 * MenuGameplay class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuGameplay.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGameplay extends K1_MenuGameplay {

  declare LBL_BAR4: GUILabel;
  declare CB_INVERTCAM: GUICheckBox;
  declare CB_LEVELUP: GUICheckBox;
  declare BTN_DIFFICULTY: GUIButton;
  declare BTN_DIFFLEFT: GUIButton;
  declare BTN_DIFFRIGHT: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare CB_AUTOSAVE: GUICheckBox;
  declare CB_REVERSE: GUICheckBox;
  declare CB_DISABLEMOVE: GUICheckBox;
  declare BTN_KEYMAP: GUIButton;
  declare BTN_MOUSE: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;
  declare CB_REVERSE_INGAME: GUICheckBox;

  declare difficultyList: SWDifficulty[];
  declare selectedDifficulty: SWDifficulty;

  constructor(){
    super();
    this.gui_resref = 'optgameplay_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      const difficultyTable = GameState.SWRuleSet.difficulty;

      for(let i = 0; i < difficultyTable.length; i++){
        const row = difficultyTable[i];
        if(row.name == -1){
          continue;
        }
        
        this.difficultyList.push(row);
        if(row.desc === 'Normal'){
          this.selectedDifficulty = row;
        }
      }

      this.BTN_DIFFLEFT.addEventListener('click', (e) => {
        e.stopPropagation();
        let idx = this.difficultyList.indexOf(this.selectedDifficulty);
        if(idx == -1){ idx = 1; }
        idx -= 1;

        if(idx < 0){ 
          idx = 0; 
        }
        this.selectedDifficulty = this.difficultyList[idx];
        this.updateSelectedDifficulty();
      });

      this.BTN_DIFFRIGHT.addEventListener('click', (e) => {
        e.stopPropagation();
        let idx = this.difficultyList.indexOf(this.selectedDifficulty);
        if(idx == -1){ idx = 1; }
        idx += 1;

        if(idx >= this.difficultyList.length){ 
          idx = this.difficultyList.length - 1; 
        }
        this.selectedDifficulty = this.difficultyList[idx];
        this.updateSelectedDifficulty();
      });

      this.CB_LEVELUP.attachINIProperty('Game Options.Auto Level Up NPCs');
      this.CB_INVERTCAM.attachINIProperty('Game Options.Mouse Look');
      this.CB_AUTOSAVE.attachINIProperty('Game Options.AutoSave');
      this.CB_REVERSE_INGAME.attachINIProperty('Game Options.Reverse Ingame YAxis');
      this.CB_REVERSE.attachINIProperty('Game Options.Reverse Minigame YAxis');
      this.CB_DISABLEMOVE.attachINIProperty('Game Options.Combat Movement');

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.SWRuleSet.currentDifficulty = this.difficultyList.indexOf(this.selectedDifficulty);
        GameState.iniConfig.setProperty('Game Options.Difficulty Level', GameState.SWRuleSet.currentDifficulty);
        void GameState.iniConfig.save();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_KEYMAP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuKeyboardMapping.open();
      });

      this.BTN_MOUSE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuMouse.open();
      });

      this.BTN_DIFFICULTY.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_DIFFICULTY);
      });
      this.CB_LEVELUP.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_LEVELUP);
      });
      this.CB_INVERTCAM.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_INVERTCAM);
      });
      this.CB_AUTOSAVE.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_AUTOSAVE);
      });
      this.CB_REVERSE_INGAME.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_REVERSE_INGAME);
      });
      this.CB_REVERSE.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_REVERSE);
      });
      this.CB_DISABLEMOVE.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_DISABLEMOVE);
      });
      this.BTN_MOUSE.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_MOUSE);
      });
      this.BTN_KEYMAP.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_KEYMAP);
      });

      resolve();
    });
  }

  show(){
    super.show();
    this.updateSelectedDifficulty();
    this.setDescription(TLK_DESC_DIFFICULTY);
  }

  updateSelectedDifficulty(){
    if(!this.difficultyList.length){ return; }

    if(!this.selectedDifficulty){
      this.selectedDifficulty = this.difficultyList[1];
    }

    const idx = this.difficultyList.indexOf(this.selectedDifficulty);
    const maxIdx = this.difficultyList.length - 1;
    if(idx == 0){
      this.BTN_DIFFLEFT.hide();
    }else{
      this.BTN_DIFFLEFT.show();
    }

    if(idx == maxIdx){
      this.BTN_DIFFRIGHT.hide();
    }else{
      this.BTN_DIFFRIGHT.show();
    }

    this.BTN_DIFFICULTY.setText(GameState.TLKManager.GetStringById(this.selectedDifficulty.name).Value);
  }
  
}
