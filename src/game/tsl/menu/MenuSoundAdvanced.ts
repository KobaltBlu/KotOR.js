import { AudioEngine } from "@/audio/AudioEngine";
import { GameState } from "@/GameState";
import type { GUILabel, GUIListBox, GUICheckBox, GUIButton } from "@/gui";
import { MenuSoundAdvanced as K1_MenuSoundAdvanced } from "@/game/kotor/KOTOR";

/** retail CSWGuiOptionsSoundAdvanced description TLKs (TSL). */
const TLK_DESC_FORCESOFTWARE = 0xbe4e;
const TLK_DESC_EAX = 0xbe4f;

/**
 * MenuSoundAdvanced class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuSoundAdvanced.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSoundAdvanced extends K1_MenuSoundAdvanced {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare CB_FORCESOFTWARE: GUICheckBox;
  declare BTN_EAX: GUIButton;
  declare BTN_EAXLEFT: GUIButton;
  declare BTN_EAXRIGHT: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsoundadv_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
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

      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_a = this.BTN_CANCEL;

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
