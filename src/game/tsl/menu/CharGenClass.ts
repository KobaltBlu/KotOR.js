/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GFFDataType } from "../../../enums/resource/GFFDataType";
import { GameState } from "../../../GameState";
import { CharGenClass as K1_CharGenClass, GUILabel, GUIButton, GUIControl, MenuManager, LBL_3DView } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { OdysseyModel } from "../../../odyssey";
import { GFFField } from "../../../resource/GFFField";
import { GFFObject } from "../../../resource/GFFObject";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyModel3D } from "../../../three/odyssey";

/* @file
* The CharGenClass menu class.
*/

export class CharGenClass extends K1_CharGenClass {

  declare _3D_MODEL2: GUILabel;
  declare LBL_CHAR_GEN: GUILabel;
  declare LBL_CLASS: GUILabel;
  declare LBL_INSTRUCTION: GUILabel;
  declare _3D_MODEL1: GUILabel;
  declare LBL_DESC: GUILabel;
  declare BTN_BACK: GUIButton;
  declare _3D_MODEL3: GUILabel;
  declare _3D_MODEL4: GUILabel;
  declare _3D_MODEL5: GUILabel;
  declare _3D_MODEL6: GUILabel;
  declare BTN_SEL1: GUIButton;
  declare BTN_SEL2: GUIButton;
  declare BTN_SEL3: GUIButton;
  declare BTN_SEL4: GUIButton;
  declare BTN_SEL6: GUIButton;
  declare BTN_SEL5: GUIButton;
  cgmain_light: OdysseyModel;

  constructor(){
    super();
    this.gui_resref = 'classsel_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close()
      });

      this.BTN_SEL1.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedClass = 0;
        GameState.player = this._3D_MODEL1.objectCreature;
        GameState.player.model.parent.remove(GameState.player.model);
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_SEL2.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedClass = 1;
        GameState.player = this._3D_MODEL2.objectCreature;
        GameState.player.model.parent.remove(GameState.player.model);
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_SEL3.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedClass = 2;
        GameState.player = this._3D_MODEL3.objectCreature;
        GameState.player.model.parent.remove(GameState.player.model);
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_SEL4.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedClass = 3;
        GameState.player = this._3D_MODEL4.objectCreature;
        GameState.player.model.parent.remove(GameState.player.model);
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_SEL5.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedClass = 4;
        GameState.player = this._3D_MODEL5.objectCreature;
        GameState.player.model.parent.remove(GameState.player.model);
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_SEL6.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedClass = 5;
        GameState.player = this._3D_MODEL6.objectCreature;
        GameState.player.model.parent.remove(GameState.player.model);
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.tGuiPanel.getFill().position.z = -0.5;

      for(let i = 0; i < 6; i++){
        let control = (this as any)['_3D_MODEL'+(i+1)];
        control._3dView = new LBL_3DView();
        control._3dView.visible = true;
        control._3dView.camera.aspect = control.extent.width / control.extent.height;
        control._3dView.camera.updateProjectionMatrix();
        control.setFillTexture(control._3dView.texture.texture);
        control.getFill().material.transparent = false;
      }

      GameState.ModelLoader.load({
        file: 'charmain_light',
        onLoad: (mdl: OdysseyModel) => {
          this.cgmain_light = mdl;
          resolve();
        }
      });
    });
  }

  Load3D(onLoad?: Function, i = 0) {
    if (i < 6) {
      this.InitCharacter3D((this as any)['_3D_MODEL' + (i + 1)], i, () => {
        i++;
        this.Load3D(onLoad, i);
      });
    } else {
      if (typeof onLoad === 'function')
        onLoad();
    }
  }

  InitCharacter3D(control: GUIControl, nth = 0, onLoad?: Function) {
    if (control._3dViewModel instanceof OdysseyModel3D) {
      control._3dViewModel.dispose();
      control._3dViewModel = undefined;
    }
    if (control.objectCreature instanceof ModuleCreature) {
      control.objectCreature.destroy();
      control.char = undefined;
      control.objectCreature = undefined;
    }
    OdysseyModel3D.FromMDL(this.cgmain_light, {
      onComplete: model => {
        control._3dViewModel = model;
        control._3dView.addModel(control._3dViewModel);
        control.camerahook = control._3dViewModel.getObjectByName('camerahook');
        control._3dView.camera.position.set(control.camerahook.position.x, control.camerahook.position.y, control.camerahook.position.z);
        control._3dView.camera.quaternion.set(control.camerahook.quaternion.x, control.camerahook.quaternion.y, control.camerahook.quaternion.z, control.camerahook.quaternion.w);
        control._3dView.camera.position.z = 1;
        let template = this.GetPlayerTemplate(nth);
        control.objectCreature = new ModuleCreature(template);
        control.objectCreature.Load(() => {
          control.objectCreature.LoadModel(model => {
            model.position.set(0, 0, 0);
            model.rotation.z = -Math.PI / 2;
            model.box = new THREE.Box3().setFromObject(model);
            control.char = model;
            control._3dView.addModel(control.char);
            TextureLoader.LoadQueue(() => {
              GameState.LoadScreen.setProgress((nth + 1) / 6 * 100);
              if (typeof onLoad === 'function')
                onLoad();
              control._3dViewModel.playAnimation(0, true);
            });
          });
        });
      },
      manageLighting: false,
      context: control._3dView
    });
  }

  GetPlayerTemplate(nth = 0) {
    let template = new GFFObject();
    let idx = Math.floor(Math.random() * 15);
    let classId = 0;
    switch (nth) {
    case 0:
      classId = 2;
      break;
    case 1:
      classId = 1;
      break;
    case 2:
      classId = 0;
      break;
    case 3:
      classId = 0;
      break;
    case 4:
      classId = 1;
      break;
    case 5:
      classId = 2;
      break;
    }
    let portraitId = 0;
    let appearanceIdx = CharGenClasses[nth].appearances[idx];
    for (let i = 0; i < Global.kotor2DA.portraits.RowCount; i++) {
      let port = Global.kotor2DA.portraits.rows[i];
      if (parseInt(port['appearancenumber']) == appearanceIdx) {
        portraitId = i;
        break;
      } else if (parseInt(port['appearance_l']) == appearanceIdx) {
        portraitId = i;
        break;
      } else if (parseInt(port['appearance_s']) == appearanceIdx) {
        portraitId = i;
        break;
      }
    }
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'Appearance_Type')).SetValue(appearanceIdx);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'FactionID')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'PortraitId')).SetValue(portraitId);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'HitPoints')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'CurrentHitPoints')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'MaxHitPoints')).SetValue(20);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'ForcePoints')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'CurrentForce')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Gender')).SetValue(nth < 3 ? 0 : 1);
    let equipment = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptAttacked')).SetValue('k_hen_attacked01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDamaged')).SetValue('k_hen_damage01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDeath')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDialogue')).SetValue('k_hen_dialogue01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDisturbed')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptEndRound')).SetValue('k_hen_combend01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat')).SetValue('k_hen_heartbt01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked')).SetValue('k_hen_blocked01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptOnNotice')).SetValue('k_hen_percept01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptRested')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptSpawn')).SetValue('k_hen_spawn01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptSpellAt')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'GoodEvil')).SetValue(50);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'NaturalAC')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'Con')).SetValue(10);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'Dex')).SetValue(14);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'Str')).SetValue(10);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'Wis')).SetValue(10);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'Cha')).SetValue(10);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'Int')).SetValue(10);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'fortbonus')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'refbonus')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'willbonus')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'PerceptionRange')).SetValue(12);
    let skillList = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'SkillList'));
    for (let i = 0; i < 8; i++) {
      let _skill = new GFFStruct();
      _skill.AddField(new GFFField(GFFDataType.RESREF, 'Rank')).SetValue(0);
      skillList.AddChildStruct(_skill);
    }
    let classList = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'ClassList'));
    let _class = new GFFStruct();
    _class.AddField(new GFFField(GFFDataType.INT, 'Class')).SetValue(classId);
    _class.AddField(new GFFField(GFFDataType.SHORT, 'ClassLevel')).SetValue(1);
    _class.AddField(new GFFField(GFFDataType.LIST, 'KnownList0'));
    classList.AddChildStruct(_class);
    let armorStruct = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
    armorStruct.AddField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).SetValue('g_a_clothes01');
    equipment.AddChildStruct(armorStruct);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(nth < 3 ? 85 : 83);
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'Race')).SetValue(6);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'XPosition')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'YPosition')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'ZPosition')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'XOrientation')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'YOrientation')).SetValue(0);
    return template;
  }

  Update(delta = 0) {
    try {
      for (let i = 0; i < 6; i++) {
        let modelControl = this['_3D_MODEL' + (i + 1)];
        let btnControl = this['BTN_SEL' + (i + 1)];
        if (modelControl.objectCreature) {
          modelControl.objectCreature.update(delta);
        }
        modelControl._3dView.render(delta);
        modelControl.getFill().material.needsUpdate = true;
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

  Init(onLoad = null) {
    let bgMusic = 'mus_main';
    GameState.LoadScreen.setProgress(0);
    this.Load3D(() => {
      AudioLoader.LoadMusic(bgMusic, data => {
        GameState.audioEngine.SetBackgroundMusic(data);
        if (typeof onLoad === 'function')
          onLoad();
      }, () => {
        console.error('Background Music not found', bgMusic);
        if (typeof onLoad === 'function')
          onLoad();
      });
    });
  }

  GetRandomAnimation() {
  }
  
}
