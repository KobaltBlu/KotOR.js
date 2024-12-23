import { AudioLoader } from "../../../audio/AudioLoader";
import { CurrentGame } from "../../../CurrentGame";
import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";
import { GameState } from "../../../GameState";
import { GameMenu, LBL_3DView } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { MDLLoader, TextureLoader } from "../../../loaders";
import { OdysseyModel } from "../../../odyssey";
import { OdysseyModel3D } from "../../../three/odyssey";
import { AudioEngine } from "../../../audio/AudioEngine";

/**
 * MainMenu class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MainMenu.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MainMenu extends GameMenu {

  LB_MODULES: GUIListBox;
  LBL_3DVIEW: GUILabel;
  LBL_GAMELOGO: GUILabel;
  LBL_BW: GUILabel;
  LBL_LUCAS: GUILabel;
  LBL_MENUBG: GUILabel;
  BTN_LOADGAME: GUIButton;
  BTN_NEWGAME: GUIButton;
  BTN_MOVIES: GUIButton;
  BTN_OPTIONS: GUIButton;
  LBL_NEWCONTENT: GUILabel;
  BTN_WARP: GUIButton;
  BTN_EXIT: GUIButton;
  _3dViewModel: OdysseyModel3D;
  _3dView: LBL_3DView;
  bgMusicBuffer: ArrayBuffer;
  bgMusicResRef: string = 'mus_theme_cult';

  constructor(){
    super();
    this.gui_resref = 'mainmenu16x12';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.selectedControl = this.BTN_NEWGAME;

      this.LB_MODULES.hide();
      this.LBL_BW.hide();
      this.LBL_LUCAS.hide();
      this.LBL_NEWCONTENT.hide();
      this.BTN_WARP.hide();

      this.BTN_NEWGAME.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.Start();
      });

      this.BTN_LOADGAME.addEventListener('click', (e) => {
        e.stopPropagation();
        //Game.LoadModule('danm14aa', null, () => { console.log('ready to load'); })
        this.manager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        this.manager.MenuSaveLoad.open()
      });

      this.BTN_MOVIES.addEventListener('click', (e) => {
        e.stopPropagation();
        //this.Hide();
        this.manager.MainMovies.open();
        //Game.LoadModule('danm14aa', null, () => { console.log('ready to load'); })
      });

      this.BTN_OPTIONS.addEventListener('click', (e) => {
        e.stopPropagation();
        //this.Hide();
        this.manager.MainOptions.open();
      });

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        window.close();
      });

      MDLLoader.loader.load('mainmenu').then((mdl: OdysseyModel) => {
        this.tGuiPanel.widget.userData.fill.visible = false;
        this._3dView = new LBL_3DView();
        this._3dView.setControl(this.LBL_3DVIEW);
        this._3dView.visible = true;
        (this.LBL_3DVIEW.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this._3dView.texture.texture;
        (this.LBL_3DVIEW.getFill().material as THREE.ShaderMaterial).transparent = false;
        this._3dView.setControl(this.LBL_3DVIEW);
        (this.LBL_3DVIEW.getFill().material as any).visible = true;
        
        OdysseyModel3D.FromMDL(mdl, { 
          // manageLighting: false,
          context: this._3dView
        }).then( (model: OdysseyModel3D) => {
          console.log('Model Loaded', model);
          this._3dViewModel = model;
          
          this._3dView.camera.position.copy(model.camerahook.position);
          this._3dView.camera.quaternion.copy(model.camerahook.quaternion);

          this._3dView.addModel(this._3dViewModel);
          TextureLoader.LoadQueue(() => {
            this._3dViewModel.playAnimation(0, true);
            resolve();
          });
        }).catch((e: any) => {

        });
      });
    });
  }

  Start(){
    return new Promise<void>( (resolve, reject) => {
      this.manager.ClearMenus(); 
      AudioLoader.LoadMusic(this.bgMusicResRef).then((data: ArrayBuffer) => {
        AudioEngine.GetAudioEngine().setBackgroundMusic(data);
        this.open();
        resolve();
      }, () => {
        this.open();
        console.error('Background Music not found', this.bgMusicResRef);
        resolve();
      });
    });
  }

  update(delta = 0) {
    super.update(delta);
    try {
      this._3dView.render(delta);
    } catch (e: any) {
      console.error(e);
    }
  }

  show() {
    super.show();
    AudioEngine.GetAudioEngine().setBackgroundMusic(this.bgMusicBuffer);
    GameState.AlphaTest = 0.5;
    CurrentGame.InitGameInProgressFolder(false).then( () => {

    });
  }

  triggerControllerDUpPress() {
    if (!this.selectedControl) {
      this.selectedControl = this.BTN_NEWGAME;
    }
    this.BTN_NEWGAME.onHoverOut();
    this.BTN_LOADGAME.onHoverOut();
    this.BTN_MOVIES.onHoverOut();
    this.BTN_OPTIONS.onHoverOut();
    this.BTN_EXIT.onHoverOut();
    if (this.selectedControl == this.BTN_EXIT) {
      this.selectedControl = this.BTN_OPTIONS;
    } else if (this.selectedControl == this.BTN_OPTIONS) {
      this.selectedControl = this.BTN_MOVIES;
    } else if (this.selectedControl == this.BTN_MOVIES) {
      this.selectedControl = this.BTN_LOADGAME;
    } else if (this.selectedControl == this.BTN_LOADGAME) {
      this.selectedControl = this.BTN_NEWGAME;
    } else if (this.selectedControl == this.BTN_NEWGAME) {
      this.selectedControl = this.BTN_EXIT;
    }
    this.selectedControl.onHoverIn();
  }

  triggerControllerDDownPress() {
    if (!this.selectedControl) {
      this.selectedControl = this.BTN_NEWGAME;
    }
    this.BTN_NEWGAME.onHoverOut();
    this.BTN_LOADGAME.onHoverOut();
    this.BTN_MOVIES.onHoverOut();
    this.BTN_OPTIONS.onHoverOut();
    this.BTN_EXIT.onHoverOut();
    if (this.selectedControl == this.BTN_NEWGAME) {
      this.selectedControl = this.BTN_LOADGAME;
    } else if (this.selectedControl == this.BTN_LOADGAME) {
      this.selectedControl = this.BTN_MOVIES;
    } else if (this.selectedControl == this.BTN_MOVIES) {
      this.selectedControl = this.BTN_OPTIONS;
    } else if (this.selectedControl == this.BTN_OPTIONS) {
      this.selectedControl = this.BTN_EXIT;
    } else if (this.selectedControl == this.BTN_EXIT) {
      this.selectedControl = this.BTN_NEWGAME;
    }
    this.selectedControl.onHoverIn();
  }

  triggerControllerAPress() {
    if (this.selectedControl) {
      this.selectedControl.click();
    }
  }

  triggerControllerBPress() {
    this.BTN_EXIT.click();
  }
  
}
