/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUISlider, GUIListBox, GUIButton, GUICheckBox, MenuManager } from "../../../gui";

/* @file
* The MenuGraphics menu class.
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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        /*this.Hide();
        if(Game.Mode == Game.MODES.INGAME){
          MenuManager.MenuOptions.Show();
        }else{
          MenuManager.MainOptions.Show();
        }*/
        this.Close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_ADVANCED.addEventListener('click', (e: any) => {
        MenuManager.MenuGraphicsAdvanced.Open();
      });

      this.SLI_GAMMA.onValueChanged = (value: any) => {
        //let gamma = (1.5 * value) + .25;
        let contrast = (50 * ((value*2) - 1) )*-1;

        GameState.canvas.style.filter = 'contrast('+(100 + contrast)+'%)';
      };

      this.BTN_RESOLUTION.addEventListener('click', (e: any) => {
        MenuManager.MenuResolutions.Open();
      });

      this.BTN_RESOLUTION.hide();

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
