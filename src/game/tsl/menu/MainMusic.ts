import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton, GUIListBox, GUISlider } from "../../../gui";

/**
 * MainMusic class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MainMusic.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MainMusic extends GameMenu {

  declare LBL_MUSIC_TITLE: GUILabel;
  declare BTN_LOOP: GUIButton;
  declare BTN_STOP: GUIButton;
  declare BTN_NEXT: GUIButton;
  declare BTN_PLAY: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_UNLOCKED: GUILabel;
  declare LBL_TRACKNAME: GUILabel;
  declare LBL_TRACKNUM: GUILabel;
  declare BTN_BACK: GUIButton;
  declare LB_MUSIC: GUIListBox;
  declare SLI_VOLUME: GUISlider;

  constructor(){
    super();
    this.gui_resref = 'titlemusic_p';
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
  
}
