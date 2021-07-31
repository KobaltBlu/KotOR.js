/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AppearanceLoader class.
 */

class AppearanceLoader {

  constructor( args = {} ){

    args = $.extend({
      id: -1,
      context: Game,
      type: AppearanceLoader.TYPE.CREATURE
    }, args);

    this.id = args.id;
    this.type = args.type;
    this.model = null;
    this.context = args.context;

    //Used for Creatures only!!!
    this.bodyVariant = 'A';
    this.textureVar = 0;

  }

  GetModel ( onLoad = null, onError = null ){

    switch(this.type){

      case AppearanceLoader.TYPE.CREATURE:
        this.GetCreatureModel(onLoad, onError);
      break;

      case AppearanceLoader.TYPE.DOOR:
        this.GetDoorModel(onLoad, onError);
      break;

      case AppearanceLoader.TYPE.PLACEABLE:
        this.GetPlaceableModel(onLoad, onError);
      break;

    }

  }

  GetCreatureModel ( onLoad = null, onError = null ){

    if(this.id > -1){

      let appearance = Global.kotor2DA['appearance'].rows[this.id];
      //console.log('appearance', this.id);
      let bodyModel = appearance.modelc.replace(/\0[\s\S]*$/g,'').toLowerCase();
      let headId = appearance.normalhead.replace(/\0[\s\S]*$/g,'').toLowerCase();
      let raceTex = appearance.racetex.replace(/\0[\s\S]*$/g,'');


      if(appearance.modeltype != 'B'){
        bodyModel = appearance.race.replace(/\0[\s\S]*$/g,'').toLowerCase();
        this.textureVar = raceTex != '****' ? raceTex : 0;
      }else{
        switch(this.bodyVariant.toLowerCase()){
          case 'a':
            bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + (this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar;
          break;
          case 'b':
            bodyModel = appearance.modelb.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texb.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          case 'c':
            bodyModel = appearance.modelc.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texc.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          case 'd':
            bodyModel = appearance.modeld.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texd.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          case 'e':
            bodyModel = appearance.modele.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texe.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          case 'f':
            bodyModel = appearance.modelf.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texf.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          case 'g':
            bodyModel = appearance.modelg.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texg.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          case 'h':
            bodyModel = appearance.modelh.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texh.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          case 'i':
            bodyModel = appearance.modeli.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texi.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
          default:
            bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.textureVar = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
          break;
        }

        //console.log('textureVar', this.textureVar);

      }

      //console.log('modela', bodyModel);

      Game.ModelLoader.load({
        file: bodyModel,
        onLoad: (mdl) => {
          if(mdl instanceof AuroraModel){
            THREE.AuroraModel.FromMDL(mdl, {
              context: this.context,
              onComplete: (model) => {
                if(this.model != null){
                  let scene = this.model.parent;
                  let position = this.model.position;
                  let rotation = this.model.rotation;
                  scene.remove(this.model);
                }

                this.model = model;
                this.model.moduleObject = this.moduleObject;

                if(typeof scene != 'undefined'){
                  scene.add(this.model);
                  this.model.translateX(position.x);
                  this.model.translateY(position.y);
                  this.model.translateZ(position.z);

                  this.model.rotation.set(rotation.x, rotation.y, rotation.z);
                }

                if(headId != '****'){
                  let head = Global.kotor2DA['heads'].rows[headId];
                  Game.ModelLoader.load({
                    file: head.head.replace(/\0[\s\S]*$/g,'').toLowerCase(),
                    onLoad: (mdl) => {
                      if(mdl instanceof AuroraModel){
                        THREE.AuroraModel.FromMDL(mdl, {
                          context: this.context,
                          onComplete: (head) => {
                            try{
                              this.model.headhook.head = head;
                              this.model.headhook.add(head);

                              TextureLoader.LoadQueue(() => {
                                if(onLoad != null)
                                  onLoad(this.model);
                              });
                            }catch(e){
                              console.error(e);
                              TextureLoader.LoadQueue(() => {
                                if(typeof onLoad === 'function')
                                  onLoad(this.model);
                              });
                            }
                          }
                        });
                      }else{
                        TextureLoader.LoadQueue(() => {
                          if(typeof onLoad === 'function')
                            onLoad(this.model);
                        });
                      }
                    },
                    onError: (e) => {
                      console.error(e);
                      if(onError != null && typeof onError === 'function')
                        onError(e)
                    }
                  });

                }else{
                  TextureLoader.LoadQueue(() => {
                    if(onLoad != null)
                      onLoad(this.model);
                  });
                }
              }
            });
          }else{
            console.error(e);
            if(typeof onError === 'function')
              onError(e)
          }
        },
        onError: (e) => {
          console.error(e);
          if(typeof onError === 'function')
            onError(e)
        }
      });

    }else{
      console.error('Invalid ID', this.id);
    }

  }

  GetDoorModel ( onLoad = null, onError = null ){

    if(this.id > -1) {

      let modelName = Global.kotor2DA['genericdoors'].rows[genericType.Value].modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();

      Game.ModelLoader.load({
        file: modelName,
        onLoad: (door) => {

          if(this.model != null){
            let scene = this.model.parent;
            let position = this.model.position;
            let rotation = this.model.rotation;
            scene.remove(this.model);
          }

          this.model = door;
          this.model.moduleObject = this.moduleObject;

          if(typeof scene != 'undefined'){
            scene.add(this.model);
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
        onError: (e) => {
          console.error(e);
          if(onError != null && typeof onError === 'function')
            onError(e)
        }
      });

    }else{
      console.error('Invalid ID', this.id);
    }

  }

  GetPlaceableModel ( onLoad = null, onError = null ){

    if(this.id > -1) {
      let modelName = Global.kotor2DA['placeables'].rows[this.id].modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
      //console.log('modelName', modelName);

      Game.ModelLoader.load({
        file: modelName,
        onLoad: (plc) => {

          if(this.model != null){
            let scene = this.model.parent;
            let position = this.model.position;
            let rotation = this.model.rotation;
            scene.remove(this.model);
          }

          this.model = plc;
          this.model.moduleObject = this.moduleObject;

          if(typeof scene != 'undefined'){
            scene.add(this.model);
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
        onError: (e) => {
          console.error(e);
          if(onError != null && typeof onError === 'function')
            onError(e)
        }
      });
    }else{
      console.error('Invalid ID', this.id);
    }

  }

}


AppearanceLoader.TYPE = {
  CREATURE: 1,
  DOOR: 2,
  PLACEABLE: 3
}


module.exports = AppearanceLoader;
