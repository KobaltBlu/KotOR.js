/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { LoadScreen as K1_LoadScreen, GUIProgressBar, GUILabel } from "../../../gui";

/* @file
* The LoadScreen menu class.
*/

export class LoadScreen extends K1_LoadScreen {

  declare PB_PROGRESS: GUIProgressBar;
  declare LBL_HINT: GUILabel;
  declare LBL_LOGO: GUILabel;
  declare LBL_LOADING: GUILabel;
  defaultTex: any;

  constructor(){
    super();
    this.gui_resref = 'loadscreen_p';
    this.background = 'blackfill';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {

      //this.showRandomHint();

      this.LBL_HINT.visible = false;

      this.defaultTex = this.tGuiPanel.getFill().material.uniforms.map.value;

      if(this.args.loadscreen.length){
        this.LoadTexture(this.args.loadscreen, (texture) => {

          this.tGuiPanel.getFill().material.uniforms.map.value = texture;

          resolve();
        });
      }else{
        resolve();
      }
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
        } else {
          this.tGuiPanel.getFill().material.uniforms.map.value = this.defaultTex;
        }
        if (typeof onLoad === 'function')
          onLoad();
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
    FadeOverlayManager.plane.visible = false;
  }

  Hide() {
    super.Hide();
    FadeOverlayManager.plane.visible = true;
  }
  
}
