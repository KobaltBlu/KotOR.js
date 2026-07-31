import { GameState } from "@/GameState";
import type { GUILabel, GUIButton } from "@/gui";
import { CharGenPortCust as K1_CharGenPortCust } from "@/game/kotor/KOTOR";
import * as THREE from "three";

/**
 * CharGenPortCust class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenPortCust.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenPortCust extends K1_CharGenPortCust {

  declare LBL_HEAD: GUILabel;
  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare LBL_BEVEL_M: GUILabel;
  declare LBL_PORTRAIT: GUILabel;
  declare LBL_BEVEL_B: GUILabel;
  declare LBL_BEVEL_T: GUILabel;
  declare BTN_ARRL: GUIButton;
  declare BTN_ARRR: GUIButton;
  declare LBL_BEVEL_L: GUILabel;
  declare LBL_BEVEL_R: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_BAR6: GUILabel;
  declare LBL_BAR7: GUILabel;
  declare LBL_BAR8: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_ACCEPT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'portcust_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;

    this.BTN_ARRL.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.cyclePortrait(-1);
    });

    this.BTN_ARRR.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.cyclePortrait(1);
    });

    this.BTN_BACK.addEventListener('click', async (e) => {
      e.stopPropagation();
      const creature = GameState.CharGenManager.selectedCreature;
      if(this.exiting) return;
      this.exiting = true;
      try{
        GameState.CharGenManager.applyPortraitAppearance(
          creature,
          this.appearance,
          this.portraitId
        );
        creature.appearanceHead = this.appearanceHead;
        await creature.loadModel();
        this.close();
      }finally{
        this.exiting = false;
        this.isCharLoading = false;
      }
    });

    this.BTN_ACCEPT.addEventListener('click', (e) => {
      e.stopPropagation();
      const creature = GameState.CharGenManager.selectedCreature;
      const entry = this.portraitList[this.portraitListIndex];
      if(entry){
        GameState.CharGenManager.applyPortraitAppearance(
          creature,
          entry.appearanceId,
          entry.portraitId
        );
      }else{
        creature.template.getFieldByLabel('Appearance_Type')?.setValue(creature.appearance);
        creature.template.getFieldByLabel('PortraitId')?.setValue(creature.portraitId);
        creature.template.getFieldByLabel('Appearance_Head')?.setValue(creature.appearanceHead);
      }
      this.manager.CharGenQuickPanel?.portraitCreationCompleted?.();
      this.manager.CharGenCustomPanel?.portraitCreationCompleted?.();
      this.manager.CharGenMain?.updateAttributes?.();
      this.close();
    });

    this.tGuiPanel.widget.userData.fill.position.z = -0.5

    this._3dView.visible = true;
    this._3dView.setControl(this.LBL_HEAD);
    this._3dView.setViewAngle();
    (this.LBL_HEAD.getFill().material as THREE.ShaderMaterial).transparent = false;

    this.Init3D();
  }

}
