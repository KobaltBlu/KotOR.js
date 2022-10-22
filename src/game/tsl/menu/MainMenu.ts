/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { AudioLoader } from "../../../audio/AudioLoader";
import { BinaryReader } from "../../../BinaryReader";
import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton, LBL_3DView, MenuManager } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { CharGenManager } from "../../../managers/CharGenManager";
import { OdysseyModel } from "../../../odyssey";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import { OdysseyModel3D } from "../../../three/odyssey";
import { MainMenu as K1_MainMenu } from "../../kotor/KOTOR";

/* @file
* The MainMenu menu class.
*/

export class MainMenu extends K1_MainMenu {

  declare LBL_3DVIEW: GUILabel;
  declare LB_MODULES: GUIListBox;
  declare LBL_GAMELOGO: GUILabel;
  declare LBL_BW: GUILabel;
  declare LBL_LUCAS: GUILabel;
  declare BTN_LOADGAME: GUIButton;
  declare BTN_NEWGAME: GUIButton;
  declare BTN_MOVIES: GUIButton;
  declare BTN_MUSIC: GUIButton;
  declare BTN_OPTIONS: GUIButton;
  declare LBL_NEWCONTENT: GUILabel;
  declare BTN_WARP: GUIButton;
  declare BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'mainmenu8x6_p';
    this.background = '';
    this.voidFill = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_MODULES.hide();
      this.LBL_NEWCONTENT.hide();
      this.BTN_WARP.hide();

      this.BTN_NEWGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.Start();
      });

      this.BTN_LOADGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuSaveLoad.Open();
      });

      this.BTN_MOVIES.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });

      this.BTN_OPTIONS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MainOptions.Open();
      });

      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        window.close();
      });

      let bgMusic = 'mus_sion'; 
      
      (this.tGuiPanel.widget.userData.fill as any).visible = false;

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      (this.LBL_3DVIEW.getFill().material as any).uniforms.map.value = this._3dView.texture.texture;
      (this.LBL_3DVIEW.getFill().material as any).transparent = false;
      
      GameState.ModelLoader.load({
        name: 'mainmenu01', 
        onLoad: (mdl: OdysseyModel) => {
          
          OdysseyModel3D.FromMDL(mdl, { 
            onComplete: (model: OdysseyModel3D) => {
              console.log('Model Loaded', model);
              this._3dViewModel = model;
              
              this._3dView.camera.position.copy(model.camerahook.position);
              this._3dView.camera.quaternion.copy(model.camerahook.quaternion);

              this._3dView.addModel(this._3dViewModel);
              TextureLoader.LoadQueue(() => {

                AudioLoader.LoadMusic(bgMusic, (data: any) => {
                  console.log('Loaded Background Music', bgMusic);
                  
                  GameState.audioEngine.SetBackgroundMusic(data);
                  resolve();

                  this._3dViewModel.playAnimation(0, true);
            
                }, () => {
                  console.error('Background Music not found', bgMusic);
                  resolve();
                });

              });

            },
            manageLighting: false,
            context: this._3dView
          });
        },
        onError: () => {
          resolve();
        }
      });
    });
  }

  Update(delta = 0) {
    this._3dView.render(delta);
  }

  Show() {
    super.Show();
    GameState.AlphaTest = 0.5;
  }
    
}
