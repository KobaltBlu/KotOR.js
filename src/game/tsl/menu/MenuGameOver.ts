import { GameMenu } from "@/gui";
import type { GUIButton, GUILabel } from "@/gui";
import { GameState } from "@/GameState";
import { GameOverManager } from "@/managers/GameOverManager";

/**
 * MenuGameOver class — TSL CSWGuiDeathDisplay (gameover_p).
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

  /** Retail button input lock (0.5s after open). */
  buttonEnableDelay = 0;

  constructor(){
    super();
    this.gui_resref = 'gameover_p';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
    this.userCanClose = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {

      this.BTN_LASTSAVE?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.buttonEnableDelay > 0) return;
        GameOverManager.LoadMostRecentSave();
      });

      this.BTN_LOADGAME?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.buttonEnableDelay > 0) return;
        GameOverManager.OpenLoadGameFromDeath();
      });

      this.BTN_QUIT?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.buttonEnableDelay > 0) return;
        GameOverManager.QuitToMainMenu();
      });

      this._button_a = this.BTN_LASTSAVE;
      this._button_b = this.BTN_QUIT;

      resolve();
    });
  }

  /** DisplayDeathMessage path — show panel and reset button lock. */
  openDeath(options?: {
    respawnEnabled?: boolean;
    waitForHelpEnabled?: boolean;
    message?: string;
  }){
    this.buttonEnableDelay = GameOverManager.BUTTON_ENABLE_DELAY;

    // NWN Respawn/WaitForHelp → TSL Last Save / Load Game chrome
    void options?.waitForHelpEnabled;
    const respawn = options?.respawnEnabled !== false;
    if(this.BTN_LASTSAVE){
      if(respawn) this.BTN_LASTSAVE.show();
      else this.BTN_LASTSAVE.hide();
    }
    if(this.BTN_LOADGAME){
      if(respawn) this.BTN_LOADGAME.show();
      else this.BTN_LOADGAME.hide();
    }

    if(options?.message && this.LBL_MESSAGE){
      this.LBL_MESSAGE.setText(options.message);
    }

    this.open();
  }

  updateDeathButtons(delta: number = 0){
    if(!this.bVisible) return;
    if(this.buttonEnableDelay > 0){
      this.buttonEnableDelay = Math.max(0, this.buttonEnableDelay - delta);
    }
  }

  update(delta: number = 0){
    super.update(delta);
    this.updateDeathButtons(delta);
  }

  show(){
    super.show();
    // Keep follower camera view behind the modal during death
    if(GameState.getCurrentPlayer()){
      GameState.currentCamera = GameState.camera;
    }
  }

}
