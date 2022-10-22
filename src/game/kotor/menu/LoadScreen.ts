/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIProgressBar, GUILabel, MenuManager } from "../../../gui";
import { FadeOverlayManager } from "../../../managers/FadeOverlayManager";
import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";

/* @file
* The LoadScreen menu class.
*/

export class LoadScreen extends GameMenu {

  PB_PROGRESS: GUIProgressBar;
  LBL_HINT: GUILabel;
  LBL_LOGO: GUILabel;
  LBL_LOADING: GUILabel;
  defaultTex: any;

  constructor(){
    super();
    this.gui_resref = 'loadscreen';
    this.background = '1600x1200load';
    this.voidFill = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      //this.showRandomHint();

      this.LBL_HINT.visible = false;

      (this.defaultTex = this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value;

      resolve();
    });
  }

  setProgress(val = 0) {
    this.PB_PROGRESS.setProgress(val);
  }

  setLoadBackground(resref: string, onLoad?: Function) {
    if (resref) {
      this.LoadTexture(resref, (texture: OdysseyTexture) => {
        if (texture) {
          (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = texture;
          if (typeof onLoad === 'function')
            onLoad();
        } else {
          this.LoadTexture('load_default', (texture: OdysseyTexture) => {
            (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this.defaultTex = texture;
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
    this.LBL_LOADING.setText(TLKManager.TLKStrings[42493].Value);
    let id = Math.floor(Math.random() * (TwoDAManager.datatables.get('loadscreenhints').RowCount - 0 + 1)) + 0;
    let hint = TwoDAManager.datatables.get('loadscreenhints').rows[id];
    if (!hint) {
      console.log('showRandomHint', id);
      hint = TwoDAManager.datatables.get('loadscreenhints').rows[0];
    }
    this.LBL_HINT.setText(TLKManager.TLKStrings[hint.gameplayhint].Value);
  }

  showSavingMessage() {
    this.LBL_LOADING.setText(TLKManager.TLKStrings[42528].Value);
    this.LBL_HINT.setText(TLKManager.TLKStrings[41926].Value);
    this.setProgress(0);
  }

  Show() {
    super.Show();
    this.setProgress(0);
    MenuManager.InGameAreaTransition.Hide();
    FadeOverlayManager.plane.visible = false;
  }

  Hide() {
    super.Hide();
    FadeOverlayManager.plane.visible = true;
    this.setProgress(0);
  }
  
}
