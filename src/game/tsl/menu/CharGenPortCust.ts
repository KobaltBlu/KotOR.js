import { GameState } from "../../../GameState";
import type { GUILabel, GUIButton } from "../../../gui";
import { OdysseyModel3D } from "../../../three/odyssey";
import { CharGenClasses } from "../../CharGenClasses";
import { CharGenPortCust as K1_CharGenPortCust } from "../../kotor/KOTOR";

/**
 * CharGenPortCust class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenPortCust.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_ARRL.addEventListener('click', (e) => {
        e.stopPropagation();
        const creature = GameState.CharGenManager.selectedCreature;
      
        let idx = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.indexOf(creature.appearance);
        let arrayLength = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.length;
        if(idx <= 0){
          creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[arrayLength - 1];
        }else{
          creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[--idx];
        }
        creature.creatureAppearance = GameState.AppearanceManager.GetCreatureAppearanceById(creature.appearance);

        const portraits2DA = GameState.TwoDAManager.datatables.get('portraits');
        if(portraits2DA){
          for(let i = 0; i < portraits2DA.RowCount; i++){
            let port = portraits2DA.rows[i];
            if(parseInt(port['appearancenumber']) == creature.appearance){
              creature.portraidId = i;
              break;
            }else if(parseInt(port['appearance_l']) == creature.appearance){
              creature.portraidId = i;
              break;
            }else if(parseInt(port['appearance_s']) == creature.appearance){
              creature.portraidId = i;
              break;
            }
          }
        }

        creature.loadModel().then( (model: any) => {
          this.updateCamera();
          this.UpdatePortrait();
          if(model){
            model.rotation.z = -Math.PI/2;
            model.removeFromParent();
            this._3dView.addModel(model);
          }
        });

      });

      this.BTN_ARRR.addEventListener('click', (e) => {
        e.stopPropagation();
        const creature = GameState.CharGenManager.selectedCreature;

        let idx = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.indexOf(creature.appearance);
        let arrayLength = CharGenClasses[GameState.CharGenManager.selectedClass].appearances.length;
        if(idx >= arrayLength - 1){
          creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[0];
        }else{
          creature.appearance = CharGenClasses[GameState.CharGenManager.selectedClass].appearances[++idx];
        }
        creature.creatureAppearance = GameState.AppearanceManager.GetCreatureAppearanceById(creature.appearance);

        const portraits2DA = GameState.TwoDAManager.datatables.get('portraits');
        if(portraits2DA){
          for(let i = 0; i < portraits2DA.RowCount; i++){
            let port = portraits2DA.rows[i];
            if(parseInt(port['appearancenumber']) == creature.appearance){
              creature.portraidId = i;
              break;
            }else if(parseInt(port['appearance_l']) == creature.appearance){
              creature.portraidId = i;
              break;
            }else if(parseInt(port['appearance_s']) == creature.appearance){
              creature.portraidId = i;
              break;
            }
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
        });

      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        const creature = GameState.CharGenManager.selectedCreature;
        if(!this.exiting){
          this.exiting = true;
          //Restore previous appearance
          creature.appearance = this.appearance;
          creature.portraidId = this.portraidId;
          creature.creatureAppearance = GameState.AppearanceManager.GetCreatureAppearanceById(creature.appearance);
          creature.loadModel().then( (model: any) => {
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
        creature.template.getFieldByLabel('PortraitId').setValue(creature.portraidId);
        this.manager.CharGenQuickPanel.step1 = true;
        this.close();
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
