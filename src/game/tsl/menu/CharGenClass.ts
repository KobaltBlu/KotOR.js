import type { GUILabel, GUIButton } from "@/gui";
import { OdysseyModel } from "@/odyssey";
import { CharGenClass as K1_CharGenClass } from "@/game/kotor/KOTOR";

/**
 * CharGenClass class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenClass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenClass extends K1_CharGenClass {

  declare _3D_MODEL2: GUILabel;
  declare LBL_CHAR_GEN: GUILabel;
  declare LBL_CLASS: GUILabel;
  declare LBL_INSTRUCTION: GUILabel;
  declare _3D_MODEL1: GUILabel;
  declare LBL_DESC: GUILabel;
  declare BTN_BACK: GUIButton;
  declare _3D_MODEL3: GUILabel;
  declare _3D_MODEL4: GUILabel;
  declare _3D_MODEL5: GUILabel;
  declare _3D_MODEL6: GUILabel;
  declare BTN_SEL1: GUIButton;
  declare BTN_SEL2: GUIButton;
  declare BTN_SEL3: GUIButton;
  declare BTN_SEL4: GUIButton;
  declare BTN_SEL6: GUIButton;
  declare BTN_SEL5: GUIButton;
  cgmain_light: OdysseyModel;

  constructor(){
    super();
    this.gui_resref = 'classsel_p';
    this.background = '';
    this.voidFill = false;
    this.userCanClose = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      //The K1 initializer was skipped: wire the shared slot/back listeners here.
      //Slots map to the TSL classes (Consular/Sentinel/Guardian) through CharGenClasses.
      this.wireControls();

      this.tGuiPanel.getFill().position.z = -0.5;

      this.initModelViews();

      this.captureBaseExtents();

      resolve();
    });
  }

}
