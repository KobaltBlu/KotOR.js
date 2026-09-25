import { GameMenu } from "@/gui";
import type { GUIControl, GUILabel, GUIButton } from "@/gui";
import { TextureLoader } from "@/loaders";
import type { ModulePlayer } from "@/module";
import { OdysseyModel3D } from "@/three/odyssey";
import * as THREE from "three";
import { getCharGenClass } from "@/game/CharGenClasses";
import { GameState } from "@/GameState";

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
      this.wireControls();

      this.tGuiPanel.getFill().position.z = -0.5;

      this.initModelViews();

      this.captureBaseExtents();

      resolve();
    });
  }

  /**
   * Wires the listeners shared by the K1 and TSL versions of this screen.
   * The TSL subclass skips the K1 initializer (skipInit) and calls this itself.
   */
  protected wireControls(){
    if(this.BTN_BACK){
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MainMenu.Start();
      });
    }

    for(let slot = 0; slot < 6; slot++){
      const button = this.getControlByName('BTN_SEL' + (slot + 1));
      if(!button) continue;
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectClass(slot);
      });
    }
  }

  /**
   * Binds the six slot render targets to their _3D_MODEL labels.
   */
  protected initModelViews(){
    for(let i = 0; i < 6; i++){
      const control = this.getControlByName('_3D_MODEL'+(i+1));
      const _3dView = GameState.CharGenManager.lbl_3d_views.get(i);
      if(!control) continue;
      if(_3dView){
        _3dView.visible = true;
        _3dView.camera.aspect = control.extent.width / control.extent.height;
        _3dView.camera.updateProjectionMatrix();
        control.setFillTexture(_3dView.texture.texture);
      }
      (control.getFill().material as THREE.ShaderMaterial).transparent = true;
      (control.getFill().material as THREE.ShaderMaterial).blending = 1;
    }
  }

  /**
   * Picks a class-select slot (0-5): a fresh creature from the slot's
   * template, clean working copies / step flags, and the quick-or-custom
   * choice inside CharGenMain.
   */
  selectClass(slot: number){
    if(this.selecting) return;
    this.selecting = true;

    GameState.CharGenManager.selectedClass = slot;
    //A class change starts the attribute/skill working copies and the step progress over
    GameState.CharGenManager.resetWorkingCopies();
    GameState.CharGenManager.resetStepFlags();

    const template = GameState.CharGenManager.templates.get(slot);
    const creature: ModulePlayer = new GameState.Module.ModuleArea.ModulePlayer(template);
    GameState.CharGenManager.selectedCreature = creature;
    creature.load();
    creature.loadModel().then((model: OdysseyModel3D) => {
      TextureLoader.LoadQueue().then(() => {
        this.selecting = false;

        //Point the step screens at the new creature
        this.manager.CharGenAbilities?.setCreature(creature);
        this.manager.CharGenFeats?.setCreature(creature);
        this.manager.CharGenFeats?.reset();
        if(this.manager.CharGenQuickPanel){
          this.manager.CharGenQuickPanel.step1 = false;
          this.manager.CharGenQuickPanel.step2 = false;
        }

        this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
        this.manager.CharGenMain.open();
      });
    }).catch((e) => {
      console.error(e);
      this.selecting = false;
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
  protected captureBaseExtents(): void {
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
        const slot = getCharGenClass(GameState.CharGenManager.hoveredClass);
        this.LBL_DESC.setText(this.getTLKString(slot.strings.description));
        this.LBL_CLASS.setText(this.getTLKString(slot.strings.gender) + ' ' + this.getTLKString(slot.strings.name));
        this.textNeedsUpdate = false;
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  getTLKString(strRef: number): string {
    const tlkString = GameState.TLKManager?.TLKStrings?.[strRef];
    return tlkString ? tlkString.Value : '';
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
