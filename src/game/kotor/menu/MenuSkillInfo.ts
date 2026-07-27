import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";

/**
 * MenuSkillInfo class.
 *
 * Retail CSWGuiSkillInfoBox — used by CSWGuiFeatsCharGen::ShowGranted @ 006f2c40
 * to list feats granted when CharGen feats panel opens (TLK 0xa512 = 42258).
 *
 * @file MenuSkillInfo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSkillInfo extends GameMenu {

  LBL_MESSAGE: GUILabel;
  LB_SKILLS: GUIListBox;
  BTN_OK: GUIButton;

  private onDismiss?: () => void;

  constructor(){
    super();
    this.gui_resref = 'skillinfo';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.BTN_OK?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss();
    });
  }

  /** Open with message + string list (feat / skill names). */
  openWithContent(message: string, items: string[], onDismiss?: () => void) {
    this.onDismiss = onDismiss;
    this.LBL_MESSAGE?.setText(message || '');
    if(typeof this.LB_SKILLS?.setItems === 'function'){
      this.LB_SKILLS.setItems(items || []);
    }
    this.open();
  }

  private dismiss() {
    const cb = this.onDismiss;
    this.onDismiss = undefined;
    this.close();
    cb?.();
  }

}
