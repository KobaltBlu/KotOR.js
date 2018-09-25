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

}

UTDObject.ResType = ResourceTypes['utd'];

module.exports = UTDObject;
