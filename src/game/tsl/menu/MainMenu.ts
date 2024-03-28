import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";
import { GameState } from "../../../GameState";
import { LBL_3DView } from "../../../gui";
import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MDLLoader, TextureLoader } from "../../../loaders";
import { OdysseyModel } from "../../../odyssey";
import { OdysseyModel3D } from "../../../three/odyssey";
import { MainMenu as K1_MainMenu } from "../../kotor/KOTOR";

/**
 * MainMenu class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MainMenu.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  bgMusicResRef: string = 'mus_sion';

  constructor(){
    super();
    this.gui_resref = 'mainmenu8x6_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_MODULES.hide();
      this.LBL_NEWCONTENT.hide();
      this.BTN_WARP.hide();

      this.BTN_NEWGAME.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.Start();
      });

      this.BTN_LOADGAME.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        this.manager.MenuSaveLoad.open();
      });

      this.BTN_MOVIES.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MainMovies.open();
      });

      this.BTN_MUSIC.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MainMusic.open();
      });

      this.BTN_OPTIONS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MainOptions.open();
      });

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        window.close();
      });
      
      (this.tGuiPanel.widget.userData.fill as any).visible = false;

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      (this.LBL_3DVIEW.getFill().material as any).uniforms.map.value = this._3dView.texture.texture;
      (this.LBL_3DVIEW.getFill().material as any).transparent = false;
      this._3dView.setControl(this.LBL_3DVIEW);
      (this.LBL_3DVIEW.getFill().material as any).visible = true;
      
      MDLLoader.loader.load('mainmenu01')
      .then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          // manageLighting: false,
          context: this._3dView
        }).then((model: OdysseyModel3D) => {
          console.log('Model Loaded', model);
          this._3dViewModel = model;
          
          this._3dView.camera.position.copy(model.camerahook.position);
          this._3dView.camera.quaternion.copy(model.camerahook.quaternion);

          this._3dView.addModel(this._3dViewModel);
          TextureLoader.LoadQueue(() => {
            this._3dViewModel.playAnimation(0, true);
            resolve();
          });
        }).catch(resolve);
      }).catch(resolve);
    });
  }

  update(delta = 0) {
    this._3dView.render(delta);
  }

  show() {
    super.show();
    GameState.AlphaTest = 0.5;
  }
    
}
