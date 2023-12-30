import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTCEditor } from "../../components/tabs/TabUTCEditor";
import { UI3DRenderer } from "../../UI3DRenderer";
import { UI3DRendererView } from "../../components/UI3DRendererView";
import { ModuleCreatureAnimState } from "../../../../enums/module/ModuleCreatureAnimState";

export class TabUTCEditorState extends TabState {
  tabName: string = `UTC`;
  moduleCreature: KotOR.ModuleCreature;
  blueprint: KotOR.GFFObject;

  ui3DRenderer: UI3DRenderer;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    this.setContentView(<TabUTCEditor tab={this}></TabUTCEditor>);
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
          this.moduleCreature = new KotOR.ModuleCreature(this.blueprint);
          this.moduleCreature.setContext(this.ui3DRenderer as any);
          this.moduleCreature.load();
          this.moduleCreature.loadModel().then( () => {
            this.ui3DRenderer.scene.add(this.moduleCreature.container);
            this.updateCameraFocus();
          });
          resolve(this.blueprint);
        });
      }
    });
  }

  updateCameraFocus(){
    if(!this.moduleCreature || !this.moduleCreature?.model) return;

    this.moduleCreature.container.position.set(0, 0, 0);
    this.moduleCreature.box.setFromObject(this.moduleCreature.container);

    let center = new THREE.Vector3();
    this.moduleCreature.box.getCenter(center);

    let size = new THREE.Vector3();
    this.moduleCreature.box.getSize(size);

    //Center the object to 0
    let origin = new THREE.Vector3();
    this.moduleCreature.container.position.set(-center.x, -center.y, -center.z);
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

    if(this.moduleCreature && this.moduleCreature.model){

      let currentAnimation = this.moduleCreature.model.getAnimationName();
      let animation = this.moduleCreature.animationConstantToAnimation(this.moduleCreature.animState);
      if(animation){
        if(currentAnimation != animation.name.toLowerCase()){
          let aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
          const anim = this.moduleCreature.model.playAnimation(animation.name.toLowerCase(), aLooping);
          if(!aLooping){
            setTimeout( () => {
              this.moduleCreature.animState = ModuleCreatureAnimState.PAUSE;
            }, anim ? anim.length * 1000 : 1500 );
          }
        }
      }

      this.moduleCreature.model.update(delta);
      //rotate the object in the viewport
      this.moduleCreature.rotation.z += delta;
    }
    
  }

}
