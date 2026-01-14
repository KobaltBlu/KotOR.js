import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTDEditor } from "../../components/tabs/tab-utd-editor/TabUTDEditor";
import { UI3DRenderer } from "../../UI3DRenderer";
import { UI3DRendererView } from "../../components/UI3DRendererView";
import { ForgeDoor } from "../../module-editor/ForgeDoor";

export class TabUTDEditorState extends TabState {
  tabName: string = `UTD`;
  door: ForgeDoor = new ForgeDoor();
  
  get blueprint(): KotOR.GFFObject {
    return this.door.blueprint;
  }

  ui3DRenderer: UI3DRenderer;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    this.setContentView(<TabUTDEditor tab={this}></TabUTDEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Door File',
        accept: {
          'application/octet-stream': ['.utd']
        }
      }
    ];
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( async (response) => {
          this.door = new ForgeDoor(response.buffer);
          this.door.setContext(this.ui3DRenderer);
          await this.door.load();
          if(this.ui3DRenderer.scene && this.door.model){
            this.ui3DRenderer.scene.add(this.door.model);
          }
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  box3: THREE.Box3 = new THREE.Box3();
  center: THREE.Vector3 = new THREE.Vector3();
  size: THREE.Vector3 = new THREE.Vector3();
  origin: THREE.Vector3 = new THREE.Vector3();

  updateCameraFocus(){
    if(!this.door.model) return;

    this.door.model.position.set(0, 0, 0);
    this.box3.setFromObject(this.door.model);
    this.box3.getCenter(this.center);
    this.box3.getSize(this.size);

    //Center the object to 0
    this.door.model.position.set(-this.center.x, -this.center.y, -this.center.z);
    this.ui3DRenderer.camera.position.z = 0;
    this.ui3DRenderer.camera.position.y = this.size.x + this.size.y;
    this.ui3DRenderer.camera.lookAt(this.origin);
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
    if(this.door.model){
      this.door.model.update(delta);
      //rotate the object in the viewport
      this.door.model.rotation.z += delta;
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'utd'){
      this.door.templateResRef = resref;
      this.updateFile();
      return this.door.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }
  
  updateFile(){
    this.door.exportToBlueprint();
  }
}
