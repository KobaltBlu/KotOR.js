import type { SWDifficulty } from "@/engine/rules/SWDifficulty";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "@/gui";

/**
 * MenuGameplay class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGameplay.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGameplay extends GameMenu {

  CB_INVERTCAM: GUICheckBox;
  CB_LEVELUP: GUICheckBox;
  BTN_DIFFICULTY: GUIButton;
  BTN_DIFFLEFT: GUIButton;
  BTN_DIFFRIGHT: GUIButton;
  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  CB_AUTOSAVE: GUICheckBox;
  CB_REVERSE: GUICheckBox;
  CB_DISABLEMOVE: GUICheckBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  BTN_KEYMAP: GUIButton;
  BTN_MOUSE: GUIButton;

  difficultyList: SWDifficulty[] = [];
  selectedDifficulty: SWDifficulty;

  constructor(){
    super();
    this.gui_resref = 'optgameplay';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
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
      this.CB_REVERSE.attachINIProperty('Game Options.Reverse Minigame YAxis');
      this.CB_DISABLEMOVE.attachINIProperty('Game Options.Combat Movement');

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.SWRuleSet.currentDifficulty = this.difficultyList.indexOf(this.selectedDifficulty);
        GameState.iniConfig.setProperty('Game Options.Difficulty Level', GameState.SWRuleSet.currentDifficulty);
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
    const difficultyTable = GameState.SWRuleSet.difficulty;
    this.difficultyList = [];

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
    this.updateSelectedDifficulty();
  }

  update(delta: number){
    super.update(delta);
    this.updateSelectedDifficulty();
  }

  updateSelectedDifficulty(){
    if(!this.difficultyList.length){ return; }

    if(!this.selectedDifficulty){
      this.selectedDifficulty = this.difficultyList[1];
    }

    const idx = this.difficultyList.indexOf(this.selectedDifficulty);
    const maxIdx = this.difficultyList.length - 1;
    
    this.BTN_DIFFLEFT.show();
    if(idx <= 0){
      this.BTN_DIFFLEFT.hide();
    }

    this.BTN_DIFFRIGHT.show();
    if(idx >= maxIdx){
      this.BTN_DIFFRIGHT.hide();
    }

    this.BTN_DIFFICULTY.setText(GameState.TLKManager.GetStringById(this.selectedDifficulty.name).Value);
  }
  
}
