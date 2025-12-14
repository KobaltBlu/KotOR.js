import { SceneGraphTreeViewManager } from "./managers/SceneGraphTreeViewManager";
import { EventListenerModel } from "./EventListenerModel";
import * as KotOR from "./KotOR";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

export enum CameraView {
  Top = 'top',
  Bottom = 'bottom',
  Left = 'left',
  Right = 'right',
  Front = 'front',
  Back = 'back',
  Orthogonal = 'orthogonal',
  Default = 'default'
}

export type UI3DRendererEventListenerTypes =
  'onBeforeRender'|'onAfterRender'|'onCreate'|'onDispose'|'onResize'|'onCanvasAttached'|'onSelect'|'onMouseDown'|'onMouseUp'|'onMouseMove'|'onMouseWheel'|'onKeyDown'|'onKeyUp';

export interface UI3DRendererEventListeners {
  onBeforeRender: Function[],
  onAfterRender:  Function[],
  onCreate:       Function[],
  onDispose:      Function[],
  onResize:       Function[],
  onCanvasAttached: Function[],
  onSelect: Function[],
  onMouseDown: Function[],
  onMouseUp: Function[],
  onMouseMove: Function[],
  onMouseWheel: Function[],
  onKeyDown: Function[],
  onKeyUp: Function[],
  
}

const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshBasicMaterial({color: 0x00ff00}));

/**
 * UI3DRenderer class.
 * 
 * This class is used to create and manage 3d rendering instances in the KotOR Forge application.
 * The main use is for the model previews in the template editors for UTC, UTD, and UTP files
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file UI3DRenderer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class UI3DRenderer extends EventListenerModel {
  
  static CameraMoveSpeed: number = 10;

  uuid: string;

  sceneGraphManager: SceneGraphTreeViewManager;
  
  time: number;
  deltaTime: number;
  deltaTimeFixed: number = 0;

  canvas?: HTMLCanvasElement;
  width: number = 640;
  height: number = 480;

  guiMode: boolean = false;
  clock: THREE.Clock;
  renderer?: THREE.WebGLRenderer;
  clearColor: THREE.Color = new THREE.Color(0x333333);
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  guiCamera: THREE.OrthographicCamera;
  currentCamera: THREE.PerspectiveCamera;
  cameras: THREE.PerspectiveCamera[] = [];
  light: THREE.AmbientLight;
  lights: THREE.Group = new THREE.Group();
  globalLight: THREE.Light;
  depthTarget: THREE.WebGLRenderTarget;
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  orbitControls: OrbitControls;
  cameraView: CameraView = CameraView.Default;

  lightManager: KotOR.LightManager = new KotOR.LightManager();

  referenceNode: THREE.Object3D = new THREE.Object3D();

  selectable: THREE.Group = new THREE.Group();
  unselectable: THREE.Group = new THREE.Group();

  resizeObserver: ResizeObserver;
  loadingTextures: boolean;
  enabled: boolean = false;

  queuedAnimationFrame: number;

  odysseyModels: KotOR.OdysseyModel3D[] = [];
  selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
  disableSelection: boolean = false;

  flyControls: FirstPersonControls;
  transformControls: TransformControls;
  viewHelper: ViewHelper;

  group: { 
    lights: THREE.Group; 
    light_helpers: THREE.Group; 
    shadow_lights: THREE.Group; 
  };
  frustumMat4: THREE.Matrix4;
  viewportFrustum: THREE.Frustum;

  transformControlsDragging: boolean = false;

  constructor( canvas?: HTMLCanvasElement, width: number = 640, height: number = 480 ){
    super();
    this.uuid = crypto.randomUUID();
    this.sceneGraphManager = new SceneGraphTreeViewManager();
    this.sceneGraphManager.attachUI3DRenderer(this);
    this.canvas = canvas;
    this.width = width;
    this.height = height;

    this.frustumMat4 = new THREE.Matrix4();
    this.viewportFrustum = new THREE.Frustum();

    this.time = 0;
    this.deltaTime = 0;

    this.clock = new THREE.Clock();
    this.selectionBox.visible = false;

    this.group = {
      lights: new THREE.Group(),
      light_helpers: new THREE.Group(),
      shadow_lights: new THREE.Group(),
    }

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
    
    this.selectionBox.visible = false;
    this.buildTransformControls();
    this.buildViewHelper();
    this.buildDOMEventHandlers();

    this.lightManager.init(this);
  }

  buildTransformControls() {
    if(this.transformControls){
      this.transformControls.dispose();
      this.transformControls.removeFromParent();
    }
    if(this.canvas){
      if(this.orbitControls){
        this.orbitControls.dispose();
      }
      this.orbitControls = new OrbitControls(this.currentCamera, this.canvas);
      this.orbitControls.enableDamping = true;
      this.orbitControls.enableZoom = true;
      this.orbitControls.enablePan = true;
      this.orbitControls.enableRotate = true;
      this.orbitControls.panSpeed = 2;
      this.transformControls = new TransformControls(this.currentCamera, this.canvas);
      this.transformControls.visible = false;
      this.unselectable.add(this.transformControls);
      this.transformControls.userData.uuids = [];
      this.transformControls.traverse( (obj) => {
        this.transformControls.userData.uuids.push(obj.uuid);
      });

      this.transformControls.addEventListener('dragging-changed', (event: any) => {
        this.transformControlsDragging = event.value === true;  
        if (this.orbitControls) {
          this.orbitControls.enabled = !this.transformControlsDragging;
        }
      });

      this.transformControls.addEventListener('mouseDown', () => {
        if (this.orbitControls) this.orbitControls.enabled = false;
      });
      this.transformControls.addEventListener('mouseUp', () => {
        if (this.orbitControls) this.orbitControls.enabled = true;
      });
    }
  }

  buildViewHelper() {
    if(this.viewHelper) this.viewHelper.dispose();
    if(this.canvas){
      this.viewHelper = new ViewHelper(this.currentCamera as any, this.canvas);
    }
  }

  reorientCamera(view: CameraView) {
    if(!this.camera || !this.orbitControls) return;

    this.cameraView = view;
    const distance = 10; // Distance from origin
    const lookAt = new THREE.Vector3(0, 0, 0);
    
    switch(view) {
      case CameraView.Top:
        this.camera.position.set(0, 0, distance);
        this.camera.up.set(0, 1, 0);
        break;
      case CameraView.Bottom:
        this.camera.position.set(0, 0, -distance);
        this.camera.up.set(0, 1, 0);
        break;
      case CameraView.Left:
        this.camera.position.set(distance, 0, 0);
        this.camera.up.set(0, 0, 1);
        break;
      case CameraView.Right:
        this.camera.position.set(-distance, 0, 0);
        this.camera.up.set(0, 0, 1);
        break;
      case CameraView.Front:
        this.camera.position.set(0, distance, 0);
        this.camera.up.set(0, 0, 1);
        break;
      case CameraView.Back:
        this.camera.position.set(0, -distance, 0);
        this.camera.up.set(0, 0, 1);
        break;
      case CameraView.Orthogonal:
      case CameraView.Default:
        // Isometric view: equal distance on all axes
        const isoDistance = distance * 1.5;
        this.camera.position.set(isoDistance, isoDistance, isoDistance);
        this.camera.up.set(0, 0, 1);
        break;
    }

    this.camera.lookAt(lookAt);
    this.camera.updateProjectionMatrix();
    
    // Update orbit controls target to maintain the look-at point
    if(this.orbitControls) {
      this.orbitControls.target.copy(lookAt);
      this.orbitControls.update();
      this.orbitControls.enableRotate = view === CameraView.Default;
    }
  }

  
  #center: THREE.Vector3 = new THREE.Vector3();
  #box3: THREE.Box3 = new THREE.Box3();

  private updateCameraFocus(): void {
    this.#box3 = new THREE.Box3();
    for(let i = 0; i < this.selectable.children.length; i++){
      this.#box3.expandByObject(this.selectable.children[i]);
    }
    this.#box3.getCenter(this.#center);
    this.orbitControls.target.copy(this.#center);
  }

  public fitCameraToScene(offset: number = 1.25): void {
    this.updateCameraFocus();
    if(!this.#center) return;
    
    // Calculate bounding box size (box3 is already calculated in updateCameraFocus)
    const boxSize = this.#box3.getSize(new THREE.Vector3());
    const maxSize = Math.max(boxSize.x, boxSize.y, boxSize.z);
    
    const fov = THREE.MathUtils.degToRad(this.camera.fov); // vertical fov in radians
    const aspect = this.camera.aspect;

    // Distance required to fit box height in view
    const fitHeightDistance = maxSize / (2 * Math.tan(fov / 2));
    // Distance required to fit box width in view
    const fitWidthDistance = fitHeightDistance / aspect;

    // Take the larger one, then apply offset
    const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

    // Get the direction vector based on the current cameraView
    const direction = this.getDirectionForView(this.cameraView);

    // New camera position
    this.camera.position.copy(this.#center).add(direction.multiplyScalar(distance));

    // Update camera up vector based on view
    this.updateCameraUpForView(this.cameraView);

    // Update controls target to center the box
    this.orbitControls.target.copy(this.#center);
    this.camera.lookAt(this.#center);

    // Optionally update near/far to better match scene scale
    this.camera.near = distance / 100;
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();

    this.orbitControls.update();
  }

  private getDirectionForView(view: CameraView): THREE.Vector3 {
    const direction = new THREE.Vector3();
    
    switch(view) {
      case CameraView.Top:
        direction.set(0, 0, 1);
        break;
      case CameraView.Bottom:
        direction.set(0, 0, -1);
        break;
      case CameraView.Left:
        direction.set(1, 0, 0);
        break;
      case CameraView.Right:
        direction.set(-1, 0, 0);
        break;
      case CameraView.Front:
        direction.set(0, 1, 0);
        break;
      case CameraView.Back:
        direction.set(0, -1, 0);
        break;
      case CameraView.Orthogonal:
      case CameraView.Default:
        // Isometric view: normalized vector for equal distance on all axes
        direction.set(1, 1, 1).normalize();
        break;
    }
    
    return direction;
  }

  private updateCameraUpForView(view: CameraView): void {
    switch(view) {
      case CameraView.Top:
      case CameraView.Bottom:
        this.camera.up.set(0, 1, 0);
        break;
      case CameraView.Left:
      case CameraView.Right:
      case CameraView.Front:
      case CameraView.Back:
      case CameraView.Orthogonal:
      case CameraView.Default:
        this.camera.up.set(0, 0, 1);
        break;
    }
  }

  buildDOMEventHandlers() {
    if(this.canvas){
      this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
      this.canvas.addEventListener('keydown', this.onKeyDown.bind(this));
      this.canvas.addEventListener('keyup', this.onKeyUp.bind(this));
      // Make canvas focusable for keyboard events
      this.canvas.setAttribute('tabindex', '0');
      this.canvas.style.outline = 'none'; // Remove focus outline
    }
  }

  removeDOMEventHandlers() {
    if(this.canvas){
      this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
      this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
      this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
      this.canvas.removeEventListener('wheel', this.onMouseWheel.bind(this));
      this.canvas.removeEventListener('keydown', this.onKeyDown.bind(this));
      this.canvas.removeEventListener('keyup', this.onKeyUp.bind(this));
    }
  }

  onKeyDown(event: KeyboardEvent) {
    this.processEventListener('onKeyDown', [event]);
    // Only handle key events when canvas is visible and enabled
    if(!this.canvas || !this.enabled) {
      return;
    }

    // Check if canvas is visible in the viewport
    const rect = this.canvas.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) {
      return;
    }

    // Prevent default behavior for camera view keys
    const key = event.key.toLowerCase();
    
    switch(key) {
      case '1':
        event.preventDefault();
        this.reorientCamera(CameraView.Top);
        break;
      case '2':
        event.preventDefault();
        this.reorientCamera(CameraView.Bottom);
        break;
      case '3':
        event.preventDefault();
        this.reorientCamera(CameraView.Left);
        break;
      case '4':
        event.preventDefault();
        this.reorientCamera(CameraView.Right);
        break;
      case '5':
        event.preventDefault();
        this.reorientCamera(CameraView.Front);
        break;
      case '6':
        event.preventDefault();
        this.reorientCamera(CameraView.Back);
        break;
      case '7':
        event.preventDefault();
        this.reorientCamera(CameraView.Orthogonal);
        break;
      case '0':
        event.preventDefault();
        this.reorientCamera(CameraView.Default);
        break;
      case 'f':
        event.preventDefault();
        this.fitCameraToScene();
        break;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    this.processEventListener('onKeyUp', [event]);
  }

  onMouseDown(event: MouseEvent) {
    this.processEventListener('onMouseDown', [event]);
    if(event.target != this.canvas){
      return;
    }

    const offset = this.canvas.getBoundingClientRect();
    KotOR.Mouse.ButtonState = event.which;
    KotOR.Mouse.MouseDown = true;
    KotOR.Mouse.MouseX = event.pageX - offset.left;
    KotOR.Mouse.MouseY = event.pageY - offset.top;
    KotOR.Mouse.Vector.x = ( (KotOR.Mouse.MouseX) / this.canvas.width ) * 2 - 1;
    KotOR.Mouse.Vector.y = - ( (KotOR.Mouse.MouseY) / this.canvas.height ) * 2 + 1;

    if(KotOR.Mouse.ButtonState == KotOR.MouseState.LEFT && !this.transformControlsDragging){
      this.raycaster.setFromCamera( KotOR.Mouse.Vector, this.camera );
      const intersects = this.raycaster.intersectObjects( this.selectable.children, true );
      if(intersects.length){
        const intersection = intersects.shift();
        this.selectObject(intersection?.object);
        this.processEventListener('onSelect', [intersection]);
      }else{
        this.selectObject(undefined);
        this.processEventListener('onSelect', [undefined]);
      }
    }
  }

  onMouseUp(event: MouseEvent) {
    this.processEventListener('onMouseUp', [event]);
    KotOR.Mouse.MouseDown = false;
    KotOR.Mouse.Dragging = false;
    KotOR.Mouse.ButtonState = KotOR.MouseState.NONE;
  }

  onMouseMove(event: MouseEvent) {
    this.processEventListener('onMouseMove', [event]);
    if(event.target != this.canvas){
      return;
    }

    const offset = this.canvas.getBoundingClientRect();
    KotOR.Mouse.MouseX = event.pageX - offset.left;
    KotOR.Mouse.MouseY = event.pageY - offset.top;
    KotOR.Mouse.Vector.x = ( (KotOR.Mouse.MouseX) / this.canvas.width ) * 2 - 1;
    KotOR.Mouse.Vector.y = - ( (KotOR.Mouse.MouseY) / this.canvas.height ) * 2 + 1;
  }

  onMouseWheel(event: WheelEvent) {
    this.processEventListener('onMouseWheel', [event]);
  }

  attachObject(object: THREE.Object3D, selectable: boolean = true){
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

  detachObject(object: THREE.Object3D){
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
  
  attachCamera(camera: THREE.PerspectiveCamera){
    camera.userData.heler = new THREE.CameraHelper( camera );
    this.scene.add( camera.userData.heler );
    this.cameras.push(camera);
  }

  selectObject(object: THREE.Object3D | undefined){
    if(!object || this.disableSelection){
      this.selectionBox.visible = false;
      return;
    }

    const nodeType: KotOR.OdysseyModelNodeType = (object as any).odysseyModelNode?.nodeType || 1;
    const isGeometry = (object instanceof THREE.Mesh) || (object instanceof THREE.Line) || (object instanceof THREE.Points) || ((nodeType & KotOR.OdysseyModelNodeType.Mesh) == KotOR.OdysseyModelNodeType.Mesh);
    const arr = ((this.selectionBox.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array)
    arr.fill(0);
    this.selectionBox.geometry.attributes.position.needsUpdate = true;

    this.selectionBox.setFromObject(object);
    this.selectionBox.visible = true;

    const size = arr.reduce( (a, b) => a + b, 0 );

    if(!size || !isGeometry){
      dummyMesh.position.copy(object.position);
      // object.getWorldPosition(dummyMesh.position);
      object.getWorldQuaternion(dummyMesh.quaternion);
      // dummyMesh.scale.copy(object.scale);
      this.selectionBox.setFromObject(dummyMesh);
      this.selectionBox.visible = true;
    }
  }

  setCanvas(canvas: HTMLCanvasElement){
    //remove old event handlers
    this.removeDOMEventHandlers();

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
      this.buildTransformControls();
      this.buildViewHelper();
      this.buildDOMEventHandlers();
      if(this.canvas.parentElement) this.resizeObserver.observe(this.canvas.parentElement);
      this.setSize(this.canvas.width, this.canvas.height);
      this.processEventListener('onCanvasAttached', [this.canvas]);
    }
  }

  private buildCamera(){
    // if(this.camera) this.camera.dispose();
    this.camera = new THREE.PerspectiveCamera( 50, this.width / this.height, 0.1, 1500 );
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.position.set( .1, 5, 1 ); // offset the camera a bit
    this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.currentCamera = this.camera;

    this.guiCamera = new THREE.OrthographicCamera(
      this.width / -2, this.width / 2,
      this.height / 2, this.height / -2,
      1, 1000
    );
    this.guiCamera.up = new THREE.Vector3( 0, 0, 1 );
    this.guiCamera.position.z = 500;
    this.guiCamera.updateProjectionMatrix();
  }

  private buildAmbientLight(){
    if(this.globalLight) {
      this.globalLight.removeFromParent();
      this.globalLight.dispose();
    }
    this.globalLight = new THREE.AmbientLight(0x7F7F7F); //0x60534A
    this.globalLight.name = 'Ambient Light';
    this.globalLight.position.x = 0;
    this.globalLight.position.y = 0;
    this.globalLight.position.z = 0;
    this.globalLight.intensity  = 1;
    this.lights.add(this.globalLight);
  }

  private buildScene(){
    // this.scene = new THREE.Scene();

    this.scene.add(this.selectionBox);
    this.scene.add(this.lights);
    this.scene.add(this.selectable);
    this.scene.add(this.unselectable);
    this.scene.add(this.referenceNode);
    this.scene.add(this.group.lights);
    this.scene.add(this.group.light_helpers);
    this.scene.add(this.group.shadow_lights);
    this.sceneGraphManager.rebuild();
  }
  
  private buildWebGLRenderer(){
    if(this.renderer) this.renderer.dispose();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      // autoClear: false,
      depth: true,
      alpha: true,
      logarithmicDepthBuffer: false,
      preserveDrawingBuffer: false,
    });

    if(this.renderer){
      this.renderer.setClearColor(this.clearColor)
      this.renderer.autoClear = false;
      this.renderer.setSize( this.width, this.height );
    }
  }

  private buildDepthTarget(){
    if(this.depthTarget) this.depthTarget.dispose();
    const pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
		this.depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
    this.depthTarget.texture.generateMipmaps = false;
    this.depthTarget.stencilBuffer = false;
    this.depthTarget.depthBuffer = true;
    this.depthTarget.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    this.depthTarget.depthTexture.type = THREE.UnsignedShortType;
  }

  setSize( width = 100, height = 100){
    this.width = width;
    this.height = height;
    if(this.renderer) this.renderer.setSize(this.width, this.height);

    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.depthTarget.setSize( this.width, this.height );

    this.guiCamera.left = this.width / -2;
    this.guiCamera.right = this.width / 2;
    this.guiCamera.top = this.height / 2;
    this.guiCamera.bottom = this.height / -2;

    this.guiCamera.updateProjectionMatrix();
  }

  triggerResize(){
    if(this.canvas){
      this.setSize(this.canvas.width, this.canvas.height);
    }
  }

  resetScene(){
    this.scene = new THREE.Scene();
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
      this.deltaTimeFixed += (1/60);

      if(this.viewHelper && this.viewHelper.animating === true ) {
        this.viewHelper.update(delta);
      }

      if(this.orbitControls){
        //@ts-ignore
        this.orbitControls.update(delta);
      }

      //Custom render logic can run here
      this.processEventListener('onBeforeRender', [delta]);

      if(!this.loadingTextures && KotOR.TextureLoader.queue.length){
        this.loadingTextures = true;
        KotOR.TextureLoader.LoadQueue().then( () => {
          this.loadingTextures = false;
        });
      }

      if(this.currentCamera){
        this.currentCamera.updateProjectionMatrix();
        this.frustumMat4.multiplyMatrices( this.currentCamera.projectionMatrix, this.currentCamera.matrixWorldInverse )
        this.viewportFrustum.setFromProjectionMatrix(this.frustumMat4);
        this.lightManager.update(delta, this.currentCamera);
      }

      this.renderer.render( this.scene, this.guiMode ? this.guiCamera : this.currentCamera );

      if(this.viewHelper){
        this.viewHelper.render(this.renderer);
      }

      //Custom render logic can run here
      this.processEventListener('onAfterRender', [delta]);
    }
  }

  destroy(){
    //remove old event handlers
    this.removeDOMEventHandlers();
    
    this.enabled = false;
    cancelAnimationFrame(this.queuedAnimationFrame);
    
    if(this.renderer) this.renderer.dispose();
    this.renderer = undefined;

    if(this.orbitControls){
      this.orbitControls.dispose();
    }

    if(this.camera){
      this.camera.removeFromParent();
    }
    if(this.guiCamera){
      this.guiCamera.removeFromParent();
    }
    while(this.scene.children.length){
      this.scene.children[0].removeFromParent();
    }
    this.canvas = undefined;
  }

}
