/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UTCObject class.
 */

class UTCObject {

  constructor(gff = undefined, moduleObject = undefined) {
    this.model = null;
    this.moduleObject = moduleObject;
    this.bodyVariant = 'A';
    this.textureVar = 1;
    this.resType = UTCObject.ResType;
    this.gff = gff;
    this.scripts = {

    };

    this.lhand = null;
    this.rhand = null;

    this.onUpdated = (gff) => {
      this.Update();
    }

  }

  LoadScripts (onLoad = null){

    this.scripts.onAttacked = this.gff.GetFieldByLabel('ScriptAttacked').GetValue();
    this.scripts.onDamaged = this.gff.GetFieldByLabel('ScriptDamaged').GetValue();
    this.scripts.onDeath = this.gff.GetFieldByLabel('ScriptDeath').GetValue();
    this.scripts.onDialog = this.gff.GetFieldByLabel('ScriptDialogue').GetValue();
    this.scripts.onDisturbed = this.gff.GetFieldByLabel('ScriptDisturbed').GetValue();
    this.scripts.onEndDialog = this.gff.GetFieldByLabel('ScriptEndDialogu').GetValue();
    this.scripts.onEndRound = this.gff.GetFieldByLabel('ScriptEndRound').GetValue();
    this.scripts.onHeartbeat = this.gff.GetFieldByLabel('ScriptHeartbeat').GetValue();
    this.scripts.onBlocked = this.gff.GetFieldByLabel('ScriptOnBlocked').GetValue();
    this.scripts.onNotice = this.gff.GetFieldByLabel('ScriptOnNotice').GetValue();
    this.scripts.onRested = this.gff.GetFieldByLabel('ScriptRested').GetValue();
    this.scripts.onSpawn = this.gff.GetFieldByLabel('ScriptSpawn').GetValue();
    this.scripts.onSpellAt = this.gff.GetFieldByLabel('ScriptSpellAt').GetValue();
    this.scripts.onUserDefined = this.gff.GetFieldByLabel('ScriptUserDefine').GetValue();

    let keys = Object.keys(this.scripts);
    let loop = new AsyncLoop({
      array: keys,
      onLoop: async (key, asyncLoop) => {
        let _script = this.scripts[key];
        if(_script != '' && !(_script instanceof NWScriptInstance)){
          //let script = await NWScript.Load(_script);
          this.scripts[key] = await NWScript.Load(_script);
          //this.scripts[key].name = _script;
          asyncLoop.next();
        }else{
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  LoadModel ( onLoad = null ){

    this.moduleObject.isReady = false;

    this.LoadEquipment( () => {
      this.LoadBody( () => {
        this.LoadHead( () => {
          TextureLoader.LoadQueue(() => {
            this.moduleObject.isReady = true;
            if(onLoad != null)
              onLoad(this.model);
          }, (texName) => {
            //loader.SetMessage('Loading Textures: '+texName);
          });
        });
      });
    });

  }

  LoadBody( onLoad = null ){
    let appearance = this.getAppearance();
    this.bodyModel = appearance.modelc.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.bodyTexture = '****';

    if(this.moduleObject.equipment.ARMOR instanceof UTIObject){
      this.textureVar = this.moduleObject.equipment.ARMOR.getTextureVariation();

      if(appearance.modeltype != 'B'){

        let raceTex = appearance.racetex.replace(/\0[\s\S]*$/g,'');
        this.bodyModel = appearance.race.replace(/\0[\s\S]*$/g,'').toLowerCase();
        let match = raceTex.match(/\d+/);
        
        if(match && this.textureVar){

          match = match[0];
          this.bodyTexture = raceTex.replace( new RegExp("[0-9]+", "g"), this.textureVar ? pad( this.textureVar, match.length ) : '' );

        }else{

          this.bodyTexture = raceTex; //(raceTex != '****' ? raceTex : 0) + ((this.textureVar < 10) ? (this.textureVar) : this.textureVar)
          
        }

        console.log('body 1', this.bodyTexture, raceTex, this.textureVar, appearance);
        
      }else{
        switch(this.moduleObject.equipment.ARMOR.getBodyVariation().toLowerCase()){
          case 'a':
            this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'b':
            this.bodyModel = appearance.modelb.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texb.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'c':
            this.bodyModel = appearance.modelc.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texc.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'd':
            this.bodyModel = appearance.modeld.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texd.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'e':
            this.bodyModel = appearance.modele.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texe.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'f':
            this.bodyModel = appearance.modelf.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texf.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'g':
            this.bodyModel = appearance.modelg.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texg.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'h':
            this.bodyModel = appearance.modelh.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texh.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          case 'i':
            this.bodyModel = appearance.modeli.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texi.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
          default:
            this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);
          break;
        }
        console.log('body 1B', this.bodyTexture, this.bodyModel, this.textureVar, appearance);
      }
      
    }else{
      if(appearance.modeltype != 'B'){
        let raceTex = appearance.racetex.replace(/\0[\s\S]*$/g,'').toLowerCase();
        this.bodyModel = appearance.race.replace(/\0[\s\S]*$/g,'').toLowerCase();

        let match = raceTex.match(/\d+/);

        if(match && this.textureVar){

          match = match[0];
          this.bodyTexture = raceTex.replace( new RegExp("[0-9]+", "g"), this.textureVar ? pad( this.textureVar, match.length ) : '' );

        }else{

          this.bodyTexture = raceTex; //(raceTex != '****' ? raceTex : 0) + ((this.textureVar < 10) ? (this.textureVar) : this.textureVar)

        }

        console.log('body 2', this.bodyTexture, raceTex, this.textureVar, appearance);
      }else{
        this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
        this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);

        console.log('body 2B', this.bodyTexture, this.bodyModel, this.textureVar, appearance);
      }
    }

    let mdlLoader = new THREE.MDLLoader();
    mdlLoader.load({
      file: this.bodyModel,
      onLoad: (mdl) => {
        THREE.AuroraModel.FromMDL(mdl, {
          castShadow: true,
          receiveShadow: true,
          textureVar: this.bodyTexture,
          onComplete: (model) => {

            if(this.model != null){
              let scene = this.model.parent;
              let position = this.model.position;
              let rotation = this.model.rotation;
              scene.remove(this.model);
            }

            this.model = model;
            this.model.moduleObject = this.moduleObject;
            this.moduleObject.model = this.model;

            try{
              if(this.moduleObject.equipment.LEFTHAND instanceof UTIObject){
                this.model.lhand.add(this.moduleObject.equipment.LEFTHAND.model);
              }
            }catch(e){
              
            }

            try{
              if(this.moduleObject.equipment.RIGHTHAND instanceof UTIObject){
                this.model.rhand.add(this.moduleObject.equipment.RIGHTHAND.model);
              }
            }catch(e){
              
            }

            if(typeof scene != 'undefined'){
              scene.add( this.model );
              Game.octree.add( this.model );
              this.model.translateX(position.x);
              this.model.translateY(position.y);
              this.model.translateZ(position.z);

              this.model.rotation.set(rotation.x, rotation.y, rotation.z);
            }

            if(typeof onLoad === 'function')
              onLoad();

          }
        });
      }
    });
  }

  LoadHead( onLoad = null ){
    let appearance = this.getAppearance();
    let headId = appearance.normalhead.replace(/\0[\s\S]*$/g,'').toLowerCase();
    if(headId != '****'){
      let head = Global.kotor2DA['heads'].rows[headId];
      let headLoader = new THREE.MDLLoader();
      headLoader.load({
        file: head.head.replace(/\0[\s\S]*$/g,'').toLowerCase(),
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            onComplete: (head) => {
              try{
                this.model.headhook.head = head;
                this.model.headhook.add(head);
                //head.buildSkeleton();

                if(typeof onLoad === 'function')
                  onLoad();
              }catch(e){
                console.error(e);
                if(typeof onLoad === 'function')
                  onLoad();
              }
            },
            castShadow: true,
            receiveShadow: true
          });
        }
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  LoadEquipment( onLoad = null){

    this.equipment = this.gff.GetFieldByLabel('Equip_ItemList').GetChildStructs();

    this.ParseEquipmentSlots( () => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  ParseEquipmentSlots( onLoad = null, cEquip = 0){

    if(cEquip < this.equipment.length){
      let equip = this.equipment[cEquip];
      let EquippedRes = equip.GetFieldByLabel('EquippedRes').Value;

      this.LoadEquipmentItem({
        ResRef: EquippedRes,
        Slot: equip.GetType(),
        onLoad: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        },
        onError: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        }
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  GetEquippedSlot(slot = 0){
    for(let i = 0; i < this.equipment.length; i++){

      let equip = this.equipment[i];
      if(equip.GetType() == slot){

        return {

        }

      }
      let EquippedRes = equip.GetFieldByLabel('EquippedRes').Value;

      this.LoadEquipmentItem({
        ResRef: EquippedRes,
        Slot: equip.GetType(),
        onLoad: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        },
        onError: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        }
      });

    }
  }



  LoadEquipmentItem(args = {}){

    args = $.extend({
      ResRef: null,
      Slot: 0x01,
      onLoad: null,
      onError: null
    }, args);

    UTIObject.FromTemplate(args.ResRef, (uti) => {
      switch(args.Slot){
        case UTCObject.SLOT.ARMOR:
          this.moduleObject.equipment.ARMOR = uti;

          uti.Load( () => {
            if(typeof args.onLoad == 'function')
              args.onLoad();
          });

        break;
        case UTCObject.SLOT.RIGHTHAND:
          this.moduleObject.equipment.RIGHTHAND = uti;

          uti.Load( () => {
            if(typeof args.onLoad == 'function')
              args.onLoad();
          });

        break;
        case UTCObject.SLOT.LEFTHAND:
          this.moduleObject.equipment.LEFTHAND = uti;

          uti.Load( () => {
            if(typeof args.onLoad == 'function')
              args.onLoad();
          });

        break;
        case UTCObject.SLOT.CLAW1:
          this.moduleObject.equipment.CLAW1 = uti;

          uti.Load( () => {
            if(typeof args.onLoad == 'function')
              args.onLoad();
          });

        break;
        case UTCObject.SLOT.CLAW2:
          this.moduleObject.equipment.CLAW2 = uti;

          uti.Load( () => {
            if(typeof args.onLoad == 'function')
              args.onLoad();
          });

        break;
        case UTCObject.SLOT.CLAW3:
          this.moduleObject.equipment.CLAW3 = uti;

          uti.Load( () => {
            if(typeof args.onLoad == 'function')
              args.onLoad();
          });

        break;
        default:
          uti.Load( () => {
            if(typeof args.onLoad == 'function')
              args.onLoad();
          });
        break;
      }
    });

  }

  Update(onLoad = null){
    this.LoadEquipment( () => {
      this.LoadModel( () => {
        if(onLoad != null)
          onLoad(this);
      });
    });
  }

  ChangeTemplate(ResRef = null, onLoad = null){

    if(ResRef != null){

      if(this.gff != null){
        this.gff.signals.onUpdated.remove(this.onUpdated);
      }

      this.textureVar = 0;
      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTCObject.ResType,
        onLoad: (gff) => {
          this.gff = gff;

          this.gff.signals.onUpdated.add(this.onUpdated);

          this.Update( () => {
            if(onLoad != null)
              onLoad(this);
          });

        },
        onFail: () => {
          console.error('Failed to load placeable template');
        }
      });
    }

  }

  getFactionID(){
    return this.gff.GetFieldByLabel('FactionID').GetValue();
  }

  getIsPC(){
    return this.gff.GetFieldByLabel('IsPC').GetValue();
  }

  getPortraitId(){
    return this.gff.GetFieldByLabel('PortraitId').GetValue();
  }

  getWalkRateId(){
    return this.gff.GetFieldByLabel('WalkRate').GetValue();
  }

  getAppearance(){
    return Global.kotor2DA["appearance"].rows[this.gff.GetFieldByLabel('Appearance_Type').GetValue()];
  }

  static FromTemplate(ResRef = null, onLoad = null){

    let utc = new UTCObject();

    if(ResRef != null){

      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTCObject.ResType,
        onLoad: (gff) => {
          utc.gff = gff;
          utc.gff.signals.onUpdated.add(utc.onUpdated);
          if(onLoad != null)
            onLoad(utc);

        },
        onFail: () => {
          console.error('Failed to load creature template');
        }
      });

    }

  }

  static FromGFF(gff = null){
    let utc = new UTCObject();
    utc.gff = gff;
    utc.gff.signals.onUpdated.add(utc.onUpdated);
    return utc;
  }

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTC ';

    template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Appearance_Type') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyBag') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyVariation') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Cha') );
    template.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ChallengeRating') );
    template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ClassList') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Comment') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Con') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Conversation') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'CurrentForce') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'CurrentHitPoints') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Deity') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'Description') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Dex') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Disarmable') );
    template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Equip_ItemList') );
    template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'FactionID') );
    template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'FeatList') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'FirstName') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'ForcePoints') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Gender') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'GoodEvil') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'HitPoints') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Int') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Interruptable') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'IsPC') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'LastName') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'LawfulChaotic') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'MaxHitPoints') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Min1HP') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'NaturalAC') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'NoPermDeath') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'NotReorienting') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PalletID') ).SetValue(4);
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PartyInteract') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PerceptionRange') );
    template.RootNode.AddField( new Field(GFFDataTypes.INT, 'Phenotype') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Plot') );
    template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'PortraitId') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Race') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptAttacked') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDamaged') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDeath') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDialogue') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDisturbed') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndDialogu') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndRound') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptHeartbeat') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnBlocked') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnNotice') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptRested') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpawn') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpellAt') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptUserDefine') );
    let skillList = template.RootNode.AddField( new Field(GFFDataTypes.List, 'SkillList') );
    template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') )
    template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'SpecAbilityList') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Str') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Subrace') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'SubraceIndex') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Tag') );
    template.RootNode.AddField( new Field(GFFDataTypes.LIST, 'TemplateList') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'TemplateResRef') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TextureVar') );
    template.RootNode.AddField( new Field(GFFDataTypes.INT, 'WalkRate') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Wis') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'fortbonus') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'refbonus') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'willbonus') );

    for(let i = 0; i < 8; i++){
      let _skill = new Struct();
      _skill.AddField( new Field(GFFDataTypes.RESREF, 'Rank') ).SetValue(0);
      skillList.AddChildStruct(_skill);
    }

    return template;
  }

}

UTCObject.ResType = ResourceTypes['utc'];

UTCObject.SLOT = {
  HEAD: 0x1,
  ARMOR: 0x2,
  ARMS: 0x8,
  RIGHTHAND: 0x10,
  LEFTHAND: 0x20,
  LEFTARMBAND: 0x80,
  RIGHTARMBAND: 0x100,
  IMPLANT: 0x200,
  BELT: 0x400,

  CLAW1: 0x4000,
  CLAW2: 0x8000,
  CLAW3: 0x10000,
  HIDE:  0x20000,
};

UTCObject.NWScriptSlot = (slot = 0) => {
  switch(slot){
    case 0:
      return UTCObject.SLOT.HEAD;
    case 1:
      return UTCObject.SLOT.ARMOR;
    case 2:
      return UTCObject.SLOT.ARMS;
    case 3:
      return UTCObject.SLOT.RIGHTHAND;
    case 4:
      return UTCObject.SLOT.LEFTHAND;
    case 5:
      return UTCObject.SLOT.LEFTARMBAND;
    case 6:
      return UTCObject.SLOT.RIGHTARMBAND;
    case 7:
      return UTCObject.SLOT.IMPLANT;
    case 8:
      return UTCObject.SLOT.BELT;
    case 9:
      return UTCObject.SLOT.CLAW1;
    case 10:
      return UTCObject.SLOT.CLAW2;
    case 14:
      return UTCObject.SLOT.CLAW3;
    case 15:
      return UTCObject.SLOT.HIDE;
    case 16:
      return UTCObject.SLOT.HEAD;
    case 17:
      return UTCObject.SLOT.ARMOR; //Creature Armor
  }
}

module.exports = UTCObject;
