import { GameMenu, LBL_3DView } from "@/gui";
import type { GUILabel } from "@/gui";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { OdysseyModel3D } from "@/three/odyssey";
import { getCharGenClass } from "@/game/CharGenClasses";
import { GameState } from "@/GameState";

/**
 * CharGenMain class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenMain.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenMain extends GameMenu {

  LBL_VIT: GUILabel;
  LBL_DEF: GUILabel;
  OLD_FORT_LBL: GUILabel;
  OLD_REFL_LBL: GUILabel;
  NEW_WILL_LBL: GUILabel;
  MODEL_LBL: GUILabel;
  FORT_ARROW_LBL: GUILabel;
  WILL_ARROW_LBL: GUILabel;
  NEW_REFL_LBL: GUILabel;
  OLD_WILL_LBL: GUILabel;
  NEW_FORT_LBL: GUILabel;
  LBL_FORTITUDE: GUILabel;
  PORTRAIT_LBL: GUILabel;
  MAIN_TITLE_LBL: GUILabel;
  STR_LBL: GUILabel;
  LBL_NAME: GUILabel;
  DEX_LBL: GUILabel;
  CON_LBL: GUILabel;
  INT_LBL: GUILabel;
  WIS_LBL: GUILabel;
  CHA_LBL: GUILabel;
  STR_AB_LBL: GUILabel;
  DEX_AB_LBL: GUILabel;
  CON_AB_LBL: GUILabel;
  INT_AB_LBL: GUILabel;
  WIS_AB_LBL: GUILabel;
  CHA_AB_LBL: GUILabel;
  OLD_VIT_LBL: GUILabel;
  OLD_DEF_LBL: GUILabel;
  NEW_VIT_LBL: GUILabel;
  NEW_DEF_LBL: GUILabel;
  OLD_LBL: GUILabel;
  NEW_LBL: GUILabel;
  VIT_ARROW_LBL: GUILabel;
  DEF_ARROW_LBL: GUILabel;
  LBL_WILL: GUILabel;
  LBL_REFLEX: GUILabel;
  LBL_BEVEL_L: GUILabel;
  LBL_BEVEL_R: GUILabel;
  LBL_BEVEL_M: GUILabel;
  REFL_ARROW_LBL: GUILabel;
  LBL_LEVEL_VAL: GUILabel;
  LBL_LEVEL: GUILabel;
  LBL_CLASS: GUILabel;
  _3dView: LBL_3DView;
  _3dViewModel: OdysseyModel3D;

  constructor(){
    super();
    this.gui_resref = 'maincg';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.tGuiPanel.getFill().position.z = -0.5;

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      this._3dView.camera.aspect = this.MODEL_LBL.extent.width / this.MODEL_LBL.extent.height;
      this._3dView.camera.updateProjectionMatrix();
      this.MODEL_LBL.setFillTexture(this._3dView.texture.texture);
      (this.MODEL_LBL.getFill().material as THREE.ShaderMaterial).transparent = true;
      (this.MODEL_LBL.getFill().material as THREE.ShaderMaterial).blending = 1;

      this.Init3D();
      resolve(); 
    });
  }

  Init3D() {
    OdysseyModel3D.FromMDL(GameState.CharGenManager.cgbody_light, {
      onComplete: (model: OdysseyModel3D) => {
        this._3dViewModel = model;
        this._3dView.addModel(this._3dViewModel);
        this._3dView.camera.position.copy(this._3dViewModel.camerahook.position);
        this._3dView.camera.quaternion.copy(this._3dViewModel.camerahook.quaternion);
        this._3dViewModel.playAnimation(0, true);
      },
      // manageLighting: false,
      context: this._3dView
    });
  }

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;
    try {
      let modelControl = this.MODEL_LBL;
      GameState.CharGenManager.selectedCreature.update(delta);
      this._3dView.render(delta);
      (modelControl.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
    } catch (e: any) {
      console.error(e);
    }
  }

  hide() {
    super.hide();
  }

  show() {
    super.show();
    this.LBL_LEVEL?.hide();
    this.LBL_LEVEL_VAL?.hide();
    this.OLD_LBL?.hide();
    this.NEW_LBL?.hide();
    try {
      GameState.CharGenManager.selectedCreature.model.removeFromParent();
    } catch (e: any) {
    }
    this._3dView.scene.add(GameState.CharGenManager.selectedCreature.model);
    GameState.CharGenManager.selectedCreature.model.rotation.z = -Math.PI / 2;
    const portraitResRef = GameState.CharGenManager.selectedCreature.getPortraitResRef();
    this.PORTRAIT_LBL.show();
    if (this.PORTRAIT_LBL.getFillTextureName() != portraitResRef) {
      this.PORTRAIT_LBL.setFillTextureName(portraitResRef);
      TextureLoader.tpcLoader.fetch(portraitResRef).then((texture: OdysseyTexture) => {
        this.PORTRAIT_LBL.setFillTexture(texture);
      });
    }
    const slot = getCharGenClass(GameState.CharGenManager.selectedClass);
    this.LBL_CLASS?.setText(this.getTLKString(slot.strings.name));
    this.updateAttributes();
  }

  getTLKString(strRef: number): string {
    const tlkString = GameState.TLKManager?.TLKStrings?.[strRef];
    return tlkString ? tlkString.Value : '';
  }

  /**
   * Summary panel: name, attributes, vitality, defense and saves of the
   * character being built. Called on every show() and by the Attributes
   * screen's Accept. The OLD/NEW/arrow labels only matter on level-up and
   * stay hidden; the values go to LBL_VIT / LBL_DEF and the NEW_* save labels.
   */
  updateAttributes() {
    const creature = GameState.CharGenManager.selectedCreature;
    if(!creature) return;

    //Keep the creature's stored HP/FP in step with the class + attributes
    GameState.CharGenManager.applyDerivedStats(creature);

    this.LBL_NAME?.setText(creature.firstName);

    this.STR_AB_LBL?.setText(creature.str);
    this.DEX_AB_LBL?.setText(creature.dex);
    this.CON_AB_LBL?.setText(creature.con);
    this.INT_AB_LBL?.setText(creature.int);
    this.WIS_AB_LBL?.setText(creature.wis);
    this.CHA_AB_LBL?.setText(creature.cha);

    this.LBL_VIT?.setText(creature.getMaxHP());
    this.LBL_DEF?.setText(creature.getAC());

    //Level-up only: previous value, arrow, column headers
    this.OLD_VIT_LBL?.hide();
    this.NEW_VIT_LBL?.hide();
    this.VIT_ARROW_LBL?.hide();
    this.OLD_DEF_LBL?.hide();
    this.NEW_DEF_LBL?.hide();
    this.DEF_ARROW_LBL?.hide();
    this.OLD_FORT_LBL?.hide();
    this.OLD_REFL_LBL?.hide();
    this.OLD_WILL_LBL?.hide();
    this.FORT_ARROW_LBL?.hide();
    this.REFL_ARROW_LBL?.hide();
    this.WILL_ARROW_LBL?.hide();
    this.OLD_LBL?.hide();
    this.NEW_LBL?.hide();

    //Saves: class base (level-1 row) + ability modifier
    this.NEW_FORT_LBL?.setText(creature.getTotalFortitudeSave());
    this.NEW_REFL_LBL?.setText(creature.getTotalReflexSave());
    this.NEW_WILL_LBL?.setText(creature.getTotalWillSave());
    this.NEW_FORT_LBL?.show();
    this.NEW_REFL_LBL?.show();
    this.NEW_WILL_LBL?.show();
  }
  
}
