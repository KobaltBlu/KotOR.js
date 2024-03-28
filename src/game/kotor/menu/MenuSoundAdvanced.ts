import { AudioEngine } from "../../../audio/AudioEngine";
import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "../../../gui";

/**
 * MenuSoundAdvanced class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSoundAdvanced.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
  return new Promise<void>((resolve, reject) => {
    this.CB_FORCESOFTWARE.attachINIProperty('Sound Options.Force Software');
    this.CB_FORCESOFTWARE.onValueChanged = () => {
      console.log('CB_FORCESOFTWARE', 'onValueChanged');
      if(GameState.iniConfig.getProperty('Sound Options.Force Software') == 1){
        AudioEngine.GetAudioEngine().setReverbState(false);
      }else{
        AudioEngine.GetAudioEngine().setReverbState(true);
      }
    };

    this.BTN_BACK.addEventListener('click', (e) => {
      e.stopPropagation();
      /*this.Hide();
      if(GameState.Mode == Game.MODES.INGAME){
        GameState.MenuSound.Show();
      }else{
        GameState.MenuSound.Show();
      }*/
      this.close();
    });
    this._button_b = this.BTN_BACK;
    resolve();
  });
}

show() {
  super.show();
}
  
}
