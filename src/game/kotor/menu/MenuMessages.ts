import { GameState } from '@/GameState';
import { GameMenu } from '@/gui';
import type { GUIListBox, GUILabel, GUIButton } from '@/gui';

/**
 * MenuMessages class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuMessages.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuMessages extends GameMenu {
  LB_MESSAGES: GUIListBox;
  LBL_MESSAGES: GUILabel;
  BTN_EXIT: GUIButton;
  LB_DIALOG: GUIListBox;
  BTN_SHOW: GUIButton;

  mode: number = 0;

  constructor() {
    super();
    this.gui_resref = 'messages';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if (skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, _reject) => {
      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;
      this.BTN_SHOW.addEventListener('click', (_e) => {
        if (this.mode == 0) {
          this.mode = 1;
        } else {
          this.mode = 0;
        }
        this.updateListVisibility();
      });
      resolve();
    });
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_MSG.onHoverIn();
    const dlg_entries = GameState.DialogMessageManager.Entries.slice(0).reverse();
    this.LB_DIALOG.setItems(dlg_entries.map(e => `${e.speaker}: ${e.message}`));

    const fb_entries = GameState.FeedbackMessageManager.Entries.slice(0).reverse();
    this.LB_MESSAGES.setItems(fb_entries.map(e => `${e.message}`));

    this.updateListVisibility();
  }

  updateListVisibility() {
    this.LB_MESSAGES.hide();
    this.LB_DIALOG.hide();
    if (this.mode == 0) {
      this.LB_DIALOG.show();
      this.BTN_SHOW.setText(GameState.TLKManager.GetStringById(42142).Value);
    } else {
      this.LB_MESSAGES.show();
      this.BTN_SHOW.setText(GameState.TLKManager.GetStringById(42143).Value);
    }
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_ABI.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_JOU.click();
  }
}
