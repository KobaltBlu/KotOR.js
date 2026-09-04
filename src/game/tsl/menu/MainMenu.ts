import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { MenuSaveLoadMode } from "@/enums/gui/MenuSaveLoadMode";
import { GameState } from "@/GameState";
import { LBL_3DView } from "@/gui";
import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { MDLLoader, TextureLoader } from "@/loaders";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { MainMenu as K1_MainMenu } from "@/game/kotor/KOTOR";

/**
 * MainMenu class.
 *
 * retail (mainmenu8x6_p) — TSL adds Music between Movies and Options.
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
    this.background = 'blackfill';
    this.voidFill = true;
    this.userCanClose = false;
  }

  /** TSL: New → Load → Movies → Music → Options → Exit. */
  protected getNavButtons(): GUIButton[] {
    return [
      this.BTN_NEWGAME,
      this.BTN_LOADGAME,
      this.BTN_MOVIES,
      this.BTN_MUSIC,
      this.BTN_OPTIONS,
      this.BTN_EXIT,
    ].filter((b): b is GUIButton => !!b);
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.selectedControl = this.BTN_NEWGAME;
      this._button_a = this.BTN_NEWGAME;
      this._button_b = this.BTN_EXIT;

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
        if (ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON) {
          window.close();
        }else{
          if(window.opener){
            window.close();
            return;
          }
          alert('To exit the game in your browser, close this tab or window. For the best experience, open the game from the KotOR.js launcher so Exit Game works from the menu.');
        }
      });

      (this.tGuiPanel.widget.userData.fill as any).visible = false;

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      (this.LBL_3DVIEW.getFill().material as any).transparent = false;
      this._3dView.setControl(this.LBL_3DVIEW);
      this.LBL_3DVIEW.setFillTexture(this._3dView.texture.texture);
      (this.LBL_3DVIEW.getFill().material as any).visible = true;

      MDLLoader.loader.load('mainmenu01')
      .then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: this._3dView
        }).then((model: OdysseyModel3D) => {
          this._3dViewModel = model;

          this._3dView.camera.position.copy(model.camerahook.position);
          this._3dView.camera.quaternion.copy(model.camerahook.quaternion);

          this._3dView.addModel(this._3dViewModel);
          TextureLoader.LoadQueue().then(() => {
            this._3dViewModel.playAnimation(0, true);
            resolve();
          }).catch(() => resolve());
        }).catch(() => resolve());
      }).catch(() => resolve());
    });
  }

  update(delta = 0) {
    super.update(delta);
  }

  show() {
    super.show();
    GameState.AlphaTest = 0.5;
  }

}
