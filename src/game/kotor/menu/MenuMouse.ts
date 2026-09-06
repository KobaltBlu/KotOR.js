import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUISlider, GUICheckBox } from "@/gui";

/** retail CSWGuiOptionsMouse custom_value (K1). */
const TLK_MOUSE_SENSITIVITY = 0xbb8d;
const TLK_REVERSE_BUTTONS = 0xbd42;
/** Retail SetDefaultMouseOptions mouse_sensitivity (0x2C). */
const DEFAULT_MOUSE_SENSITIVITY = 0x2c;
/** Retail SetDefaultMouseOptions reverse_mouse_buttons. */
const DEFAULT_REVERSE_BUTTONS = 0;

const INI_MOUSE_SENSITIVITY = 'Game Options.Mouse Sensitivity';
const INI_REVERSE_BUTTONS = 'Game Options.Reverse Mouse Buttons';

/**
 * MenuMouse class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * retail (optmouse).
 *
 * @file MenuMouse.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuMouse extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  SLI_MOUSESEN: GUISlider;
  LBL_MOUSESEN: GUILabel;
  CB_REVBUTTONS: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optmouse';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
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

      this.SLI_MOUSESEN.attachINIProperty(INI_MOUSE_SENSITIVITY);
      this.CB_REVBUTTONS.attachINIProperty(INI_REVERSE_BUTTONS);

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

  /** Retail SetUpOptions — load current values into controls. */
  setupOptions(){
    const sensitivity = Number(GameState.iniConfig.getProperty(INI_MOUSE_SENSITIVITY));
    const reverse = Number(GameState.iniConfig.getProperty(INI_REVERSE_BUTTONS));
    this.SLI_MOUSESEN.setValue((Number.isFinite(sensitivity) ? sensitivity : DEFAULT_MOUSE_SENSITIVITY) * 0.01);
    this.CB_REVBUTTONS.setValue(!!reverse);
  }

  /** Retail OnDefault / SetDefaultMouseOptions. */
  resetToDefaults(){
    this.SLI_MOUSESEN.setValue(DEFAULT_MOUSE_SENSITIVITY * 0.01);
    this.CB_REVBUTTONS.setValue(!!DEFAULT_REVERSE_BUTTONS);
  }

  setDescription(strRef: number){
    this.LB_DESC.setItem(GameState.TLKManager.GetStringById(strRef)?.Value || '');
  }

}
