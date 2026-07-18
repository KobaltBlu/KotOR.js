import { GameState } from "@/GameState";
import type { GUILabel, GUIButton } from "@/gui";
import { CharGenClasses } from "@/game/CharGenClasses";
import { CharGenPortCust as K1_CharGenPortCust } from "@/game/kotor/KOTOR";

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

  private async cycleAppearance(direction: -1 | 1) {
    if(this.isCharLoading) return;
    this.isCharLoading = true;
    try{
      const creature = GameState.CharGenManager.selectedCreature;
      const appearances = CharGenClasses[GameState.CharGenManager.selectedClass].appearances;
      let idx = appearances.indexOf(creature.appearance);
      if(direction < 0){
        creature.appearance = idx <= 0 ? appearances[appearances.length - 1] : appearances[idx - 1];
      }else{
        creature.appearance = idx >= appearances.length - 1 ? appearances[0] : appearances[idx + 1];
      }
      creature.setAppearance(creature.appearance);

      for(let i = 0; i < GameState.SWRuleSet.portraits.length; i++){
        const port = GameState.SWRuleSet.portraits[i];
        if(
          port.appearancenumber == creature.appearance ||
          port.appearance_l == creature.appearance ||
          port.appearance_s == creature.appearance
        ){
          creature.portraitId = i;
          creature.portrait = port;
          break;
        }
      }

      const model = await creature.loadModel();
      this.updateCamera();
      this.UpdatePortrait();
      if(model){
        model.rotation.z = -Math.PI/2;
        model.removeFromParent();
        this._3dView.addModel(model);
      }
    }finally{
      this.isCharLoading = false;
    }
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;

    this.BTN_ARRL.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.cycleAppearance(-1);
    });

    this.BTN_ARRR.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.cycleAppearance(1);
    });

    this.BTN_BACK.addEventListener('click', async (e) => {
      e.stopPropagation();
      const creature = GameState.CharGenManager.selectedCreature;
      if(this.exiting) return;
      this.exiting = true;
      try{
        creature.appearance = this.appearance;
        creature.portraitId = this.portraitId;
        if(GameState.SWRuleSet.portraits?.[this.portraitId]){
          creature.portrait = GameState.SWRuleSet.portraits[this.portraitId];
        }
        creature.setAppearance(creature.appearance);
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
      creature.template.getFieldByLabel('Appearance_Type').setValue(creature.appearance);
      creature.template.getFieldByLabel('PortraitId').setValue(creature.portraitId);
      this.manager.CharGenQuickPanel?.portraitCreationCompleted?.();
      this.manager.CharGenCustomPanel?.portraitCreationCompleted?.();
      this.manager.CharGenMain?.updateAttributes?.();
      this.close();
    });

    this.tGuiPanel.widget.userData.fill.position.z = -0.5

    this._3dView.visible = true;
    this._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
    this._3dView.camera.updateProjectionMatrix();
    this.LBL_HEAD.setFillTexture(this._3dView.texture.texture);

    this.Init3D();
  }
  
}
