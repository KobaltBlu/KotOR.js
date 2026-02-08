import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/** TLK 32321: "Max wager" label prefix (CSWGuiWagerPopup LBL_MAXIMUM format) */
const TLK_MAX_WAGER = 0x7e41;
/** TLK 38600: "Your credits" label prefix */
const TLK_YOUR_CREDITS = 0x96c8;
/** TLK 42424: "Quit Pazaak?" confirmation (HandleInputEvent case 0x28/0x2e) */
const TLK_QUIT_PAZAAK_CONFIRM = 0xa5b8;

/**
 * MenuPazaakWager class.
 *
 * Implements CSWGuiWagerPopup from KotOR I - wager selection popup for Pazaak.
 * Original game behavior parity: HandleButtonWager, OnBButtonPressed (quit), UpdateWagerText, LBL_MAXIMUM format.
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

      /**
       * BTN_QUIT: CSWGuiPanel::OnBButtonPressed -> HandleInputEvent(0x28/0x2e)
       * Shows "Quit Pazaak?" confirmation. If confirmed, cancels Pazaak (HandleQuitDialog).
       */
      this.BTN_QUIT.addEventListener('click', () => {
        this.handleQuitClicked();
      });

      /**
       * BTN_WAGER: HandleButtonWager -> HandleInputEvent(0x2d)
       * Confirms wager, closes popup, stays on setup (HandleWagerExit).
       */
      this.BTN_WAGER.addEventListener('click', () => {
        this.handleWagerClicked();
      });

      /**
       * BTN_LESS: OnMinusButtonPushed -> HandleInputEvent(0x2f etc) decrease
       */
      this.BTN_LESS.addEventListener('click', () => {
        GameState.PazaakManager.DecreaseWager();
        this.rebuild();
      });

      /**
       * BTN_MORE: OnPlusButtonPushed -> HandleInputEvent(0x30 etc) increase
       */
      this.BTN_MORE.addEventListener('click', () => {
        GameState.PazaakManager.IncreaseWager();
        this.rebuild();
      });

      resolve();
    });
  }

  /**
   * Handle BTN_QUIT - show confirmation then cancel if confirmed.
   * Matches HandleInputEvent case 0x28/0x2e -> HandleQuitDialog.
   */
  private handleQuitClicked(){
    GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_click');
    GameState.MenuManager.InGameConfirm.showConfirmDialog(
      TLK_QUIT_PAZAAK_CONFIRM,
      () => {
        GameState.PazaakManager.CancelPazaak();
      },
      () => { /* cancel - do nothing */ }
    );
  }

  /**
   * Handle BTN_WAGER - confirm wager, close popup, stay on setup.
   * Matches HandleButtonWager -> HandleInputEvent(0x2d) -> HandleWagerExit.
   */
  private handleWagerClicked(){
    GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_click');
    this.close();
  }

  private getPlayerGold(): number {
    return GameState.PartyManager?.Gold ?? 0;
  }

  show() {
    super.show();
    this.tGuiPanel.widget.position.z = 100;
    this.rebuild();
  }

  /**
   * Matches CSWGuiWagerPopup::UpdateWagerText + LBL_MAXIMUM format.
   * LBL_MAXIMUM: GetSimpleString(0x7e41) + " " + maxWager + "\n" + GetSimpleString(0x96c8) + " " + playerGold
   */
  rebuild(){
    const pm = GameState.PazaakManager;
    const playerGold = this.getPlayerGold();
    const maxWager = Math.min(pm.MaxWager, playerGold);

    pm.Wager = Math.max(pm.MinWager, Math.min(pm.Wager, maxWager));

    this.LBL_WAGERVAL.setText(pm.Wager.toString());

    const tlkMax = GameState.TLKManager?.GetStringById?.(TLK_MAX_WAGER)?.Value ?? 'Max wager';
    const tlkCredits = GameState.TLKManager?.GetStringById?.(TLK_YOUR_CREDITS)?.Value ?? 'Your credits';
    this.LBL_MAXIMUM.setText(`${tlkMax} ${maxWager}\n${tlkCredits} ${playerGold}`);
  }
}
