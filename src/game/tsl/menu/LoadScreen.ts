import type { GUIProgressBar, GUILabel } from "@/gui";
import { LoadScreen as K1_LoadScreen } from "@/game/kotor/KOTOR";
import { EngineMode } from "@/enums/engine/EngineMode";

/**
 * LoadScreen class.
 *
 * retail (loadscreen_p).
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
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LBL_HINT.hide();
      this.defaultTex = (this.tGuiPanel.getFill().material as any).uniforms.map.value;
      resolve();
    });
  }

}
