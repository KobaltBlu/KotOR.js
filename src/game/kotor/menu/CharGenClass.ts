/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

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

  constructor(){
    super();
    this.gui_resref = 'classsel';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Load3D(onLoad = null, i = 0) {
  if (i < 6) {
    this.InitCharacter3D(this['_3D_MODEL' + (i + 1)], i, () => {
      i++;
      this.Load3D(onLoad, i);
    });
  } else {
    if (typeof onLoad === 'function')
      onLoad();
  }
}

InitCharacter3D(control, nth = 0, onLoad = null) {
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
      control._3dView.camera.position.z = 0.9;
      let template = this.GetPlayerTemplate(nth);
      control.objectCreature = new ModulePlayer(template);
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
  control.setFillTexture(control._3dView.texture.texture);
  control.border.fill.material.transparent = true;
  control.border.fill.material.blending = 1;
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
  let appearanceIdx = CharGenClass.Classes[nth].appearances[idx];
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
  template.RootNode.AddField(new GFFField(GFFDataType.INT, 'AIState')).SetValue(appearanceIdx);
  template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'ActionList'));
  template.RootNode.AddField(new GFFField(GFFDataType.INT, 'Age')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'AmbientAnimState')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.INT, 'Animation')).SetValue(10000);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Appearance_Head')).SetValue(1);
  template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'Appearance_Type')).SetValue(appearanceIdx);
  template.RootNode.AddField(new GFFField(GFFDataType.SHORT, 'ArmorClass')).SetValue(10);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'BodyBag')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'FactionID')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'PortraitId')).SetValue(portraitId);
  template.RootNode.AddField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName')).SetValue('New Player');
  template.RootNode.AddField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName'));
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
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'GoodEvil')).SetValue(50);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'NaturalAC')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Con')).SetValue(8);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Dex')).SetValue(8);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Str')).SetValue(8);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Wis')).SetValue(8);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Cha')).SetValue(8);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Int')).SetValue(8);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'fortbonus')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'refbonus')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'willbonus')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'PerceptionRange')).SetValue(13);
  let skillList = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'SkillList'));
  for (let i = 0; i < 8; i++) {
    let _skill = new GFFStruct();
    _skill.AddField(new GFFField(GFFDataType.BYTE, 'Rank')).SetValue(0);
    skillList.AddChildStruct(_skill);
  }
  let classList = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'ClassList'));
  let classStruct = new GFFStruct();
  classStruct.AddField(new GFFField(GFFDataType.INT, 'Class')).SetValue(classId);
  classStruct.AddField(new GFFField(GFFDataType.SHORT, 'ClassLevel')).SetValue(1);
  classStruct.AddField(new GFFField(GFFDataType.LIST, 'KnownList0'));
  classList.AddChildStruct(classStruct);
  let armorStruct = new GFFStruct(UTCObject.SLOT.ARMOR);
  armorStruct.AddField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).SetValue('g_a_clothes01');
  equipment.AddChildStruct(armorStruct);
  if (appearanceIdx >= 91 && appearanceIdx <= 105) {
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(83);
  } else if (appearanceIdx >= 106 && appearanceIdx <= 120) {
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(82);
  } else if (appearanceIdx >= 121 && appearanceIdx <= 135) {
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(83);
  } else if (appearanceIdx >= 136 && appearanceIdx <= 150) {
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(85);
  } else if (appearanceIdx >= 151 && appearanceIdx <= 165) {
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(84);
  } else if (appearanceIdx >= 166 && appearanceIdx <= 180) {
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(85);
  } else {
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(nth < 3 ? 85 : 83);
  }
  template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Race')).SetValue(6);
  template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'XPosition')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'YPosition')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).SetValue(0);
  template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).SetValue(0);
  return template;
}

Update(delta = 0) {
  super.Update(delta);
  if (!this.bVisible)
    return;
  try {
    for (let i = 0; i < 6; i++) {
      let modelControl = this['_3D_MODEL' + (i + 1)];
      let btnControl = this['BTN_SEL' + (i + 1)];
      if (modelControl.objectCreature) {
        modelControl.objectCreature.update(delta);
      }
      if (btnControl.hover) {
        if (CharGenClass.HoveredClass != i) {
          CharGenClass.HoveredClass = i;
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
      modelControl._3dView.setSize(modelControl.extent.width * 2, modelControl.extent.height * 2);
      modelControl._3dView.render(delta);
      modelControl.getFill().material.needsUpdate = true;
      btnControl.resizeControl();
      modelControl.resizeControl();
    }
    if (this.textNeedsUpdate) {
      this.LBL_DESC.setText(TLKManager.TLKStrings[CharGenClass.Classes[CharGenClass.HoveredClass].strings.description].Value);
      this.LBL_CLASS.setText(TLKManager.TLKStrings[CharGenClass.Classes[CharGenClass.HoveredClass].strings.gender].Value + ' ' + TLKManager.TLKStrings[CharGenClass.Classes[CharGenClass.HoveredClass].strings.name].Value);
      this.textNeedsUpdate = false;
    }
  } catch (e: any) {
    console.error(e: any);
  }
}

Show() {
  super.Show();
}

Init(onLoad = null) {
  let bgMusic = 'mus_theme_rep';
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
