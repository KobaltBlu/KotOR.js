import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTCEditor } from "../../components/tabs/tab-utc-editor/TabUTCEditor";
import { UI3DRenderer } from "../../UI3DRenderer";
import { ForgeCreature } from "../../module-editor/ForgeCreature";

export class TabUTCEditorState extends TabState {
  tabName: string = `UTC`;
  creature: ForgeCreature = new ForgeCreature();
  
  get blueprint(): KotOR.GFFObject {
    return this.creature.blueprint;
  }

  ui3DRenderer: UI3DRenderer;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    this.setContentView(<TabUTCEditor tab={this}></TabUTCEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Creature File',
        accept: {
          'application/octet-stream': ['.utc']
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
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.creature = new ForgeCreature(response.buffer);
          this.creature.setContext(this.ui3DRenderer);
          this.creature.load();
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
    const model = this.creature.model;
    if(!model) return;

    const oldRotationZ = model.rotation.z;
    model.rotation.z = 0;

    model.position.set(0, 0, 0);
    this.box3.setFromObject(model);
    this.box3.getCenter(this.center);
    this.box3.getSize(this.size);

    //Center the object to 0
    model.position.set(-this.center.x, -this.center.y, -this.center.z);
    this.ui3DRenderer.camera.position.z = 0;
    this.ui3DRenderer.camera.position.y = (this.size.x + this.size.y) * 1.5;
    this.ui3DRenderer.camera.lookAt(this.origin)

    model.rotation.z = oldRotationZ;
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

  animate(delta: number = 0){
    if(!this.creature) return;
    const model = this.creature.model;
    if(model){
      model.update(delta);
      //rotate the object in the viewport
      model.rotation.z += delta;
      this.updateCameraFocus();
    }

    // if(this.moduleCreature && this.moduleCreature.model){

    //   let currentAnimation = this.moduleCreature.model.getAnimationName();
    //   let animation = this.moduleCreature.animationConstantToAnimation(this.moduleCreature.animState);
    //   if(animation){
    //     if(currentAnimation != animation.name.toLowerCase()){
    //       let aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
    //       const anim = this.moduleCreature.model.playAnimation(animation.name.toLowerCase(), aLooping);
    //       if(!aLooping){
    //         setTimeout( () => {
    //           this.moduleCreature.animState = ModuleCreatureAnimState.PAUSE;
    //         }, anim ? anim.length * 1000 : 1500 );
    //       }
    //     }
    //   }
    // }
    
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'utc'){
      this.creature.templateResRef = resref;
      this.updateFile();
      return this.creature.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }
  
  updateFile(){
    this.creature.exportToBlueprint();
  }

}
