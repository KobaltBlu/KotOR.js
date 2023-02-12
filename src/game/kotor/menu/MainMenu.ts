/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { AudioLoader } from "../../../audio/AudioLoader";
import { CurrentGame } from "../../../CurrentGame";
import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUIListBox, GUILabel, GUIButton, GUIControl, LBL_3DView, MenuManager } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { OdysseyModel } from "../../../odyssey";
import { OdysseyModel3D } from "../../../three/odyssey";
import { CharGenManager } from "../../../managers/CharGenManager";

/* @file
* The MainMenu menu class.
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
  bgMusicBuffer: Buffer;
  bgMusicResRef: string = 'mus_theme_cult';

  constructor(){
    super();
    this.gui_resref = 'mainmenu16x12';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.selectedControl = this.BTN_NEWGAME;

      this.LB_MODULES.hide();
      this.LBL_BW.hide();
      this.LBL_LUCAS.hide();
      this.LBL_NEWCONTENT.hide();
      this.BTN_WARP.hide();

      this.BTN_NEWGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.Start();
      });

      this.BTN_LOADGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //Game.LoadModule('danm14aa', null, () => { console.log('ready to load'); })
        MenuManager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        MenuManager.MenuSaveLoad.Open()
      });

      this.BTN_MOVIES.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //this.Hide();
        MenuManager.MainMovies.Open();
        //Game.LoadModule('danm14aa', null, () => { console.log('ready to load'); })
      });

      this.BTN_OPTIONS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //this.Hide();
        MenuManager.MainOptions.Open();
      });

      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        window.close();
      });

      GameState.ModelLoader.load('mainmenu').then((mdl: OdysseyModel) => {
        this.tGuiPanel.widget.userData.fill.visible = false;
        this._3dView = new LBL_3DView();
        this._3dView.setControl(this.LBL_3DVIEW);
        this._3dView.visible = true;
        (this.LBL_3DVIEW.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this._3dView.texture.texture;
        (this.LBL_3DVIEW.getFill().material as THREE.ShaderMaterial).transparent = false;
        this._3dView.setControl(this.LBL_3DVIEW);
        (this.LBL_3DVIEW.getFill().material as any).visible = true;
        
        OdysseyModel3D.FromMDL(mdl, { 
          manageLighting: false,
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
      MenuManager.ClearMenus(); 
      AudioLoader.LoadMusic(this.bgMusicResRef, (data: ArrayBuffer) => {
        GameState.audioEngine.SetBackgroundMusic(data);
        this.Open();
        resolve();
      }, () => {
        this.Open();
        console.error('Background Music not found', this.bgMusicResRef);
        resolve();
      });
    });
  }

  Update(delta = 0) {
    super.Update(delta);
    try {
      this._3dView.render(delta);
    } catch (e: any) {
      console.error(e);
    }
  }

  Show() {
    super.Show();
    GameState.audioEngine.SetBackgroundMusic(this.bgMusicBuffer);
    GameState.AlphaTest = 0.5;
    CurrentGame.InitGameInProgressFolder().then( () => {

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
    if (this.selectedControl instanceof GUIControl) {
      this.selectedControl.click();
    }
  }

  triggerControllerBPress() {
    this.BTN_EXIT.click();
  }
  
}
