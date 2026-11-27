import { GameMenu, LBL_3DView } from "@/gui";
import type { GUILabel, GUIButton } from "@/gui";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { OdysseyModel3D } from "@/three/odyssey";
import { getCharGenClass } from "@/game/CharGenClasses";
import * as THREE from "three";
import { GameState } from "@/GameState";

/**
 * CharGenPortCust class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
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

  _3dView: LBL_3DView;
  sceneModel3D: OdysseyModel3D;

  isCharLoading: boolean = false;

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
    this.wireControls();

    this.tGuiPanel.widget.userData.fill.position.z = -0.5

    this._3dView.visible = true;
    this._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
    this._3dView.camera.updateProjectionMatrix();
    this.LBL_HEAD.setFillTexture(this._3dView.texture.texture);
    (this.LBL_HEAD.getFill().material as THREE.ShaderMaterial).transparent = false;

    this.Init3D();
  }

  /**
   * Wires the listeners shared by the K1 and TSL versions of this screen.
   * The TSL subclass skips the K1 initializer (skipInit) and calls this itself.
   */
  protected wireControls(){
    if(this.BTN_ARRL){
      this.BTN_ARRL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cycleAppearance(-1);
      });
    }

    if(this.BTN_ARRR){
      this.BTN_ARRR.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cycleAppearance(1);
      });
    }

    if(this.BTN_BACK){
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.restoreAppearance();
      });
    }

    if(this.BTN_ACCEPT){
      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.acceptAppearance();
      });
    }
  }

  /**
   * The appearance.2da rows this slot can cycle through (game-specific table).
   */
  protected getAppearanceList(): number[] {
    return getCharGenClass(GameState.CharGenManager.selectedClass).appearances;
  }

  /**
   * Points the creature's portrait at the portraits.2da row that references
   * the given appearance in any of its body-size columns.
   */
  protected applyPortraitForAppearance(appearance: number){
    const creature = GameState.CharGenManager.selectedCreature;
    const portraits = GameState.SWRuleSet.portraits;
    for(let i = 0; i < portraits.length; i++){
      const port = portraits[i];
      if(port.appearancenumber == appearance || port.appearance_l == appearance || port.appearance_s == appearance){
        creature.portraitId = i;
        creature.portrait = port;
        return;
      }
    }
  }

  /**
   * Previous (-1) / next (+1) head of the slot's appearance list, wrapping
   * around at both ends.
   */
  cycleAppearance(direction: number){
    if(this.isCharLoading) return;
    const creature = GameState.CharGenManager.selectedCreature;
    const appearances = this.getAppearanceList();
    if(!creature || !appearances.length) return;
    this.isCharLoading = true;

    let idx = appearances.indexOf(creature.appearance);
    if(direction < 0){
      idx = (idx <= 0) ? appearances.length - 1 : idx - 1;
    }else{
      idx = (idx < 0 || idx >= appearances.length - 1) ? 0 : idx + 1;
    }

    creature.appearance = appearances[idx];
    creature.setAppearance(creature.appearance);
    this.applyPortraitForAppearance(creature.appearance);

    creature.loadModel().then( (model: OdysseyModel3D) => {
      this.updateCamera();
      this.UpdatePortrait();
      if(model){
        model.rotation.z = -Math.PI/2;
        model.removeFromParent();
        this._3dView.addModel(model);
      }
      this.isCharLoading = false;
    }).catch((e) => {
      console.error(e);
      this.isCharLoading = false;
    });
  }

  /**
   * Back: the appearance shown when the screen was opened is put back.
   */
  restoreAppearance(){
    const creature = GameState.CharGenManager.selectedCreature;
    if(this.exiting) return;
    this.exiting = true;
    creature.appearance = this.appearance;
    creature.portraitId = this.portraitId;
    creature.portrait = GameState.SWRuleSet.portraits[this.portraitId];
    creature.setAppearance(creature.appearance);
    creature.loadModel().then( (model: OdysseyModel3D) => {
      if(model){
        model.rotation.z = -Math.PI/2;
      }
      this.exiting = false;
      this.isCharLoading = false;
      this.close();
    }).catch((e) => {
      console.error(e);
      this.exiting = false;
      this.isCharLoading = false;
      this.close();
    });
  }

  /**
   * Accept: the appearance / portrait choice is kept and step 1 is done.
   */
  acceptAppearance(){
    const creature = GameState.CharGenManager.selectedCreature;

    //Save appearance choice
    creature.template.getFieldByLabel('Appearance_Type')?.setValue(creature.appearance);
    creature.template.getFieldByLabel('PortraitId')?.setValue(creature.portraitId);
    this.manager.CharGenQuickPanel.step1 = true;
    GameState.CharGenManager.setStepComplete(1, true);

    this.close();
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
    const portraitResRef = creature.portrait?.getPortraitGoodEvil(50);
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
    if(creature.model && creature.model.camerahook){
      creature.model.camerahook.getWorldPosition(v3)
      this._3dView.camera.position.z = v3.z;
    }
  }

}
