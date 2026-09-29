import { GameState } from "@/GameState";
import { GameMenu, commitGuiTransform } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";

/**
 * CharGenQuickOrCustom class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenQuickOrCustom.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenQuickOrCustom extends GameMenu {

  LBL_DECORATION: GUILabel;
  BTN_BACK: GUIButton;
  LBL_RBG: GUILabel;
  LB_DESC: GUIListBox;
  QUICK_CHAR_BTN: GUIButton;
  CUST_CHAR_BTN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'qorcpnl';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.QUICK_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        try{
          GameState.CharGenManager.resetChargenProgress();
          GameState.CharGenManager.doQuickStats();

          this.manager.CharGenMain.close();
          this.manager.CharGenMain.childMenu = this.manager.CharGenQuickPanel;
          this.manager.CharGenQuickPanel.tGuiPanel.widget.position.x = 142.5;
          this.manager.CharGenQuickPanel.tGuiPanel.widget.position.y = 0;
          commitGuiTransform(this.manager.CharGenQuickPanel.tGuiPanel.widget);
          this.manager.CharGenQuickPanel.setState(0);
          this.manager.CharGenMain.open();
        }catch(e){
          console.error(e);
        }
      });

      this.CUST_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.resetChargenProgress();
        this.manager.CharGenAbilities.setCreature(GameState.CharGenManager.selectedCreature);
        this.manager.CharGenAbilities.reset();
        this.manager.CharGenSkills.reset();

        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenCustomPanel;
        this.manager.CharGenCustomPanel.tGuiPanel.widget.position.x = 142.5;
        this.manager.CharGenCustomPanel.tGuiPanel.widget.position.y = 0;
        commitGuiTransform(this.manager.CharGenCustomPanel.tGuiPanel.widget);
        this.manager.CharGenCustomPanel.setState(0);
        this.manager.CharGenMain.open();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        try{
          GameState.CharGenManager.selectedCreature.model.removeFromParent();
        }catch(e){}
        this.manager.CharGenMain.close();
      });

      const setDescFromControl = (ctrl: GUIButton) => {
        const hint = ctrl?.getHintText?.() || ctrl?.getText?.() || '';
        if(hint) this.LB_DESC?.setItem?.(hint);
      };
      this.QUICK_CHAR_BTN?.addEventListener('hover', () => setDescFromControl(this.QUICK_CHAR_BTN));
      this.CUST_CHAR_BTN?.addEventListener('hover', () => setDescFromControl(this.CUST_CHAR_BTN));
      this.QUICK_CHAR_BTN?.addEventListener('click', () => setDescFromControl(this.QUICK_CHAR_BTN));
      // Default pane text from Quick button hint
      setDescFromControl(this.QUICK_CHAR_BTN);

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 100;
      this.recalculatePosition();
      resolve();
    });
  }

  show() {
    super.show();
    const hint = this.QUICK_CHAR_BTN?.getHintText?.() || '';
    if(hint) this.LB_DESC?.setItem?.(hint);
  }
  
}
