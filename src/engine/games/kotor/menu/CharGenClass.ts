import { GameMenu } from "@engine/gui";
import type { GUIControl, GUILabel, GUIButton } from "@engine/gui";
import { truncDiv } from "@engine/gui/GUICoord";
import { TextureLoader } from "@engine/loaders";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { CharGenClasses } from "@engine/games/CharGenClasses";
import { GameState } from "@engine/runtime/GameState";

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
  /**
   * Fixed layout centers per slot (from classsel.gui extents before anim).
   * Slot 1 is authored at hover size; 2–6 at base — growing/shrinking must
   * re-anchor left/top on these centers or pane 1 sits offset after reset.
   */
  private _modelCenters: { x: number; y: number }[] = [];
  private _btnCenters: { x: number; y: number }[] = [];
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
        this.selectClassSlot(0);
      });

      this.BTN_SEL2.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectClassSlot(1);
      });

      this.BTN_SEL3.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectClassSlot(2);
      });

      this.BTN_SEL4.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectClassSlot(3);
      });

      this.BTN_SEL5.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectClassSlot(4);
      });

      this.BTN_SEL6.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectClassSlot(5);
      });

      for(let i = 0; i < 6; i++){
        let control = this.getControlByName('_3D_MODEL'+(i+1));
        let _3dView = GameState.CharGenManager.lbl_3d_views.get(i);
        _3dView.visible = true;
        _3dView.setControl(control);
        _3dView.setViewAngle();
        control.setFillOpaque(false);
        control.setChromeBlending(1);
      }

      this.captureBaseExtents();

      resolve();
    });
  }

  selectClassSlot(slot: number) {
    if(this.selecting) return;
    this.selecting = true;
    GameState.CharGenManager.selectedClass = slot;
    const template = GameState.CharGenManager.templates.get(slot);
    GameState.CharGenManager.selectedCreature = new GameState.Module.Area.PlayerCharacter(template);
    GameState.CharGenManager.selectedCreature.load();
    GameState.CharGenManager.selectedCreature.loadModel().then(() => {
      TextureLoader.LoadQueue().then(() => {
        GameState.CharGenManager.resetChargenProgress();
        this.selecting = false;
        this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
        this.manager.CharGenMain.open();
      }).catch(() => { this.selecting = false; });
    }).catch(() => { this.selecting = false; });
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
      control.setFillOpaque(false);
      control.setChromeBlending(1);

      if(_3dViewModel) _3dViewModel.removeFromParent();

      OdysseyModel3D.FromMDL(GameState.CharGenManager.cgbody_light, {
        onComplete: (background_model: OdysseyModel3D) => {
          GameState.CharGenManager.models.set(nth, background_model);
          _3dViewModel = background_model;
          _3dView.addModel(_3dViewModel);
          // ClassSel: AttachToObject(camerahook, behavior 0) + SetViewAngle 22.726
          // — no forced camera.z override.
          _3dView.attachCameraToHook(_3dViewModel.camerahook);
          _3dView.setViewAngle();
          creature.load();
          creature.setContext(_3dView);
          creature.loadModel().then((creature_model: OdysseyModel3D) => {
            creature.model.position.set(0, 0, 0);
            creature.model.rotation.z = -Math.PI / 2;
            _3dView.addModel(creature.model);
            TextureLoader.LoadQueue().then(() => {
              this.manager.LoadScreen.setProgress((nth + 1) / 6 * 100);
              _3dViewModel.playAnimation(0, true);
              _3dViewModel.update(1.0);
              // CGPauseCycle(0, 1) — pause1 or pause2
              try {
                creature.model?.playAnimation?.(this.GetRandomAnimation(), true);
                creature.model?.update?.(1.0);
              } catch (e) {}
              resolve();
            });
          });
        },
        // Preview context owns its LightManager; keep manager registration on.
        manageLighting: true,
        context: _3dView
      });
    });
  }

  /**
   * Capture base/hover sizes and per-slot layout centers from classsel.gui.
   * MODEL1/BTN_SEL1 are authored at hover size; MODEL2+/BTN_SEL2+ at base.
   */
  protected captureBaseExtents(): void {
    if (this._baseExtentsCaptured && this._modelCenters.length === 6) return;

    // Sizes already captured but centers missing (e.g. HMR after field add):
    // rebuild centers from current left/top + authored sizes. Slot 0 still
    // carries hover-authored offsets when only width/height were snapped.
    if(this._baseExtentsCaptured){
      this._modelCenters = [];
      this._btnCenters = [];
      for(let i = 0; i < 6; i++){
        const modelControl = this.getControlByName('_3D_MODEL' + (i + 1));
        const btnControl = this.getControlByName('BTN_SEL' + (i + 1));
        if(!modelControl || !btnControl) return;
        const mw = i === 0 ? this._hoverModelExtent.width : this._baseModelExtent.width;
        const mh = i === 0 ? this._hoverModelExtent.height : this._baseModelExtent.height;
        const bw = i === 0 ? this._hoverBtnExtent.width : this._baseBtnExtent.width;
        const bh = i === 0 ? this._hoverBtnExtent.height : this._baseBtnExtent.height;
        this._modelCenters.push({
          x: modelControl.extent.left + truncDiv(mw, 2),
          y: modelControl.extent.top + truncDiv(mh, 2),
        });
        this._btnCenters.push({
          x: btnControl.extent.left + truncDiv(bw, 2),
          y: btnControl.extent.top + truncDiv(bh, 2),
        });
      }
      return;
    }

    this._modelCenters = [];
    this._btnCenters = [];
    for(let i = 0; i < 6; i++){
      const modelControl = this.getControlByName('_3D_MODEL' + (i + 1));
      const btnControl = this.getControlByName('BTN_SEL' + (i + 1));
      if(!modelControl || !btnControl) return;
      this._modelCenters.push({
        x: modelControl.extent.left + truncDiv(modelControl.extent.width, 2),
        y: modelControl.extent.top + truncDiv(modelControl.extent.height, 2),
      });
      this._btnCenters.push({
        x: btnControl.extent.left + truncDiv(btnControl.extent.width, 2),
        y: btnControl.extent.top + truncDiv(btnControl.extent.height, 2),
      });
    }

    const modelHover = this.getControlByName('_3D_MODEL1');
    const btnHover = this.getControlByName('BTN_SEL1');
    this._hoverModelExtent.width = modelHover.extent.width;
    this._hoverModelExtent.height = modelHover.extent.height;
    this._hoverBtnExtent.width = btnHover.extent.width;
    this._hoverBtnExtent.height = btnHover.extent.height;

    const modelBase = this.getControlByName('_3D_MODEL2');
    const btnBase = this.getControlByName('BTN_SEL2');
    if(!modelBase || !btnBase || modelBase.extent.width <= 0 || modelBase.extent.height <= 0) return;
    this._baseModelExtent.width = modelBase.extent.width;
    this._baseModelExtent.height = modelBase.extent.height;
    this._baseBtnExtent.width = btnBase.extent.width;
    this._baseBtnExtent.height = btnBase.extent.height;
    this._baseExtentsCaptured = true;
  }

  /** Set size and re-anchor left/top on the slot's fixed layout center. */
  protected applyCenteredExtent(
    control: GUIControl,
    center: { x: number; y: number },
    width: number,
    height: number,
  ): void {
    control.extent.width = width;
    control.extent.height = height;
    control.extent.left = center.x - truncDiv(width, 2);
    control.extent.top = center.y - truncDiv(height, 2);
    control.resizeControl();
    control.recalculate();
  }

  /** Step width/height one px toward target, then re-center on the slot anchor. */
  protected stepCenteredExtent(
    control: GUIControl,
    center: { x: number; y: number },
    targetW: number,
    targetH: number,
    growing: boolean,
  ): void {
    let w = control.extent.width;
    let h = control.extent.height;
    if(growing){
      if(h < targetH) h = Math.min(h + 1, targetH);
      if(w < targetW) w = Math.min(w + 1, targetW);
    }else{
      if(h > targetH) h = Math.max(h - 1, targetH);
      if(w > targetW) w = Math.max(w - 1, targetW);
    }
    this.applyCenteredExtent(control, center, w, h);
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
        const modelCenter = this._modelCenters[i];
        const btnCenter = this._btnCenters[i];
        if(btnControl.hover){
          if (GameState.CharGenManager.hoveredClass != i) {
            GameState.CharGenManager.hoveredClass = i;
            this.textNeedsUpdate = true;
          }
          if(btnCenter){
            this.stepCenteredExtent(
              btnControl, btnCenter,
              this._hoverBtnExtent.width, this._hoverBtnExtent.height,
              true,
            );
          }
          if(modelCenter){
            this.stepCenteredExtent(
              modelControl, modelCenter,
              this._hoverModelExtent.width, this._hoverModelExtent.height,
              true,
            );
          }
        }else{
          if(btnCenter){
            this.stepCenteredExtent(
              btnControl, btnCenter,
              this._baseBtnExtent.width, this._baseBtnExtent.height,
              false,
            );
          }
          if(modelCenter){
            this.stepCenteredExtent(
              modelControl, modelCenter,
              this._baseModelExtent.width, this._baseModelExtent.height,
              false,
            );
          }
        }
        _3dView.setSize(modelControl.extent.width * 2, modelControl.extent.height * 2);
        _3dView.render(delta);
        modelControl.markChromeNeedsUpdate();
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

  /**
   * Snap every class pane back to layout base size (centered) and clear hover.
   * Hover anim mutates extent in place; leaving while enlarged (then
   * returning via CharGenMain.close → MenuManager.Remove → show) left
   * panes stuck at the hover size / hover-authored offset.
   */
  protected resetClassPaneExtents(): void {
    if(!this._baseExtentsCaptured){
      this.captureBaseExtents();
    }
    if(!this._baseExtentsCaptured) return;

    for(let i = 0; i < 6; i++){
      const modelControl = this.getControlByName('_3D_MODEL' + (i + 1));
      const btnControl = this.getControlByName('BTN_SEL' + (i + 1));
      if(modelControl && this._modelCenters[i]){
        this.applyCenteredExtent(
          modelControl,
          this._modelCenters[i],
          this._baseModelExtent.width,
          this._baseModelExtent.height,
        );
      }
      if(btnControl && this._btnCenters[i]){
        this.applyCenteredExtent(
          btnControl,
          this._btnCenters[i],
          this._baseBtnExtent.width,
          this._baseBtnExtent.height,
        );
        if(btnControl.hover){
          btnControl.onHoverOut();
        }
      }
      const view = GameState.CharGenManager.lbl_3d_views.get(i);
      if(view){
        view.setSize(this._baseModelExtent.width * 2, this._baseModelExtent.height * 2);
      }
    }
    this.activeControls.length = 0;
  }

  hide() {
    this.resetClassPaneExtents();
    for(const creature of GameState.CharGenManager.creatures.values()){
      creature?.setContext?.(GameState);
    }
    super.hide();
  }

  show() {
    super.show();
    this.resetClassPaneExtents();
  }

  async Init() {
    this.manager.LoadScreen.setProgress(0);
    await this.load3D();
  }

  GetRandomAnimation(): string {
    // CGPauseCycle initial branch — pause1 or pause2
    return Math.random() < 0.5 ? 'pause1' : 'pause2';
  }

}
