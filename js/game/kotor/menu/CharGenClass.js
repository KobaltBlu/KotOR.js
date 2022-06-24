/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenClass menu class.
 */

class CharGenClass extends GameMenu {
  
    constructor( args = {} ){
      super(args);

      this.background = '1600x1200back';
      this.textNeedsUpdate = true;
  
      this.LoadMenu({
        name: 'classsel',
        onLoad: () => {

          this.LBL_CLASS = this.getControlByName('LBL_CLASS');
          this.LBL_INSTRUCTION = this.getControlByName('LBL_INSTRUCTION');
          this.LBL_DESC = this.getControlByName('LBL_DESC');

          this._3D_MODEL1 = this.getControlByName('3D_MODEL1');
          this._3D_MODEL2 = this.getControlByName('3D_MODEL2');
          this._3D_MODEL3 = this.getControlByName('3D_MODEL3');
          this._3D_MODEL4 = this.getControlByName('3D_MODEL4');
          this._3D_MODEL5 = this.getControlByName('3D_MODEL5');
          this._3D_MODEL6 = this.getControlByName('3D_MODEL6');

          this.BTN_SEL1 = this.getControlByName('BTN_SEL1');
          this.BTN_SEL2 = this.getControlByName('BTN_SEL2');
          this.BTN_SEL3 = this.getControlByName('BTN_SEL3');
          this.BTN_SEL4 = this.getControlByName('BTN_SEL4');
          this.BTN_SEL5 = this.getControlByName('BTN_SEL5');
          this.BTN_SEL6 = this.getControlByName('BTN_SEL6');

          this.BTN_BACK = this.getControlByName('BTN_BACK');

          this.BTN_BACK.addEventListener('click', (e) => {
            e.stopPropagation();
            this.Close();
          });

          this.BTN_SEL1.addEventListener('click', (e) => {
            e.stopPropagation();
            CharGenClass.SelectedClass = 0;
            Game.player = this._3D_MODEL1.objectCreature;
            Game.player.model.parent.remove(Game.player.model);
            Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
            Game.CharGenMain.Open();
          });

          this.BTN_SEL2.addEventListener('click', (e) => {
            e.stopPropagation();
            CharGenClass.SelectedClass = 1;
            Game.player = this._3D_MODEL2.objectCreature;
            Game.player.model.parent.remove(Game.player.model);
            Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
            Game.CharGenMain.Open();
          });

          this.BTN_SEL3.addEventListener('click', (e) => {
            e.stopPropagation();
            CharGenClass.SelectedClass = 2;
            Game.player = this._3D_MODEL3.objectCreature;
            Game.player.model.parent.remove(Game.player.model);
            Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
            Game.CharGenMain.Open();
          });

          this.BTN_SEL4.addEventListener('click', (e) => {
            e.stopPropagation();
            CharGenClass.SelectedClass = 3;
            Game.player = this._3D_MODEL4.objectCreature;
            Game.player.model.parent.remove(Game.player.model);
            Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
            Game.CharGenMain.Open();
          });

          this.BTN_SEL5.addEventListener('click', (e) => {
            e.stopPropagation();
            CharGenClass.SelectedClass = 4;
            Game.player = this._3D_MODEL5.objectCreature;
            Game.player.model.parent.remove(Game.player.model);
            Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
            Game.CharGenMain.Open();
          });

          this.BTN_SEL6.addEventListener('click', (e) => {
            e.stopPropagation();
            CharGenClass.SelectedClass = 5;
            Game.player = this._3D_MODEL6.objectCreature;
            Game.player.model.parent.remove(Game.player.model);
            Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
            Game.CharGenMain.Open();
          });

          this.tGuiPanel.getFill().position.z = -0.5;

          for(let i = 0; i < 6; i++){
            let control = this['_3D_MODEL'+(i+1)];
            control._3dView = new LBL_3DView();
            control._3dView.visible = true;
            control._3dView.camera.aspect = control.extent.width / control.extent.height;
            control._3dView.camera.updateProjectionMatrix();
            control.setFillTexture(control._3dView.texture.texture);
            control.getFill().material.transparent = true;
            control.getFill().material.blending = 1;
          }

          Game.ModelLoader.load({
            file: 'cgmain_light',
            onLoad: (mdl) => {
              this.cgmain_light = mdl;
              if(typeof this.onLoad === 'function')
                this.onLoad();
            }
          });          

        }
      });
  
    }

    Load3D( onLoad = null, i = 0) {
      //console.log('load doors');
      if(i < 6){

        this.InitCharacter3D(this['_3D_MODEL'+(i+1)], i, () => {

          i++;
          this.Load3D( onLoad, i );

        });
  
      }else{
        if(typeof onLoad === 'function')
          onLoad();
      }
  
    }


    InitCharacter3D(control, nth = 0, onLoad = null){

      if(control._3dViewModel instanceof THREE.AuroraModel){
        control._3dViewModel.dispose();
        control._3dViewModel = undefined;
      }

      if(control.objectCreature instanceof ModuleCreature){
        control.objectCreature.destroy();
        control.char = undefined;
        control.objectCreature = undefined;
      }
      
      THREE.AuroraModel.FromMDL(this.cgmain_light, { 
        onComplete: (model) => {
          //console.log('Model Loaded', model);
          control._3dViewModel = model;
          control._3dView.addModel(control._3dViewModel);

          control.camerahook = control._3dViewModel.getObjectByName('camerahook');
          
          control._3dView.camera.position.set(
            control.camerahook.position.x,
            control.camerahook.position.y,
            control.camerahook.position.z
          );

          control._3dView.camera.quaternion.set(
            control.camerahook.quaternion.x,
            control.camerahook.quaternion.y,
            control.camerahook.quaternion.z,
            control.camerahook.quaternion.w
          );

          control._3dView.camera.position.z = .9;

          let template = this.GetPlayerTemplate(nth);
          control.objectCreature = new ModulePlayer(template);
          control.objectCreature.Load( () => {
            control.objectCreature.LoadModel( (model) => {
              model.position.set(0, 0, 0);
              model.rotation.z = -Math.PI/2;
              model.box = new THREE.Box3().setFromObject(model);
              control.char = model;
              //control._3dViewModel.children[0].children[1].add(control.char);
              control._3dView.addModel(control.char);
              TextureLoader.LoadQueue(() => {
                Game.LoadScreen.setProgress(((nth+1)/6)*100);
                if(typeof onLoad === 'function')
                  onLoad();
                //setTimeout( () => {
                  control._3dViewModel.playAnimation(0, true);
                  //control.char.playAnimation('pause1', false);
                //}, 100);
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

    GetPlayerTemplate(nth = 0){

      let template = new GFFObject();
      let idx = Math.floor(Math.random() * 15);
      let classId = 0;

      switch(nth){
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
      for(let i = 0; i < Global.kotor2DA.portraits.RowCount; i++){
        let port = Global.kotor2DA.portraits.rows[i];
        if(parseInt(port['appearancenumber']) == appearanceIdx){
          portraitId = i;
          break;
        }else if(parseInt(port['appearance_l']) == appearanceIdx){
          portraitId = i;
          break;
        }else if(parseInt(port['appearance_s']) == appearanceIdx){
          portraitId = i;
          break;
        }
      }
      //console.log('port', appearanceIdx, portraitId);

      template.RootNode.AddField( new Field(GFFDataTypes.INT, 'AIState') ).SetValue(appearanceIdx);
      template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ActionList') );
      template.RootNode.AddField( new Field(GFFDataTypes.INT, 'Age') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'AmbientAnimState') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.INT, 'Animation') ).SetValue(10000);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Appearance_Head') ).SetValue(1);
      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Appearance_Type') ).SetValue(appearanceIdx);
      template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'ArmorClass') ).SetValue(10);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyBag') ).SetValue(0);

      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'FactionID') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'PortraitId') ).SetValue(portraitId);
      template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'FirstName') ).SetValue('New Player');
      template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'LastName') );
      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'HitPoints') ).SetValue(8);
      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'CurrentHitPoints') ).SetValue(8);
      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'MaxHitPoints') ).SetValue(20);
      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'ForcePoints') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'CurrentForce') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Gender') ).SetValue(nth < 3 ? 0 : 1);
      let equipment = template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Equip_ItemList') );

      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptAttacked') ).SetValue('k_hen_attacked01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDamaged') ).SetValue('k_hen_damage01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDeath') ).SetValue('');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDialogue') ).SetValue('k_hen_dialogue01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDisturbed') ).SetValue('');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndDialogu') ).SetValue('');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndRound') ).SetValue('k_hen_combend01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptHeartbeat') ).SetValue('k_hen_heartbt01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnBlocked') ).SetValue('k_hen_blocked01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnNotice') ).SetValue('k_hen_percept01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptRested') ).SetValue('');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpawn') ).SetValue('k_hen_spawn01');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpellAt') ).SetValue('');
      template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptUserDefine') ).SetValue('');
  
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'GoodEvil') ).SetValue(50);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'NaturalAC') ).SetValue(0);
  
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Con') ).SetValue(8);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Dex') ).SetValue(8);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Str') ).SetValue(8);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Wis') ).SetValue(8);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Cha') ).SetValue(8);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Int') ).SetValue(8);
  
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'fortbonus') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'refbonus') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'willbonus') ).SetValue(0);
  
      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PerceptionRange') ).SetValue(13);
  
      let skillList = template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'SkillList') );
  
      for(let i = 0; i < 8; i++){
        let _skill = new Struct();
        _skill.AddField( new Field(GFFDataTypes.BYTE, 'Rank') ).SetValue(0);
        skillList.AddChildStruct(_skill);
      }

      //ClassList
      let classList = template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ClassList') );
      let classStruct = new Struct();
      classStruct.AddField( new Field(GFFDataTypes.INT, 'Class') ).SetValue(classId);
      classStruct.AddField( new Field(GFFDataTypes.SHORT, 'ClassLevel') ).SetValue(1);
      classStruct.AddField( new Field(GFFDataTypes.LIST, 'KnownList0') );
      classList.AddChildStruct(classStruct);
  
      let armorStruct = new Struct(UTCObject.SLOT.ARMOR);
      armorStruct.AddField( new Field(GFFDataTypes.RESREF, 'EquippedRes') ).SetValue('g_a_clothes01');
  
      equipment.AddChildStruct( armorStruct );
  
      // SoundSetFile
      if(appearanceIdx >= 91 && appearanceIdx <= 105){ //FEMALE_A
        template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(83);
      }else if(appearanceIdx >= 106 && appearanceIdx <= 120){ //FEMALE_B
        template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(82);
      }else if(appearanceIdx >= 121 && appearanceIdx <= 135){ //FEMALE_C
        template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(83);
      }else if(appearanceIdx >= 136 && appearanceIdx <= 150){ //MALE_A
        template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(85);
      }else if(appearanceIdx >= 151 && appearanceIdx <= 165){ //MALE_B
        template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(84);
      }else if(appearanceIdx >= 166 && appearanceIdx <= 180){ //MALE_C
        template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(85);
      }else{
        template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(nth < 3 ? 85 : 83);
      }

      template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Race') ).SetValue(6);
  
      template.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'XPosition') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'YPosition') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ZPosition') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'XOrientation') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'YOrientation') ).SetValue(0);
      template.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ZOrientation') ).SetValue(0);

      return template;

    }


    Update(delta = 0){
      
      super.Update(delta);
      if(!this.bVisible)
        return;

      try{
        for(let i = 0; i < 6; i++){
          let modelControl = this['_3D_MODEL'+(i+1)];
          let btnControl = this['BTN_SEL'+(i+1)];
          if(modelControl.objectCreature){
            modelControl.objectCreature.update(delta);
          }     

          if(btnControl.hover){
            if(CharGenClass.HoveredClass != i){
              CharGenClass.HoveredClass = i;
              this.textNeedsUpdate = true;
            }
              
            if(btnControl.extent.height < 213){
              btnControl.extent.height++;
              btnControl.extent.width++;
            }
            
            if(modelControl.extent.height < 207){
              modelControl.extent.height++;
              modelControl.extent.width++;
            }
          }else{
            if(btnControl.extent.height > 193){
              btnControl.extent.height--;
              btnControl.extent.width--;
            }

            if(modelControl.extent.height > 187){
              modelControl.extent.height--;
              modelControl.extent.width--;
            }
          }

          //Upscale the renderer a bit so that it will look a little better at this smaller size
          modelControl._3dView.setSize(modelControl.extent.width * 2, modelControl.extent.height * 2);
          //Render the frame
          modelControl._3dView.render(delta);
          modelControl.getFill().material.needsUpdate = true;

          btnControl.resizeControl();
          modelControl.resizeControl();
        }

        //
        if(this.textNeedsUpdate){
          this.LBL_DESC.setText(Global.kotorTLK.TLKStrings[
            CharGenClass.Classes[
              CharGenClass.HoveredClass
            ].strings.description
          ].Value);

          this.LBL_CLASS.setText(
            Global.kotorTLK.TLKStrings[
              CharGenClass.Classes[
                CharGenClass.HoveredClass
              ].strings.gender
            ].Value
            + ' ' +
            Global.kotorTLK.TLKStrings[
              CharGenClass.Classes[
                CharGenClass.HoveredClass
              ].strings.name
            ].Value
          );
          this.textNeedsUpdate = false;
        }
        
      }catch(e){
        console.error(e);
      }
    }

    Show(){
      super.Show();
    }

    Init( onLoad = null ){
      let bgMusic = 'mus_theme_rep';
      Game.LoadScreen.setProgress(0);
      this.Load3D( () => {
        AudioLoader.LoadMusic(bgMusic, (data) => {
          //console.log('Loaded Chargen Music', bgMusic);
          
          Game.audioEngine.SetBackgroundMusic(data);
          if(typeof onLoad === 'function')
            onLoad();
    
        }, () => {
          console.error('Background Music not found', bgMusic);
          if(typeof onLoad === 'function')
            onLoad();
        });
      });

    }

    GetRandomAnimation(){

    }
  
  }

  CharGenClass.SelectedClass = 0;
  CharGenClass.HoveredClass = 0;
  CharGenClass.Classes = {
    0: {
      id: 2,
      strings: {
        name: 135,
        gender: 358,
        description: 32109
      },
      appearances: [136, 139, 142, 145, 148, 151, 154, 157, 160, 163, 166, 169, 172, 175, 178]
    },
    1: {
      id: 1,
      strings: {
        name: 133,
        gender: 358,
        description: 32110
      },
      appearances: [137, 140, 143, 146, 149, 152, 155, 158, 161, 164, 167, 170, 173, 175, 179]
    },
    2: {
      id: 0,
      strings: {
        name: 134,
        gender: 358,
        description: 32111
      },
      appearances: [138, 141, 144, 147, 150, 153, 156, 159, 162, 165, 168, 171, 174, 177, 180]
    },
    3: {
      id: 0,
      strings: {
        name: 134,
        gender: 359,
        description: 32111
      },
      appearances: [93, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135]
    },
    4: {
      id: 1,
      strings: {
        name: 133,
        gender: 359,
        description: 32110
      },
      appearances: [92, 95, 98, 101, 104, 107, 110, 113, 116, 119, 122, 125, 128, 131, 134]
    },
    5: {
      id: 2,
      strings: {
        name: 135,
        gender: 359,
        description: 32109
      },
      appearances: [91, 94, 97, 100, 103, 106, 109, 112, 115, 118, 121, 124, 127, 130, 133]
    }
  };

  module.exports = CharGenClass;