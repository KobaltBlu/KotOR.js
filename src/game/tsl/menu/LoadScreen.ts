/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIProgressBar, GUILabel } from "../../../gui";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import { LoadScreen as K1_LoadScreen } from "../../kotor/KOTOR";

/* @file
* The LoadScreen menu class.
*/

export class LoadScreen extends K1_LoadScreen {

  declare PB_PROGRESS: GUIProgressBar;
  declare LBL_HINT: GUILabel;
  declare LBL_LOGO: GUILabel;
  declare LBL_LOADING: GUILabel;
  // defaultTex: any;

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

      this.defaultTex = (this.tGuiPanel.getFill().material as any).uniforms.map.value;

      if(this.args.loadscreen.length){
        this.LoadTexture(this.args.loadscreen, (texture: OdysseyTexture) => {

          (this.tGuiPanel.getFill().material as any).uniforms.map.value = texture;

          resolve();
        });
      }else{
        resolve();
      }
    });
  }
  
}
