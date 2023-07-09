import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTPEditor } from "../../components/tabs/TabUTPEditor";
import { UI3DRenderer } from "../../UI3DRenderer";
import { UI3DRendererView } from "../../components/UI3DRendererView";

export class TabUTPEditorState extends TabState {
  tabName: string = `UTP`;
  modulePlaceable: KotOR.ModulePlaceable;
  blueprint: KotOR.GFFObject;

  ui3DRenderer: UI3DRenderer;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    this.setContentView(<TabUTPEditor tab={this}></TabUTPEditor>);
    this.openFile();
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.blueprint = new KotOR.GFFObject(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          this.modulePlaceable = new KotOR.ModulePlaceable(this.blueprint);
          this.modulePlaceable.setContext(this.ui3DRenderer as any);
          this.modulePlaceable.load();
          this.modulePlaceable.loadModel().then( () => {
            this.modulePlaceable.box.setFromObject(this.modulePlaceable.container);
            this.ui3DRenderer.scene.add(this.modulePlaceable.container);
            this.updateCameraFocus();
          });
          resolve(this.blueprint);
        });
      }
    });
  }

  updateCameraFocus(){
    if(!this.modulePlaceable || !this.modulePlaceable?.model) return;

    this.modulePlaceable.container.position.set(0, 0, 0);

    let center = new KotOR.THREE.Vector3();
    this.modulePlaceable.box.getCenter(center);

    let size = new KotOR.THREE.Vector3();
    this.modulePlaceable.box.getSize(size);

    //Center the object to 0
    let origin = new KotOR.THREE.Vector3();
    this.modulePlaceable.container.position.set(-center.x, -center.y, -center.z);
    this.ui3DRenderer.camera.position.z = 0;
    this.ui3DRenderer.camera.position.y = size.x + size.y;
    this.ui3DRenderer.camera.lookAt(origin)
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;

    this.updateCameraFocus();

    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  animate(delta: number = 0){

    if(this.modulePlaceable && this.modulePlaceable.model){
      this.modulePlaceable.model.update(delta);
      //rotate the object in the viewport
      this.modulePlaceable.rotation.z += delta;
    }
    
  }

}
