import { GameMenu, LBL_3DView } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { OdysseyTexture } from "../../../three/odyssey/OdysseyTexture";
import { OdysseyModel3D } from "../../../three/odyssey";
import { CharGenClasses } from "../../CharGenClasses";
import * as THREE from "three";
import { GameState } from "../../../GameState";

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
    this.BTN_ARRL.addEventListener('click', (e) => {
      e.stopPropagation();
      if(this.isCharLoading) return;
      this.isCharLoading = true;
      const creature = GameState.CharGenManager.selectedCreature;
    
      let idx = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.indexOf(creature.appearance);
      const arrayLength = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.length;
      if(idx <= 0){
        creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[arrayLength - 1];
      }else{
        creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[--idx];
      }
      creature.setAppearance(creature.appearance);

      for(let i = 0; i < GameState.SWRuleSet.portraits.length; i++){
        const port = GameState.SWRuleSet.portraits[i];
        if(port.appearancenumber == creature.appearance){
          creature.portraitId = i;
          creature.portrait = GameState.SWRuleSet.portraits[i];
          break;
        }else if(port.appearance_l == creature.appearance){
          creature.portraitId = i;
          creature.portrait = GameState.SWRuleSet.portraits[i];
          break;
        }else if(port.appearance_s == creature.appearance){
          creature.portraitId = i;
          creature.portrait = GameState.SWRuleSet.portraits[i];
          break;
        }
      }

      creature.loadModel().then( (model: OdysseyModel3D) => {
        this.updateCamera();
        this.UpdatePortrait();
        if(model){
          model.rotation.z = -Math.PI/2;
          model.removeFromParent();
          this._3dView.addModel(model);
        }
        this.isCharLoading = false;
      });

    });

    this.BTN_ARRR.addEventListener('click', (e) => {
      e.stopPropagation();
      if(this.isCharLoading) return;
      this.isCharLoading = true;
      const creature = GameState.CharGenManager.selectedCreature;

      let idx = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.indexOf(creature.appearance);
      const arrayLength = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.length;
      if(idx >= arrayLength - 1){
        creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[0];
      }else{
        creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[++idx];
      }
      creature.setAppearance(creature.appearance);

      for(let i = 0; i < GameState.SWRuleSet.portraits.length; i++){
        const port = GameState.SWRuleSet.portraits[i];
        if(port.appearancenumber == creature.appearance){
          creature.portraitId = i;
          creature.portrait = GameState.SWRuleSet.portraits[i];
          break;
        }else if(port.appearance_l == creature.appearance){
          creature.portraitId = i;
          creature.portrait = GameState.SWRuleSet.portraits[i];
          break;
        }else if(port.appearance_s == creature.appearance){
          creature.portraitId = i;
          creature.portrait = GameState.SWRuleSet.portraits[i];
          break;
        }
      }

      creature.loadModel().then( (model: OdysseyModel3D) => {
        this.updateCamera();
        this.UpdatePortrait();
        if(model){
          model.rotation.z = -Math.PI/2;
          model.removeFromParent();
          this._3dView.addModel(model);
        }
        this.isCharLoading = false;
      });

    });

    this.BTN_BACK.addEventListener('click', (e) => {
      e.stopPropagation();
      const creature = GameState.CharGenManager.selectedCreature;
      if(!this.exiting){
        this.exiting = true;
        //Restore previous appearance
        creature.appearance = this.appearance;
        creature.portraitId = this.portraitId;
        creature.setAppearance(creature.appearance);
        creature.loadModel().then( (model: OdysseyModel3D) => {
          model.rotation.z = -Math.PI/2;
          this.exiting = false;
          this.close();
        });
      }
    });

    this.BTN_ACCEPT.addEventListener('click', (e) => {
      e.stopPropagation();
      const creature = GameState.CharGenManager.selectedCreature;
      
      //Save appearance choice
      creature.template.getFieldByLabel('Appearance_Type').setValue(creature.appearance);
      creature.template.getFieldByLabel('PortraitId').setValue(creature.portraitId);
      this.manager.CharGenQuickPanel.step1 = true;

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
    if (creature.getGender() == 0) {
      this._3dView.camera.position.copy(this.sceneModel3D.camerahookm.position);
      this._3dView.camera.quaternion.copy(this.sceneModel3D.camerahookm.quaternion);
    } else {
      this._3dView.camera.position.copy(this.sceneModel3D.camerahookf.position);
      this._3dView.camera.quaternion.copy(this.sceneModel3D.camerahookf.quaternion);
    }
    let v3 = new THREE.Vector3();
    creature.model.camerahook.getWorldPosition(v3)
    this._3dView.camera.position.z = v3.z;
  }
    
}
