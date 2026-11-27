import { GameState } from "@engine/runtime/GameState";
import type { GUILabel, GUIListBox, GUISlider, GUICheckBox, GUIButton } from "@engine/gui";
import { MenuMouse as K1_MenuMouse } from "@engine/games/kotor/menu/MenuMouse";

/** mouse options custom_value (TSL). */
const TLK_MOUSE_SENSITIVITY = 0xbe51;
const TLK_REVERSE_BUTTONS = 0xbe52;

/**
 * MenuMouse class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuMouse.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuMouse extends K1_MenuMouse {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare SLI_MOUSESEN: GUISlider;
  declare LBL_MOUSESEN: GUILabel;
  declare CB_REVBUTTONS: GUICheckBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optmouse_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        void GameState.iniConfig.save();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetToDefaults();
      });

      this.SLI_MOUSESEN.attachINIProperty('Game Options.Mouse Sensitivity');
      this.CB_REVBUTTONS.attachINIProperty('Game Options.Reverse Mouse Buttons');

      this.SLI_MOUSESEN.addEventListener('hover', () => {
        this.setDescription(TLK_MOUSE_SENSITIVITY);
      });
      this.LBL_MOUSESEN.addEventListener('hover', () => {
        this.setDescription(TLK_MOUSE_SENSITIVITY);
      });
      this.CB_REVBUTTONS.addEventListener('hover', () => {
        this.setDescription(TLK_REVERSE_BUTTONS);
      });

      resolve();
    });
  }

  show(): void {
    super.show();
    this.setupOptions();
    this.setDescription(TLK_MOUSE_SENSITIVITY);
  }

}
