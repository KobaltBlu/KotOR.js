import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/**
 * MenuPazaakWager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakWager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakWager extends GameMenu {

  LBL_BG: GUILabel;
  LBL_WAGERVAL: GUILabel;
  LBL_TITLE: GUILabel;
  LBL_MAXIMUM: GUILabel;
  BTN_LESS: GUIButton;
  BTN_MORE: GUIButton;
  BTN_QUIT: GUIButton;
  BTN_WAGER: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pazaakwager';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_QUIT.addEventListener('click', () => {
        this.close();
        GameState.MenuManager.MenuPazaakSetup.close();
      });

      this.BTN_WAGER.addEventListener('click', () => {
        this.close();
        GameState.MenuManager.MenuPazaakSetup.close();
        GameState.MenuManager.MenuPazaakGame.open();
        GameState.PazaakManager.BeginGame();
      });

      this.BTN_LESS.addEventListener('click', () => {
        GameState.PazaakManager.DecreaseWager();
        this.rebuild();
      }); 

      this.BTN_MORE.addEventListener('click', () => {
        GameState.PazaakManager.IncreaseWager();
        this.rebuild();
      });
      
      resolve();
    });
  }

  show() {
    super.show();
    this.tGuiPanel.widget.position.z = 100
    this.rebuild();
  }

  rebuild(){
    this.LBL_WAGERVAL.setText(GameState.PazaakManager.Wager.toString());
  }
}
