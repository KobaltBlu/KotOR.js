import { GameState } from "../../../GameState";
import type { GUILabel, GUICheckBox, GUIButton, GUIListBox } from "../../../gui";
import { MenuGameplay as K1_MenuGameplay } from "../../kotor/KOTOR";

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

  difficultyList: any[] = [];
  selectedDifficulty: any;

  constructor(){
    super();
    this.gui_resref = 'optgameplay_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      const difficultyTable = GameState.TwoDAManager.datatables.get('difficultyopt');

      for(let i = 0; i < difficultyTable.RowCount; i++){
        const row = difficultyTable.rows[i];
        if(row.name == '****'){
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

        if(idx >= this.selectedDifficulty.length){ 
          idx = this.selectedDifficulty.length - 1; 
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
        this.close();
      });

      this.BTN_KEYMAP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuKeyboardMapping.open();
      });

      this.BTN_MOUSE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuMouse.open();
      });

      

      this.BTN_DIFFICULTY.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[42265].Value)
      });
      
      this.CB_LEVELUP.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[42266].Value)
      });
      
      this.CB_INVERTCAM.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[48697].Value)
      });
      
      this.CB_AUTOSAVE.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[38038].Value)
      });
      
      this.CB_REVERSE_INGAME.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[106490].Value)
      });
      
      this.CB_REVERSE.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[48699].Value)
      });
      
      this.CB_DISABLEMOVE.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[42484].Value)
      });


      resolve();
    });
  }

  show(){
    super.show();
    this.updateSelectedDifficulty();
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
