/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { AudioEngine } from "../../../audio/AudioEngine";
import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton, GUICheckBox } from "../../../gui";

/* @file
* The MenuSoundAdvanced menu class.
*/

export class MenuSoundAdvanced extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;
  CB_FORCESOFTWARE: GUICheckBox;
  BTN_EAX: GUIButton;
  BTN_EAXLEFT: GUIButton;
  BTN_EAXRIGHT: GUIButton;
  BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsoundadv';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
  return new Promise<void>((resolve, reject) => {
    this.CB_FORCESOFTWARE.attachINIProperty('Sound Options.Force Software');
    this.CB_FORCESOFTWARE.onValueChanged = () => {
      console.log('CB_FORCESOFTWARE', 'onValueChanged');
      if(GameState.iniConfig.getProperty('Sound Options.Force Software') == 1){
        GameState.audioEngine.SetReverbState(false);
      }else{
        GameState.audioEngine.SetReverbState(true);
      }
    };

    this.BTN_BACK.addEventListener('click', (e: any) => {
      e.stopPropagation();
      /*this.Hide();
      if(GameState.Mode == Game.MODES.INGAME){
        GameState.MenuSound.Show();
      }else{
        GameState.MenuSound.Show();
      }*/
      this.Close();
    });
    this._button_b = this.BTN_BACK;
    resolve();
  });
}

Show() {
  super.Show();
}
  
}
