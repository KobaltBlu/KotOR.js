import React from "react";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./";
import * as THREE from 'three';
import * as KotOR from '../../KotOR';
import { Project } from "../../Project";

export class TabModuleEditorState extends TabState {

  tabName: string = `Module Editor`;

  ui3DRenderer: UI3DRenderer;
  module: KotOR.Module | undefined;
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
  static async FromProject(project: Project): Promise<KotOR.Module | undefined> {
    console.log('BuildFromExisting', project);
    if(!project){
      return undefined;
    }
    const module = new KotOR.Module();
    module.transWP = '';
    KotOR.ModuleObjectManager.module = module;

    /**
     * Load the IFO file
     */
    const ifoFile = await project.module_ifo?.readFile();
    if(!ifoFile){
      console.error('IFO file not found');
      return undefined;
    }
    const ifo = new KotOR.GFFObject(ifoFile.buffer);
    module.setFromIFO(ifo);
    KotOR.GameState.time = module.timeManager.pauseTime / 1000;

    /**
     * Load the ARE file
     */
    const areFile = await project.module_are?.readFile();
    if(!areFile){
      console.error('ARE file not found');
      return undefined;
    }
    const are = new KotOR.GFFObject(areFile.buffer);

    /**
     * Load the GIT file
     */
    const gitFile = await project.module_git?.readFile();
    if(!gitFile){
      console.error('GIT file not found');
      return undefined;
    }
    const git = new KotOR.GFFObject(gitFile.buffer);

    /**
     * Create the area
     */
    module.area = new KotOR.ModuleArea(module.entryArea, are, git);
    module.area.module = module;
    module.areas = [module.area];
    await module.area.load();
    return module;
  }

}