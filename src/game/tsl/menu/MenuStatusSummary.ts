import type { GUILabel, GUIButton } from "../../../gui";
import { MenuStatusSummary as K1_MenuStatusSummary } from "../../kotor/KOTOR";

/**
 * MenuStatusSummary class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuStatusSummary.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuStatusSummary extends K1_MenuStatusSummary {

  declare LBL_JOURNAL: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare LBL_XP: GUILabel;
  declare LBL_DARKSIDE: GUILabel;
  declare LBL_LIGHTSIDE: GUILabel;
  declare LBL_RECEIVED: GUILabel;
  declare LBL_LOST: GUILabel;
  declare LBL_CREDITS_DESC: GUILabel;
  declare LBL_JOURNAL_DESC: GUILabel;
  declare LBL_XP_DESC: GUILabel;
  declare LBL_DARKSIDE_DESC: GUILabel;
  declare LBL_LIGHTSIDE_DESC: GUILabel;
  declare LBL_RECEIVED_DESC: GUILabel;
  declare LBL_LOST_DESC: GUILabel;
  declare LBL_STEALTH_DESC: GUILabel;
  declare LBL_STEALTH: GUILabel;
  declare LBL_NETSHIFT_DESC: GUILabel;
  declare LBL_NETSHIFT: GUILabel;
  declare LBL_INFLUENCE_RECV_DESC: GUILabel;
  declare LBL_INFLUENCE_RECV: GUILabel;
  declare LBL_INFLUENCE_LOST_DESC: GUILabel;
  declare LBL_INFLUENCE_LOST: GUILabel;
  declare LBL_MAX_FP_GAINED_DESC: GUILabel;
  declare LBL_MAX_FP_GAINED: GUILabel;
  declare LBL_MAX_FP_LOST_DESC: GUILabel;
  declare LBL_MAX_FP_LOST: GUILabel;
  declare BTN_OK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'statussummary_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
