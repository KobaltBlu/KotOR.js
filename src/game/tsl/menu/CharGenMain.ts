import { LBL_3DView, type GUILabel } from "../../../gui";
import { CharGenMain as K1_CharGenMain } from "../../kotor/KOTOR";

/**
 * CharGenMain class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenMain.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.tGuiPanel.getFill().position.z = -0.5;

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      this._3dView.camera.aspect = this.MODEL_LBL.extent.width / this.MODEL_LBL.extent.height;
      this._3dView.camera.updateProjectionMatrix();
      this.MODEL_LBL.setFillTexture(this._3dView.texture.texture);
      (this.MODEL_LBL.getFill().material as THREE.ShaderMaterial).transparent = true;
      (this.MODEL_LBL.getFill().material as THREE.ShaderMaterial).blending = 1;

      this.Init3D();
      resolve(); 
    });
  }
  
}
