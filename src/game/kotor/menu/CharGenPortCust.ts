/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

/* @file
* The CharGenPortCust menu class.
*/

export class CharGenPortCust extends GameMenu {

  LBL_HEAD: GUILabel;
  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  LBL_BEVEL_L: GUILabel;
  LBL_BEVEL_M: GUILabel;
  LBL_BEVEL_R: GUILabel;
  LBL_PORTRAIT: GUILabel;
  LBL_BEVEL_B: GUILabel;
  LBL_BEVEL_T: GUILabel;
  BTN_ARRL: GUIButton;
  BTN_ARRR: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'portcust';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Init3D() {
  let control = this.LBL_HEAD;
  OdysseyModel3D.FromMDL(this.cghead_light, {
    onComplete: model => {
      control._3dViewModel = model;
      control._3dView.addModel(control._3dViewModel);
      control.camerahook = control._3dViewModel.getObjectByName('camerahookm');
      control._3dView.camera.position.set(control.camerahook.position.x, control.camerahook.position.y, control.camerahook.position.z);
      control._3dView.camera.quaternion.set(control.camerahook.quaternion.x, control.camerahook.quaternion.y, control.camerahook.quaternion.z, control.camerahook.quaternion.w);
      control._3dViewModel.playAnimation(0, true);
    },
    manageLighting: false,
    context: control._3dView
  });
  control.getFill().material.uniforms.map.value = control._3dView.texture.texture;
  control.getFill().material.transparent = false;
  control.getFill().material.blending = 1;
}

Update(delta = 0) {
  super.Update(delta);
  if (!this.bVisible)
    return;
  try {
    let modelControl = this.LBL_HEAD;
    GameState.player.update(delta);
    modelControl._3dView.render(delta);
    modelControl.getFill().material.needsUpdate = true;
  } catch (e: any) {
    console.error(e: any);
  }
}

UpdatePortrait() {
  let portraitId = GameState.player.getPortraitId();
  let portrait = Global.kotor2DA['portraits'].rows[portraitId];
  this.LBL_PORTRAIT.show();
  if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
    this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
    TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
      this.LBL_PORTRAIT.setFillTexture(texture);
    });
  }
}

Show() {
  super.Show();
  this.appearance = GameState.player.appearance;
  this.portraidId = GameState.player.portraidId;
  try {
    GameState.player.model.parent.remove(GameState.player.model);
  } catch (e: any) {
  }
  this.LBL_HEAD._3dView.scene.add(GameState.player.model);
  this.LBL_PORTRAIT.getFill().material.blending = 1;
  this.updateCamera();
  this.UpdatePortrait();
}

updateCamera() {
  if (GameState.getCurrentPlayer().getGender() == 0) {
    this.LBL_HEAD.camerahook = this.LBL_HEAD._3dViewModel.getObjectByName('camerahookm');
  } else {
    this.LBL_HEAD.camerahook = this.LBL_HEAD._3dViewModel.getObjectByName('camerahookf');
  }
  this.LBL_HEAD._3dView.camera.position.set(this.LBL_HEAD.camerahook.position.x, this.LBL_HEAD.camerahook.position.y, this.LBL_HEAD.camerahook.position.z);
  this.LBL_HEAD._3dView.camera.quaternion.set(this.LBL_HEAD.camerahook.quaternion.x, this.LBL_HEAD.camerahook.quaternion.y, this.LBL_HEAD.camerahook.quaternion.z, this.LBL_HEAD.camerahook.quaternion.w);
  this.LBL_HEAD._3dView.camera.position.z = GameState.player.model.getObjectByName('camerahook').getWorldPosition().z;
}
  
}
