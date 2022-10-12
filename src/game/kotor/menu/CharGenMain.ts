/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel } from "../../../gui";

/* @file
* The CharGenMain menu class.
*/

export class CharGenMain extends GameMenu {

  LBL_VIT: GUILabel;
  LBL_DEF: GUILabel;
  OLD_FORT_LBL: GUILabel;
  OLD_REFL_LBL: GUILabel;
  NEW_WILL_LBL: GUILabel;
  MODEL_LBL: GUILabel;
  FORT_ARROW_LBL: GUILabel;
  WILL_ARROW_LBL: GUILabel;
  NEW_REFL_LBL: GUILabel;
  OLD_WILL_LBL: GUILabel;
  NEW_FORT_LBL: GUILabel;
  LBL_FORTITUDE: GUILabel;
  PORTRAIT_LBL: GUILabel;
  MAIN_TITLE_LBL: GUILabel;
  STR_LBL: GUILabel;
  LBL_NAME: GUILabel;
  DEX_LBL: GUILabel;
  CON_LBL: GUILabel;
  INT_LBL: GUILabel;
  WIS_LBL: GUILabel;
  CHA_LBL: GUILabel;
  STR_AB_LBL: GUILabel;
  DEX_AB_LBL: GUILabel;
  CON_AB_LBL: GUILabel;
  INT_AB_LBL: GUILabel;
  WIS_AB_LBL: GUILabel;
  CHA_AB_LBL: GUILabel;
  OLD_VIT_LBL: GUILabel;
  OLD_DEF_LBL: GUILabel;
  NEW_VIT_LBL: GUILabel;
  NEW_DEF_LBL: GUILabel;
  OLD_LBL: GUILabel;
  NEW_LBL: GUILabel;
  VIT_ARROW_LBL: GUILabel;
  DEF_ARROW_LBL: GUILabel;
  LBL_WILL: GUILabel;
  LBL_REFLEX: GUILabel;
  LBL_BEVEL_L: GUILabel;
  LBL_BEVEL_R: GUILabel;
  LBL_BEVEL_M: GUILabel;
  REFL_ARROW_LBL: GUILabel;
  LBL_LEVEL_VAL: GUILabel;
  LBL_LEVEL: GUILabel;
  LBL_CLASS: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'maincg';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
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
    console.error(e: any);
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
  GameState.player.model.rotation.z = -Math.PI / 2;
  let portraitId = GameState.player.getPortraitId();
  let portrait = Global.kotor2DA['portraits'].rows[portraitId];
  GameState.CharGenQuickPanel.tGuiPanel.widget.position.x = 142.5;
  GameState.CharGenQuickPanel.tGuiPanel.widget.position.y = 0;
  this.PORTRAIT_LBL.show();
  if (this.PORTRAIT_LBL.getFillTextureName() != portrait.baseresref) {
    this.PORTRAIT_LBL.setFillTextureName(portrait.baseresref);
    TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
      this.PORTRAIT_LBL.setFillTexture(texture);
    });
  }
}

updateAttributes() {
}
  
}
