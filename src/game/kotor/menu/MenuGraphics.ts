import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUISlider, GUICheckBox } from "../../../gui";

/**
 * MenuGraphics class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGraphics.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGraphics extends GameMenu {

  LBL_TITLE: GUILabel;
  SLI_GAMMA: GUISlider;
  LBL_GAMMA: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;
  BTN_RESOLUTION: GUIButton;
  CB_SHADOWS: GUICheckBox;
  CB_GRASS: GUICheckBox;
  BTN_ADVANCED: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgraphics';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        /*this.Hide();
        if(Game.Mode == Game.MODES.INGAME){
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
          //Game.module.grassMaterial.visible = value;
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
