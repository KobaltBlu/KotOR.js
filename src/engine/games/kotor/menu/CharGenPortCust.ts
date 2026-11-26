import type { PadControlGlyph } from "@engine/gui/GameMenu";
import { GameMenu, LBL_3DView } from "@engine/gui";
import type { GUILabel, GUIButton } from "@engine/gui";
import { MDLLoader, TextureLoader } from "@engine/loaders";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import type { OdysseyModel } from "@engine/odyssey";
import { CharGenClasses } from "@engine/games/CharGenClasses";
import {
  buildCharGenPortraitList,
  type CharGenPortraitEntry,
} from "@engine/rules/chargen-appearance";
import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";

/**
 * CharGenPortCust class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * (PORTCUST)
 * gui3D_room + cghead_light, camerahookm/f, SetViewAngle 22.726,
 * AttachTranslate (0, headHeight, 0) local-space (=0).
 *
 * @file CharGenPortCust.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenPortCust extends GameMenu {

  LBL_HEAD: GUILabel;
  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  LBL_BEVEL_L: GUILabel;
  LBL_BEVEL_M: GUILabel;
  LBL_BEVEL_R: GUILabel;
  LBL_PORTRAIT: GUILabel;
  LBL_BEVEL_B: GUILabel;
  LBL_BEVEL_T: GUILabel;
  BTN_ARRL: GUIButton;
  BTN_ARRR: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;
  exiting: boolean;
  appearance: number;
  portraitId: number;
  appearanceHead: number;

  _3dView: LBL_3DView;
  sceneModel3D: OdysseyModel3D;
  /** gui3D_room spawned before cghead_light (portrait cust ctor). */
  _3dViewRoom: OdysseyModel3D;

  isCharLoading: boolean = false;
  /** GetPortraitsList parallel arrays (portrait id + appearance id). */
  portraitList: CharGenPortraitEntry[] = [];
  /** Index into portraitList. */
  portraitListIndex: number = 0;
  /** Creature context before preview (restored on hide/close). */
  private _previewContextRestore: any = undefined;

  constructor(){
    super();
    this.gui_resref = 'portcust';
    this.background = '1600x1200back';
    this.voidFill = true;
    this._3dView = new LBL_3DView();
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.BTN_ARRL.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.cyclePortrait(-1);
    });

    this.BTN_ARRR.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.cyclePortrait(1);
    });

    this.BTN_BACK.addEventListener('click', (e) => {
      e.stopPropagation();
      const creature = GameState.CharGenManager.selectedCreature;
      if(!this.exiting){
        this.exiting = true;
        GameState.CharGenManager.applyPortraitAppearance(
          creature,
          this.appearance,
          this.portraitId
        );
        creature.appearanceHead = this.appearanceHead;
        this.restoreCreatureContext();
        creature.loadModel().then( (model: OdysseyModel3D) => {
          if(model) model.rotation.z = -Math.PI/2;
          this.exiting = false;
          this.close();
        }).catch(() => {
          this.exiting = false;
          this.close();
        });
      }
    });

    this.BTN_ACCEPT.addEventListener('click', (e) => {
      e.stopPropagation();
      const creature = GameState.CharGenManager.selectedCreature;
      const entry = this.portraitList[this.portraitListIndex];
      if(entry){
        GameState.CharGenManager.applyPortraitAppearance(
          creature,
          entry.appearanceId,
          entry.portraitId
        );
      }else{
        creature.template.getFieldByLabel('Appearance_Type')?.setValue(creature.appearance);
        creature.template.getFieldByLabel('PortraitId')?.setValue(creature.portraitId);
        creature.template.getFieldByLabel('Appearance_Head')?.setValue(creature.appearanceHead);
      }
      this.manager.CharGenQuickPanel?.portraitCreationCompleted?.();
      this.manager.CharGenCustomPanel?.portraitCreationCompleted?.();
      this.manager.CharGenMain?.updateAttributes?.();

      this.restoreCreatureContext();
      this.close();
    });

    this._3dView.visible = true;
    this._3dView.setControl(this.LBL_HEAD);
    this._3dView.setViewAngle();
    this.LBL_HEAD.setFillOpaque(true);

    this.Init3D();
  }

  protected rebuildPortraitList() {
    const slot = GameState.CharGenManager.selectedClass;
    const classId = CharGenClasses[slot]?.id ?? 0;
    const gender = GameState.CharGenManager.selectedCreature?.getGender?.() ?? (slot < 3 ? 0 : 1);
    this.portraitList = buildCharGenPortraitList(
      GameState.SWRuleSet.portraits || [],
      classId,
      gender
    );
    if(!this.portraitList.length){
      // Fallback to hardcoded CharGenClasses appearances
      const apps = CharGenClasses[slot]?.appearances || [];
      this.portraitList = apps.map((appearanceId) => {
        let portraitId = 0;
        const portraits = GameState.SWRuleSet.portraits || [];
        for(let i = 0; i < portraits.length; i++){
          const port = portraits[i];
          if(
            port.appearancenumber == appearanceId ||
            port.appearance_l == appearanceId ||
            port.appearance_s == appearanceId
          ){
            portraitId = i;
            break;
          }
        }
        return { portraitId, appearanceId };
      });
    }
  }

  protected syncPortraitListIndex() {
    const creature = GameState.CharGenManager.selectedCreature;
    const idx = this.portraitList.findIndex(
      (e) => e.portraitId == creature.portraitId || e.appearanceId == creature.appearance
    );
    this.portraitListIndex = idx >= 0 ? idx : 0;
  }

  /** Point selectedCreature at this view's LightManager while previewing. */
  protected bindCreatureContext(){
    const creature = GameState.CharGenManager.selectedCreature;
    if(!creature) return;
    if(this._previewContextRestore === undefined){
      this._previewContextRestore = creature.context;
    }
    creature.setContext(this._3dView);
  }

  protected restoreCreatureContext(){
    const creature = GameState.CharGenManager.selectedCreature;
    if(!creature || this._previewContextRestore === undefined) return;
    creature.setContext(this._previewContextRestore);
    this._previewContextRestore = undefined;
  }

  async cyclePortrait(direction: -1 | 1) {
    if(this.isCharLoading) return;
    if(!this.portraitList.length){
      this.rebuildPortraitList();
    }
    if(!this.portraitList.length) return;

    this.isCharLoading = true;
    try{
      const len = this.portraitList.length;
      this.portraitListIndex = (this.portraitListIndex + direction + len) % len;
      const entry = this.portraitList[this.portraitListIndex];
      const creature = GameState.CharGenManager.selectedCreature;
      GameState.CharGenManager.applyPortraitAppearance(
        creature,
        entry.appearanceId,
        entry.portraitId
      );

      this.bindCreatureContext();
      const model = await creature.loadModel();
      this.playPauseAnimation(creature);
      this.updateCamera();
      this.UpdatePortrait();
      if(model){
        model.rotation.z = -Math.PI/2;
        model.removeFromParent();
        this._3dView.addModel(model);
      }
    }finally{
      this.isCharLoading = false;
    }
  }

  /** UpdatePortraitButton plays pause1 on body (0xff) and head (0xfe). */
  playPauseAnimation(creature: { model?: OdysseyModel3D }) {
    try{
      creature?.model?.playAnimation?.('pause1', true);
      creature?.model?.update?.(1.0);
    }catch(e){
      // ignore missing anim
    }
  }

  Init3D() {
    let control = this.LBL_HEAD;
    const creature = GameState.CharGenManager.selectedCreature;
    if(creature.model){
      creature.model.removeFromParent();
    }
    void this.init3DScene();
    control.setFillTexture(this._3dView.texture.texture);
    control.setFillOpaque(true);
    control.setChromeBlending(1);
  }

  /**
   * SpawnRoom("gui3D_room") then AddModel("cghead_light") + PlayAnimation("default").
   */
  private async init3DScene(){
    try{
      const roomMdl: OdysseyModel = await MDLLoader.loader.load('gui3D_room');
      this._3dViewRoom = await OdysseyModel3D.FromMDL(roomMdl, { context: this._3dView });
      this._3dView.addModel(this._3dViewRoom);
    }catch(e){
      console.warn('CharGenPortCust: failed to load gui3D_room', e);
    }

    try{
      const lightMdl = GameState.CharGenManager.cghead_light
        ?? await MDLLoader.loader.load('cghead_light');
      this.sceneModel3D = await OdysseyModel3D.FromMDL(lightMdl, { context: this._3dView });
      this._3dView.addModel(this.sceneModel3D);
      this.sceneModel3D.playAnimation('default', true);
      this.sceneModel3D.update(1.0);
      this.updateCamera();
    }catch(e){
      console.error('CharGenPortCust: failed to load cghead_light', e);
    }

    await TextureLoader.LoadQueue().catch(() => {});
  }

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;
    try {
      const creature = GameState.CharGenManager.selectedCreature;
      let modelControl = this.LBL_HEAD;
      creature.update(delta);
      this._3dView.render(delta);
      modelControl.markChromeNeedsUpdate();
    } catch (e: any) {
      console.error(e);
    }
  }

  UpdatePortrait() {
    const creature = GameState.CharGenManager.selectedCreature;
    const goodEvil = creature.getGoodEvil?.() ?? creature.goodEvil ?? 50;
    const portraitResRef = creature.portrait?.getPortraitGoodEvil(goodEvil);
    this.LBL_PORTRAIT.show();
    if (this.LBL_PORTRAIT.getFillTextureName() != portraitResRef) {
      void this.LBL_PORTRAIT.setFillTextureName(portraitResRef);
    }
  }

  show() {
    super.show();
    const creature = GameState.CharGenManager.selectedCreature;
    this.appearance = creature.appearance;
    this.portraitId = creature.portraitId;
    this.appearanceHead = creature.appearanceHead;
    this.rebuildPortraitList();
    this.syncPortraitListIndex();
    this.bindCreatureContext();
    try {
      creature.model.removeFromParent();
    } catch (e: any) {
      console.error(e);
    }
    this._3dView.addModel(creature.model);
    this.LBL_PORTRAIT.setChromeBlending(1);
    this.updateCamera();
    this.UpdatePortrait();
  }

  hide() {
    this.restoreCreatureContext();
    super.hide();
  }

  /**
   * UpdatePortraitButton AttachTranslate
   * camerahookm/f pose + local-space (0, getCameraHeight, 0).
   */
  updateCamera() {
    const creature = GameState.CharGenManager.selectedCreature;
    if(!this.sceneModel3D) return;
    const hook = (creature.getGender() == 0)
      ? this.sceneModel3D.camerahookm
      : this.sceneModel3D.camerahookf;
    const headHeight = creature.getCameraHeight?.() ?? 1.5;
    this._3dView.attachCameraToHook(hook, { x: 0, y: headHeight, z: 0 }, false);
  }

  /** Left / right (and LB / RB) step through portraits; A and Start accept. */
  triggerControllerDLeftPress() {
    this.BTN_ARRL?.click();
  }

  triggerControllerDRightPress() {
    this.BTN_ARRR?.click();
  }

  triggerControllerBumperLPress() {
    this.BTN_ARRL?.click();
  }

  triggerControllerBumperRPress() {
    this.BTN_ARRR?.click();
  }

  triggerControllerAPress() {
    this.BTN_ACCEPT?.click();
  }

  triggerControllerStartPress() {
    this.BTN_ACCEPT?.click();
  }


  /** Pad button symbols drawn on this menu's controls. */
  getPadButtonGlyphs(): PadControlGlyph[] {
    const glyphs = super.getPadButtonGlyphs();
    this.addPadGlyph(glyphs, 'lb', this.BTN_ARRL);
    this.addPadGlyph(glyphs, 'rb', this.BTN_ARRR);
    this.addPadGlyph(glyphs, 'a', this.BTN_ACCEPT);
    return glyphs;
  }

}
