import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIButton, GUILabel } from "../../../gui";
import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";

/**
 * MenuGameOver class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGameOver.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGameOver extends GameMenu {

  declare BTN_LASTSAVE: GUIButton;
  declare BTN_LOADGAME: GUIButton;
  declare BTN_QUIT: GUIButton;
  declare LBL_MESSAGE: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'gameover';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_LASTSAVE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        this.manager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        this.manager.MenuSaveLoad.open();
      });

      this.BTN_LOADGAME.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        this.manager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        this.manager.MenuSaveLoad.open();
      });

      this.BTN_QUIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        this.manager.MainMenu.Start();
      });

      resolve();
    });
  }

}
