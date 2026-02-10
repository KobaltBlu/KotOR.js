import { GameMenu } from "../../../gui";
import type { GUIControl, GUILabel, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import type { ModulePlayer } from "../../../module";
import { OdysseyModel3D } from "../../../three/odyssey";
import * as THREE from "three";
import { CharGenClasses } from "../../CharGenClasses";
import { GameState } from "../../../GameState";

/**
 * CharGenClass class.
 * Character generation "CHOOSE YOUR CLASS" screen; displays six class portrait slots
 * (_3D_MODEL1–6) with hover animation. Corresponds to layout from ClassSel / classsel.gui.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenClass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenClass extends GameMenu {

  _3D_MODEL2: GUILabel;
  LBL_CHAR_GEN: GUILabel;
  LBL_CLASS: GUILabel;
  LBL_INSTRUCTION: GUILabel;
  _3D_MODEL1: GUILabel;
  LBL_DESC: GUILabel;
  BTN_BACK: GUIButton;
  _3D_MODEL3: GUILabel;
  _3D_MODEL4: GUILabel;
  _3D_MODEL5: GUILabel;
  _3D_MODEL6: GUILabel;
  BTN_SEL1: GUIButton;
  BTN_SEL2: GUIButton;
  BTN_SEL3: GUIButton;
  BTN_SEL4: GUIButton;
  BTN_SEL6: GUIButton;
  BTN_SEL5: GUIButton;

  selecting: boolean = false;

  /** Base extent sizes from the layout (classsel.gui) for model and button; used so hover animation does not shrink below layout size. */
  private _baseModelExtent: { width: number; height: number } = { width: 0, height: 0 };
  private _baseBtnExtent: { width: number; height: number } = { width: 0, height: 0 };
  /** Hovered (larger) target sizes; non-hovered slots animate toward base, hovered toward hover. */
  private _hoverModelExtent: { width: number; height: number } = { width: 0, height: 0 };
  private _hoverBtnExtent: { width: number; height: number } = { width: 0, height: 0 };
  private _baseExtentsCaptured: boolean = false;

  constructor(){
    super();
    this.gui_resref = 'classsel';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.userCanClose = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
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
        GameState.CharGenManager.selectedCreature = new GameState.Module.ModuleArea.ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue().then(() => {
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
        GameState.CharGenManager.selectedCreature = new GameState.Module.ModuleArea.ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue().then(() => {
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
        GameState.CharGenManager.selectedCreature = new GameState.Module.ModuleArea.ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue().then(() => {
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
        GameState.CharGenManager.selectedCreature = new GameState.Module.ModuleArea.ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue().then(() => {
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
        GameState.CharGenManager.selectedCreature = new GameState.Module.ModuleArea.ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue().then(() => {
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
        GameState.CharGenManager.selectedCreature = new GameState.Module.ModuleArea.ModulePlayer(template);
        GameState.CharGenManager.selectedCreature.load();
        GameState.CharGenManager.selectedCreature.loadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue().then(() => {
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
        _3dView.visible = true;
        _3dView.camera.aspect = control.extent.width / control.extent.height;
        _3dView.camera.updateProjectionMatrix();
        control.setFillTexture(_3dView.texture.texture);
        (control.getFill().material as THREE.ShaderMaterial).transparent = true;
        (control.getFill().material as THREE.ShaderMaterial).blending = 1;
      }

      this.captureBaseExtents();

      resolve();
    });
  }

  async load3D() {
    await this.initCharacter3D(this._3D_MODEL1, 0);
    await this.initCharacter3D(this._3D_MODEL2, 1);
    await this.initCharacter3D(this._3D_MODEL3, 2);
    await this.initCharacter3D(this._3D_MODEL4, 3);
    await this.initCharacter3D(this._3D_MODEL5, 4);
    await this.initCharacter3D(this._3D_MODEL6, 5);
  }

  initCharacter3D(control: GUIControl, nth = 0) {
    return new Promise<void>( (resolve, reject) => {
      let _3dView = GameState.CharGenManager.lbl_3d_views.get(nth);
      let _3dViewModel = GameState.CharGenManager.models.get(nth);
      let creature = GameState.CharGenManager.creatures.get(nth);
      _3dView.setControl(control);
      _3dView.visible = true;
      control.border.fill.material.transparent = true;
      control.border.fill.material.blending = 1;

      if(_3dViewModel) _3dViewModel.removeFromParent();

      OdysseyModel3D.FromMDL(GameState.CharGenManager.cgmain_light, {
        onComplete: (background_model: OdysseyModel3D) => {
          GameState.CharGenManager.models.set(nth, background_model);
          _3dViewModel = background_model;
          _3dView.addModel(_3dViewModel);
          _3dView.camera.position.copy(_3dViewModel.camerahook.position);
          _3dView.camera.quaternion.copy(_3dViewModel.camerahook.quaternion);
          _3dView.camera.position.z = 0.9;
          creature.load();
          creature.loadModel().then((creature_model: OdysseyModel3D) => {
            creature.model.position.set(0, 0, 0);
            creature.model.rotation.z = -Math.PI / 2;
            _3dView.addModel(creature.model);
            TextureLoader.LoadQueue().then(() => {
              this.manager.LoadScreen.setProgress((nth + 1) / 6 * 100);
              _3dViewModel.playAnimation(0, true);
              resolve();
            });
          });
        },
        manageLighting: false,
        context: _3dView
      });
    });
  }

  /**
   * Capture base (rest) and hover target extents from the first model/button control.
   * Layout (classsel.gui) defines the intended size; we animate between base and a slightly
   * larger hover size so portraits never shrink below the layout dimensions.
   */
  private captureBaseExtents(): void {
    if (this._baseExtentsCaptured) return;
    //Hover extents can be calculated from the first model and button control
    //They are sized differently from the other 5 controls
    const modelControlHovered = this.getControlByName('_3D_MODEL1');
    const btnControlHovered = this.getControlByName('BTN_SEL1');
    this._hoverModelExtent.width = modelControlHovered.extent.width;
    this._hoverModelExtent.height = modelControlHovered.extent.height;
    this._hoverBtnExtent.width = btnControlHovered.extent.width;
    this._hoverBtnExtent.height = btnControlHovered.extent.height;

    //Base extents can be calculated from the 2nd model and button controls
    const modelControl = this.getControlByName('_3D_MODEL2');
    const btnControl = this.getControlByName('BTN_SEL2');
    if (!modelControl || !btnControl || modelControl.extent.width <= 0 || modelControl.extent.height <= 0) return;
    this._baseModelExtent.width = modelControl.extent.width;
    this._baseModelExtent.height = modelControl.extent.height;
    this._baseBtnExtent.width = btnControl.extent.width;
    this._baseBtnExtent.height = btnControl.extent.height;
    this._baseExtentsCaptured = true;
  }

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;
    try {
      for (let i = 0; i < 6; i++) {
        const modelControl = this.getControlByName('_3D_MODEL' + (i + 1));
        const btnControl = this.getControlByName('BTN_SEL' + (i + 1));
        const _3dView = GameState.CharGenManager.lbl_3d_views.get(i);
        const creature = GameState.CharGenManager.creatures.get(i);
        if (creature) {
          creature.update(delta);
        }
        if (btnControl.hover) {
          if (GameState.CharGenManager.hoveredClass != i) {
            GameState.CharGenManager.hoveredClass = i;
            this.textNeedsUpdate = true;
          }
          if (btnControl.extent.height < this._hoverBtnExtent.height) {
            btnControl.extent.height = Math.min(btnControl.extent.height + 1, this._hoverBtnExtent.height);
            btnControl.extent.width = Math.min(btnControl.extent.width + 1, this._hoverBtnExtent.width);
          }
          if (modelControl.extent.height < this._hoverModelExtent.height) {
            modelControl.extent.height = Math.min(modelControl.extent.height + 1, this._hoverModelExtent.height);
            modelControl.extent.width = Math.min(modelControl.extent.width + 1, this._hoverModelExtent.width);
          }
        } else {
          if (btnControl.extent.height > this._baseBtnExtent.height) {
            btnControl.extent.height = Math.max(btnControl.extent.height - 1, this._baseBtnExtent.height);
            btnControl.extent.width = Math.max(btnControl.extent.width - 1, this._baseBtnExtent.width);
          }
          if (modelControl.extent.height > this._baseModelExtent.height) {
            modelControl.extent.height = Math.max(modelControl.extent.height - 1, this._baseModelExtent.height);
            modelControl.extent.width = Math.max(modelControl.extent.width - 1, this._baseModelExtent.width);
          }
        }
        _3dView.setSize(modelControl.extent.width * 2, modelControl.extent.height * 2);
        _3dView.render(delta);
        (modelControl.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
        btnControl.resizeControl();
        modelControl.resizeControl();
      }
      if (this.textNeedsUpdate) {
        this.LBL_DESC.setText(GameState.TLKManager.TLKStrings[CharGenClasses[GameState.CharGenManager.hoveredClass].strings.description].Value);
        this.LBL_CLASS.setText(GameState.TLKManager.TLKStrings[CharGenClasses[GameState.CharGenManager.hoveredClass].strings.gender].Value + ' ' + GameState.TLKManager.TLKStrings[CharGenClasses[GameState.CharGenManager.hoveredClass].strings.name].Value);
        this.textNeedsUpdate = false;
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  show() {
    super.show();
  }

  async Init() {
    this.manager.LoadScreen.setProgress(0);
    await this.load3D();
  }

  GetRandomAnimation() {
  }

}
