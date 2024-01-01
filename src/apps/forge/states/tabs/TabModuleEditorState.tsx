import React from "react";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./";
import * as THREE from 'three';
import * as KotOR from '../../KotOR';
import * as path from "path";

export class TabModuleEditorState extends TabState {

  tabName: string = `Module Editor`;

  ui3DRenderer: UI3DRenderer;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<THREE.WireframeGeometry<THREE.PlaneGeometry>, THREE.LineBasicMaterial>;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.singleInstance = true;
    this.isClosable = true;
    
    // Geometry
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.controlsEnabled = true;

    this.ui3DRenderer.scene.add(this.groundMesh);

  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;
    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  destroy(): void {
    this.ui3DRenderer.destroy();
    // this.disposeLayout();
    super.destroy();
  }

  animate(delta: number = 0){

  }

  

  //This should only be used inside KotOR Forge
  static FromProject(directory?: string, onComplete?: Function){
    console.log('BuildFromExisting', directory);
    const module = new KotOR.Module();
    module.transWP = '';
    if(directory != null){
      KotOR.GameFileSystem.readFile(path.join(directory, 'module.ifo')).then( (ifo_data) => {
        new KotOR.GFFObject(ifo_data, (ifo) => {
          //console.log('Module.FromProject', 'IFO', ifo);
          try{
            module.setFromIFO(ifo);
            KotOR.GameState.time = module.timeManager.pauseTime / 1000;
            KotOR.GameFileSystem.readFile(path.join(directory, module.entryArea+'.git')).then( (buffer) => {
              new KotOR.GFFObject(buffer, (git) => {
                //console.log('Module.FromProject', 'GIT', git);
                KotOR.GameFileSystem.readFile(path.join(directory, module.entryArea+'.are')).then( (buffer) => {
                  new KotOR.GFFObject(buffer, (are) => {
                    //console.log('Module.FromProject', 'ARE', are);
                    module.area = new KotOR.ModuleArea(module.entryArea, are, git);
                    module.area.module = module;
                    module.areas = [module.area];
                    module.area.setTransitionWaypoint(module.transWP);

                    KotOR.ModuleObjectManager.module = module;
                    module.area.load().then(() => {
                      if(typeof onComplete == 'function')
                        onComplete(module);
                    });                        
                  });
                }).catch( (e) => {
                  console.error(e);
                });
              });
            }).catch( (e) => {
              console.error(e);
            });
          }catch(e){
            console.error(e);
          }
        });
      }).catch( (e) => {
        console.error(e);
      });
    }
    return module;
  }

}