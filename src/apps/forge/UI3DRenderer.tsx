/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import type * as THREE from "three";

/* @file
 * The UI3DRenderer class.
 * This class is used to create and manage 3d rendering instances in the KotOR Forge application.
 * The main use is for the model previews in the template editors for UTC, UTD, and UTP files
 */

declare const KotOR: any;

export type UI3DRendererEventListenerTypes =
  'onBeforeRender'|'onAfterRender'|'onCreate'|'onDispose'|'onResize';

export interface UI3DRendererEventListeners {
  onBeforeRender: Function[],
  onAfterRender:  Function[],
  onCreate:       Function[],
  onDispose:      Function[],
  onResize:       Function[],
}

export class UI3DRenderer {

  eventListeners: UI3DRendererEventListeners = {
    onBeforeRender: [],
    onAfterRender:  [],
    onCreate:       [],
    onDispose:      [],
    onResize:       [],
  }

  addEventListener(type: UI3DRendererEventListenerTypes, cb: Function){
    if(Array.isArray(this.eventListeners[type])){
      let ev = this.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        console.warn('Event Listener: Already added', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  removeEventListener(type: UI3DRendererEventListenerTypes, cb: Function){
    if(Array.isArray(this.eventListeners[type])){
      let ev = this.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  processEventListener(type: UI3DRendererEventListenerTypes, args: any[] = []){
    if(Array.isArray(this.eventListeners[type])){
      let ev = this.eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  triggerEventListener(type: UI3DRendererEventListenerTypes, args: any[] = []){
    this.processEventListener(type, args);
  }
  
  time: number;
  deltaTime: number;

  canvas?: HTMLCanvasElement;
  width: number = 640;
  height: number = 480;

  clock: THREE.Clock;
  renderer?: THREE.WebGLRenderer;
  scene: THREE.Scene = new KotOR.THREE.Scene();
  camera: THREE.PerspectiveCamera;
  currentCamera: THREE.PerspectiveCamera;
  light: THREE.AmbientLight;
  lights: THREE.Group = new KotOR.THREE.Group();
  globalLight: THREE.Light;
  depthTarget: THREE.WebGLRenderTarget;
  raycaster: THREE.Raycaster = new KotOR.THREE.Raycaster();

  resizeObserver: ResizeObserver;
  loadingTextures: boolean;
  enabled: boolean = false;

  constructor( canvas?: HTMLCanvasElement, width: number = 640, height: number = 480 ){

    this.canvas = canvas;
    this.width = width;
    this.height = height;

    this.time = 0;
    this.deltaTime = 0;

    this.clock = new KotOR.THREE.Clock();

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

    this.scene.add(this.lights);
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
    requestAnimationFrame( () => {
      this.render();
    });
    if(this.renderer){
      this.renderer.clear();

      const delta = this.clock.getDelta();
      this.time += delta;
      this.deltaTime += delta;

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
    this.renderer = undefined;
    if(this.camera){
      this.camera.removeFromParent();
    }
    while(this.scene.children.length){
      this.scene.children[0].removeFromParent();
    }
    this.canvas = undefined;
  }

}