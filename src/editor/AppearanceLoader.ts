/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GameState } from "../GameState";
import { TwoDAManager } from "../managers/TwoDAManager";
import { OdysseyModel } from "../odyssey";
import { OdysseyModel3D } from "../three/odyssey";
import { AppearanceLoaderType } from "./enum/AppearanceLoaderType";

/* @file
 * The AppearanceLoader class.
 */

export class AppearanceLoader {
  id: any;
  type: any;
  model: any;
  context: any;
  bodyVariant: string;
  textureVar: number;
  moduleObject: any;

  constructor( args: any = {} ){

    args = Object.assign({
      id: -1,
      context: GameState,
      type: AppearanceLoaderType.CREATURE
    }, args);

    this.id = args.id;
    this.type = args.type;
    this.model = null;
    this.context = args.context;

    //Used for Creatures only!!!
    this.bodyVariant = 'A';
    this.textureVar = 0;

  }

  GetModel ( onLoad?: Function, onError?: Function ){

    switch(this.type){

      case AppearanceLoaderType.CREATURE:
        this.GetCreatureModel(onLoad, onError);
      break;

      case AppearanceLoaderType.DOOR:
        this.GetDoorModel(onLoad, onError);
      break;

      case AppearanceLoaderType.PLACEABLE:
        this.GetPlaceableModel(onLoad, onError);
      break;

    }

  }

  GetCreatureModel ( onLoad?: Function, onError?: Function ){

    if(this.id > -1){
      
      let appearance = TwoDAManager.datatables.get('appearance')?.rows[this.id];
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
            this.textureVar = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + ((this.textureVar < 10) ? ("0" + this.textureVar) : this.textureVar);
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

      GameState.ModelLoader.load({
        file: bodyModel,
        onLoad: (mdl: OdysseyModel) => {
          if(mdl instanceof OdysseyModel){
            OdysseyModel3D.FromMDL(mdl, {
              context: this.context,
              onComplete: (model: OdysseyModel3D) => {
                let scene;
                let position;
                let rotation;
                if(this.model != null){
                  scene = this.model.parent;
                  position = this.model.position;
                  rotation = this.model.rotation;
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
                  let head = TwoDAManager.datatables.get('heads')?.rows[headId];
                  GameState.ModelLoader.load({
                    file: head.head.replace(/\0[\s\S]*$/g,'').toLowerCase(),
                    onLoad: (mdl: OdysseyModel) => {
                      if(mdl instanceof OdysseyModel){
                        OdysseyModel3D.FromMDL(mdl, {
                          context: this.context,
                          onComplete: (head: OdysseyModel3D) => {
                            try{
                              this.model.headhook.head = head;
                              this.model.headhook.add(head);

                              //TextureLoader.LoadQueue(() => {
                                if(typeof onLoad === 'function')
                                  onLoad(this.model);
                              //});
                            }catch(e: any){
                              console.error(e);
                              //TextureLoader.LoadQueue(() => {
                                if(typeof onLoad === 'function')
                                  onLoad(this.model);
                              //});
                            }
                          }
                        });
                      }else{
                        //TextureLoader.LoadQueue(() => {
                          if(typeof onLoad === 'function')
                            onLoad(this.model);
                        //});
                      }
                    },
                    onError: (e: any) => {
                      console.error(e);
                      if(typeof onError === 'function')
                        onError(e)
                    }
                  });

                }else{
                  //TextureLoader.LoadQueue(() => {
                    if(typeof onLoad === 'function')
                      onLoad(this.model);
                  //});
                }
              }
            });
          }else{
            if(typeof onError === 'function')
              onError()
          }
        },
        onError: (e: any) => {
          console.error(e);
          if(typeof onError === 'function')
            onError(e)
        }
      });

    }else{
      console.error('Invalid ID', this.id);
    }

  }

  GetDoorModel ( onLoad?: Function, onError?: Function ){

    if(this.id > -1) {
      
      let modelName = TwoDAManager.datatables.get('genericdoors')?.rows[this.id].modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();

      GameState.ModelLoader.load({
        file: modelName,
        onLoad: (door: OdysseyModel3D) => {

          let scene;
          let position;
          let rotation;
          if(this.model != null){
            scene = this.model.parent;
            position = this.model.position;
            rotation = this.model.rotation;
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

          //TextureLoader.LoadQueue(() => {
            //console.log(this.model);
            if(onLoad != null)
              onLoad(this.model);
          //}, (texName) => {
            //loader.SetMessage('Loading Textures: '+texName);
          //});

        },
        onError: (e: any) => {
          console.error(e);
          if(onError != null && typeof onError === 'function')
            onError(e)
        }
      });

    }else{
      console.error('Invalid ID', this.id);
    }

  }

  GetPlaceableModel ( onLoad?: Function, onError?: Function ){

    if(this.id > -1) {
      
      let modelName = TwoDAManager.datatables.get('placeables')?.rows[this.id].modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
      //console.log('modelName', modelName);

      GameState.ModelLoader.load({
        file: modelName,
        onLoad: (plc: OdysseyModel3D) => {

          let scene;
          let position;
          let rotation;
          if(this.model != null){
            scene = this.model.parent;
            position = this.model.position;
            rotation = this.model.rotation;
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

          //TextureLoader.LoadQueue(() => {
            //console.log(this.model);
            if(onLoad != null)
              onLoad(this.model);
          //}, (texName) => {
            //loader.SetMessage('Loading Textures: '+texName);
          //});

        },
        onError: (e: any) => {
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
