/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UTDObject class.
 */

class UTDObject {

  constructor(gff = undefined){
    this.model = null;
    this.moduleObject = null;
    this.gff = gff;
    this.resType = UTDObject.ResType;
    
  }

  LoadModel ( onLoad = null ){
    let genericType = this.gff.GetFieldByLabel('GenericType');
    let modelName = Global.kotor2DA['genericdoors'].rows[genericType.Value].modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();

    let mdlLoader = new THREE.MDLLoader();
    console.log('loading',modelName);
    mdlLoader.load({
      file: modelName,
      onLoad: (mdl) => {
        THREE.AuroraModel.FromMDL(mdl, {
          onComplete: (door) => {
            if(this.model != null){
              var scene = this.model.parent;
              var position = this.model.position;
              var rotation = this.model.rotation;
              scene.remove(this.model);
            }

            this.model = door;
            this.model.moduleObject = this.moduleObject;
            this.model.name = modelName;

            this.moduleObject.model = this.model;

            if(typeof scene != 'undefined'){
              scene.add(this.model);
              Game.octree.add( this.model );
              this.model.translateX(position.x);
              this.model.translateY(position.y);
              this.model.translateZ(position.z);

              this.model.rotation.set(rotation.x, rotation.y, rotation.z);
            }

            TextureLoader.LoadQueue(() => {
              console.log(this.model);
              if(onLoad != null)
                onLoad(this.model);
            }, (texName) => {
              //loader.SetMessage('Loading Textures: '+texName);
            });
          }
        });
      }
    });
  }

  ChangeTemplate(ResRef = null, onLoad = null){

    if(ResRef != null){

      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTDObject.ResType,
        onLoad: (gff) => {
          console.log('UTDObject load complete');
          this.gff = gff;

          this.LoadModel( () => {
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

  isLocked(){
    return this.gff.GetFieldByLabel('Locked').GetValue() ? true : false;
  }

  requiresKey(){
    return this.gff.GetFieldByLabel('KeyRequired').GetValue() ? true : false;
  }

  keyName(){
    return this.gff.GetFieldByLabel('KeyName').GetValue();
  }

  getName(){
    return this.gff.GetFieldByLabel('LocName').GetCExoLocString().GetValue();
  }

  getTemplateResRef(){
    if(this.gff.RootNode.HasField('TemplateResRef')){
      return his.gff.GetFieldByLabel('TemplateResRef').GetValue()
    }
    return null;
  }

  static FromTemplate(ResRef = null, onLoad = null){

    let utd = new UTDObject();

    if(ResRef != null){
      console.log('UTDObject', ResRef, UTDObject.ResType);
      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTDObject.ResType,
        onLoad: (gff) => {
          console.log('UTDObject load complete');
          utd.gff = gff;
          if(onLoad != null)
            onLoad(utd);
        },
        onFail: () => {
          console.error('Failed to load door template');
        }
      });

    }

  }

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTD ';

    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'AnimationState') );
    template.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Appearance') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'AutoRemoveKey') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'CloseLockDC') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Comment') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Conversation') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'CurrentHP') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'Description') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'DisarmDC') );
    template.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Faction') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Fort') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'GenericType') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'HP') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Hardness') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Interruptable') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'KeyName') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'KeyRequired') );
    template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'LoadScreenID') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'LocName') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Lockable') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Locked') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Min1HP') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnClick') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnClosed') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDamaged') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDeath') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDisarm') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnHeartbeat') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnLock') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnMeleeAttacked') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnOpen') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnSpellCastAt') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnTrapTriggered') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUnlock') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUsed') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUserDefined') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'OpenLockDC') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PaletteId') ).SetValue(6);
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Plot') );
    template.RootNode.AddField( new Field(GFFDataTypes.WORD, 'PortraidId') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Ref') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Static') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Tag') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'TemplateResRef') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapDetectDC') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapDetactable') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapDisarmable') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapFlag') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapOneShot') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapType') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Type') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Will') );

    return template;
  }

}

UTDObject.ResType = ResourceTypes['utd'];

module.exports = UTDObject;
