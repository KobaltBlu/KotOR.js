import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";

/**
 * MenuPazaakSetup class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakSetup.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakSetup extends GameMenu {

  LBL_TITLE: GUILabel;
  BTN_AVAIL00: GUIButton;
  BTN_AVAIL01: GUIButton;
  BTN_AVAIL02: GUIButton;
  BTN_AVAIL03: GUIButton;
  BTN_AVAIL04: GUIButton;
  BTN_AVAIL05: GUIButton;
  BTN_AVAIL15: GUIButton;
  BTN_AVAIL14: GUIButton;
  BTN_AVAIL13: GUIButton;
  BTN_AVAIL12: GUIButton;
  BTN_AVAIL11: GUIButton;
  BTN_AVAIL10: GUIButton;
  BTN_AVAIL24: GUIButton;
  BTN_AVAIL23: GUIButton;
  BTN_AVAIL25: GUIButton;
  BTN_AVAIL22: GUIButton;
  BTN_AVAIL21: GUIButton;
  BTN_AVAIL20: GUIButton;
  BTN_CHOSEN8: GUIButton;
  BTN_CHOSEN6: GUIButton;
  BTN_CHOSEN4: GUIButton;
  BTN_CHOSEN2: GUIButton;
  BTN_CHOSEN9: GUIButton;
  BTN_CHOSEN0: GUIButton;
  BTN_CHOSEN7: GUIButton;
  BTN_CHOSEN5: GUIButton;
  BTN_CHOSEN3: GUIButton;
  BTN_CHOSEN1: GUIButton;
  LBL_AVAIL00: GUILabel;
  LBL_AVAIL01: GUILabel;
  LBL_AVAIL02: GUILabel;
  LBL_AVAIL03: GUILabel;
  LBL_AVAIL04: GUILabel;
  LBL_AVAIL05: GUILabel;
  LBL_AVAIL10: GUILabel;
  LBL_AVAIL11: GUILabel;
  LBL_AVAIL12: GUILabel;
  LBL_AVAIL13: GUILabel;
  LBL_AVAIL14: GUILabel;
  LBL_AVAIL15: GUILabel;
  LBL_AVAIL20: GUILabel;
  LBL_AVAIL21: GUILabel;
  LBL_AVAIL22: GUILabel;
  LBL_AVAIL23: GUILabel;
  LBL_AVAIL24: GUILabel;
  LBL_AVAIL25: GUILabel;
  LBL_CHOSEN0: GUILabel;
  LBL_CHOSEN2: GUILabel;
  LBL_CHOSEN4: GUILabel;
  LBL_CHOSEN6: GUILabel;
  LBL_CHOSEN8: GUILabel;
  LBL_CHOSEN1: GUILabel;
  LBL_CHOSEN3: GUILabel;
  LBL_CHOSEN5: GUILabel;
  LBL_CHOSEN7: GUILabel;
  LBL_CHOSEN9: GUILabel;
  LBL_AVAILNUM05: GUILabel;
  LBL_AVAILNUM15: GUILabel;
  LBL_AVAILNUM25: GUILabel;
  LBL_AVAILNUM24: GUILabel;
  LBL_AVAILNUM14: GUILabel;
  LBL_AVAILNUM04: GUILabel;
  LBL_AVAILNUM03: GUILabel;
  LBL_AVAILNUM13: GUILabel;
  LBL_AVAILNUM23: GUILabel;
  LBL_AVAILNUM22: GUILabel;
  LBL_AVAILNUM12: GUILabel;
  LBL_AVAILNUM02: GUILabel;
  LBL_AVAILNUM01: GUILabel;
  LBL_AVAILNUM11: GUILabel;
  LBL_AVAILNUM21: GUILabel;
  LBL_AVAILNUM20: GUILabel;
  LBL_AVAILNUM10: GUILabel;
  LBL_AVAILNUM00: GUILabel;
  LBL_RTEXT: GUILabel;
  LBL_LTEXT: GUILabel;
  BTN_YTEXT: GUIButton;
  BTN_ATEXT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pazaaksetup';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
