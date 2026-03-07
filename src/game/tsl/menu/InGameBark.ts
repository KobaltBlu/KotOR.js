import type { GUILabel } from "../../../gui";
import { InGameBark as K1_InGameBark } from "../../kotor/KOTOR";

/**
 * InGameBark class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameBark.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameBark extends K1_InGameBark {

  declare LBL_BARKTEXT: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'barkbubble_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_BARKTEXT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.bHasAudio = false;
        this.bAudioPlayed = true;
        this.barkTimer = 0;
      });
      this.tGuiPanel.widget.position.z = 5;
      resolve();
    });
  }
  
}
