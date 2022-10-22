/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, MenuManager, LBL_3DView } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { CharGenManager } from "../../../managers/CharGenManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { OdysseyModel } from "../../../odyssey";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import { OdysseyModel3D } from "../../../three/odyssey";
import { CharGenClasses } from "../../CharGenClasses";
import { CharGenClass } from "./CharGenClass";
import * as THREE from "three";

/* @file
* The CharGenPortCust menu class.
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
  cghead_light: OdysseyModel;
  exiting: any;
  appearance: any;
  portraidId: any;

  _3dView: LBL_3DView;
  _3dViewModel: OdysseyModel3D;

  constructor(){
    super();
    this.gui_resref = 'portcust';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_ARRL.addEventListener('click', (e: any) => {
        e.stopPropagation();
      
        let idx = CharGenClasses[CharGenManager.selectedClass].appearances.indexOf(CharGenManager.selectedCreature.appearance);
        let arrayLength = CharGenClasses[CharGenManager.selectedClass].appearances.length;
        if(idx <= 0){
          CharGenManager.selectedCreature.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[arrayLength - 1];
        }else{
          CharGenManager.selectedCreature.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[--idx];
        }

        for(let i = 0; i < TwoDAManager.datatables.get('portraits').RowCount; i++){
          let port = TwoDAManager.datatables.get('portraits').rows[i];
          if(parseInt(port['appearancenumber']) == CharGenManager.selectedCreature.appearance){
            CharGenManager.selectedCreature.portraidId = i;
            break;
          }else if(parseInt(port['appearance_l']) == CharGenManager.selectedCreature.appearance){
            CharGenManager.selectedCreature.portraidId = i;
            break;
          }else if(parseInt(port['appearance_s']) == CharGenManager.selectedCreature.appearance){
            CharGenManager.selectedCreature.portraidId = i;
            break;
          }
        }

        CharGenManager.selectedCreature.LoadModel( (model: OdysseyModel3D) => {
          this.updateCamera();
          this.UpdatePortrait();
          model.rotation.z = -Math.PI/2;
        });

      });

      this.BTN_ARRR.addEventListener('click', (e: any) => {
        e.stopPropagation();

        let idx = CharGenClasses[CharGenManager.selectedClass].appearances.indexOf(CharGenManager.selectedCreature.appearance);
        let arrayLength = CharGenClasses[CharGenManager.selectedClass].appearances.length;
        if(idx >= arrayLength - 1){
          CharGenManager.selectedCreature.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[0];
        }else{
          CharGenManager.selectedCreature.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[++idx];
        }

        for(let i = 0; i < TwoDAManager.datatables.get('portraits').RowCount; i++){
          let port = TwoDAManager.datatables.get('portraits').rows[i];
          if(parseInt(port['appearancenumber']) == CharGenManager.selectedCreature.appearance){
            CharGenManager.selectedCreature.portraidId = i;
            break;
          }else if(parseInt(port['appearance_l']) == CharGenManager.selectedCreature.appearance){
            CharGenManager.selectedCreature.portraidId = i;
            break;
          }else if(parseInt(port['appearance_s']) == CharGenManager.selectedCreature.appearance){
            CharGenManager.selectedCreature.portraidId = i;
            break;
          }
        }

        CharGenManager.selectedCreature.LoadModel( (model: OdysseyModel3D) => {
          this.updateCamera();
          this.UpdatePortrait();
          model.rotation.z = -Math.PI/2;
        });

      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(!this.exiting){
          this.exiting = true;
          //Restore previous appearance
          CharGenManager.selectedCreature.appearance = this.appearance;
          CharGenManager.selectedCreature.portraidId = this.portraidId;
          CharGenManager.selectedCreature.LoadModel( (model: OdysseyModel3D) => {
            model.rotation.z = -Math.PI/2;
            this.exiting = false;
            this.Close();
          });
        }
      });

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        
        //Save appearance choice
        CharGenManager.selectedCreature.template.GetFieldByLabel('Appearance_Type').SetValue(CharGenManager.selectedCreature.appearance);
        CharGenManager.selectedCreature.template.GetFieldByLabel('PortraitId').SetValue(CharGenManager.selectedCreature.portraidId);
        MenuManager.CharGenQuickPanel.step1 = true;

        this.Close();
      });

      this.tGuiPanel.widget.userData.fill.position.z = -0.5

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      this._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
      this._3dView.camera.updateProjectionMatrix();
      this.LBL_HEAD.setFillTexture(this._3dView.texture.texture);
      (this.LBL_HEAD.getFill().material as THREE.ShaderMaterial).transparent = false;

      this.Init3D();
      resolve();
    });
  }

  Init3D() {
    let control = this.LBL_HEAD;
    OdysseyModel3D.FromMDL(this.cghead_light, {
      onComplete: (model: OdysseyModel3D) => {
        this._3dViewModel = model;
        this._3dView.addModel(this._3dViewModel);
        if(CharGenManager.selectedCreature.getGender()){
          this._3dView.camera.position.copy(this._3dViewModel.camerahookf.position);
          this._3dView.camera.quaternion.copy(this._3dViewModel.camerahookf.quaternion);
        }else{
          this._3dView.camera.position.copy(this._3dViewModel.camerahookm.position);
          this._3dView.camera.quaternion.copy(this._3dViewModel.camerahookm.quaternion);
        }
        this._3dViewModel.playAnimation(0, true);
      },
      manageLighting: false,
      context: this._3dView
    });
    (control.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this._3dView.texture.texture;
    (control.getFill().material as THREE.ShaderMaterial).transparent = false;
    (control.getFill().material as THREE.ShaderMaterial).blending = 1;
  }

  Update(delta = 0) {
    super.Update(delta);
    if (!this.bVisible)
      return;
    try {
      let modelControl = this.LBL_HEAD;
      CharGenManager.selectedCreature.update(delta);
      this._3dView.render(delta);
      (modelControl.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
    } catch (e: any) {
      console.error(e);
    }
  }

  UpdatePortrait() {
    let portraitId = CharGenManager.selectedCreature.getPortraitId();
    let portrait = TwoDAManager.datatables.get('portraits').rows[portraitId];
    this.LBL_PORTRAIT.show();
    if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
      this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
      TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
        this.LBL_PORTRAIT.setFillTexture(texture);
      });
    }
  }

  Show() {
    super.Show();
    this.appearance = CharGenManager.selectedCreature.appearance;
    this.portraidId = CharGenManager.selectedCreature.portraidId;
    try {
      CharGenManager.selectedCreature.model.parent.remove(CharGenManager.selectedCreature.model);
    } catch (e: any) {
    }
    this._3dView.scene.add(CharGenManager.selectedCreature.model);
    (this.LBL_PORTRAIT.getFill().material as THREE.ShaderMaterial).blending = 1;
    this.updateCamera();
    this.UpdatePortrait();
  }

  updateCamera() {
    if (CharGenManager.selectedCreature.getGender() == 0) {
      this._3dView.camera.position.copy(this._3dViewModel.camerahookm.position);
      this._3dView.camera.quaternion.copy(this._3dViewModel.camerahookm.quaternion);
    } else {
      this._3dView.camera.position.copy(this._3dViewModel.camerahookf.position);
      this._3dView.camera.quaternion.copy(this._3dViewModel.camerahookf.quaternion);
    }
    let v3 = new THREE.Vector3();
    CharGenManager.selectedCreature.model.camerahook.getWorldPosition(v3)
    this._3dView.camera.position.z = v3.z;
  }
    
}
