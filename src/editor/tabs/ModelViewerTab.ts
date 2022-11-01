import { BinaryReader } from "../../BinaryReader";
import { OdysseyModel } from "../../odyssey";
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
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { LYTObject } from "../../resource/LYTObject";
import { KEYManager } from "../../KotOR";
import { TextureLoaderQueuedRef } from "../../interface/loaders/TextureLoaderQueuedRef";

export class ModelViewerTab extends EditorTab {
  animLoop: boolean;
  deltaTime: number;
  renderer: THREE.WebGLRenderer;
  referenceNode: THREE.Object3D<THREE.Event>;
  clock: THREE.Clock;
  stats: Stats;
  scene: THREE.Scene;
  selectable: THREE.Group;
  unselectable: THREE.Group;
  camera: THREE.PerspectiveCamera;
  CameraMode: { EDITOR: number; STATIC: number; ANIMATED: number; };
  staticCameras: any[];
  animatedCameras: any[];
  staticCameraIndex: number;
  animatedCameraIndex: number;
  cameraMode: any;
  currentCamera: any;
  canvas: any;
  $canvas: JQuery<any>;
  $controls: JQuery<HTMLElement>;
  globalLight: THREE.AmbientLight;
  raycaster: THREE.Raycaster;
  depthTarget: THREE.WebGLRenderTarget;
  selectionBox: THREE.BoxHelper;
  controls: ModelViewerControls;
  $ui_selected: JQuery<HTMLElement>;
  data: Uint8Array;
  model: any;
  selected: any;
  $nodeTreeEle: JQuery<HTMLElement>;
  treeIndex: number;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<any, any>;
  $inputCameraSpeed: JQuery<HTMLElement>;
  $btn_camerahook: JQuery<HTMLElement>;
  $animSelect: JQuery<HTMLElement>;
  $animLoop: JQuery<HTMLElement>;
  $selected_object: JQuery<HTMLElement>;
  $input_name: JQuery<HTMLElement>;
  $input_texture: JQuery<HTMLElement>;
  $btn_reset_position: JQuery<HTMLElement>;
  $btn_center_position: JQuery<HTMLElement>;

  camerahook_cameras: THREE.PerspectiveCamera[] = [];
  $selectCameras: JQuery<HTMLElement>;

  layout: LYTObject;
  layout_group: THREE.Group;
  $btn_load_layout: JQuery<HTMLElement>;
  loading_layout: any;
  $select_layout_list: JQuery<HTMLElement>;
  $btn_dispose_layout: JQuery<HTMLElement>;

  constructor(file: EditorFile, isLocal = false){
    super();
    console.log('ModelViewerTab', this);
    this.animLoop = false;
    this.deltaTime = 0;
    console.log('Model Viewer');
    $('a', this.$tab).text('Model Viewer');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      // autoClear: false,
      logarithmicDepthBuffer: true
    });
    this.renderer.autoClear = false;
    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );

    this.referenceNode = new THREE.Object3D();

    this.clock = new THREE.Clock();
    this.stats = Stats();

    this.scene = new THREE.Scene();

    this.selectable = new THREE.Group();
    this.unselectable = new THREE.Group();

    this.layout_group = new THREE.Group();

    this.scene.add(this.selectable);
    this.scene.add(this.unselectable);
    this.scene.add(this.referenceNode);
    this.scene.add(this.layout_group);

    this.camera = new THREE.PerspectiveCamera( 55, this.$tabContent.innerWidth() / this.$tabContent.innerHeight(), 0.01, 15000 );
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

    this.CameraMode = {
      EDITOR: 0,
      STATIC: 1,
      ANIMATED: 2
    };

    //Static Camera's that are in the .git file of the module
    this.staticCameras = [];
    //Animates Camera's are MDL files that have a camera_hook and animations for use in dialog
    this.animatedCameras = [];

    this.staticCameraIndex = 0;
    this.animatedCameraIndex = 0;
    this.cameraMode = this.CameraMode.EDITOR;
    this.currentCamera = this.camera;

    this.canvas = this.renderer.domElement;
    this.$canvas = $(this.canvas);

    this.$canvas.addClass('noselect').attr('tabindex', 1);

    this.$controls = $('<div style="position: absolute; top: 25px; right: 25px; z-index:1000; height: auto!important;" />');

    //0x60534A
    this.globalLight = new THREE.AmbientLight(0xFFFFFF); //0x60534A
    this.globalLight.position.x = 0
    this.globalLight.position.y = 0
    this.globalLight.position.z = 0
    this.globalLight.intensity  = 1

    this.unselectable.add(this.globalLight);

    //Raycaster
    this.raycaster = new THREE.Raycaster();

    let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
		this.depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
    this.depthTarget.texture.generateMipmaps = false;
    this.depthTarget.stencilBuffer = false;
    this.depthTarget.depthBuffer = true;
    this.depthTarget.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    this.depthTarget.depthTexture.type = THREE.UnsignedShortType;

    //this.axes = new THREE.TransformControls( this.currentCamera, this.canvas );//new THREE.AxisHelper(10);            // add axes
    //this.axes.selected = null;
    //this.unselectable.add(this.axes);

    //Selection Box Helper
    this.selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
    this.selectionBox.update();
    this.selectionBox.visible = false;
    this.unselectable.add( this.selectionBox );

    this.controls = new ModelViewerControls(this.currentCamera, this.canvas, this);
    this.controls.AxisUpdate(); //always call this after the Yaw or Pitch is updated

    this.$tabContent.append($(this.stats.dom));
    this.$tabContent.append(this.$canvas);
    this.$tabContent.append(this.$controls);

    this.$ui_selected = $('<div style="position: absolute; top: 0; right: 0; bottom: 0;" />');

    this.$ui_selected.windowPane({
      title: 'Model Viewer Tools'
    });

    this.$tabContent.append(this.$ui_selected);


    this.data = new Uint8Array(0);
    this.file = file;

    window.addEventListener('resize', () => {
      try{
        this.TabSizeUpdate();
      }catch(e){

      }
    });

    $('#container').layout({ applyDefaultStyles: false,
      onresize: () => {
        try{
          this.TabSizeUpdate();
        }catch(e){

        }
      }
    });

    this.BuildGround();

    this.OpenFile(file);

  }

  UpdateUI(){

    (this.$ui_selected[0] as any).$content.html(`
      <div class="tab-host">
        <div class="tabs">
          <ul class="tabs-menu tabs-flex-wrap">
            <li class="btn btn-tab" rel="#camera">Camera</li>
            <li class="btn btn-tab" rel="#animations">Animation</li>
            <li class="btn btn-tab" rel="#selected_object">Nodes</li>
            <li class="btn btn-tab" rel="#object_utils">Utils</li>
          </ul>
        </div>
        <div class="tab-container">
          <div class="tab-content" id="camera">
            <div class="toolbar-header">
              <b>Camera</b>
            </div>
            <select id="camera_list">
              <option value="-1">Main</option>
            </select>

            <div class="toolbar-header">
              <b>Camera Speed</b>
            </div>
            <input id="camera_speed" type="range" min="1" max="25" value="${EditorControls.CameraMoveSpeed}" />
            <button id="btn_camerahook">Align to camera hook</button>
          </div>
          <div class="tab-content" id="animations">
            <div class="toolbar-header">
              <b>Animations</b>
            </div>
            <select id="animation_list">
              <option value="-1">None</option>
            </select>
            <b>Loop? </b><input type="checkbox" id="anim_loop"/>
          </div>
          <div class="tab-content" id="selected_object">
            <div class="toolbar-header">
              <b>Name</b>
            </div>
            <input id="selected_name" type="text" class="input" disabled />

            <div class="toolbar-header">
              <b>Texture</b>
            </div>
            <input id="selected_texture" type="text" class="input" disabled />
            <button id="selected_change_texture">Change Texture</button>

            <ul id="node_tree_ele" class="tree css-treeview js"></ul>
          </div>
          <div class="tab-content" id="object_utils">
            <div class="toolbar-header">
              <b>Position</b>
            </div>
            <button id="btn_reset_position">Reset</button>
            <button id="btn_center_position">Center</button>
            <br>
            <div class="toolbar-header">
              <b>Layout</b>
            </div>
            <select id="layout_list">
              <option value="-1">None</option>
            </select><br>
            <button id="btn_load_layout">Load Layout</button>
            <button id="btn_dispose_layout">Dispose Layout</button>
          </div>
        </div>
      </div>
    `);

    //Setup the tabs
    (this.$ui_selected as any).$tabHost = $('.tab-host', (this.$ui_selected[0] as any).$content);

    $('.tabs-menu', (this.$ui_selected as any).$tabHost).css({
      whiteSpace: 'initial',
      width: '100%',
      height: 'initial'
    });

    $('.tabs-menu > .btn-tab', (this.$ui_selected as any).$tabHost).on('click', (e: any) => {
      e.preventDefault();
      $('.tabs-menu > .btn-tab', (this.$ui_selected as any).$tabHost).removeClass('current');
      $(e.target).addClass('current');
      $('.tab-container .tab-content', (this.$ui_selected as any).$tabHost).hide()
      $('.tab-container .tab-content'+e.target.attributes.rel.value, (this.$ui_selected as any).$tabHost).show();
    });

    $('.tabs > .btn-tab[rel="#animations"]', (this.$ui_selected as any).$tabHost).trigger('click');

    //Camera Properties
    this.$selectCameras = $('select#camera_list', (this.$ui_selected[0] as any).$content);
    this.$selectCameras.on('change', () => {
      if(this.$selectCameras.val() == -1){
        this.currentCamera = this.camera;
      }else{
        this.currentCamera = this.camerahook_cameras[this.$selectCameras.val() as any];
      }
      if(!this.currentCamera){
        this.currentCamera = this.camera;
      }
    });

    for(let i = 0; i < this.camerahook_cameras.length; i++){
      let name = this.camerahook_cameras[i].parent.name.replace(/\0[\s\S]*$/g,'');
      this.$selectCameras.append('<option value="'+i+'">'+name+'</option>')
    }

    this.$inputCameraSpeed = $('input#camera_speed', (this.$ui_selected[0] as any).$content);
    this.$inputCameraSpeed.on('change', () => {
      EditorControls.CameraMoveSpeed = parseInt(this.$inputCameraSpeed.val() as any);
      localStorage.setItem('camera_speed', EditorControls.CameraMoveSpeed.toString());
    });

    this.$btn_camerahook = $('#btn_camerahook', (this.$ui_selected[0] as any).$content);
    this.$btn_camerahook.on('click', (e: any) => {
      e.preventDefault();
      if(this.model.camerahook instanceof THREE.Object3D){
        this.model.camerahook.getWorldPosition(this.camera.position);
        this.model.camerahook.getWorldQuaternion(this.camera.quaternion);
      }else{
        NotificationManager.Notify(NotificationManager.Types.WARNING, 'There is no camerahook present in this model.');
      }
    })

    //Animation Properties

    this.$animSelect = $('select#animation_list', (this.$ui_selected[0] as any).$content);
    this.$animLoop = $('input#anim_loop', (this.$ui_selected[0] as any).$content);

    let animations = this.model.odysseyAnimations.slice();
    animations.sort( (a: any, b: any) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      let comparison = 0;
      if (nameA > nameB) {
        comparison = 1;
      } else if (nameA < nameB) {
        comparison = -1;
      }
      return comparison;
    });

    for(let i = 0; i < animations.length; i++){
      let name = animations[i].name.replace(/\0[\s\S]*$/g,'');
      this.$animSelect.append('<option value="'+name+'">'+name+'</option>')
    }

    this.$animSelect.on('change', () => {
      let val = this.$animSelect.val();
      this.model.stopAnimation();
      if(val != '-1')
        this.model.playAnimation(val, this.animLoop)

    });

    this.$animLoop.on('change', () => {
      this.animLoop = this.$animLoop.is(':checked');
      this.$animSelect.trigger('change');
    });

    //Selected Object Properties
    this.$selected_object = $('div#selected_object', (this.$ui_selected[0] as any).$content);
    this.$input_name = $('input#selected_name', (this.$ui_selected[0] as any).$content);
    this.$input_texture = $('input#selected_texture', (this.$ui_selected[0] as any).$content);
    (this.$ui_selected as any).$btn_change_texture = $('button#selected_change_texture', (this.$ui_selected[0] as any).$content);

    (this.$ui_selected as any).$btn_change_texture.on('click', async (e: any) => {

      let originalTextureName = this.selected.odysseyModelNode.TextureMap1;

      let payload = await WindowDialog.showOpenDialog({
        title: 'Replace Texture',
        filters: [
          {name: 'TPC Image', extensions: ['tpc']},
          {name: 'TGA Image', extensions: ['tga']}
        ],
        properties: ['createDirectory'],
      });

      if(!payload.canceled && payload.filePaths.length){
        if(payload.filePaths.length){
          let file = payload.filePaths[0];
          let file_info = path.parse(file);
          TextureLoader.tpcLoader.fetch_local(file, (texture: OdysseyTexture) => {
            this.selected.odysseyModelNode.TextureMap1 = file_info.name;
            this.selected.material.uniforms.map.value = texture;
            this.selected.material.uniformsNeedsUpdate = true;

            let replaceAll = WindowDialog.showMessageBox({
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Replace All',
                message: 'Would you like to replace all occurrences of the texture?'
              });

            if(replaceAll == 0){
              this.model.traverse( (obj: any) => {
                if(obj instanceof THREE.Mesh){
                  if(obj.userData.node.TextureMap1.equalsIgnoreCase(originalTextureName)){
                    obj.userData.node.TextureMap1 = file_info.name;
                    obj.material.uniforms.map.value = texture;
                    obj.material.uniformsNeedsUpdate = true;
                  }
                }
              });
            }

          });
        }
      }
    });

    //Node Tree Tab
    //this.$nodeTreeTab = $('#node_tree', (this.$ui_selected as any).$tabHost);
    this.$nodeTreeEle = $('#node_tree_ele', (this.$ui_selected as any).$tabHost);

    //Object Utils
    this.$btn_reset_position = $('#btn_reset_position', (this.$ui_selected[0] as any).$content);
    this.$btn_center_position = $('#btn_center_position', (this.$ui_selected[0] as any).$content);

    this.$btn_reset_position.on('click', (e) => {
      e.preventDefault();
      this.resetObjectPosition();
    });

    this.$btn_center_position.on('click', (e) => {
      e.preventDefault();
      this.centerObjectPosition();
    });

    this.$select_layout_list = $('#layout_list', (this.$ui_selected[0] as any).$content);
    let layouts = KEYManager.Key.GetFilesByResType(3000);
    layouts.forEach( (res, index) => {
      let key = KEYManager.Key.GetFileKeyByRes(res);
      this.$select_layout_list[0].innerHTML += `<option value="${index}">${key.ResRef}</option>`;
    });
    this.$select_layout_list.on('change', (e) => {
      let val = this.$select_layout_list.val();
    })

    this.$btn_load_layout = $('#btn_load_layout', (this.$ui_selected[0] as any).$content);
    this.$btn_load_layout.on('click', (e) => {
      if(this.loading_layout) return;
      if(!this.layout){
        let index = parseInt(this.$select_layout_list.val() as any);
        this.disposeLayout();
        if(index >= 0){
          this.loading_layout = true;
          KEYManager.Key.GetFileData(KEYManager.Key.GetFileKeyByRes(layouts[index]), (data: Buffer) => {
            this.loadLayout(new LYTObject(data)).then( () => {
              this.loading_layout = false;
            });
          })
        }else{
          this.layout = undefined;
          this.loading_layout = false;
        }
      }
    });
    
    this.$btn_dispose_layout = $('#btn_dispose_layout', (this.$ui_selected[0] as any).$content);
    this.$btn_dispose_layout.on('click', (e) => {
      this.disposeLayout();
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

          try{
            this.$tabName.text(file.getFilename());
          }catch(e){}

          OdysseyModel3D.FromMDL(odysseyModel, {
            manageLighting: false,
            context: this, 
            onComplete: (model: OdysseyModel3D) => {
              this.model = model;

              if(model.camerahook){
                const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
                const helper = new THREE.CameraHelper( camera );
                this.scene.add( helper );
                model.camerahook.add(camera);
                this.camerahook_cameras.push(camera);
              }

              this.selectable.add(model);
              model.position.set(0, 0, 0);
              TextureLoader.LoadQueue(() => {
                console.log('Textures Loaded');
                this.TabSizeUpdate();
                this.UpdateUI();
                this.Render();
                this.BuildNodeTree();
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

  async loadLayout(lyt: LYTObject){
    return new Promise<void>( async (resolve, reject) => {
      this.layout = lyt;
      for(let i = 0, len = this.layout.rooms.length; i < len; i++){
        let room = this.layout.rooms[i];
        let mdl = await GameState.ModelLoader.loadAsync(room.name);
        if(mdl){
          let model = await OdysseyModel3D.FromMDL(mdl, {
            manageLighting: false,
            context: this, 
            mergeStatic: true,
          });
          if(model){
            model.position.set( parseFloat(room.x), parseFloat(room.y), parseFloat(room.z) )
            this.layout_group.add(model);
          }
        }
      }
      TextureLoader.LoadQueue(() => {
        this.renderer.compile(this.scene, this.currentCamera);
        resolve();
      }, (texObj: TextureLoaderQueuedRef) => {
        if(texObj.material){
          if(texObj.material instanceof THREE.ShaderMaterial){
            if(texObj.material.uniforms.map.value){
              console.log('iniTexture', texObj.name);
              this.renderer.initTexture(texObj.material.uniforms.map.value);
            }
          }
        }
      });
    });
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
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  onDestroy() {
    super.onDestroy();

    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  TabSizeUpdate(){
    this.camera.aspect = this.$tabContent.innerWidth() / this.$tabContent.innerHeight();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
    this.depthTarget.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );

    for(let i = 0; i < this.camerahook_cameras.length; i++){
      this.camerahook_cameras[i].aspect = this.camera.aspect;
      this.camerahook_cameras[i].updateProjectionMatrix();
    }
  }

  BuildNodeTree(){

    let nodeList = [];
    this.treeIndex = 0;

    for (const [key, value] of this.model.nodes) {
      nodeList.push({
        name: key,
        type: 'resource',
        data: {
          node: value,
        },
        nodeList: []
      });
    }

    this.$nodeTreeEle.html(
      this.buildNodeList(nodeList)
    );

    $('li.link', this.$nodeTreeEle).off('click').on('click', (e: any) => {
      e.preventDefault();
      if(this.model.nodes.has(e.target.dataset.node)){
        this.select(this.model.nodes.get(e.target.dataset.node));
      }
      console.log(e.target.dataset.node);
    });

  }

  buildNodeList(nodeList: any = [], canOrphan = false){

    let str = '';
    if(nodeList instanceof Array){
      for(let i = 0; i < nodeList.length; i++){
        str += this.buildNodeList(nodeList[i], canOrphan);
      }
    }else{

      let node = nodeList;
      if(node.type == 'group'){
        if(node.nodeList.length == 1 && canOrphan){
          for(let i = 0; i < node.nodeList.length; i++){
            str += this.buildNodeList(node.nodeList[i], false);
          }
        }else{
          str += '<li><input type="checkbox" checked id="list-'+this.treeIndex+'"><label for="list-'+(this.treeIndex++)+'">'+node.name+'</label><span></span><ul>';
          for(let i = 0; i < node.nodeList.length; i++){
            str += this.buildNodeList(node.nodeList[i], true);
          }
          str += '</ul></li>';
        }
      }else{
        str += '<li class="link" data-node="'+node.name+'">'+node.name+'</li>';
      }

    }

    return str;

  }

  Render(){
    requestAnimationFrame( this.Render.bind(this) );
    if(!this.visible || !!this.loading_layout)
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
        obj.update(delta);
      }
    }

    for(let i = 0; i < GameState.AnimatedTextures.length; i++){
      GameState.AnimatedTextures[i].Update(delta);
    }
    //this.scene.children[1].rotation.z += 0.01;
    this.renderer.clear();
    this.renderer.render( this.scene, this.currentCamera );
    this.stats.update();

  }

  select ( object: any ) {
    //console.log('ModuleEditorTab', 'select', object);
    if(this.selected === object) return;

    if(object == null || object == undefined) return;

    //this.axes.detach();
    //this.axes.attach( object );
    //this.axes.visible = true;

    this.selected = object;


    console.log('Signal', 'objectSelected', this.selected);
    (this.selectionBox as any).object = this.selected;
    this.selectionBox.visible = true;
    this.selectionBox.update();

    console.log(this.selectionBox);

    if(this.selected instanceof THREE.Mesh){
      this.$selected_object.show();
      this.$input_name.val((this.selected as any).odysseyNode.name);
      this.$input_texture.val((this.selected as any).odysseyNode.TextureMap1);
    }else if(this.selected instanceof THREE.Group){
      for(let i = 0; i < this.selected.children.length; i++){
        let child = this.selected.children[i];
        if(child instanceof THREE.Mesh){
          this.selected = child;
          this.$selected_object.show();
          this.$input_name.val(this.selected.odysseyModelNode.name);
          this.$input_texture.val(this.selected.odysseyModelNode.TextureMap1);
          break;
        }
      }
    }else{
      this.$selected_object.hide();
    }

    //let centerX = this.selectionBox.geometry.boundingSphere.center.x;
    //let centerY = this.selectionBox.geometry.boundingSphere.center.y;
    //let centerZ = this.selectionBox.geometry.boundingSphere.center.z;

    //console.log(this.editor.axes, centerX, centerY, centerZ);

    //this.editor.axes.position.set(centerX, centerY, centerZ);
    //this.editor.axes.visible = true;

    //this.signals.objectSelected.dispatch( object );
  }

  BuildGround(){
    // Geometry
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 25, 25, 25, 25 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );
    this.unselectable.add( this.groundMesh );

    this.renderer.setClearColor(0x222222);
  }

}
