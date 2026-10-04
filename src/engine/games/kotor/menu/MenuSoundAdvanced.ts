import { AudioEngine } from "@engine/audio/AudioEngine";
import { GameState } from "@engine/runtime/GameState";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "@engine/gui";

/** sound advanced options description TLKs (K1). */
const TLK_DESC_FORCESOFTWARE = 0xbdc1;
const TLK_DESC_EAX = 0xbdc2;

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

  protected setDescription(strRef: number) {
    this.LB_DESC?.setItem(
      GameState.TLKManager.GetStringById(strRef)?.Value
        || GameState.TLKManager.TLKStrings?.[strRef]?.Value
        || ''
    );
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.CB_FORCESOFTWARE.attachINIProperty('Sound Options.Force Software');
      this.CB_FORCESOFTWARE.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Sound Options.Force Software') == 1){
          AudioEngine.GetAudioEngine().setReverbState(false);
        }else{
          AudioEngine.GetAudioEngine().setReverbState(true);
        }
      };

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;
      this.selectedControl = this.LB_DESC;

      this.CB_FORCESOFTWARE.addEventListener('hover', () => this.setDescription(TLK_DESC_FORCESOFTWARE));
      this.BTN_EAX?.addEventListener('hover', () => this.setDescription(TLK_DESC_EAX));
      this.BTN_EAXLEFT?.addEventListener('hover', () => this.setDescription(TLK_DESC_EAX));
      this.BTN_EAXRIGHT?.addEventListener('hover', () => this.setDescription(TLK_DESC_EAX));

      resolve();
    });
  }

  show() {
    super.show();
    this.setDescription(TLK_DESC_FORCESOFTWARE);
  }
  
}
