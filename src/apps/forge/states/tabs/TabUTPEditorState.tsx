import React from "react";
import * as THREE from 'three';

import { TabUTPEditor } from "@/apps/forge/components/tabs/tab-utp-editor/TabUTPEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgePlaceable } from "@/apps/forge/module-editor/ForgePlaceable";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);


export class TabUTPEditorState extends TabState {
  tabName: string = `UTP`;
  placeable: ForgePlaceable = new ForgePlaceable();

  get blueprint(): KotOR.GFFObject {
    return this.placeable.blueprint;
  }

  ui3DRenderer: UI3DRenderer;

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabUTPEditorState constructor entry');
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', (delta: number) => this.animate(delta));

    this.setContentView(<TabUTPEditor tab={this}></TabUTPEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Placeable File',
        accept: {
          'application/octet-stream': ['.utp']
        }
      }
    ];
    log.trace('TabUTPEditorState constructor exit');
  }

  public openFile(file?: EditorFile){
    log.trace('TabUTPEditorState openFile entry', !!file);
    return new Promise<KotOR.GFFObject>( (resolve, _reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        log.debug('TabUTPEditorState openFile tabName', this.tabName);

        file.readFile().then( async (response) => {
          this.placeable = new ForgePlaceable(response.buffer);
          this.placeable.setContext(this.ui3DRenderer);
          await this.placeable.load();
          this.ui3DRenderer.attachObject(this.placeable.container, false);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabUTPEditorState openFile loaded');
          resolve(this.blueprint);
        });
      } else {
        log.trace('TabUTPEditorState openFile no file');
      }
    });
  }



  box: THREE.Box3 = new THREE.Box3();
  center: THREE.Vector3 = new THREE.Vector3();
  size: THREE.Vector3 = new THREE.Vector3();
  origin: THREE.Vector3 = new THREE.Vector3();

  updateCameraFocus(){
    const model = this.placeable.model;
    if(!model) return;

    const oldRotationZ = model.rotation.z;
    model.rotation.z = 0;

    model.position.set(0, 0, 0);
    this.box.setFromObject(model);
    this.box.getCenter(this.center);
    this.box.getSize(this.size);

    //Center the object to 0
    model.position.set(-this.center.x, -this.center.y, -this.center.z);
    this.ui3DRenderer.camera.position.z = 0;
    this.ui3DRenderer.camera.position.y = (this.size.x + this.size.y) * 1.5;
    this.ui3DRenderer.camera.lookAt(this.origin);

    model.rotation.z = oldRotationZ;
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
    if(!this.placeable) return;
    const model = this.placeable.model;
    if(model){
      model.update(delta);
      //rotate the object in the viewport
      model.rotation.z += delta;
      this.updateCameraFocus();
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'utp'){
      this.placeable.templateResRef = resref;
      this.updateFile();
      return this.placeable.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    this.placeable.exportToBlueprint();
  }
}
