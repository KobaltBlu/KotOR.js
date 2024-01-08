import type { GUILabel, GUIButton } from "../../../gui";
import { MenuPazaakSetup as K1_MenuPazaakSetup } from "../../kotor/KOTOR";

/**
 * MenuPazaakSetup class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakSetup.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakSetup extends K1_MenuPazaakSetup {

  declare LBL_TITLE: GUILabel;
  declare BTN_AVAIL00: GUIButton;
  declare BTN_AVAIL01: GUIButton;
  declare BTN_AVAIL02: GUIButton;
  declare BTN_AVAIL03: GUIButton;
  declare BTN_AVAIL04: GUIButton;
  declare BTN_AVAIL05: GUIButton;
  declare BTN_AVAIL15: GUIButton;
  declare BTN_AVAIL14: GUIButton;
  declare BTN_AVAIL13: GUIButton;
  declare BTN_AVAIL12: GUIButton;
  declare BTN_AVAIL11: GUIButton;
  declare BTN_AVAIL10: GUIButton;
  declare BTN_AVAIL24: GUIButton;
  declare BTN_AVAIL34: GUIButton;
  declare BTN_AVAIL23: GUIButton;
  declare BTN_AVAIL33: GUIButton;
  declare BTN_AVAIL25: GUIButton;
  declare BTN_AVAIL35: GUIButton;
  declare BTN_AVAIL22: GUIButton;
  declare BTN_AVAIL32: GUIButton;
  declare BTN_AVAIL21: GUIButton;
  declare BTN_AVAIL31: GUIButton;
  declare BTN_AVAIL20: GUIButton;
  declare BTN_AVAIL30: GUIButton;
  declare BTN_CHOSEN8: GUIButton;
  declare BTN_CHOSEN6: GUIButton;
  declare BTN_CHOSEN4: GUIButton;
  declare BTN_CHOSEN2: GUIButton;
  declare BTN_CHOSEN9: GUIButton;
  declare BTN_CHOSEN0: GUIButton;
  declare BTN_CHOSEN7: GUIButton;
  declare BTN_CHOSEN5: GUIButton;
  declare BTN_CHOSEN3: GUIButton;
  declare BTN_CHOSEN1: GUIButton;
  declare LBL_AVAIL00: GUILabel;
  declare LBL_AVAIL01: GUILabel;
  declare LBL_AVAIL02: GUILabel;
  declare LBL_AVAIL03: GUILabel;
  declare LBL_AVAIL04: GUILabel;
  declare LBL_AVAIL05: GUILabel;
  declare LBL_AVAIL10: GUILabel;
  declare LBL_AVAIL11: GUILabel;
  declare LBL_AVAIL12: GUILabel;
  declare LBL_AVAIL13: GUILabel;
  declare LBL_AVAIL14: GUILabel;
  declare LBL_AVAIL15: GUILabel;
  declare LBL_AVAIL20: GUILabel;
  declare LBL_AVAIL30: GUILabel;
  declare LBL_AVAIL21: GUILabel;
  declare LBL_AVAIL31: GUILabel;
  declare LBL_AVAIL22: GUILabel;
  declare LBL_AVAIL32: GUILabel;
  declare LBL_AVAIL23: GUILabel;
  declare LBL_AVAIL33: GUILabel;
  declare LBL_AVAIL24: GUILabel;
  declare LBL_AVAIL34: GUILabel;
  declare LBL_AVAIL25: GUILabel;
  declare LBL_AVAIL35: GUILabel;
  declare LBL_CHOSEN0: GUILabel;
  declare LBL_CHOSEN2: GUILabel;
  declare LBL_CHOSEN4: GUILabel;
  declare LBL_CHOSEN6: GUILabel;
  declare LBL_CHOSEN8: GUILabel;
  declare LBL_CHOSEN1: GUILabel;
  declare LBL_CHOSEN3: GUILabel;
  declare LBL_CHOSEN5: GUILabel;
  declare LBL_CHOSEN7: GUILabel;
  declare LBL_CHOSEN9: GUILabel;
  declare LBL_AVAILNUM05: GUILabel;
  declare LBL_AVAILNUM15: GUILabel;
  declare LBL_AVAILNUM25: GUILabel;
  declare LBL_AVAILNUM35: GUILabel;
  declare LBL_AVAILNUM24: GUILabel;
  declare LBL_AVAILNUM34: GUILabel;
  declare LBL_AVAILNUM14: GUILabel;
  declare LBL_AVAILNUM04: GUILabel;
  declare LBL_AVAILNUM03: GUILabel;
  declare LBL_AVAILNUM13: GUILabel;
  declare LBL_AVAILNUM23: GUILabel;
  declare LBL_AVAILNUM33: GUILabel;
  declare LBL_AVAILNUM22: GUILabel;
  declare LBL_AVAILNUM32: GUILabel;
  declare LBL_AVAILNUM12: GUILabel;
  declare LBL_AVAILNUM02: GUILabel;
  declare LBL_AVAILNUM01: GUILabel;
  declare LBL_AVAILNUM11: GUILabel;
  declare LBL_AVAILNUM21: GUILabel;
  declare LBL_AVAILNUM31: GUILabel;
  declare LBL_AVAILNUM20: GUILabel;
  declare LBL_AVAILNUM30: GUILabel;
  declare LBL_AVAILNUM10: GUILabel;
  declare LBL_AVAILNUM00: GUILabel;
  declare LBL_RTEXT: GUILabel;
  declare LBL_LTEXT: GUILabel;
  declare BTN_ATEXT: GUIButton;
  declare BTN_CLEARCARDS: GUIButton;
  declare LBL_HELP: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'pazaaksetup_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }
  
}
