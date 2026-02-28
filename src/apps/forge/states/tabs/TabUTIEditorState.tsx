import React from "react";
import * as THREE from "three";

import { TabUTIEditor } from "@/apps/forge/components/tabs/tab-uti-editor/TabUTIEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeItem } from "@/apps/forge/module-editor/ForgeItem";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export interface ItemPropertyEntry {
  chanceAppear: number;
  costTable: number;
  costValue: number;
  param1: number;
  param1Value: number;
  propertyName: number;
  subtype: number;
}

export class TabUTIEditorState extends TabState {
  tabName: string = `UTI`;
  item: ForgeItem = new ForgeItem();

  get blueprint(): KotOR.GFFObject {
    return this.item.blueprint;
  }

  get properties() {
    return this.item.properties;
  }

  set properties(value) {
    this.item.properties = value;
  }

  ui3DRenderer: UI3DRenderer;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));
    this.setContentView(<TabUTIEditor tab={this}></TabUTIEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Item Blueprint',
        accept: {
          'application/octet-stream': ['.uti']
        }
      }
    ];
    
    this.item.addEventListener('onPropertyChange', (property: string, newValue: any, oldValue: any) => {
      if(property === 'baseItem' || property === 'modelVariation'){
        this.processEventListener('onModelChange', [this]);
      }
    });
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
          this.item = new ForgeItem(response.buffer);
          this.item.setContext(this.ui3DRenderer);
          await this.item.load();
          this.ui3DRenderer.attachObject(this.item.container, false);
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
    if(!this.item.model) return;

    this.item.model.position.set(0, 0, 0);
    this.box3.setFromObject(this.item.model);

    this.box3.getCenter(this.center);
    this.box3.getSize(this.size);

    //Center the object to 0
    this.item.model.position.set(-this.center.x, -this.center.y, -this.center.z);
    this.ui3DRenderer.camera.position.z = 0;
    this.ui3DRenderer.camera.position.y = this.size.x + this.size.y;
    this.ui3DRenderer.camera.lookAt(this.origin)
  }

  animate(delta: number){
    if(this.item.model){
      this.item.model.update(delta);
      //rotate the object in the viewport
      this.item.model.rotation.z += delta;
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'uti'){
      this.item.templateResRef = resref;
      this.updateFile();
      return this.item.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
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

  updateFile(){
    this.item.exportToBlueprint();
  }
}

