import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
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
    return new Promise<void>((resolve, reject) => {
      this.wireControls();

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 100;
      this.recalculatePosition();
      resolve();
    });
  }

  /**
   * Wires the listeners shared by the K1 and TSL versions of this screen.
   * The TSL subclass skips the K1 initializer (skipInit) and calls this itself.
   */
  protected wireControls(){
    if(this.QUICK_CHAR_BTN){
      this.QUICK_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectQuick();
      });
    }

    if(this.CUST_CHAR_BTN){
      this.CUST_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectCustom();
      });
    }

    if(this.BTN_BACK){
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.goBack();
      });
    }
  }

  /**
   * Game-specific placement of the quick/custom step panel inside CharGenMain
   * (the K1 layouts need an offset; the TSL layouts do not).
   */
  protected positionChildPanel(panel: GameMenu){
    panel.tGuiPanel.widget.position.x = 142.5;
    panel.tGuiPanel.widget.position.y = 0;
  }

  protected showChildPanel(panel: GameMenu){
    this.manager.CharGenMain.close();
    this.manager.CharGenMain.childMenu = panel;
    this.positionChildPanel(panel);
    this.manager.CharGenMain.open();
  }

  /**
   * Quick character: class recommended attributes / skills / feats, then the
   * three-step quick panel.
   */
  selectQuick(){
    try{
      GameState.CharGenManager.applyQuickCharacter();
      GameState.CharGenManager.resetStepFlags();
      //Any picks committed on the custom Feats screen are gone
      this.manager.CharGenFeats.reset();
      this.showChildPanel(this.manager.CharGenQuickPanel);
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Custom character: a clean creature (attributes at 8, no skill ranks, only
   * the class-granted feats) and the six-step custom panel.
   */
  selectCustom(){
    try{
      GameState.CharGenManager.resetStepFlags();

      //Point the custom-chargen steps at the creature being built and apply the class-granted feats
      this.prepareCustomCreature();

      //Reset the Attributes window
      this.manager.CharGenAbilities.reset();

      //Reset the Skills window
      this.manager.CharGenSkills.reset();

      //Reset the Feats window (keeps the creature's feats)
      this.manager.CharGenFeats.reset();

      this.showChildPanel(this.manager.CharGenCustomPanel);
    }catch(e){
      console.error(e);
    }
  }

  prepareCustomCreature(){
    try{
      const creature = GameState.CharGenManager.selectedCreature;
      GameState.CharGenManager.prepareCustomCharacter(creature);
      this.manager.CharGenAbilities.setCreature(creature);
      this.manager.CharGenFeats.setCreature(creature);
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Back to the class selection screen (still on the menu stack under CharGenMain).
   */
  goBack(){
    try{
      GameState.CharGenManager.selectedCreature.model.removeFromParent();
    }catch(e){}
    this.manager.CharGenMain.close();
  }

}
