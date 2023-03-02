/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { SceneGraphTreeViewManager } from "./managers/SceneGraphTreeViewManager";
import { EventListenerModel } from "./EventListenerModel";

import * as KotOR from "./KotOR";
import { ModelViewerControls } from "./ModelViewerControls";
import { SceneGraphNode } from "./SceneGraphNode";

/* @file
 * The UI3DRenderer class.
 * This class is used to create and manage 3d rendering instances in the KotOR Forge application.
 * The main use is for the model previews in the template editors for UTC, UTD, and UTP files
 */

export type UI3DRendererEventListenerTypes =
  'onBeforeRender'|'onAfterRender'|'onCreate'|'onDispose'|'onResize'|'onCanvasAttached';

export interface UI3DRendererEventListeners {
  onBeforeRender: Function[],
  onAfterRender:  Function[],
  onCreate:       Function[],
  onDispose:      Function[],
  onResize:       Function[],
  onCanvasAttached: Function[],
}

export class UI3DRenderer extends EventListenerModel {

  uuid: string;

  sceneGraphManager: SceneGraphTreeViewManager;
  
  time: number;
  deltaTime: number;

  canvas?: HTMLCanvasElement;
  width: number = 640;
  height: number = 480;

  clock: KotOR.THREE.Clock;
  renderer?: KotOR.THREE.WebGLRenderer;
  scene: KotOR.THREE.Scene = new KotOR.THREE.Scene();
  camera: KotOR.THREE.PerspectiveCamera;
  currentCamera: KotOR.THREE.PerspectiveCamera;
  cameras: KotOR.THREE.PerspectiveCamera[] = [];
  light: KotOR.THREE.AmbientLight;
  lights: KotOR.THREE.Group = new KotOR.THREE.Group();
  globalLight: KotOR.THREE.Light;
  depthTarget: KotOR.THREE.WebGLRenderTarget;
  raycaster: KotOR.THREE.Raycaster = new KotOR.THREE.Raycaster();

  selectable: KotOR.THREE.Group = new KotOR.THREE.Group();
  unselectable: KotOR.THREE.Group = new KotOR.THREE.Group();

  resizeObserver: ResizeObserver;
  loadingTextures: boolean;
  enabled: boolean = false;

  controls: ModelViewerControls;
  controlsEnabled: boolean = false;

  queuedAnimationFrame: number;

  odysseyModels: KotOR.OdysseyModel3D[] = [];
  selectionBox = new KotOR.THREE.BoxHelper(new KotOR.THREE.Object3D(), 0xffffff);

  constructor( canvas?: HTMLCanvasElement, width: number = 640, height: number = 480 ){
    super();
    this.uuid = crypto.randomUUID();
    this.sceneGraphManager = new SceneGraphTreeViewManager();
    this.sceneGraphManager.attachUI3DRenderer(this);
    this.canvas = canvas;
    this.width = width;
    this.height = height;

    this.time = 0;
    this.deltaTime = 0;

    this.clock = new KotOR.THREE.Clock();
    this.selectionBox.visible = false;

    this.resizeObserver = new ResizeObserver((elements: ResizeObserverEntry[]) => {
      for(let i = 0; i < elements.length; i++){
        const entry = elements[i];
        this.setSize(entry.contentRect.width, entry.contentRect.height);
      }
    });

    this.buildCamera();
    if(this.canvas){
      this.buildWebGLRenderer();
      this.buildDepthTarget();
      this.buildAmbientLight();
      this.buildScene();
    }
    
    this.controls = new ModelViewerControls(this);
    this.controls.attachEventListener('onSelect', (obj: KotOR.THREE.Object3D) => {
      this.selectObject(obj);
    })
    this.selectionBox.visible = false;

  }

  attachObject(object: KotOR.THREE.Object3D, selectable: boolean = true){
    if(object){
      if(selectable) this.selectable.add(object);
      else this.unselectable.add(object);

      object.traverse( (node) => {
        if(node instanceof KotOR.OdysseyModel3D){
          if(this.odysseyModels.indexOf(node) == -1){
            this.odysseyModels.push(node);
          }
        }
      });

      this.sceneGraphManager.rebuild();
    }
  }

  detachObject(object: KotOR.THREE.Object3D){
    object.removeFromParent();

    object.traverse( (node) => {
      if(node instanceof KotOR.OdysseyModel3D){
        const index = this.odysseyModels.indexOf(node);
        if(index >= 0){
          this.odysseyModels.splice(index, 1);
        }
      }
    });

    this.sceneGraphManager.rebuild();
  }
  
  attachCamera(camera: KotOR.THREE.PerspectiveCamera){
    camera.userData.heler = new KotOR.THREE.CameraHelper( camera );
    this.scene.add( camera.userData.heler );
    this.cameras.push(camera);
  }

  selectObject(object: KotOR.THREE.Object3D){
    this.selectionBox.setFromObject(object);
    this.selectionBox.visible = true;
  }

  setCanvas(canvas: HTMLCanvasElement){
    const oCanvas = this.canvas;
    if(oCanvas?.parentElement) this.resizeObserver.unobserve(oCanvas.parentElement);
    this.canvas = canvas;
    if(this.canvas && oCanvas != this.canvas){
      this.buildWebGLRenderer();
      this.buildDepthTarget();

      // this.buildCamera();
      this.buildAmbientLight();
      this.buildScene();
    }
    if(this.canvas){
      if(this.canvas?.parentElement) this.resizeObserver.observe(this.canvas.parentElement);
      this.setSize(this.canvas.width, this.canvas.height);
      this.controls.attachCanvasElement(this.canvas);
      this.processEventListener('onCanvasAttached', [this.canvas]);
    }
  }

  private buildCamera(){
    // if(this.camera) this.camera.dispose();
    this.camera = new KotOR.THREE.PerspectiveCamera( 50, this.width / this.height, 0.1, 1500 );
    this.camera.up = new KotOR.THREE.Vector3( 0, 0, 1 );
    this.camera.position.set( .1, 5, 1 ); // offset the camera a bit
    this.camera.lookAt(new KotOR.THREE.Vector3( 0, 0, 0 ));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.currentCamera = this.camera;
  }

  private buildAmbientLight(){
    if(this.globalLight) {
      this.globalLight.removeFromParent();
      this.globalLight.dispose();
    }
    this.globalLight = new KotOR.THREE.AmbientLight(0x7F7F7F); //0x60534A
    this.globalLight.name = 'Ambient Light';
    this.globalLight.position.x = 0;
    this.globalLight.position.y = 0;
    this.globalLight.position.z = 0;
    this.globalLight.intensity  = 1;
    this.lights.add(this.globalLight);
  }

  private buildScene(){
    // this.scene = new KotOR.THREE.Scene();

    this.scene.add(this.selectionBox);
    this.scene.add(this.lights);
    this.scene.add(this.selectable);
    this.scene.add(this.unselectable);
    this.sceneGraphManager.rebuild();
  }
  
  private buildWebGLRenderer(){
    if(this.renderer) this.renderer.dispose();
    this.renderer = new KotOR.THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      // autoClear: false,
      depth: true,
      alpha: true,
      logarithmicDepthBuffer: false,
      preserveDrawingBuffer: false,
    });

    if(this.renderer){
      this.renderer.autoClear = false;
      this.renderer.setSize( this.width, this.height );
    }
  }

  private buildDepthTarget(){
    if(this.depthTarget) this.depthTarget.dispose();
    const pars = { minFilter: KotOR.THREE.LinearFilter, magFilter: KotOR.THREE.LinearFilter, format: KotOR.THREE.RGBFormat };
		this.depthTarget = new KotOR.THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
    this.depthTarget.texture.generateMipmaps = false;
    this.depthTarget.stencilBuffer = false;
    this.depthTarget.depthBuffer = true;
    this.depthTarget.depthTexture = new KotOR.THREE.DepthTexture(window.innerWidth, window.innerHeight);
    this.depthTarget.depthTexture.type = KotOR.THREE.UnsignedShortType;
  }

  setSize( width = 100, height = 100){
    this.width = width;
    this.height = height;
    if(this.renderer) this.renderer.setSize(this.width, this.height);

    this.camera.up = new KotOR.THREE.Vector3( 0, 0, 1 );
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.depthTarget.setSize( this.width, this.height );
  }

  triggerResize(){
    if(this.canvas){
      this.setSize(this.canvas.width, this.canvas.height);
    }
  }

  resetScene(){
    this.scene = new KotOR.THREE.Scene();
    this.scene.add(this.light);

    return this.scene;
  }

  getScene(){
    return this.scene;
  }

  getCamera(){
    return this.camera;
  }

  getRenderedImage(): string {
    if(this.canvas){
      return this.canvas.toDataURL();
    }
    return '';
  }

  render(){
    if(!this.enabled) return;
    this.queuedAnimationFrame = requestAnimationFrame( () => {
      this.render();
    });
    if(this.renderer){
      this.renderer.clear();
      this.selectionBox.update();

      const delta = this.clock.getDelta();
      this.time += delta;
      this.deltaTime += delta;

      if(this.controlsEnabled){
        this.controls.update(delta);
      }

      //Custom render logic can run here
      this.processEventListener('onBeforeRender', [delta]);

      if(!this.loadingTextures && KotOR.TextureLoader.queue.length){
        this.loadingTextures = true;
        KotOR.TextureLoader.LoadQueue( () => {
          this.loadingTextures = false;
        });
      } 

      this.renderer.render( this.scene, this.currentCamera );

      //Custom render logic can run here
      this.processEventListener('onAfterRender', [delta]);
    }
  }

  destroy(){
    this.enabled = false;
    cancelAnimationFrame(this.queuedAnimationFrame);
    if(this.renderer) this.renderer.dispose();
    this.renderer = undefined;

    this.controls.dispose();
    
    if(this.camera){
      this.camera.removeFromParent();
    }
    while(this.scene.children.length){
      this.scene.children[0].removeFromParent();
    }
    this.canvas = undefined;
  }

}
