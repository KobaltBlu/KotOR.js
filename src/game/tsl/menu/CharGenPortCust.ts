/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton } from "../../../gui";
import { CharGenPortCust as K1_CharGenPortCust } from "../../kotor/KOTOR";

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

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
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

        for(let i = 0; i < Global.kotor2DA.portraits.RowCount; i++){
          let port = Global.kotor2DA.portraits.rows[i];
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

        GameState.player.LoadModel( (model) => {
          this.LBL_HEAD._3dView.camera.position.z = model.getObjectByName('camerahook').getWorldPosition().z;
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

        for(let i = 0; i < Global.kotor2DA.portraits.RowCount; i++){
          let port = Global.kotor2DA.portraits.rows[i];
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

        GameState.player.LoadModel( (model) => {
          this.LBL_HEAD._3dView.camera.position.z = model.getObjectByName('camerahook').getWorldPosition().z;
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
          GameState.player.LoadModel( (model) => {
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

      this.tGuiPanel.widget.fill.position.z = -0.5

      this.LBL_HEAD._3dView = new LBL_3DView();
      this.LBL_HEAD._3dView.visible = true;
      this.LBL_HEAD._3dView.camera.aspect = this.LBL_HEAD.extent.width / this.LBL_HEAD.extent.height;
      this.LBL_HEAD._3dView.camera.updateProjectionMatrix();
      this.LBL_HEAD.setFillTexture(this.LBL_HEAD._3dView.texture.texture);

      GameState.ModelLoader.load({
        file: 'cghead_light',
        onLoad: (mdl) => {
          this.cghead_light = mdl;
          this.Init3D();
          resolve();
        }
      }); 
    });
  }

  Init3D() {
    let control = this.LBL_HEAD;
    OdysseyModel3D.FromMDL(this.cghead_light, {
      onComplete: model => {
        control._3dViewModel = model;
        control._3dView.addModel(control._3dViewModel);
        control.camerahook = control._3dViewModel.getObjectByName('camerahookm');
        control._3dView.camera.position.set(control.camerahook.position.x, control.camerahook.position.y, control.camerahook.position.z);
        control._3dView.camera.quaternion.set(control.camerahook.quaternion.x, control.camerahook.quaternion.y, control.camerahook.quaternion.z, control.camerahook.quaternion.w);
        control._3dView.camera.position.z = 1;
        control._3dViewModel.playAnimation(0, true);
      },
      manageLighting: false,
      context: control._3dView
    });
  }

  Update(delta = 0) {
    super.Update(delta);
    if (!this.bVisible)
      return;
    try {
      let modelControl = this.LBL_HEAD;
      GameState.player.update(delta);
      modelControl._3dView.render(delta);
      modelControl.getFill().material.needsUpdate = true;
      modelControl.getFill().material.transparent = false;
    } catch (e: any) {
      console.error(e);
    }
  }

  UpdatePortrait() {
    let portraitId = GameState.player.getPortraitId();
    let portrait = Global.kotor2DA['portraits'].rows[portraitId];
    this.LBL_PORTRAIT.show();
    if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
      this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
      TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
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
    this.LBL_HEAD._3dView.scene.add(GameState.player.model);
    this.LBL_HEAD._3dView.camera.position.z = GameState.player.model.getObjectByName('camerahook').getWorldPosition().z;
    this.UpdatePortrait();
  }
  
}
