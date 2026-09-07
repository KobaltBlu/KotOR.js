import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GUICreatureSkill } from "@/game/tsl/gui/GUICreatureSkill";
import type { TalentFeat } from "@/talents/TalentFeat";

/**
 * MenuSkillInfo class.
 *
 * — used by ShowGranted
 * to list feats granted when CharGen feats panel opens (TLK 0xa512 = 42258).
 * Rows are GUI (K1) via {@link GUICreatureSkill}.
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
    // Overlay so CharGen stays under it and MenuGetActiveUIElements hits this panel.
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.BTN_OK?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss();
    });
    this._button_a = this.BTN_OK;

    // skillinfo.gui parks the dialog at design-canvas (154,118) ≈ centered on
    // 640×480. KotOR.js centers by panel size at widget (0,0); zero the GFF
    // origin so GetLocalMouseCoords / hit tests match (MenuContainer / InGameConfirm).
    if(this.tGuiPanel){
      this.tGuiPanel.extent.left = 0;
      this.tGuiPanel.extent.top = 0;
    }

    // ctor: noSelectMode + SetEnabled(0) on LB_SKILLS;
    // rows are InGameSkillEntry (GUICreatureSkill), not raw PROTOITEM text.
    if(this.LB_SKILLS){
      this.LB_SKILLS.setProtoBuilder(GUICreatureSkill);
      this.LB_SKILLS.disableSelection = true;
      this.LB_SKILLS.bitFlags.noSelectMode = true;
    }
  }

  /**
   * Open with message + talent list (feats / skills / powers).
   * SetSkillList — AddControls of InGameSkillEntry rows.
   */
  openWithContent(message: string, items: Array<TalentFeat | { getName?: () => string; getIcon?: () => string } | string>, onDismiss?: () => void) {
    this.onDismiss = onDismiss;
    this.LBL_MESSAGE?.setText(message || '');
    if(this.LB_SKILLS){
      this.LB_SKILLS.setProtoBuilder(GUICreatureSkill);
      this.LB_SKILLS.bitFlags.noSelectMode = true;
      const nodes = (items || []).map((item) => {
        if(typeof item === 'string'){
          return { getName: () => item, getIcon: () => 'inone' };
        }
        return item;
      });
      this.LB_SKILLS.setItems(nodes, { requestNoSelect: true });
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
