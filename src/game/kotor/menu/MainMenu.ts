import { AudioLoader } from "@/audio/AudioLoader";
import { CurrentGame } from "@/engine/CurrentGame";
import { MenuSaveLoadMode } from "@/enums/gui/MenuSaveLoadMode";
import { GameState } from "@/GameState";
import { GameMenu, LBL_3DView } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { MDLLoader, TextureLoader } from "@/loaders";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
import { AudioEngine } from "@/audio/AudioEngine";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";

/**
 * MainMenu class.
 *
 * — title screen buttons, 3D backdrop, theme music.
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
    this.userCanClose = false;
  }

  /** Visible title buttons in order (New → Load → Movies → Options → Exit). */
  protected getNavButtons(): GUIButton[] {
    return [
      this.BTN_NEWGAME,
      this.BTN_LOADGAME,
      this.BTN_MOVIES,
      this.BTN_OPTIONS,
      this.BTN_EXIT,
    ].filter((b): b is GUIButton => !!b);
  }

  protected clearNavHover() {
    for(const btn of this.getNavButtons()){
      btn.onHoverOut();
    }
  }

  protected selectNavButton(btn: GUIButton) {
    this.clearNavHover();
    // Force re-apply hover even when focus is unchanged (e.g. menu show).
    if(this.selectedControl === btn){
      this.selectedControl = undefined;
    }
    this.setActiveControl(btn);
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.selectedControl = this.BTN_NEWGAME;
      this._button_a = this.BTN_NEWGAME;
      this._button_b = this.BTN_EXIT;

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
        this.manager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        this.manager.MenuSaveLoad.open();
      });

      this.BTN_MOVIES.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MainMovies.open();
      });

      this.BTN_OPTIONS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MainOptions.open();
      });

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onExitPicked();
      });

      MDLLoader.loader.load('mainmenu').then((mdl: OdysseyModel) => {
        this.tGuiPanel.hideFill();
        this._3dView = new LBL_3DView();
        this._3dView.setControl(this.LBL_3DVIEW);
        this._3dView.visible = true;
        this.LBL_3DVIEW.setFillTexture(this._3dView.texture.texture);
        this.LBL_3DVIEW.setFillOpaque(true);

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

  protected onExitPicked() {
    if (ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON) {
      window.close();
    }else{
      if(window.opener){
        window.close();
        return;
      }
      alert('To exit the game in your browser, close this tab or window. For the best experience, open the game from the KotOR.js launcher so Exit Game works from the menu.');
    }
  }

  Start(){
    return new Promise<void>((resolve) => {
      this.manager.ClearMenus();
      AudioLoader.LoadMusic(this.bgMusicResRef).then((data: Uint8Array) => {
        this.bgMusicBuffer = data.buffer as ArrayBuffer;
        AudioEngine.GetAudioEngine().setAudioBuffer('BACKGROUND_MUSIC_DAY', this.bgMusicBuffer, this.bgMusicResRef);
        AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter.play();
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
      this._3dView?.render(delta);
    } catch (e: any) {
      console.error(e);
    }
  }

  show() {
    super.show();
    if(this.bgMusicBuffer){
      AudioEngine.GetAudioEngine().setAudioBuffer('BACKGROUND_MUSIC_DAY', this.bgMusicBuffer, this.bgMusicResRef);
      AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter.play();
    }
    GameState.AlphaTest = 0.5;
    CurrentGame.InitGameInProgressFolder(false).then(() => {});
    if(this.selectedControl){
      this.selectNavButton(this.selectedControl as GUIButton);
    }else{
      this.selectNavButton(this.BTN_NEWGAME);
    }
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
