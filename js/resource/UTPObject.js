/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UTPObject class.
 */

class UTPObject {

  constructor(gff = undefined) {
    this.model = null;
    this.moduleObject = null;
    this.gff = gff;
    this.resType = UTPObject.ResType;
  }

  /*LoadModel ( onLoad = null ){

    let appearance = this.gff.GetFieldByLabel('Appearance');
    //console.log('appearance', appearance.Value);
    let modelName = Global.kotor2DA['placeables'].rows[appearance.Value].modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
    //console.log('modelName', modelName);

    let mdlLoader = new THREE.MDLLoader();
    //console.log('loading',modelName);
    mdlLoader.load({
      file: modelName,
      onLoad: (mdl) => {
        THREE.AuroraModel.FromMDL(mdl, {
          onComplete: (plc) => {
            if(this.model != null){
              let scene = this.model.parent;
              let position = this.model.position;
              let rotation = this.model.rotation;
              scene.remove(this.model);
            }

            this.model = plc;
            this.model.moduleObject = this.moduleObject;

            this.moduleObject.model = this.model;
            this.model.name = modelName;

            if(typeof scene != 'undefined'){
              scene.add(this.model);
              Game.octree.add( this.model );
              this.model.translateX(position.x);
              this.model.translateY(position.y);
              this.model.translateZ(position.z);

              this.model.rotation.set(rotation.x, rotation.y, rotation.z);
            }

            TextureLoader.LoadQueue(() => {
              //console.log(this.model);
              if(onLoad != null)
                onLoad(this.model);
            }, (texName) => {
              //loader.SetMessage('Loading Textures: '+texName);
            });
          },
          castShadow: true,
          receiveShadow: true
        });
      }
    });

  }

  ChangeTemplate(ResRef = null, onLoad = null){

    if(ResRef != null){

      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTPObject.ResType,
        onLoad: (gff) => {
          //console.log('UTPObject load complete');
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

  static FromTemplate(ResRef = null, onLoad = null){

    let utp = new UTPObject();

    if(ResRef != null){

      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTPObject.ResType,
        onLoad: (gff) => {
          //console.log('UTPObject load complete');
          utp.gff = gff;
          if(onLoad != null)
            onLoad(utp);
        },
        onFail: () => {
          console.error('Failed to load placeable template');
        }
      });

    }

  }*/

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTP ';

    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'AnimationState') );
    template.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Appearance') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'AutoRemoveKey') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyBag') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'CloseLockDC') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Comment') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Conversation') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'CurrentHP') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'Description') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'DisarmDC') );
    template.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Faction') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Fort') );
    template.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'HP') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Hardness') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'HasInventory') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Interruptable') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'KeyName') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'KeyRequired') );
    template.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'LocName') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Lockable') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Locked') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Min1HP') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnClosed') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDamaged') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDeath') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDisarm') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnEndDialogue') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnHeartbeat') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnInvDisturbed') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnLock') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnMeleeAttacked') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnOpen') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnSpellCastAt') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnTrapTriggered') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUnlock') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUsed') );
    template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUserDefined') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'OpenLockDC') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PaletteId') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PartyInteract') );
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
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Useable') );
    template.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Will') );

    return template;
  }

}

UTPObject.ResType = ResourceTypes['utp'];

module.exports = UTPObject;
