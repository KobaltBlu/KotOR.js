import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUILabel, GUIProgressBar } from "../../../gui";

/**
 * LoadScreen class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LoadScreen.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LoadScreen extends GameMenu {

  engineMode: EngineMode = EngineMode.LOADING;
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_HINT.visible = false;
      (this.defaultTex = this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value;
      resolve();
    });
  }

  setProgress(val = 0) {
    this.PB_PROGRESS.setProgress(val);
  }

  setLoadBackground(resref: string): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      if (resref) {
        const texture = await this.loadTexture(resref);
        if (texture) {
          (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = texture;
          resolve(true);
          return;
        } else {
          const default_texture = await this.loadTexture('load_default');
          if(default_texture){
            (this.tGuiPanel.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this.defaultTex = default_texture;
            resolve(true);
            return;
          }else{
            resolve(true);
            return;
          }
        }
      } else {
        resolve(false);
        return;
      }
    });
  }

  showRandomHint() {
    this.LBL_LOADING.setText(GameState.TLKManager.TLKStrings[42493].Value);
    let id = Math.floor(Math.random() * (GameState.TwoDAManager.datatables.get('loadscreenhints').RowCount - 0 + 1)) + 0;
    let hint = GameState.TwoDAManager.datatables.get('loadscreenhints').rows[id];
    if (!hint) {
      console.log('showRandomHint', id);
      hint = GameState.TwoDAManager.datatables.get('loadscreenhints').rows[0];
    }
    this.LBL_HINT.setText(GameState.TLKManager.TLKStrings[hint.gameplayhint].Value);
  }

  showSavingMessage() {
    this.LBL_LOADING.setText(GameState.TLKManager.TLKStrings[42528].Value);
    this.LBL_HINT.setText(GameState.TLKManager.TLKStrings[41926].Value);
    this.setProgress(0);
  }

  setHintMessage(message: string = ''){
    this.LBL_HINT.setText(message);
  }

  show() {
    super.show();
    this.setProgress(0);
    GameState.FadeOverlayManager.plane.visible = false;
  }

  hide() {
    super.hide();
    GameState.FadeOverlayManager.plane.visible = true;
    this.setProgress(0);
  }
  
}
