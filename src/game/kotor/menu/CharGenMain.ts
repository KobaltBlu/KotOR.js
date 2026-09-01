import { GameMenu, LBL_3DView } from "@/gui";
import type { GUILabel } from "@/gui";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { OdysseyModel3D } from "@/three/odyssey";
import { CharGenClasses } from "@/game/CharGenClasses";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { LevelUpManager } from "@/managers/LevelUpManager";
import * as THREE from "three";

/** retail MAIN_TITLE_LBL SetStrRef */
const TLK_LEVEL_UP_TITLE = 0x42f; // 1071

/**
 * CharGenMain class.
 *
 * retail — gui3D_room + charrec_light (not
 * cgbody_light), Setup3DScene camera on camerahook with AttachTranslate
 * world Z = getCameraHeight(), SetViewAngle 22.726.
 *
 * Also hosts in-game level-up as retail (same MAINCG
 * layout) with MenuLevelUp (LEVELUPPNL) as childMenu.
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

  /** True while hosting in-game level-up (GUI). */
  levelUpMode: boolean = false;
  /** Portrait clone for level-up — never the live party model (retail uses a retail copy). */
  portraitModel: OdysseyModel3D;
  portraitGen: number = 0;

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

      this._3dView = new LBL_3DView();
      this._3dView.visible = true;
      this._3dView.setControl(this.MODEL_LBL);
      this._3dView.setViewAngle();
      (this.MODEL_LBL.getFill().material as THREE.ShaderMaterial).transparent = true;
      (this.MODEL_LBL.getFill().material as THREE.ShaderMaterial).blending = 1;

      void this.Init3D().then(() => resolve()).catch((e) => {
        console.error('CharGenMain.Init3D', e);
        resolve();
      });
    });
  }

  /**
   * Retail MAINCG / LevelUpCharGen uses charrec_light. Chargen Init loads it;
   * in-game level-up (EnsureLevelUpMenus) must load it lazily.
   */
  async Init3D() {
    const CG = GameState.CharGenManager;
    if(!CG.charrec_light){
      try{ await CG.LoadCharRecLight?.(); }catch(e){ console.error(e); }
    }
    if(!CG.cgbody_light){
      try{ await CG.LoadCGBodyLight?.(); }catch(e){ console.error(e); }
    }
    const lightMdl = CG.charrec_light ?? CG.cgbody_light;
    if(!lightMdl){
      console.error('CharGenMain.Init3D: missing charrec_light / cgbody_light');
      return;
    }
    await new Promise<void>((resolve) => {
      OdysseyModel3D.FromMDL(lightMdl, {
        onComplete: (model: OdysseyModel3D) => {
          if(!model){
            resolve();
            return;
          }
          this._3dViewModel = model;
          this._3dView.addModel(this._3dViewModel);
          this.updateCamera();
          // Setup3DScene plays alignment anim on charrec_light; chargen starts neutral.
          this._3dViewModel.playAnimation?.('align10', true);
          resolve();
        },
        context: this._3dView
      });
    });
  }

  /**
   * Retail Setup3DScene AttachTranslate
   * camerahook pose + world-space (0, 0, getCameraHeight()).
   */
  updateCamera() {
    if(!this._3dViewModel?.camerahook) return;
    const creature = this.getDisplayCreature();
    const headHeight = creature?.getCameraHeight?.() ?? 1.5;
    this._3dView.attachCameraToHook(
      this._3dViewModel.camerahook,
      { x: 0, y: 0, z: headHeight },
      true,
    );
  }

  getDisplayCreature(): ModuleCreature | undefined {
    if(this.levelUpMode){
      return LevelUpManager.creature ?? undefined;
    }
    return GameState.CharGenManager.selectedCreature;
  }

  /**
   * Retail ShowLevelUpGUI
   * opens MAINCG with LEVELUPPNL attached (our childMenu).
   */
  openForLevelUp(creature: ModuleCreature) {
    if(!creature) return;
    this.levelUpMode = true;
    this.childMenu = this.manager.MenuLevelUp;
    const title = GameState.TLKManager.GetStringById(TLK_LEVEL_UP_TITLE)?.Value;
    if(title){
      this.MAIN_TITLE_LBL?.setText(title);
    }
    this.open();
  }

  /** Exit level-up host and clear child panel (CancelLevelUp pops both modals). */
  closeLevelUp() {
    this.clearLevelUpPortrait();
    this.levelUpMode = false;
    this.childMenu = undefined;
    this.close();
  }

  clearLevelUpPortrait() {
    this.portraitGen++;
    if(this.portraitModel){
      try{ this.portraitModel.removeFromParent(); }catch(e){}
      try{ this.portraitModel.dispose?.(); }catch(e){}
      this.portraitModel = undefined;
    }
  }

  /**
   * Build a disposable appearance clone for level-up 3D (retail SetAppearance on
   * a dedicated retail — never reparent the live party model).
   */
  attachLevelUpPortrait(source: ModuleCreature) {
    if(!source || !this._3dView) return;
    this.clearLevelUpPortrait();
    const gen = this.portraitGen;

    const clone = new GameState.Module.ModuleArea.ModuleCreature();
    clone.setAppearance(source.appearance);
    clone.goodEvil = source.goodEvil | 0;
    if(source.equipment?.ARMOR){
      clone.equipment.ARMOR = new GameState.Module.ModuleArea.ModuleItem(source.equipment.ARMOR.template);
    }
    void clone.loadModel().then((model: OdysseyModel3D) => {
      if(gen !== this.portraitGen || !this.levelUpMode){
        try{ model?.dispose?.(); }catch(e){}
        return;
      }
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, -Math.PI / 2);
      this.portraitModel = model;
      this._3dView.scene.add(model);
      this.updateCamera();
      TextureLoader.LoadQueue();
    });
  }

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;
    try {
      let modelControl = this.MODEL_LBL;
      if(this.levelUpMode){
        this.portraitModel?.update?.(delta);
      }else{
        this.getDisplayCreature()?.update?.(delta);
      }
      this._3dView.render(delta);
      (modelControl.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
    } catch (e: any) {
      console.error(e);
    }
  }

  hide() {
    if(this.levelUpMode){
      this.clearLevelUpPortrait();
    }
    super.hide();
  }

  show() {
    super.show();
    if(this.levelUpMode){
      this.LBL_LEVEL?.show();
      this.LBL_LEVEL_VAL?.show();
      this.OLD_LBL?.hide();
      this.NEW_LBL?.hide();
      this.attachLevelUpPortrait(this.getDisplayCreature());
      this.updateCamera();
      this.updateAttributes();
      return;
    }

    this.LBL_LEVEL?.hide();
    this.LBL_LEVEL_VAL?.hide();
    this.OLD_LBL?.hide();
    this.NEW_LBL?.hide();
    const creature = this.getDisplayCreature();
    if(!creature?.model){
      this.updateAttributes();
      return;
    }
    try {
      creature.model.removeFromParent();
    } catch (e: any) {
    }
    this._3dView.scene.add(creature.model);
    creature.model.rotation.z = -Math.PI / 2;
    this.updateCamera();
    this.updateAttributes();
  }

  updateAttributes() {
    const creature = this.getDisplayCreature();
    if(!creature) return;

    this.STR_AB_LBL?.setText(String(creature.str | 0));
    this.DEX_AB_LBL?.setText(String(creature.dex | 0));
    this.CON_AB_LBL?.setText(String(creature.con | 0));
    this.INT_AB_LBL?.setText(String(creature.int | 0));
    this.WIS_AB_LBL?.setText(String(creature.wis | 0));
    this.CHA_AB_LBL?.setText(String(creature.cha | 0));

    this.LBL_VIT?.setText(String(creature.getMaxHP?.() ?? creature.maxHitPoints ?? 0));
    this.LBL_DEF?.setText(String(creature.getAC?.() ?? 10));

    const fort = (creature.fortbonus | 0) + Math.floor(((creature.con | 0) - 10) / 2);
    const refl = (creature.refbonus | 0) + Math.floor(((creature.dex | 0) - 10) / 2);
    const will = (creature.willbonus | 0) + Math.floor(((creature.wis | 0) - 10) / 2);
    this.NEW_FORT_LBL?.setText(String(fort));
    this.NEW_REFL_LBL?.setText(String(refl));
    this.NEW_WILL_LBL?.setText(String(will));

    this.LBL_NAME?.setText(creature.getName() || '');

    if(this.levelUpMode){
      const draft = LevelUpManager.draft;
      const cls = (draft
        ? creature.classes?.find((c) => c.id === draft.classId)
        : undefined) ?? creature.classes?.[creature.classes.length - 1];
      this.LBL_CLASS?.setText(cls?.getName?.() || '');
      const levelVal = draft?.newClassLevel ?? ((cls?.level | 0) + 1);
      this.LBL_LEVEL_VAL?.setText(String(levelVal));
    }else{
      this.LBL_CLASS?.setText(
        GameState.TLKManager.TLKStrings[CharGenClasses[GameState.CharGenManager.selectedClass].strings.name].Value
      );
    }

    const portraitResRef = creature.getPortraitResRef?.();
    if(portraitResRef && this.PORTRAIT_LBL){
      this.PORTRAIT_LBL.show();
      if(this.PORTRAIT_LBL.getFillTextureName() != portraitResRef){
        this.PORTRAIT_LBL.setFillTextureName(portraitResRef);
        TextureLoader.tpcLoader.fetch(portraitResRef).then((texture: OdysseyTexture) => {
          this.PORTRAIT_LBL.setFillTexture(texture);
        });
      }
    }
  }
  
}
