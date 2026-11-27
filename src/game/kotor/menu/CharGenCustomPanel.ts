import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIControl, GUILabel, GUIButton } from "@/gui";

/**
 * CharGenCustomPanel class.
 *
 * The six-step custom character panel inside CharGenMain: Portrait,
 * Attributes, Skills, Feats, Name, Play. Step N+1 becomes available once
 * step N was accepted (CharGenManager.stepN_complete); Play needs step 5.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenCustomPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenCustomPanel extends GameMenu {

  LBL_BG: GUILabel;
  LBL_6: GUIControl;
  LBL_5: GUIControl;
  LBL_4: GUIControl;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  BTN_STEPNAME1: GUIButton;
  LBL_NUM1: GUILabel;
  BTN_STEPNAME2: GUIButton;
  LBL_NUM2: GUILabel;
  BTN_STEPNAME3: GUIButton;
  LBL_NUM3: GUILabel;
  BTN_STEPNAME4: GUIButton;
  LBL_NUM4: GUILabel;
  BTN_STEPNAME5: GUIButton;
  LBL_NUM5: GUILabel;
  BTN_STEPNAME6: GUIButton;
  LBL_NUM6: GUILabel;
  BTN_BACK: GUIButton;
  BTN_CANCEL: GUIButton;

  /** Accept buttons of the sub-screens this panel already watches for step completion */
  protected watchedAcceptButtons: Set<GUIControl> = new Set();

  constructor(){
    super();
    this.gui_resref = 'custpnl';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.wireControls();

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 85;
      this.recalculatePosition();
      resolve();
    });
  }

  /**
   * Wires the listeners shared by the K1 and TSL versions of this screen.
   * The TSL subclass skips the K1 initializer (skipInit) and calls this itself.
   */
  protected wireControls(){
    if(this.BTN_BACK){
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
        this.manager.CharGenMain.open();
      });
    }

    if(this.BTN_CANCEL){
      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancel();
      });
    }

    if(this.BTN_STEPNAME1){
      this.BTN_STEPNAME1.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.isStepEnabled(1)) return;
        //CharGenPortCust marks step 1 itself on Accept
        this.manager.CharGenPortCust.open();
      });
    }

    if(this.BTN_STEPNAME2){
      this.BTN_STEPNAME2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.isStepEnabled(2)) return;
        this.manager.CharGenAbilities.setCreature(GameState.CharGenManager.selectedCreature);
        this.watchAccept(this.manager.CharGenAbilities, 2);
        this.manager.CharGenAbilities.open();
      });
    }

    if(this.BTN_STEPNAME3){
      this.BTN_STEPNAME3.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.isStepEnabled(3)) return;
        this.watchAccept(this.manager.CharGenSkills, 3);
        this.manager.CharGenSkills.open();
      });
    }

    if(this.BTN_STEPNAME4){
      this.BTN_STEPNAME4.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.isStepEnabled(4)) return;
        this.manager.CharGenFeats.setCreature(GameState.CharGenManager.selectedCreature);
        this.watchAccept(this.manager.CharGenFeats, 4);
        this.manager.CharGenFeats.open();
      });
    }

    if(this.BTN_STEPNAME5){
      this.BTN_STEPNAME5.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.isStepEnabled(5)) return;
        //CharGenName marks step 5 itself on OK
        this.manager.CharGenName.open();
      });
    }

    if(this.BTN_STEPNAME6){
      this.BTN_STEPNAME6.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.isStepEnabled(6)) return;
        GameState.CharGenManager.setStepComplete(6, true);
        GameState.CharGenManager.startNewGame();
      });
    }
  }

  /**
   * The Attributes / Skills / Feats screens belong to other classes, so step
   * completion is detected from the outside: a second 'click' listener on
   * their BTN_ACCEPT runs after the screen's own handler (registered
   * earlier) and treats the accept as successful when that handler closed
   * the screen (a refused accept, e.g. unspent feat picks, leaves it open).
   * Limitation: a screen accepted without any change still counts as done.
   */
  protected watchAccept(menu: GameMenu, step: number){
    const acceptButton = (menu as any).BTN_ACCEPT as GUIControl;
    if(!acceptButton || this.watchedAcceptButtons.has(acceptButton)){
      return;
    }
    this.watchedAcceptButtons.add(acceptButton);
    acceptButton.addEventListener('click', () => {
      if(menu.isVisible()){
        return;
      }
      GameState.CharGenManager.setStepComplete(step, true);
      this.updateStepVisibility();
    });
  }

  /**
   * Back to the class selection screen, forgetting the step progress.
   */
  cancel(){
    GameState.CharGenManager.resetStepFlags();
    try{
      GameState.CharGenManager.selectedCreature.model.removeFromParent();
    }catch(e){}
    this.manager.CharGenMain.close();
  }

  isStepEnabled(step: number): boolean {
    if(step <= 1) return true;
    return GameState.CharGenManager.isStepComplete(step - 1);
  }

  /**
   * Shows the steps that can be taken and hides the rest, the way the quick
   * panel does.
   */
  updateStepVisibility(){
    for(let step = 1; step <= 6; step++){
      this.setStepVisible(step, this.isStepEnabled(step));
    }
  }

  protected setStepVisible(step: number, visible: boolean){
    const controls: GUIControl[] = [
      this.getControlByName('BTN_STEPNAME' + step),
      this.getControlByName('LBL_' + step),
      this.getControlByName('LBL_NUM' + step),
    ];
    for(let i = 0; i < controls.length; i++){
      const control = controls[i];
      if(!control) continue;
      if(visible){
        control.show();
      }else{
        control.hide();
      }
    }
  }

  show(){
    super.show();
    this.updateStepVisibility();
  }

}
