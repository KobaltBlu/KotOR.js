/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton, LBL_3DView } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { CharGenManager } from "../../../managers/CharGenManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { OdysseyModel3D } from "../../../three/odyssey";
import { CharGenClasses } from "../../CharGenClasses";
import { CharGenPortCust as K1_CharGenPortCust } from "../../kotor/KOTOR";
import * as THREE from "three";

/* @file
* The CharGenPortCust menu class.
*/

export class CharGenPortCust extends K1_CharGenPortCust {

  declare LBL_HEAD: GUILabel;
  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare LBL_BEVEL_M: GUILabel;
  declare LBL_PORTRAIT: GUILabel;
  declare LBL_BEVEL_B: GUILabel;
  declare LBL_BEVEL_T: GUILabel;
  declare BTN_ARRL: GUIButton;
  declare BTN_ARRR: GUIButton;
  declare LBL_BEVEL_L: GUILabel;
  declare LBL_BEVEL_R: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_BAR6: GUILabel;
  declare LBL_BAR7: GUILabel;
  declare LBL_BAR8: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_ACCEPT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'portcust_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_ARRL.addEventListener('click', (e: any) => {
        e.stopPropagation();
      
        let idx = CharGenClasses[CharGenManager.selectedClass].appearances.indexOf(GameState.player.appearance);
        let arrayLength = CharGenClasses[CharGenManager.selectedClass].appearances.length;
        if(idx <= 0){
          GameState.player.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[arrayLength - 1];
        }else{
          GameState.player.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[--idx];
        }

        const portraits2DA = TwoDAManager.datatables.get('portraits');
        if(portraits2DA){
          for(let i = 0; i < portraits2DA.RowCount; i++){
            let port = portraits2DA.rows[i];
            if(parseInt(port['appearancenumber']) == GameState.player.appearance){
              GameState.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_l']) == GameState.player.appearance){
              GameState.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_s']) == GameState.player.appearance){
              GameState.player.portraidId = i;
              break;
            }
          }
        }

        GameState.player.LoadModel( (model: any) => {
          // this.LBL_HEAD._3dView.camera.position.z = model.camerahook.getWorldPosition().z;
          this.UpdatePortrait();
        });

      });

      this.BTN_ARRR.addEventListener('click', (e: any) => {
        e.stopPropagation();

        let idx = CharGenClasses[CharGenManager.selectedClass].appearances.indexOf(GameState.player.appearance);
        let arrayLength = CharGenClasses[CharGenManager.selectedClass].appearances.length;
        if(idx >= arrayLength - 1){
          GameState.player.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[0];
        }else{
          GameState.player.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[++idx];
        }

        const portraits2DA = TwoDAManager.datatables.get('portraits');
        if(portraits2DA){
          for(let i = 0; i < portraits2DA.RowCount; i++){
            let port = portraits2DA.rows[i];
            if(parseInt(port['appearancenumber']) == GameState.player.appearance){
              GameState.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_l']) == GameState.player.appearance){
              GameState.player.portraidId = i;
              break;
            }else if(parseInt(port['appearance_s']) == GameState.player.appearance){
              GameState.player.portraidId = i;
              break;
            }
          }
        }

        GameState.player.LoadModel( (model: OdysseyModel3D) => {
          let target = new THREE.Vector3;
          if(model.camerahook){
            model.camerahook.getWorldPosition(target);
            this._3dView.camera.position.z = target.z;
          }
          this.UpdatePortrait();
        });

      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(!this.exiting){
          this.exiting = true;
          //Restore previous appearance
          GameState.player.appearance = this.appearance;
          GameState.player.portraidId = this.portraidId;
          GameState.player.LoadModel( (model: any) => {
            this.exiting = false;
            this.Close();
          });
        }
      });

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        
        //Save appearance choice
        GameState.player.template.GetFieldByLabel('Appearance_Type').SetValue(GameState.player.appearance);
        GameState.player.template.GetFieldByLabel('PortraitId').SetValue(GameState.player.portraidId);

        this.Close();
      });

      this.tGuiPanel.widget.userData.fill.position.z = -0.5

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      this._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
      this._3dView.camera.updateProjectionMatrix();
      this.LBL_HEAD.setFillTexture(this._3dView.texture.texture);

      GameState.ModelLoader.load({
        file: 'cghead_light',
        onLoad: (mdl: any) => {
          this.cghead_light = mdl;
          this.Init3D();
          resolve();
        }
      }); 
    });
  }

  Init3D() {
    OdysseyModel3D.FromMDL(this.cghead_light, {
      onComplete: (model: any) => {
        this._3dViewModel = model;
        this._3dView.addModel(this._3dViewModel);
        this._3dView.camera.position.copy(model.camerahookm.position);
        this._3dView.camera.quaternion.copy(model.camerahookm.quaternion);
        this._3dView.camera.position.z = 1;
        this._3dViewModel.playAnimation(0, true);
      },
      manageLighting: false,
      context: this._3dView
    });
  }

  Update(delta = 0) {
    super.Update(delta);
    if (!this.bVisible)
      return;
    try {
      GameState.player.update(delta);
      this._3dView.render(delta);
      (this.LBL_HEAD.getFill().material as any).needsUpdate = true;
      (this.LBL_HEAD.getFill().material as any).transparent = false;
    } catch (e: any) {
      console.error(e);
    }
  }

  UpdatePortrait() {
    let portraitId = GameState.player.getPortraitId();
    let portrait = TwoDAManager.datatables.get('portraits')?.rows[portraitId];
    this.LBL_PORTRAIT.show();
    if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
      this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
      TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: any) => {
        this.LBL_PORTRAIT.setFillTexture(texture);
      });
    }
  }

  Show() {
    super.Show();
    this.appearance = GameState.player.appearance;
    this.portraidId = GameState.player.portraidId;
    try {
      GameState.player.model.parent.remove(GameState.player.model);
    } catch (e: any) {
    }
    this._3dView.scene.add(GameState.player.model);
    let target = new THREE.Vector3;
    if(GameState.player.model.camerahook){
      GameState.player.model.camerahook.getWorldPosition(target);
      this._3dView.camera.position.z = target.z;
    }
    // this._3dView.camera.position.z = GameState.player.model.getObjectByName('camerahook').getWorldPosition().z;
    this.UpdatePortrait();
  }
  
}
