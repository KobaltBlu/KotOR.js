/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIProgressBar, GUILabel } from "../../../gui";

/* @file
* The LoadScreen menu class.
*/

export class LoadScreen extends GameMenu {

  PB_PROGRESS: GUIProgressBar;
  LBL_HINT: GUILabel;
  LBL_LOGO: GUILabel;
  LBL_LOADING: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'loadscreen';
    this.background = '1600x1200load';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

setProgress(val = 0) {
  this.pb_progress.setProgress(val);
}

setLoadBackground(resref = null, onLoad = null) {
  if (resref) {
    this.LoadTexture(resref, texture => {
      if (texture) {
        this.tGuiPanel.getFill().material.uniforms.map.value = texture;
        if (typeof onLoad === 'function')
          onLoad();
      } else {
        this.LoadTexture('load_default', texture => {
          this.tGuiPanel.getFill().material.uniforms.map.value = this.defaultTex = texture;
          if (typeof onLoad === 'function')
            onLoad();
        });
      }
    });
  } else {
    if (typeof onLoad === 'function')
      onLoad();
  }
}

showRandomHint() {
  this.lbl_name.setText(TLKManager.TLKStrings[42493].Value);
  let id = Math.floor(Math.random() * (Global.kotor2DA.loadscreenhints.RowCount - 0 + 1)) + 0;
  let hint = Global.kotor2DA.loadscreenhints.rows[id];
  if (!hint) {
    console.log('showRandomHint', id);
    hint = Global.kotor2DA.loadscreenhints.rows[0];
  }
  this.lbl_hint.setText(TLKManager.TLKStrings[hint.gameplayhint].Value);
}

showSavingMessage() {
  this.lbl_name.setText(TLKManager.TLKStrings[42528].Value);
  this.lbl_hint.setText(TLKManager.TLKStrings[41926].Value);
  this.setProgress(0);
}

Show() {
  super.Show();
  this.setProgress(0);
  GameState.InGameAreaTransition.Hide();
  GameState.FadeOverlay.plane.visible = false;
}

Hide() {
  super.Hide();
  GameState.FadeOverlay.plane.visible = true;
  this.setProgress(0);
}
  
}
