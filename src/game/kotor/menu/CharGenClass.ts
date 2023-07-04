/* KotOR JS - A remake of the Odyssey GameState.Engine that powered KotOR I & II
*/

import { AudioLoader } from "../../../audio/AudioLoader";
import { ModuleCreatureArmorSlot } from "../../../enums/module/ModuleCreatureArmorSlot";
import { GFFDataType } from "../../../enums/resource/GFFDataType";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton, GUIControl, LBL_3DView } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { ModuleCreature, ModulePlayer } from "../../../module";
import { OdysseyModel } from "../../../odyssey";
import { GFFField } from "../../../resource/GFFField";
import { GFFObject } from "../../../resource/GFFObject";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyModel3D } from "../../../three/odyssey";
import * as THREE from "three";
import { CharGenClasses } from "../../CharGenClasses";
import { CharGenManager, MenuManager, TLKManager } from "../../../managers";

/* @file
* The CharGenClass menu class.
*/

export class CharGenClass extends GameMenu {

  _3D_MODEL2: GUILabel;
  LBL_CHAR_GEN: GUILabel;
  LBL_CLASS: GUILabel;
  LBL_INSTRUCTION: GUILabel;
  _3D_MODEL1: GUILabel;
  LBL_DESC: GUILabel;
  BTN_BACK: GUIButton;
  _3D_MODEL3: GUILabel;
  _3D_MODEL4: GUILabel;
  _3D_MODEL5: GUILabel;
  _3D_MODEL6: GUILabel;
  BTN_SEL1: GUIButton;
  BTN_SEL2: GUIButton;
  BTN_SEL3: GUIButton;
  BTN_SEL4: GUIButton;
  BTN_SEL6: GUIButton;
  BTN_SEL5: GUIButton;

  selecting: boolean = false;

  constructor(){
    super();
    this.gui_resref = 'classsel';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MainMenu.Start();
      });

      this.BTN_SEL1.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        CharGenManager.selectedClass = 0;
        let template = CharGenManager.templates.get(CharGenManager.selectedClass);
        CharGenManager.selectedCreature = new ModulePlayer(template);
        CharGenManager.selectedCreature.Load();
        CharGenManager.selectedCreature.LoadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
            MenuManager.CharGenMain.Open();
          });
        });
      });

      this.BTN_SEL2.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        CharGenManager.selectedClass = 1;
        let template = CharGenManager.templates.get(CharGenManager.selectedClass);
        CharGenManager.selectedCreature = new ModulePlayer(template);
        CharGenManager.selectedCreature.Load();
        CharGenManager.selectedCreature.LoadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
            MenuManager.CharGenMain.Open();
          });
        });
      });

      this.BTN_SEL3.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        CharGenManager.selectedClass = 2;
        let template = CharGenManager.templates.get(CharGenManager.selectedClass);
        CharGenManager.selectedCreature = new ModulePlayer(template);
        CharGenManager.selectedCreature.Load();
        CharGenManager.selectedCreature.LoadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
            MenuManager.CharGenMain.Open();
          });
        });
      });

      this.BTN_SEL4.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        CharGenManager.selectedClass = 3;
        let template = CharGenManager.templates.get(CharGenManager.selectedClass);
        CharGenManager.selectedCreature = new ModulePlayer(template);
        CharGenManager.selectedCreature.Load();
        CharGenManager.selectedCreature.LoadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
            MenuManager.CharGenMain.Open();
          });
        });
      });

      this.BTN_SEL5.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        CharGenManager.selectedClass = 4;
        let template = CharGenManager.templates.get(CharGenManager.selectedClass);
        CharGenManager.selectedCreature = new ModulePlayer(template);
        CharGenManager.selectedCreature.Load();
        CharGenManager.selectedCreature.LoadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
            MenuManager.CharGenMain.Open();
          });
        });
      });

      this.BTN_SEL6.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selecting) return;
        this.selecting = true;
        CharGenManager.selectedClass = 5;
        let template = CharGenManager.templates.get(CharGenManager.selectedClass);
        CharGenManager.selectedCreature = new ModulePlayer(template);
        CharGenManager.selectedCreature.Load();
        CharGenManager.selectedCreature.LoadModel().then((model: OdysseyModel3D) => {
          TextureLoader.LoadQueue(() => {
            this.selecting = false;
            MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
            MenuManager.CharGenMain.Open();
          });
        });
      });

      this.tGuiPanel.getFill().position.z = -0.5;

      for(let i = 0; i < 6; i++){
        let control = this.getControlByName('_3D_MODEL'+(i+1));
        let _3dView = CharGenManager.lbl_3d_views.get(i);
        _3dView.visible = true;
        _3dView.camera.aspect = control.extent.width / control.extent.height;
        _3dView.camera.updateProjectionMatrix();
        control.setFillTexture(_3dView.texture.texture);
        (control.getFill().material as THREE.ShaderMaterial).transparent = true;
        (control.getFill().material as THREE.ShaderMaterial).blending = 1;
      }

      resolve();  
    });
  }

  async load3D() {
    await this.initCharacter3D(this._3D_MODEL1, 0);
    await this.initCharacter3D(this._3D_MODEL2, 1);
    await this.initCharacter3D(this._3D_MODEL3, 2);
    await this.initCharacter3D(this._3D_MODEL4, 3);
    await this.initCharacter3D(this._3D_MODEL5, 4);
    await this.initCharacter3D(this._3D_MODEL6, 5);
  }

  initCharacter3D(control: GUIControl, nth = 0) {
    return new Promise<void>( (resolve, reject) => {
      let _3dView = CharGenManager.lbl_3d_views.get(nth);
      let _3dViewModel = CharGenManager.models.get(nth);
      let creature = CharGenManager.creatures.get(nth);
      _3dView.setControl(control);
      _3dView.visible = true;
      control.border.fill.material.transparent = true;
      control.border.fill.material.blending = 1;

      if(_3dViewModel) _3dViewModel.removeFromParent();

      OdysseyModel3D.FromMDL(CharGenManager.cgmain_light, {
        onComplete: (background_model: OdysseyModel3D) => {
          CharGenManager.models.set(nth, background_model);
          _3dViewModel = background_model;
          _3dView.addModel(_3dViewModel);
          _3dView.camera.position.copy(_3dViewModel.camerahook.position);
          _3dView.camera.quaternion.copy(_3dViewModel.camerahook.quaternion);
          _3dView.camera.position.z = 0.9;
          creature.Load();
          creature.LoadModel().then((creature_model: OdysseyModel3D) => {
            creature.model.position.set(0, 0, 0);
            creature.model.rotation.z = -Math.PI / 2;
            _3dView.addModel(creature.model);
            TextureLoader.LoadQueue(() => {
              MenuManager.LoadScreen.setProgress((nth + 1) / 6 * 100);
              _3dViewModel.playAnimation(0, true);
              resolve();
            });
          });
        },
        manageLighting: false,
        context: _3dView
      });
    });
  }

  Update(delta = 0) {
    super.Update(delta);
    if (!this.bVisible)
      return;
    try {
      for (let i = 0; i < 6; i++) {
        
        let modelControl = this.getControlByName('_3D_MODEL' + (i + 1))
        let btnControl = this.getControlByName('BTN_SEL' + (i + 1));
        let _3dView = CharGenManager.lbl_3d_views.get(i);
        let creature = CharGenManager.creatures.get(i);
        if (creature) {
          creature.update(delta);
        }
        if (btnControl.hover) {
          if (CharGenManager.hoveredClass != i) {
            CharGenManager.hoveredClass = i;
            this.textNeedsUpdate = true;
          }
          if (btnControl.extent.height < 213) {
            btnControl.extent.height++;
            btnControl.extent.width++;
          }
          if (modelControl.extent.height < 207) {
            modelControl.extent.height++;
            modelControl.extent.width++;
          }
        } else {
          if (btnControl.extent.height > 193) {
            btnControl.extent.height--;
            btnControl.extent.width--;
          }
          if (modelControl.extent.height > 187) {
            modelControl.extent.height--;
            modelControl.extent.width--;
          }
        }
        _3dView.setSize(modelControl.extent.width * 2, modelControl.extent.height * 2);
        _3dView.render(delta);
        (modelControl.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
        btnControl.resizeControl();
        modelControl.resizeControl();
      }
      if (this.textNeedsUpdate) {
        this.LBL_DESC.setText(TLKManager.TLKStrings[CharGenClasses[CharGenManager.hoveredClass].strings.description].Value);
        this.LBL_CLASS.setText(TLKManager.TLKStrings[CharGenClasses[CharGenManager.hoveredClass].strings.gender].Value + ' ' + TLKManager.TLKStrings[CharGenClasses[CharGenManager.hoveredClass].strings.name].Value);
        this.textNeedsUpdate = false;
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  Show() {
    super.Show();
  }

  async Init() {
    MenuManager.LoadScreen.setProgress(0);
    await this.load3D();
  }

  GetRandomAnimation() {
  }
  
}
