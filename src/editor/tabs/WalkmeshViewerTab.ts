import Ractive from "ractive";
import * as THREE from "three";
import { BinaryReader } from "../../BinaryReader";
import { GameState } from "../../GameState";
import { OdysseyWalkMesh } from "../../odyssey";
import { EditorFile } from "../EditorFile";
import { EditorTab } from "./";
import { ModelViewerControls } from "../ModelViewerControls";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { UI3DRenderer } from "../UI3DRenderer";

export class WalkmeshViewerTab extends EditorTab {
  animLoop: boolean;
  deltaTime: number;

  referenceNode: THREE.Object3D<THREE.Event>;
  clock: THREE.Clock = new THREE.Clock();
  cameraMode: any;
  CameraMode: { EDITOR: number; STATIC: number; ANIMATED: number; };
  selectable: THREE.Group;
  unselectable: THREE.Group;

  $controls: JQuery<HTMLElement>;
  selectionBox: any;
  controls: ModelViewerControls;
  $ui_selected: JQuery<HTMLElement>;
  data: any;
  // file: EditorFile;
  ractive: any;
  mousePosition: THREE.Vector2;
  mouseMoveEvent: Function;
  mouseDownEvent: Function;
  mouseUpEvent: Function;
  model: OdysseyWalkMesh;
  wireMaterial: THREE.MeshBasicMaterial;
  wireframe: THREE.Mesh<any, any>;
  hit: THREE.Intersection<THREE.Object3D<THREE.Event>>[];
  selectedFace: any;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<any, any>;
  renderComponent: UI3DRenderer;
  
  constructor(file: EditorFile, isLocal = false){
    super();
    this.animLoop = false;
    this.deltaTime = 0;
    console.log('Walkmesh Viewer');
    $('a', this.$tab).text('Walkmesh Viewer');

    this.renderComponent = new UI3DRenderer({
      width: this.$tabContent.innerWidth(),
      height: this.$tabContent.innerHeight(),
    });

    this.referenceNode = new THREE.Object3D();

    this.clock = new THREE.Clock();

    this.selectable = new THREE.Group();
    this.unselectable = new THREE.Group();

    this.renderComponent.scene.add(this.selectable);
    this.renderComponent.scene.add(this.unselectable);
    this.renderComponent.scene.add(this.referenceNode);

    this.CameraMode = {
      EDITOR: 0,
      STATIC: 1,
      ANIMATED: 2
    };

    this.$controls = $('<div style="position: absolute; top: 25px; right: 25px; z-index:1000; height: auto!important;" />');

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

    this.$tabContent.append($(this.renderComponent.stats.dom));
    this.$tabContent.append(this.renderComponent.$canvas);
    this.$tabContent.append(this.$controls);

    this.$ui_selected = $('<div style="position: absolute; top: 0; right: 0; bottom: 0;" />');

    this.$ui_selected.windowPane({
      title: 'Walkmesh Viewer Tools'
    });

    this.$tabContent.append(this.$ui_selected);


    this.data = new Uint8Array(0);
    this.file = file;

    //Variables
    this.data = {
      walkmesh: undefined,
      selectedFace: undefined
    };

    this.ractive = new Ractive({
      target: $('.windowpane-content', this.$ui_selected)[0],
      template: `
      {{#if selectedFace}}
        <div class="section-header first">Selected Face</div>
        <b>Face Index:</b> {{walkmesh.faces.indexOf(selectedFace)}}<br>
        <b>Walk Type:</b> {{selectedFace.walkIndex}}
        
        {{#if selectedFace.adjacent}}
          <div class="section-header">Adjacent Faces</div>
          <b>a:</b> {{selectedFace.adjacent[0]}}, 
          <b>b:</b> {{selectedFace.adjacent[1]}}, 
          <b>c:</b> {{selectedFace.adjacent[2]}}
        {{/if}}

        {{#if selectedFace.surfacemat}}
          <div class="section-header">Surface Material: {{selectedFace.surfacemat.label}}</div>
          <b>Index:</b> {{selectedFace.surfacemat.__index}}, <br>
          <b>Walkable:</b> {{selectedFace.surfacemat.walk}}, <br>
          <b>Blocks LOS:</b> {{selectedFace.surfacemat.lineofsight}}, <br>
          <b>Grass:</b> {{selectedFace.surfacemat.grass}}, <br>
          <b>Sound:</b> {{selectedFace.surfacemat.sound}},
        {{/if}}

      {{/if}}
      `,
      data: this.data,
      on: {}
    });

    this.BuildGround();
    this.OpenFile(file);

    // Get mouse position
    this.mousePosition = new THREE.Vector2(1,1);
    this.mouseMoveEvent = (e: any) => {
      this.mousePosition.x = ((e.clientX - this.renderComponent.$canvas.offset().left) / this.renderComponent.canvas.width) * 2 - 1;
      this.mousePosition.y = -((e.clientY - this.renderComponent.$canvas.offset().top) / this.renderComponent.canvas.height) * 2 + 1;
    };
    this.mouseDownEvent = (e: any) => {

    };
    this.mouseUpEvent = (e: any) => {
      this.onMouseUp(e);
    };
    //@ts-expect-error
    document.addEventListener('mousemove', this.mouseMoveEvent);
    this.renderComponent.canvas.addEventListener('mouseup', this.mouseUpEvent);
    this.renderComponent.canvas.addEventListener('mousedown', this.mouseDownEvent);

  }

  OpenFile(file: EditorFile){

    console.log('Walkmesh Loading', file);

    if(file instanceof EditorFile){

      file.readFile( (buffer: Buffer) => {
        try{
          let wok = new OdysseyWalkMesh(new BinaryReader(buffer));
          this.ractive.set('walkmesh', wok);

          try{
            this.$tabName.text(file.getFilename());
          }catch(e){}

          this.model = wok;
          this.selectable.add(this.model.mesh);
          //this.model.mesh.position.set(0, 0, 0);
          (this.model.mesh.material as THREE.ShaderMaterial).visible = true;

          this.wireMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } );
          this.wireframe = new THREE.Mesh(this.model.geometry, this.wireMaterial);
          this.unselectable.add(this.wireframe);

          this.onResize();
          this.Render();

          setTimeout( () => {
            let center = this.model.box.getCenter(new THREE.Vector3());
            if(!isNaN(center.length())){
              //Center the object to 0
              this.model.mesh.position.set(-center.x, -center.y, 0);
              this.wireframe.position.set(-center.x, -center.y, 0);
              //Stand the object on the floor by adding half it's height back to it's position
              //model.position.z += model.box.getSize(new THREE.Vector3()).z/2;
            }else{
              //this.model.mesh.position.set(0, 0, 0);
            }
          }, 10);
        }
        catch (e) {
          console.error(e);
          this.Remove();
        }
      });

    }    

  }

  onResize() {
    super.onResize();
    try{
      this.renderComponent.camera.aspect = this.$tabContent.innerWidth() / this.$tabContent.innerHeight();
      this.renderComponent.camera.updateProjectionMatrix();
      this.renderComponent.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
      this.renderComponent.depthTarget.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
    }catch(e){
      console.error(e);
    }
  }

  onDestroy() {
    super.onDestroy();
    document.removeEventListener('mousemove', this.mouseMoveEvent as any);
    this.renderComponent.canvas.removeEventListener('mouseup', this.mouseUpEvent);
    this.renderComponent.canvas.removeEventListener('mousedown', this.mouseDownEvent);
  }

  Render(){
    requestAnimationFrame( () => { this.Render(); } );
    if(!this.visible)
      return;

    this.selectionBox.update();

    let delta = this.clock.getDelta();
    this.controls.Update(delta);
    this.deltaTime += delta;

    this.renderComponent.Render();
  }

  onMouseUp(e: any){
    if(e.button == 0){
      // let face = undefined;
      // for (let i = 0, len = this.model.geometry.faces.length; i < len; i++) {
      //   face = this.model.geometry.faces[i];
      //   face.color.copy((OdysseyWalkMesh.TILECOLORS[face.walkIndex] || OdysseyWalkMesh.TILECOLORS[0]));
      // }
      
      // // Raycasting
      // GameState.raycaster.setFromCamera(this.mousePosition, this.currentCamera);
      // this.hit = GameState.raycaster.intersectObjects(this.model.mesh.parent.children);
      // if (this.hit.length > 0) {
      //   this.selectedFace = this.hit[0].face;
      //   this.hit[0].face.color.setHex(0x607D8B);
      //   this.ractive.set('selectedFace', this.selectedFace);
      // }else{
      //   this.ractive.set('selectedFace', undefined);
      // }

      // this.model.mesh.geometry.colorsNeedUpdate = true;
    }
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
