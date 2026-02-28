import * as THREE from "three";

import { EngineMode } from "@/enums/engine/EngineMode";
import { LoadScreen as K1_LoadScreen } from "@/game/kotor/KOTOR";
import type { GUIProgressBar, GUILabel } from "@/gui";

/**
 * LoadScreen class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LoadScreen.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LoadScreen extends K1_LoadScreen {

  engineMode: EngineMode = EngineMode.LOADING;
  declare PB_PROGRESS: GUIProgressBar;
  declare LBL_HINT: GUILabel;
  declare LBL_LOGO: GUILabel;
  declare LBL_LOADING: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'loadscreen_p';
    this.background = 'blackfill';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, _reject) => {
      this.LBL_HINT.visible = false;
      const mat = this.tGuiPanel.getFill().material;
      this.defaultTex = (mat as THREE.ShaderMaterial & { uniforms: { map: { value: THREE.Texture } } }).uniforms.map.value;
      resolve();
    });
  }
  
}

