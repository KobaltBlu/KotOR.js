import { GameMenu, LBL_3DView } from "@/gui";
import type { GUILabel, GUIButton } from "@/gui";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { OdysseyModel3D } from "@/three/odyssey";
import { CharGenClasses } from "@/game/CharGenClasses";
import {
  buildCharGenPortraitList,
  type CharGenPortraitEntry,
} from "@/engine/rules/chargen-appearance";
import * as THREE from "three";
import { GameState } from "@/GameState";

/**
 * CharGenPortCust class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * Retail CSWGuiPortraitCharGen @ 006f9430 (PORTCUST).
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

  isCharLoading: boolean = false;
  /** Retail GetPortraitsList parallel arrays (portrait id + appearance id). */
  portraitList: CharGenPortraitEntry[] = [];
  /** Index into portraitList (retail field23_0x1234). */
  portraitListIndex: number = 0;

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

      this.close();
    });

    this.tGuiPanel.widget.userData.fill.position.z = -0.5

    this._3dView.visible = true;
    this._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
    this._3dView.camera.updateProjectionMatrix();
    this.LBL_HEAD.setFillTexture(this._3dView.texture.texture);
    (this.LBL_HEAD.getFill().material as THREE.ShaderMaterial).transparent = false;

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

  /** Retail UpdatePortraitButton plays pause1 on body (0xff) and head (0xfe). */
  playPauseAnimation(creature: { model?: OdysseyModel3D }) {
    try{
      creature?.model?.playAnimation?.('pause1', true);
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
    OdysseyModel3D.FromMDL(GameState.CharGenManager.cghead_light, {
      context: this._3dView
    }).then( (sceneModel3D: OdysseyModel3D) => {
      try{
        this.sceneModel3D = sceneModel3D;
        this._3dView.addModel(this.sceneModel3D);
        if(creature.getGender()){
          this._3dView.camera.position.copy(this.sceneModel3D.camerahookf.position);
          this._3dView.camera.quaternion.copy(this.sceneModel3D.camerahookf.quaternion);
        }else{
          this._3dView.camera.position.copy(this.sceneModel3D.camerahookm.position);
          this._3dView.camera.quaternion.copy(this.sceneModel3D.camerahookm.quaternion);
        }
        this.sceneModel3D.playAnimation(0, true);
      }catch(e){
        console.error(e);
      }
    });
    (control.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this._3dView.texture.texture;
    (control.getFill().material as THREE.ShaderMaterial).transparent = false;
    (control.getFill().material as THREE.ShaderMaterial).blending = 1;
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
      (modelControl.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
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
      this.LBL_PORTRAIT.setFillTextureName(portraitResRef);
      TextureLoader.tpcLoader.fetch(portraitResRef).then((texture: OdysseyTexture) => {
        this.LBL_PORTRAIT.setFillTexture(texture);
      });
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
    try {
      creature.model.removeFromParent();
    } catch (e: any) {
      console.error(e);
    }
    this._3dView.addModel(creature.model);
    (this.LBL_PORTRAIT.getFill().material as THREE.ShaderMaterial).blending = 1;
    this.updateCamera();
    this.UpdatePortrait();
  }

  updateCamera() {
    const creature = GameState.CharGenManager.selectedCreature;
    if(!this.sceneModel3D) return;
    if (creature.getGender() == 0) {
      this._3dView.camera.position.copy(this.sceneModel3D.camerahookm.position);
      this._3dView.camera.quaternion.copy(this.sceneModel3D.camerahookm.quaternion);
    } else {
      this._3dView.camera.position.copy(this.sceneModel3D.camerahookf.position);
      this._3dView.camera.quaternion.copy(this.sceneModel3D.camerahookf.quaternion);
    }
    let v3 = new THREE.Vector3();
    creature.model?.camerahook?.getWorldPosition?.(v3);
    this._3dView.camera.position.z = v3.z;
  }

}
