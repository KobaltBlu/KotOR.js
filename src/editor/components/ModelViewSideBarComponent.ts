import * as THREE from "three";
import { Component } from ".";
import { ModelViewerTab } from "../tabs"
import { LYTObject } from "../../resource/LYTObject";
import { EditorControls } from "../EditorControls";
import { NotificationManager } from "../NotificationManager";
import { WindowDialog } from "../../utility/WindowDialog";
import { TextureLoader } from "../../loaders/TextureLoader";
import { OdysseyTexture } from "../../resource/OdysseyTexture";
import * as path from "path";
import { GameState, KEYManager } from "../../KotOR";
import { OdysseyModel3D } from "../../three/odyssey";
import { OdysseyModelNodeType } from "../../interface/odyssey/OdysseyModelNodeType";
import { TextureLoaderQueuedRef } from "../../interface/loaders/TextureLoaderQueuedRef";

export class ModelViewSideBarComponent extends Component {
  declare tab: ModelViewerTab;
  $ui_selected: JQuery<HTMLElement>;
  $content: JQuery<HTMLElement>;
  
  $inputCameraSpeed: JQuery<HTMLElement>;
  $btn_camerahook: JQuery<HTMLElement>;
  $animSelect: JQuery<HTMLElement>;
  $animLoop: JQuery<HTMLElement>;
  $selected_object: JQuery<HTMLElement>;
  $input_name: JQuery<HTMLElement>;
  $input_texture: JQuery<HTMLElement>;
  $btn_reset_position: JQuery<HTMLElement>;
  $btn_center_position: JQuery<HTMLElement>;

  $selectCameras: JQuery<HTMLElement>;
  selected: any;
  $nodeTreeEle: JQuery<HTMLElement>;
  treeIndex: number;
  $btn_load_layout: JQuery<HTMLElement>;
  loading_layout: any;
  $select_layout_list: JQuery<HTMLElement>;
  $btn_dispose_layout: JQuery<HTMLElement>;
  animLoop: boolean = false;

  constructor(tab: ModelViewerTab){
    super();
    this.tab = tab;

    this.$ui_selected = $('<div style="position: absolute; top: 0; bottom: 0; left: 0; right: 0;" />');
    this.$content = $('<div style="display: flex; flex-direction: column; height: 100%;" />');
    this.$ui_selected.append(this.$content);
    this.$component.append(this.$ui_selected);
  }

  buildUI(){
    this.$content.html(`
      <div class="nodes-container" style="flex: 0.25; overflow-y: auto;">
        <div class="toolbar-header"> <b>Scene</b>  </div>
        <ul id="node_tree_ele" class="tree css-treeview js"></ul>
      </div>
      <div class="tab-host" style="flex: 0.75;">
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
            <div class="button-group">
              <button id="btn_camerahook">Align to camera hook</button>
            </div>
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
            <div class="button-group">
              <button id="selected_change_texture">Change Texture</button>
            </div>
          </div>
          <div class="tab-content" id="object_utils">
            <div class="toolbar-header">
              <b>Position</b>
            </div>
            <div class="button-group">
              <button id="btn_reset_position">Reset</button>
              <button id="btn_center_position">Center</button>
            </div>
            <div class="toolbar-header">
              <b>Layout</b>
            </div>
            <select id="layout_list">
              <option value="-1">None</option>
            </select>
            <div class="button-group">
              <button id="btn_load_layout">Load</button>
              <button id="btn_dispose_layout">Dispose</button>
            </div>
          </div>
        </div>
      </div>
    `);

    //Setup the tabs
    (this.$ui_selected as any).$tabHost = $('.tab-host', this.$content);

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
    this.$selectCameras = $('select#camera_list', this.$content);
    this.$selectCameras.on('change', () => {
      if(this.$selectCameras.val() == -1){
        this.tab.renderComponent.currentCamera = this.tab.renderComponent.camera;
      }else{
        this.tab.renderComponent.currentCamera = this.tab.camerahook_cameras[this.$selectCameras.val() as any];
      }
      if(!this.tab.renderComponent.currentCamera){
        this.tab.renderComponent.currentCamera = this.tab.renderComponent.camera;
      }
    });

    for(let i = 0; i < this.tab.camerahook_cameras.length; i++){
      let name = this.tab.camerahook_cameras[i].parent.name.replace(/\0[\s\S]*$/g,'');
      this.$selectCameras.append('<option value="'+i+'">'+name+'</option>')
    }

    this.$inputCameraSpeed = $('input#camera_speed', this.$content);
    this.$inputCameraSpeed.on('change', () => {
      EditorControls.CameraMoveSpeed = parseInt(this.$inputCameraSpeed.val() as any);
      localStorage.setItem('camera_speed', EditorControls.CameraMoveSpeed.toString());
    });

    this.$btn_camerahook = $('#btn_camerahook', this.$content);
    this.$btn_camerahook.on('click', (e: any) => {
      e.preventDefault();
      if(this.tab.model.camerahook instanceof THREE.Object3D){
        this.tab.model.camerahook.getWorldPosition(this.tab.renderComponent.camera.position);
        this.tab.model.camerahook.getWorldQuaternion(this.tab.renderComponent.camera.quaternion);
      }else{
        NotificationManager.Notify(NotificationManager.Types.WARNING, 'There is no camerahook present in this model.');
      }
    })

    //Animation Properties

    this.$animSelect = $('select#animation_list', this.$content);
    this.$animLoop = $('input#anim_loop', this.$content);

    let animations = this.tab.model.odysseyAnimations.slice();
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
      this.tab.model.stopAnimation();
      if(val != '-1')
        this.tab.model.playAnimation(val, this.animLoop)

    });

    this.$animLoop.on('change', () => {
      this.animLoop = this.$animLoop.is(':checked');
      this.$animSelect.trigger('change');
    });

    //Selected Object Properties
    this.$selected_object = $('div#selected_object', this.$content);
    this.$input_name = $('input#selected_name', this.$content);
    this.$input_texture = $('input#selected_texture', this.$content);
    (this.$ui_selected as any).$btn_change_texture = $('button#selected_change_texture', this.$content);

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
              this.tab.model.traverse( (obj: any) => {
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
    this.$nodeTreeEle = $('#node_tree_ele', (this.$ui_selected as any).$content);

    //Object Utils
    this.$btn_reset_position = $('#btn_reset_position', this.$content);
    this.$btn_center_position = $('#btn_center_position', this.$content);

    this.$btn_reset_position.on('click', (e) => {
      e.preventDefault();
      this.tab.resetObjectPosition();
    });

    this.$btn_center_position.on('click', (e) => {
      e.preventDefault();
      this.tab.centerObjectPosition();
    });

    this.$select_layout_list = $('#layout_list', this.$content);
    let layouts = KEYManager.Key.GetFilesByResType(3000);
    layouts.forEach( (res, index) => {
      let key = KEYManager.Key.GetFileKeyByRes(res);
      this.$select_layout_list[0].innerHTML += `<option value="${index}">${key.ResRef}</option>`;
    });
    this.$select_layout_list.on('change', (e) => {
      let val = this.$select_layout_list.val();
    })

    this.$btn_load_layout = $('#btn_load_layout', this.$content);
    this.$btn_load_layout.on('click', (e) => {
      if(this.loading_layout) return;
      if(!this.tab.layout){
        let index = parseInt(this.$select_layout_list.val() as any);
        this.tab.disposeLayout();
        if(index >= 0){
          this.loading_layout = true;
          KEYManager.Key.GetFileData(KEYManager.Key.GetFileKeyByRes(layouts[index]), (data: Buffer) => {
            this.loadLayout(new LYTObject(data)).then( () => {
              this.loading_layout = false;
            });
          })
        }else{
          this.tab.layout = undefined;
          this.loading_layout = false;
        }
      }
    });
    
    this.$btn_dispose_layout = $('#btn_dispose_layout', this.$content);
    this.$btn_dispose_layout.on('click', (e) => {
      this.tab.disposeLayout();
    });
  }

  async loadLayout(lyt: LYTObject){
    return new Promise<void>( async (resolve, reject) => {
      this.tab.tabLoader.SetMessage(`Loading: Layout...`);
      this.tab.tabLoader.Show();
      this.tab.layout = lyt;
      for(let i = 0, len = this.tab.layout.rooms.length; i < len; i++){
        let room = this.tab.layout.rooms[i];
        this.tab.tabLoader.SetMessage(`Loading: ${room.name}`);
        let mdl = await GameState.ModelLoader.loadAsync(room.name);
        if(mdl){
          let model = await OdysseyModel3D.FromMDL(mdl, {
            manageLighting: false,
            context: this.tab.renderComponent, 
            mergeStatic: true,
          });
          if(model){
            model.position.copy( room.position )
            this.tab.layout_group.add(model);
          }
        }
      }
      this.tab.modelViewSideBarComponent.buildNodeTree();
      TextureLoader.LoadQueue(() => {
        this.tab.renderComponent.renderer.compile(this.tab.renderComponent.scene, this.tab.renderComponent.currentCamera);
        this.tab.tabLoader.Hide();
        resolve();
      }, (texObj: TextureLoaderQueuedRef) => {
        if(texObj.material){
          if(texObj.material instanceof THREE.ShaderMaterial){
            if(texObj.material.uniforms.map.value){
              this.tab.tabLoader.SetMessage(`Initializing Texture: ${texObj.name}`);
              console.log('iniTexture', texObj.name);
              this.tab.renderComponent.renderer.initTexture(texObj.material.uniforms.map.value);
            }
          }
        }
      });
    });
  }

  buildNodeTree(){

    let nodeList: any[] = [];
    this.treeIndex = 0;

    //Rooms

    let layoutGroup: any = {
      name: 'Layout',
      type: 'group',
      nodeList: [],
      icon: 'fa-solid fa-layer-group',
			// canOrphan: false,
    }

    if(this.tab.layout_group.children.length){
      nodeList.push(layoutGroup);
      for(let i = 0; i < this.tab.layout_group.children.length; i++){
        let obj = this.tab.layout_group.children[i];
        if(obj instanceof OdysseyModel3D){
          layoutGroup.nodeList.push({
            name: obj.name,
            type: 'resource',
            icon: 'fa-solid fa-diamond',
            data: {
              node: obj,
            },
            nodeList: []
          });
        }
      }
    }

    let cameraGroup: any = {
      name: 'Cameras',
      type: 'group',
      nodeList: [],
      icon: 'fa-solid fa-video',
			// canOrphan: false,
    }

    //Cameras

    cameraGroup.nodeList.push({
      name: 'Scene Camera',
      type: 'resource',
      icon: 'fa-solid fa-diamond',
      data: {
        node: this.tab.renderComponent.camera,
      },
      nodeList: []
    });

    for(let i = 0; i < this.tab.camerahook_cameras.length; i++){
      let camera = this.tab.camerahook_cameras[i];

      cameraGroup.nodeList.push({
        name: `Camerahook ${i+1}`,
        type: 'resource',
        icon: 'fa-solid fa-diamond',
        data: {
          node: camera,
        },
        nodeList: []
      });
    }

    nodeList.push(cameraGroup);

    //Lights

    let lightsGroup: any = {
      name: 'Lights',
      type: 'group',
      nodeList: [],
      icon: 'fa-solid fa-lightbulb',
			// canOrphan: false,
    }
    
    nodeList.push(lightsGroup);

    //Model

    let modelGroup: any = {
      name: this.tab.model.name,
      type: 'group',
      nodeList: [],
      icon: 'fa-solid fa-vector-square',
			// canOrphan: false,
    }

    let modelNode: any;
    for (const [key, node] of this.tab.model.nodes) {
      modelNode = {
        name: key,
        type: 'resource',
        icon: '',
        data: {
          node: node,
        },
        nodeList: []
      };

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Header) == OdysseyModelNodeType.Header){
        modelNode.icon = 'fa-regular fa-square';
      }

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Reference) == OdysseyModelNodeType.Reference) {
        modelNode.icon = 'fa-solid fa-circle-nodes';
      }

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
        modelNode.icon = 'fa-solid fa-lightbulb';
      }

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
        modelNode.icon = 'fa-solid fa-vector-square';
      }

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin) {
        modelNode.icon = 'fa-solid fa-shirt';
      }

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) {
        modelNode.icon = 'fa-solid fa-person-walking-dashed-line-arrow-right';
      }

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly) {
        modelNode.icon = 'fa-solid fa-flag';
      }
      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber) {
        modelNode.icon = 'fa-solid fa-wand-magic';
      }

      if ((node.odysseyModelNode.NodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
        modelNode.icon = 'fa-solid fa-burst';
      }

      modelGroup.nodeList.push(modelNode); 
    }
    nodeList.push(modelGroup);

    this.$nodeTreeEle.html(
      this.buildNodeList(nodeList)
    );

    $('li.link', this.$nodeTreeEle).off('click').on('click', (e: any) => {
      e.preventDefault();
      if(this.tab.model.nodes.has(e.target.dataset.node)){
        this.select(this.tab.model.nodes.get(e.target.dataset.node));
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
          let icon = node.icon ? node.icon : 'glyphicon glyphicon-star';
          str += '<li><input type="checkbox" checked id="list-'+this.treeIndex+'"><label for="list-'+(this.treeIndex++)+'"><i class="'+icon+'"></i>'+node.name+'</label><span></span><ul>';
          for(let i = 0; i < node.nodeList.length; i++){
            str += this.buildNodeList(node.nodeList[i], true);
          }
          str += '</ul></li>';
        }
      }else{
        let icon = node.icon ? node.icon : 'glyphicon glyphicon-star';
        str += '<li class="link" data-node="'+node.name+'"><i class="'+icon+'"></i>'+node.name+'</li>';
      }
    }

    return str;
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
    (this.tab.selectionBox as any).object = this.selected;
    this.tab.selectionBox.visible = true;
    this.tab.selectionBox.update();

    console.log(this.tab.selectionBox);

    if(this.selected instanceof THREE.Mesh){
      this.$selected_object.show();
      this.$input_name.val((this.selected as any).odysseyModelNode.name);
      this.$input_texture.val((this.selected as any).odysseyModelNode.TextureMap1);
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

    //let centerX = this.tab.selectionBox.geometry.boundingSphere.center.x;
    //let centerY = this.tab.selectionBox.geometry.boundingSphere.center.y;
    //let centerZ = this.tab.selectionBox.geometry.boundingSphere.center.z;

    //console.log(this.editor.axes, centerX, centerY, centerZ);

    //this.editor.axes.position.set(centerX, centerY, centerZ);
    //this.editor.axes.visible = true;

    //this.signals.objectSelected.dispatch( object );
  }

}