import { GameState } from "../../../GameState";
import type { GUILabel, GUISlider, GUIListBox, GUIButton, GUICheckBox } from "../../../gui";
import { MenuGraphics as K1_MenuGraphics } from "../../kotor/KOTOR";

/**
 * MenuGraphics class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGraphics.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGraphics extends K1_MenuGraphics {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare SLI_GAMMA: GUISlider;
  declare LBL_GAMMA: GUILabel;
  declare LB_DESC: GUIListBox;
  declare BTN_RESOLUTION: GUIButton;
  declare CB_SHADOWS: GUICheckBox;
  declare CB_GRASS: GUICheckBox;
  declare BTN_ADVANCED: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgraphics_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        /*this.Hide();
        if(GameState.Mode == EngineMode.INGAME){
          this.manager.MenuOptions.Show();
        }else{
          this.manager.MainOptions.Show();
        }*/
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_ADVANCED.addEventListener('click', (e) => {
        this.manager.MenuGraphicsAdvanced.open();
      });

      this.SLI_GAMMA.onValueChanged = (value: any) => {
        //let gamma = (1.5 * value) + .25;
        let contrast = (50 * ((value*2) - 1) )*-1;

        GameState.canvas.style.filter = 'contrast('+(100 + contrast)+'%)';
      };

      this.BTN_RESOLUTION.addEventListener('click', (e) => {
        this.manager.MenuResolutions.open();
      });

      // this.BTN_RESOLUTION.hide();

      this.CB_GRASS.onValueChanged = (value: any) => {
        //Toggle Grass
        if(GameState.module){
          //GameState.module.grassMaterial.visible = value;
        }
      };
      this.CB_GRASS.attachINIProperty('Graphics Options.Grass');

      this.CB_SHADOWS.onValueChanged = () => {
        //Toggle Shadows
      };
      this.CB_SHADOWS.attachINIProperty('Graphics Options.Shadows');
      resolve();
    });
  }
  
}
