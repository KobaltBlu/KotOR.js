import { BinaryReader } from "../../BinaryReader";
import { OdysseyModel, OdysseyModelAnimation } from "../../odyssey";
import { OdysseyModel3D } from "../../three/odyssey";
import { EditorControls } from "../EditorControls";
import { EditorFile } from "../EditorFile";
import { EditorTab } from "./";
import { ModelViewerControls } from "../ModelViewerControls";
import { NotificationManager } from "../NotificationManager";
import { TextureLoader } from "../../loaders/TextureLoader";
import { OdysseyTexture } from "../../resource/OdysseyTexture";
import { GameState } from "../../GameState";

import * as path from "path";
import { WindowDialog } from "../../utility/WindowDialog";

import * as THREE from "three";
import { LYTObject } from "../../resource/LYTObject";
import { UI3DRenderer } from "../UI3DRenderer";
import { ModelViewSideBarComponent, KeyFrameTimelineComponent } from "../components";

export class ModelViewerTab extends EditorTab {
  animLoop: boolean;
  deltaTime: number;
  
  referenceNode: THREE.Object3D<THREE.Event>;
  clock: THREE.Clock = new THREE.Clock();
  selectable: THREE.Group =  new THREE.Group();
  unselectable: THREE.Group =  new THREE.Group();
  CameraMode: { EDITOR: number; STATIC: number; ANIMATED: number; };
  cameraMode: any;
  $controls: JQuery<HTMLElement>;
  raycaster: THREE.Raycaster;

  selectionBox: THREE.BoxHelper;

  controls: ModelViewerControls;
  data: Uint8Array;
  model: OdysseyModel3D;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<any, any>;
  $infoOverlay: JQuery<HTMLElement>;

  camerahook_cameras: THREE.PerspectiveCamera[] = [];

  layout: LYTObject;
  layout_group: THREE.Group;

  renderComponent: UI3DRenderer;
  modelViewSideBarComponent: ModelViewSideBarComponent;
  modelViewTimelineComponent: KeyFrameTimelineComponent;
  odysseyModel: OdysseyModel;

  currentAnimation: OdysseyModelAnimation;

  constructor(file: EditorFile, isLocal = false){
    super({
      enableLayoutContainers: true
    });
    console.log('ModelViewerTab', this);
    this.animLoop = false;
    this.deltaTime = 0;
    console.log('Model Viewer');
    $('a', this.$tab).text('Model Viewer');

    this.layout_north_size = 0;
    this.layout_west_size = 0;
    this.layout_east_size = 250;
    this.layout_south_size = 200;

    this.layout_north_enabled = false;
    this.layout_south_enabled = true;
    this.layout_east_enabled = true;
    this.layout_west_enabled = false;

    this.layout_north_open = false;
    this.layout_south_open = true;
    this.layout_east_open = true;
    this.layout_west_open = false;

    this.renderComponent = new UI3DRenderer();

    this.selectable = new THREE.Group();
    this.unselectable = new THREE.Group();

    this.layout_group = new THREE.Group();

    this.renderComponent.scene.add(this.selectable);
    this.renderComponent.scene.add(this.unselectable);
    this.renderComponent.scene.add(this.referenceNode);
    this.renderComponent.scene.add(this.layout_group);

    this.renderComponent.camera = new THREE.PerspectiveCamera( 55, this.$layoutContainerCenter.innerWidth() / this.$layoutContainerCenter.innerHeight(), 0.01, 15000 );
    this.renderComponent.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.renderComponent.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    this.renderComponent.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

    this.CameraMode = {
      EDITOR: 0,
      STATIC: 1,
      ANIMATED: 2
    };

    this.cameraMode = this.CameraMode.EDITOR;
    this.renderComponent.currentCamera = this.renderComponent.camera;

    this.$controls = $('<div style="position: absolute; top: 25px; right: 25px; z-index:1000; height: auto!important;" />');

    // this.unselectable.add(this.globalLight);

    //Raycaster
    this.raycaster = new THREE.Raycaster();

    //this.axes = new THREE.TransformControls( this.currentCamera, this.canvas );//new THREE.AxisHelper(10);            // add axes
    //this.axes.selected = null;
    //this.unselectable.add(this.axes);

    //Selection Box Helper
    this.selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
    this.selectionBox.update();
    this.selectionBox.visible = false;
    this.unselectable.add( this.selectionBox );

    this.controls = new ModelViewerControls(this.renderComponent.currentCamera, this.renderComponent.canvas, this);
    this.controls.AxisUpdate(); //always call this after the Yaw or Pitch is updated
    this.controls.attachEventListener('onSelect', (obj?: any) => {
      this.selectionBox.visible = false;
      this.selectionBox.update();
      this.modelViewSideBarComponent.selected = null;

      if(this.modelViewSideBarComponent.$selected_object){
        this.modelViewSideBarComponent.$selected_object.hide();
      }

      if(obj instanceof THREE.Object3D){
        if(obj instanceof THREE.Mesh){
          if(typeof this.modelViewSideBarComponent.select === 'function'){
            this.modelViewSideBarComponent.select(obj);
          }
        }else{
          obj.traverseAncestors( (obj: any) => {
            if(obj instanceof THREE.Mesh){
              if(typeof this.modelViewSideBarComponent.select === 'function'){
                this.modelViewSideBarComponent.select(obj);
              }
              return;
            }
          });
        }
        
      }
    })

    this.$infoOverlay = $('<div class="info-overlay" />')

    this.$layoutContainerCenter.append($(this.renderComponent.stats.dom));
    this.$layoutContainerCenter.append(this.renderComponent.$canvas);
    this.$layoutContainerCenter.append(this.$controls);
    this.$layoutContainerCenter.append(this.$infoOverlay)

    this.modelViewSideBarComponent = new ModelViewSideBarComponent(this);
    this.modelViewSideBarComponent.attachTo(this.$layoutContainerEast);
    // this.$layoutContainerEast.append(this.$ui_selected);

    this.modelViewTimelineComponent = new KeyFrameTimelineComponent(this);
    this.modelViewTimelineComponent.attachTo(this.$layoutContainerSouth);

    this.$tabContent.append(this.$layoutContainer);

    this.data = new Uint8Array(0);
    this.file = file;

    this.BuildGround();
    this.OpenFile(file);

    this.modelViewTimelineComponent.addEventListener('onStop', () => {
      if(!!this.model){
        if(!!this.model.animationManager.currentAnimation){
          this.model.animationManager.currentAnimationState.elapsed = 0;
          this.model.update(0.00000000001);
        }
      }
    });

    this.modelViewTimelineComponent.addEventListener('onAnimationChange', (animation: OdysseyModelAnimation) => {
      console.log('timeline', 'onAnimationChange');
      this.model.stopAnimation();
      this.currentAnimation = undefined;
      if(animation instanceof OdysseyModelAnimation){
        this.currentAnimation = animation;
        this.model.playAnimation(animation, this.animLoop);
        this.modelViewSideBarComponent.$animSelect.val(animation.name.replace(/\0[\s\S]*$/g, ``));
      }
    });

    this.modelViewSideBarComponent.addEventListener('onAnimationChange', (animation: OdysseyModelAnimation) => {
      console.log('sidebar', 'onAnimationChange');
      this.model.stopAnimation();
      this.currentAnimation = undefined;
      if(animation instanceof OdysseyModelAnimation){
        this.currentAnimation = animation;
        this.model.playAnimation(animation, this.animLoop);
        this.modelViewTimelineComponent.$select_animation.val(animation.name.replace(/\0[\s\S]*$/g, ``));
      }
    });

    this.modelViewTimelineComponent.addEventListener('onLoopChange', (loop: boolean) => {
      console.log('timeline', 'onLoopChange');
      this.animLoop = loop;
      this.modelViewSideBarComponent.$animLoop.prop('checked', this.animLoop);
      this.modelViewSideBarComponent.$animSelect.trigger('change');
    });

    this.modelViewSideBarComponent.addEventListener('onLoopChange', (loop: boolean) => {
      console.log('sidebar', 'onLoopChange');
      this.animLoop = loop;
      this.modelViewTimelineComponent.$checkbox_loop.prop('checked', this.animLoop);
      this.modelViewTimelineComponent.$select_animation.trigger('change');
    });

    this.modelViewTimelineComponent.addEventListener('onPlay', () => {
      if(!this.currentAnimation){
        this.modelViewTimelineComponent.stop();
        return; 
      }
      if(this.model.animationManager.currentAnimation != this.currentAnimation){
        this.model.playAnimation(this.currentAnimation, this.animLoop);
      }
    });

    this.modelViewTimelineComponent.addEventListener('onSeek', (elapsed: number = 0) => {
      if(this.model.animationManager.currentAnimation){
        this.model.animationManager.currentAnimationState.elapsed = elapsed;
        this.model.update(0.00000000001);
      }
    });

  }

  disposeLayout(){
    try{
      if(this.layout_group.children.length){
        let modelIndex = this.layout_group.children.length - 1;
        while(modelIndex >= 0){
          let model = this.layout_group.children[modelIndex] as OdysseyModel3D;
          if(model){
            model.dispose();
            this.layout_group.remove(model);
          }
          modelIndex--;
        }
      }
      this.modelViewSideBarComponent.buildNodeTree();
    }catch(e){
      console.error(e);
    }
    this.layout = undefined;
  }

  OpenFile(file: EditorFile){

    console.log('Model Loading', file);

    if(file instanceof EditorFile){

      file.readFile( (mdlBuffer: Buffer, mdxBuffer: Buffer) => {
        try{
          let odysseyModel = new OdysseyModel(new BinaryReader(mdlBuffer), new BinaryReader(mdxBuffer));
          this.odysseyModel = odysseyModel;

          try{
            this.$tabName.text(file.getFilename());
          }catch(e){}

          OdysseyModel3D.FromMDL(odysseyModel, {
            manageLighting: false,
            context: this.renderComponent, 
            onComplete: (model: OdysseyModel3D) => {
              this.model = model;
              model.traverse( (node) => {
                node.frustumCulled = false
              });

              if(model.camerahook){
                const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
                const helper = new THREE.CameraHelper( camera );
                this.renderComponent.scene.add( helper );
                model.camerahook.add(camera);
                this.camerahook_cameras.push(camera);
              }

              this.selectable.add(model);
              model.position.set(0, 0, 0);
              TextureLoader.LoadQueue(() => {
                console.log('Textures Loaded');
                this.onResize();
                this.modelViewSideBarComponent.buildUI();
                this.Render();
                this.modelViewSideBarComponent.buildNodeTree();
                this.modelViewTimelineComponent.setAnimations(odysseyModel.animations);
                this.resetObjectPosition();
              });
            }
          });
        }
        catch (e) {
          console.log(e);
          this.Remove();
        }
      });

    }    

  }

  centerObjectPosition(){
    this.resetObjectPosition();
    let center = new THREE.Vector3(0, 0, 0);
    this.model.box.setFromObject(this.model);
    this.model.box.getCenter(center);
    if(!isNaN(center.length())){
      //Center the object to 0
      this.model.position.set(-center.x, -center.y, -center.z);
      //Stand the object on the floor by adding half it's height back to it's position
      //model.position.z += model.box.getSize(new THREE.Vector3()).z/2;
    }else{
      this.model.position.set(0, 0, 0);
    }
  }

  resetObjectPosition(){
    this.model.position.set(0, 0, 0);
  }

  onResize() {
    super.onResize();

    try{
      this.renderComponent.triggerResize();
  
      for(let i = 0; i < this.camerahook_cameras.length; i++){
        this.camerahook_cameras[i].aspect = this.renderComponent.camera.aspect;
        this.camerahook_cameras[i].updateProjectionMatrix();
      }
    }catch(e){
      console.error(e);
    }
  }

  onDestroy() {
    super.onDestroy();
  }

  Show(): void {
    super.Show();
    this.onResize();
  }

  Render(){
    requestAnimationFrame( this.Render.bind(this) );
    if(!this.visible || !!this.modelViewSideBarComponent.loading_layout)
      return;

    this.selectionBox.update();

    let delta = this.clock.getDelta();
    this.controls.Update(delta);
    this.deltaTime += delta;

    for(let i = 0; i < this.camerahook_cameras.length; i++){
      this.camerahook_cameras[i].updateProjectionMatrix();
    }

    for(let i = 0; i < this.selectable.children.length; i++){
      let obj = this.selectable.children[i];
      if(obj instanceof OdysseyModel3D){
        if(!!this.modelViewTimelineComponent.playing){
          obj.update(delta);
        }
      }
    }

    for(let i = 0; i < this.layout_group.children.length; i++){
      let obj = this.layout_group.children[i];
      if(obj instanceof OdysseyModel3D){
        obj.update(delta);
      }
    }

    if(!!this.model.animationManager.currentAnimation){
      let animation = this.model.animationManager.currentAnimation;
      let data = animation.data;
      if(this.modelViewTimelineComponent.duration != animation.length){
        this.modelViewTimelineComponent.setDuration(animation.length);
        this.modelViewTimelineComponent.buildKeyframes();
      }
      if(this.modelViewTimelineComponent.elapsed != data.elapsed){
        this.modelViewTimelineComponent.setElapsed(data.elapsed);
      }
    }else{
      if(this.modelViewTimelineComponent.elapsed){
        this.modelViewTimelineComponent.stop();
        this.modelViewTimelineComponent.setElapsed(0);
      }
    }
    
    this.renderComponent.Render();
    //this.scene.children[1].rotation.z += 0.01;
    // this.renderer.clear();
    // this.renderer.render( this.scene, this.currentCamera );
    // this.stats.update();
    this.$infoOverlay[0].innerHTML = `
    <b>Camera</b><br>
    <span>Position - x: ${this.renderComponent.currentCamera.position.x.toFixed(4)}, y: ${this.renderComponent.currentCamera.position.y.toFixed(4)}, z: ${this.renderComponent.currentCamera.position.z.toFixed(4)}</span><br>
    <span>Rotation - x: ${this.renderComponent.currentCamera.quaternion.x.toFixed(4)}, y: ${this.renderComponent.currentCamera.quaternion.y.toFixed(4)}, z: ${this.renderComponent.currentCamera.quaternion.z.toFixed(4)}, w: ${this.renderComponent.currentCamera.quaternion.w.toFixed(4)}</span><br>
    `
  }

  BuildGround(){
    // Geometry
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 25, 25, 25, 25 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );
    this.unselectable.add( this.groundMesh );

    this.renderComponent.renderer.setClearColor(0x222222);
  }

}
