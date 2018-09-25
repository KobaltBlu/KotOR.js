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
              var scene = this.model.parent;
              var position = this.model.position;
              var rotation = this.model.rotation;
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
              this.model.turnLightsOn();
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

}

UTPObject.ResType = ResourceTypes['utp'];

module.exports = UTPObject;
