/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, LBL_3DView } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { CharGenMain as K1_CharGenMain } from "../../kotor/KOTOR";

/* @file
* The CharGenMain menu class.
*/

export class CharGenMain extends K1_CharGenMain {

  declare LBL_BAR1: GUILabel;
  declare LBL_STATSBACK: GUILabel;
  declare LBL_STATSBORDER: GUILabel;
  declare LBL_VIT: GUILabel;
  declare LBL_DEF: GUILabel;
  declare NEW_WILL_LBL: GUILabel;
  declare MODEL_LBL: GUILabel;
  declare NEW_REFL_LBL: GUILabel;
  declare NEW_FORT_LBL: GUILabel;
  declare LBL_FORTITUDE: GUILabel;
  declare PORTRAIT_LBL: GUILabel;
  declare MAIN_TITLE_LBL: GUILabel;
  declare STR_LBL: GUILabel;
  declare LBL_NAME: GUILabel;
  declare DEX_LBL: GUILabel;
  declare CON_LBL: GUILabel;
  declare INT_LBL: GUILabel;
  declare WIS_LBL: GUILabel;
  declare CHA_LBL: GUILabel;
  declare STR_AB_LBL: GUILabel;
  declare DEX_AB_LBL: GUILabel;
  declare CON_AB_LBL: GUILabel;
  declare INT_AB_LBL: GUILabel;
  declare WIS_AB_LBL: GUILabel;
  declare CHA_AB_LBL: GUILabel;
  declare LBL_WILL: GUILabel;
  declare LBL_REFLEX: GUILabel;
  declare LBL_BEVEL_L: GUILabel;
  declare LBL_BEVEL_R: GUILabel;
  declare LBL_LEVEL_VAL: GUILabel;
  declare LBL_CLASS: GUILabel;
  declare LBL_PORTBORDER: GUILabel;
  declare LBL_VIT_NAME: GUILabel;
  declare LBL_DEF_NAME: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'maincg_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      this.tGuiPanel.getFill().position.z = -0.5;

        this.MODEL_LBL._3dView = new LBL_3DView();
        this.MODEL_LBL._3dView.visible = true;
        this.MODEL_LBL._3dView.camera.aspect = this.MODEL_LBL.extent.width / this.MODEL_LBL.extent.height;
        this.MODEL_LBL._3dView.camera.updateProjectionMatrix();
        this.MODEL_LBL.setFillTexture(this.MODEL_LBL._3dView.texture.texture);
        this.MODEL_LBL.getFill().material.transparent = false;

        GameState.ModelLoader.load({
          file: 'cgbody_light',
          onLoad: (mdl) => {
            this.cgbody_light = mdl;
            this.Init3D();
            resolve();
          }
        }); 
    });
  }

  Init3D() {
    let control = this.MODEL_LBL;
    OdysseyModel3D.FromMDL(this.cgbody_light, {
      onComplete: model => {
        control._3dViewModel = model;
        control._3dView.addModel(control._3dViewModel);
        control.camerahook = control._3dViewModel.getObjectByName('camerahook');
        control._3dView.camera.position.set(control.camerahook.position.x, control.camerahook.position.y, control.camerahook.position.z);
        control._3dView.camera.quaternion.set(control.camerahook.quaternion.x, control.camerahook.quaternion.y, control.camerahook.quaternion.z, control.camerahook.quaternion.w);
        control._3dView.camera.position.z = 1;
        control._3dViewModel.playAnimation(0, true);
      },
      manageLighting: false,
      context: control._3dView
    });
  }

  Update(delta = 0) {
    super.Update(delta);
    if (!this.bVisible)
      return;
    try {
      let modelControl = this.MODEL_LBL;
      GameState.player.update(delta);
      modelControl._3dView.render(delta);
      modelControl.getFill().material.needsUpdate = true;
    } catch (e: any) {
      console.error(e);
    }
  }

  Hide() {
    super.Hide();
  }

  Show() {
    super.Show();
    GameState.MenuActive = true;
    try {
      GameState.player.model.parent.remove(GameState.player.model);
    } catch (e: any) {
    }
    this.MODEL_LBL._3dView.scene.add(GameState.player.model);
    let portraitId = GameState.player.getPortraitId();
    let portrait = Global.kotor2DA['portraits'].rows[portraitId];
    this.PORTRAIT_LBL.show();
    if (this.PORTRAIT_LBL.getFillTextureName() != portrait.baseresref) {
      this.PORTRAIT_LBL.setFillTextureName(portrait.baseresref);
      TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
        this.PORTRAIT_LBL.setFillTexture(texture);
      });
    }
  }
  
}
