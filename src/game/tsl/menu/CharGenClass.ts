import { GameState } from "../../../GameState";
import type { GUILabel, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { ModulePlayer } from "../../../module";
import { OdysseyModel } from "../../../odyssey";
import { OdysseyModel3D } from "../../../three/odyssey";
import { CharGenClass as K1_CharGenClass } from "../../kotor/KOTOR";

/**
 * CharGenClass class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenClass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenClass extends K1_CharGenClass {

  declare _3D_MODEL2: GUILabel;
  declare LBL_CHAR_GEN: GUILabel;
  declare LBL_CLASS: GUILabel;
  declare LBL_INSTRUCTION: GUILabel;
  declare _3D_MODEL1: GUILabel;
  declare LBL_DESC: GUILabel;
  declare BTN_BACK: GUIButton;
  declare _3D_MODEL3: GUILabel;
  declare _3D_MODEL4: GUILabel;
  declare _3D_MODEL5: GUILabel;
  declare _3D_MODEL6: GUILabel;
  declare BTN_SEL1: GUIButton;
  declare BTN_SEL2: GUIButton;
  declare BTN_SEL3: GUIButton;
  declare BTN_SEL4: GUIButton;
  declare BTN_SEL6: GUIButton;
  declare BTN_SEL5: GUIButton;
  cgmain_light: OdysseyModel;

  constructor(){
    super();
    this.gui_resref = 'classsel_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MainMenu.Start();
      });

      this.BTN_SEL1.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        GameState.CharGenManager.selectedClass = 0;
        let template = GameState.CharGenManager.templates.get(GameState.CharGenManager.selectedClass);
        GameState.CharGenManager.selectedCreature = new ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
            this.manager.CharGenMain.open();
          });
        });
      });

      this.BTN_SEL2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        GameState.CharGenManager.selectedClass = 1;
        let template = GameState.CharGenManager.templates.get(GameState.CharGenManager.selectedClass);
        GameState.CharGenManager.selectedCreature = new ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
            this.manager.CharGenMain.open();
          });
        });
      });

      this.BTN_SEL3.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        GameState.CharGenManager.selectedClass = 2;
        let template = GameState.CharGenManager.templates.get(GameState.CharGenManager.selectedClass);
        GameState.CharGenManager.selectedCreature = new ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
            this.manager.CharGenMain.open();
          });
        });
      });

      this.BTN_SEL4.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        GameState.CharGenManager.selectedClass = 3;
        let template = GameState.CharGenManager.templates.get(GameState.CharGenManager.selectedClass);
        GameState.CharGenManager.selectedCreature = new ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
            this.manager.CharGenMain.open();
          });
        });
      });

      this.BTN_SEL5.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        GameState.CharGenManager.selectedClass = 4;
        let template = GameState.CharGenManager.templates.get(GameState.CharGenManager.selectedClass);
        GameState.CharGenManager.selectedCreature = new ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
            this.manager.CharGenMain.open();
          });
        });
      });

      this.BTN_SEL6.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        GameState.CharGenManager.selectedClass = 5;
        let template = GameState.CharGenManager.templates.get(GameState.CharGenManager.selectedClass);
        GameState.CharGenManager.selectedCreature = new ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
            this.manager.CharGenMain.open();
          });
        });
      });

      this.tGuiPanel.getFill().position.z = -0.5;

      for(let i = 0; i < 6; i++){
        let control = this.getControlByName('_3D_MODEL'+(i+1));
        let _3dView = GameState.CharGenManager.lbl_3d_views.get(i);
        if(_3dView){
          _3dView.visible = true;
          _3dView.camera.aspect = control.extent.width / control.extent.height;
          _3dView.camera.updateProjectionMatrix();
          control.setFillTexture(_3dView.texture.texture);
        }
        (control.getFill().material as THREE.ShaderMaterial).transparent = true;
        (control.getFill().material as THREE.ShaderMaterial).blending = 1;
      }

      resolve();  
    });
  }
  
}
