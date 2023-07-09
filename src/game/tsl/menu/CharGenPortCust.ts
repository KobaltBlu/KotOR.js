/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton, LBL_3DView } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { CharGenManager, MenuManager, TwoDAManager } from "../../../managers";
import { OdysseyModel3D } from "../../../three/odyssey";
import { CharGenClasses } from "../../CharGenClasses";
import { CharGenPortCust as K1_CharGenPortCust } from "../../kotor/KOTOR";
import * as THREE from "three";
import { EngineMode } from "../../../enums/engine/EngineMode";

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
      
        let idx = CharGenClasses[CharGenManager.selectedClass].appearances.indexOf(CharGenManager.selectedCreature.appearance);
        let arrayLength = CharGenClasses[CharGenManager.selectedClass].appearances.length;
        if(idx <= 0){
          CharGenManager.selectedCreature.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[arrayLength - 1];
        }else{
          CharGenManager.selectedCreature.appearance = CharGenClasses[CharGenManager.selectedClass].appearances[--idx];
        }

        const portraits2DA = TwoDAManager.datatables.get('portraits');
        if(portraits2DA){
          for(let i = 0; i < portraits2DA.RowCount; i++){
            let port = portraits2DA.rows[i];
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
        }

        CharGenManager.selectedCreature.loadModel().then( (model: any) => {
          this.updateCamera();
          this.UpdatePortrait();
          if(model){
            model.rotation.z = -Math.PI/2;
            model.removeFromParent();
            this._3dView.addModel(model);
          }
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

        const portraits2DA = TwoDAManager.datatables.get('portraits');
        if(portraits2DA){
          for(let i = 0; i < portraits2DA.RowCount; i++){
            let port = portraits2DA.rows[i];
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
        }

        CharGenManager.selectedCreature.loadModel().then( (model: OdysseyModel3D) => {
          this.updateCamera();
          this.UpdatePortrait();
          if(model){
            model.rotation.z = -Math.PI/2;
            model.removeFromParent();
            this._3dView.addModel(model);
          }
        });

      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(!this.exiting){
          this.exiting = true;
          //Restore previous appearance
          CharGenManager.selectedCreature.appearance = this.appearance;
          CharGenManager.selectedCreature.portraidId = this.portraidId;
          CharGenManager.selectedCreature.loadModel().then( (model: any) => {
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

      this._3dView.visible = true;
      this._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
      this._3dView.camera.updateProjectionMatrix();
      this.LBL_HEAD.setFillTexture(this._3dView.texture.texture);

      this.Init3D();
      resolve();
    });
  }
  
}
