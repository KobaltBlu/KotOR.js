import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUILabel, GUIButton } from "@/gui";

/**
 * CharGenName class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenName.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenName extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  NAME_BOX_EDIT: GUILabel;
  END_BTN: GUIButton;
  BTN_RANDOM: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'name';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.wireControls();
      resolve();
    });
  }

  /**
   * Wires the listeners shared by the K1 and TSL versions of this screen.
   * The TSL subclass skips the K1 initializer (skipInit) and calls this itself.
   */
  protected wireControls(){
    if(this.NAME_BOX_EDIT){
      this.NAME_BOX_EDIT.setEditable(true);
    }

    if(this.BTN_BACK){
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    if(this.END_BTN){
      this.END_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        this.acceptName();
      });
    }

    if(this.BTN_RANDOM){
      this.BTN_RANDOM.addEventListener('click', (e) => {
        e.stopPropagation();
        this.NAME_BOX_EDIT?.setText(GameState.CharGenManager.generateRandomName());
        //Keep the keyboard on the name box after the click moved the focus to the button
        this.focusNameBox();
      });
    }
  }

  /**
   * Routes keyboard input to the name box (IngameControls forwards keydown
   * to MenuManager.activeGUIElement, which every click reassigns).
   */
  focusNameBox(){
    if(this.NAME_BOX_EDIT){
      this.manager.activeGUIElement = this.NAME_BOX_EDIT;
    }
  }

  /**
   * OK: stores the trimmed name on the creature (ModuleCreature.save() writes
   * FirstName from it). An empty name is rejected: the previous name is put
   * back in the box and the screen stays open.
   */
  acceptName(){
    const creature = GameState.CharGenManager.selectedCreature;
    const name = (this.NAME_BOX_EDIT ? this.NAME_BOX_EDIT.getValue() : '').trim();
    if(!name.length){
      this.NAME_BOX_EDIT?.setText(creature ? creature.firstName : '');
      this.focusNameBox();
      return;
    }

    if(creature){
      creature.firstName = name;
    }
    this.manager.CharGenQuickPanel.step2 = true;
    GameState.CharGenManager.setStepComplete(5, true);
    this.close();
  }

  show() {
    super.show();
    const creature = GameState.CharGenManager.selectedCreature;
    this.NAME_BOX_EDIT?.setText(creature ? creature.firstName : '');
    this.focusNameBox();
  }

}
