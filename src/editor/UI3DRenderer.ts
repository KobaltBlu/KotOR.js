/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { TextureLoader } from "../loaders/TextureLoader";

/* @file
 * The UI3DRenderer class.
 * This class is used to create and manage 3d rendering instances in the KotOR Forge application.
 * The main use is for the model previews in the template editors for UTC, UTD, and UTP files
 */

export class UI3DRenderer {
  onBeforeRender: Function;
  camera: any;
  args: any;
  time: number;
  deltaTime: number;
  clock: THREE.Clock;
  currentCamera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  canvas: any;
  $canvas: JQuery<any>;
  scene: THREE.Scene;
  light: THREE.AmbientLight;
  loadingTextures: any;
  stats: Stats;
  lights: THREE.Group = new THREE.Group();
  globalLight: THREE.Light;
  depthTarget: THREE.WebGLRenderTarget;
  raycaster: THREE.Raycaster = new THREE.Raycaster();

  constructor( args: any = {} ){

    this.args = Object.assign({
      width: 640,
      height: 480,
      camera: {
        position: new THREE.Vector3( .1, 5, 1 ),
        minView: 0.1,
        maxView: 1500
      }
    }, args);

    this.time = 0;
    this.deltaTime = 0;

    this.clock = new THREE.Clock();
    this.stats = Stats();

    this.camera = new THREE.PerspectiveCamera( 50, this.args.width / this.args.height, this.args.camera.minView, this.args.camera.maxView );
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.position.set( this.args.camera.position.x, this.args.camera.position.y, this.args.camera.position.z );              // offset the camera a bit
    this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    this.camera.aspect = this.args.width / this.args.height;
    this.camera.updateProjectionMatrix();

    this.currentCamera = this.camera;

    this.globalLight = new THREE.AmbientLight(0xFFFFFF); //0x60534A
    this.globalLight.name = 'Ambient Light';
    this.globalLight.position.x = 0
    this.globalLight.position.y = 0
    this.globalLight.position.z = 0
    this.globalLight.intensity  = 1

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      // autoClear: false,
      depth: true,
      alpha: true,
      logarithmicDepthBuffer: false,
      preserveDrawingBuffer: false
    });

    this.renderer.autoClear = false;
    this.renderer.setSize( this.args.width, this.args.height );

    let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
		this.depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
    this.depthTarget.texture.generateMipmaps = false;
    this.depthTarget.stencilBuffer = false;
    this.depthTarget.depthBuffer = true;
    this.depthTarget.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    this.depthTarget.depthTexture.type = THREE.UnsignedShortType;

    this.canvas = this.renderer.domElement;
    this.$canvas = $(this.canvas);
    this.$canvas.addClass('noselect').attr('tabindex', 1);

    this.scene = new THREE.Scene();

    this.lights.add(this.globalLight);
    this.scene.add(this.lights);

    this.light = new THREE.AmbientLight();

    this.scene.add(this.light);

    this.onBeforeRender = null;

  }

  SetSize( width = 100, height = 100){

    this.args.width = width;
    this.args.height = height;

    this.renderer.setSize(width, height);  

    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    //this.camera.position.set( this.args.camera.position.x, this.args.camera.position.y, this.args.camera.position.z );              // offset the camera a bit
    //this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    this.camera.aspect = this.args.width / this.args.height;
    this.camera.updateProjectionMatrix();

  }

  triggerResize(){
    let $parent = this.$canvas.parent();
    if($parent.length){
      this.camera.aspect = $parent.innerWidth() / $parent.innerHeight();
      this.camera.updateProjectionMatrix();
      this.renderer.setSize( $parent.innerWidth(), $parent.innerHeight() );
      this.depthTarget.setSize( $parent.innerWidth(), $parent.innerHeight() );
    }
  }

  ResetScene(){
    this.scene = new THREE.Scene();
    this.scene.add(this.light);

    return this.scene;
  }

  GetScene(){
    return this.scene;
  }

  GetCamera(){
    return this.camera;
  }

  GetRenderedImage(){
    return this.canvas.toDataURL();
  }

  Render(){
    this.renderer.clear();

    let delta = this.clock.getDelta();
    this.time += delta;
    this.deltaTime += delta;

    //Custom render logic can run here
    if(typeof this.onBeforeRender === 'function')
      this.onBeforeRender(this, delta);

    if(!this.loadingTextures && TextureLoader.queue.length){
      this.loadingTextures = true;
      TextureLoader.LoadQueue( () => {
        this.loadingTextures = false;
      });
    } 

    this.renderer.render( this.scene, this.currentCamera );
  }

  Destroy(){
    this.renderer = null;
    this.camera = null;
    this.scene = null;
    this.canvas = null;
    this.$canvas = null;
    this.args = null;
  }

}
