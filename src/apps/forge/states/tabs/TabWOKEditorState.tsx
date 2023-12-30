import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { UI3DRenderer } from "../../UI3DRenderer";
import { TabWOKEditor } from "../../components/tabs/TabWOKEditor";

export enum TabWOKEditorControlMode {
  FACE = 0,
  VERTEX = 1,
  EDGE = 2,
};

export class TabWOKEditorState extends TabState {
  tabName: string = `WOK`;

  ui3DRenderer: UI3DRenderer;
  wok: KotOR.OdysseyWalkMesh;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<THREE.WireframeGeometry<THREE.PlaneGeometry>, THREE.LineBasicMaterial>;
  faceHelperMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  faceHelperGeometry: THREE.BufferGeometry;
  faceHelperMaterial: THREE.MeshBasicMaterial;
  wireMaterial: THREE.MeshBasicMaterial;
  wireframe: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  selectColor = new THREE.Color(0x607D8B);

  vertexHelperGeometry = new THREE.BoxGeometry(1, 1, 1, 1, 1);
  vertexHelpersGroup: THREE.Group = new THREE.Group();
  vertexHelpers: THREE.Mesh[] = [];
  vertexHelperSize: number = 0.125;

  controlMode: TabWOKEditorControlMode = TabWOKEditorControlMode.FACE;

  selectedFaceIndex: number = -1;
  selectedVertexIndex: number = -1;
  selectedEdgeIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );

    this.faceHelperGeometry = new THREE.BufferGeometry();
    this.faceHelperGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));

    this.faceHelperMaterial = new THREE.MeshBasicMaterial();
    this.faceHelperMaterial.wireframe = true;
    this.faceHelperMaterial.visible = false;
    this.faceHelperMesh = new THREE.Mesh(this.faceHelperGeometry, this.faceHelperMaterial)

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.controlsEnabled = true;
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.scene.add(this.groundMesh);
    this.ui3DRenderer.scene.add(this.faceHelperMesh);
    
    this.ui3DRenderer.controls.attachEventListener('onSelect', (intersect: THREE.Intersection) => {
      this.ui3DRenderer.selectionBox.visible = false;

      switch(this.controlMode){
        case TabWOKEditorControlMode.FACE:
          if(intersect && intersect.face){
            if(intersect.object == this.wok.mesh){
              const f_idx = Math.floor(intersect.face.a / 3);
              const face: KotOR.OdysseyFace3 = this.wok.faces.find( (f: KotOR.OdysseyFace3, index: number) => index == f_idx ) as KotOR.OdysseyFace3;
              this.selectFace(face);
            }else{
              this.selectFace(undefined);
            }
          }else{
            this.selectFace(undefined);
          }
        break;
        case TabWOKEditorControlMode.VERTEX:
          if(intersect && intersect.object){
            if(intersect.object != this.wok.mesh){
              const helperIndex = this.vertexHelpersGroup.children.indexOf(intersect.object);
              if(helperIndex >= 0) this.selectVertex(helperIndex);
            }else{
              this.selectVertex(-1);
            }
          }else{
            this.selectVertex(-1);
          }
        break;
      }
    })

    this.setContentView(<TabWOKEditor tab={this}></TabWOKEditor>);
    this.openFile();
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.OdysseyWalkMesh>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          console.log(response.buffer);
          this.wok = new KotOR.OdysseyWalkMesh(new KotOR.BinaryReader(response.buffer));
          this.wok.material.visible = true;
          this.wok.material.side = THREE.DoubleSide;
          this.ui3DRenderer.selectable.add(this.wok.mesh);

          this.wireMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } );
          this.wireframe = new THREE.Mesh(this.wok.geometry, this.wireMaterial);
          this.ui3DRenderer.unselectable.add(this.wireframe);
          this.ui3DRenderer.selectable.add(this.vertexHelpersGroup);
          this.buildVertexHelpers();
          this.recenterCamera();

          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.wok);
        });
      }
    });
  }

  setControlMode(mode: TabWOKEditorControlMode = 0) {
    this.controlMode = mode;
    this.processEventListener('onControlModeChange', [mode]);
  }

  updateCameraFocus(){
    // if(!this.modulePlaceable || !this.modulePlaceable?.model) return;

    // this.modulePlaceable.container.position.set(0, 0, 0);

    // let center = new THREE.Vector3();
    // this.modulePlaceable.box.getCenter(center);

    // let size = new THREE.Vector3();
    // this.modulePlaceable.box.getSize(size);

    // //Center the object to 0
    // let origin = new THREE.Vector3();
    // this.modulePlaceable.container.position.set(-center.x, -center.y, -center.z);
    // this.ui3DRenderer.camera.position.z = 0;
    // this.ui3DRenderer.camera.position.y = size.x + size.y;
    // this.ui3DRenderer.camera.lookAt(origin)
  }

  recenterCamera(){
    const lookAt = this.wok.vertices.reduce( (acc, value) => {
      return acc.add(value)
    }, new THREE.Vector3);
    lookAt.divideScalar(this.wok.vertices.length);
    // this.ui3DRenderer.controls.lookAt(lookAt);
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

    this.vertexHelpersGroup.visible = false;
    this.ui3DRenderer.transformControls.visible = false;
    this.faceHelperMesh.visible = false;

    switch(this.controlMode){
      case TabWOKEditorControlMode.FACE:
        this.selectVertex(-1);


      break;
      case TabWOKEditorControlMode.VERTEX:
        this.selectFace(undefined);
        this.vertexHelpersGroup.visible = true;

        if(!this.ui3DRenderer.transformControls.object)
          this.ui3DRenderer.transformControls.visible = false;
        else
          this.ui3DRenderer.transformControls.visible = true;

        const selectedVertex = this.wok.vertices[this.selectedVertexIndex];
        if(selectedVertex){
          const selectedVertexHelper = this.vertexHelpers[this.selectedVertexIndex];
          const vertexNeedsUpdate = (
            !selectedVertexHelper.position.equals(selectedVertex)
          )
          if(vertexNeedsUpdate){
            const position = this.wok.geometry.attributes.position as THREE.BufferAttribute;
            selectedVertex.copy(selectedVertexHelper.position);
            for(let i = 0; i < this.wok.faces.length; i++){
              const face = this.wok.faces[i];
              if(face.a == this.selectedVertexIndex){
                position.setX( (i * 3) + 0, selectedVertex.x);
                position.setY( (i * 3) + 0, selectedVertex.y);
                position.setZ( (i * 3) + 0, selectedVertex.z);
              }

              if(face.b == this.selectedVertexIndex){
                position.setX( (i * 3) + 1, selectedVertex.x);
                position.setY( (i * 3) + 1, selectedVertex.y);
                position.setZ( (i * 3) + 1, selectedVertex.z);
              }

              if(face.c == this.selectedVertexIndex){
                position.setX( (i * 3) + 2, selectedVertex.x);
                position.setY( (i * 3) + 2, selectedVertex.y);
                position.setZ( (i * 3) + 2, selectedVertex.z);
              }
            }
            position.needsUpdate = true;
          }

        }

      break;
      case TabWOKEditorControlMode.EDGE:

      break;
    }
    
  }

  buildVertexHelpers(){
    while(this.vertexHelpers.length){
      const helper = this.vertexHelpers.splice(this.alignVertexHelpers.length-1, 1)[0];
      helper.removeFromParent();
    }
    for(let i = 0; i < this.wok.vertices.length; i++){
      const helper = new THREE.Mesh(this.vertexHelperGeometry, new THREE.MeshBasicMaterial({color: 0x000000}));
      this.vertexHelpers.push(helper);
      this.vertexHelpersGroup.add(helper);
    }
    this.alignVertexHelpers();
  }

  alignVertexHelpers(){
    for(let i = 0; i < this.wok.vertices.length; i++){
      const vertex = this.wok.vertices[i];
      const helper = this.vertexHelpers[i];
      helper.position.copy(vertex);
      helper.scale.setScalar(this.vertexHelperSize);
    }
  }

  resetFaceColors(){
    const color = this.wok.geometry.attributes.color as THREE.BufferAttribute;
    for(let i = 0; i < this.wok.faces.length; i++){
      const face = this.wok.faces[i];
      const index = i * 3;
      color.setX(index, face.color.r);
      color.setY(index, face.color.g);
      color.setZ(index, face.color.b);
      
      color.setX(index + 1, face.color.r);
      color.setY(index + 1, face.color.g);
      color.setZ(index + 1, face.color.b);
      
      color.setX(index + 2, face.color.r);
      color.setY(index + 2, face.color.g);
      color.setZ(index + 2, face.color.b);
    }
    color.needsUpdate = true;
  }

  selectFace(face?: KotOR.OdysseyFace3){
    this.resetFaceColors();
    this.selectedFaceIndex = -1;
    if(face){
      const position = this.wok.geometry.attributes.position as THREE.BufferAttribute;
      const h_position = this.faceHelperGeometry.attributes.position as THREE.BufferAttribute;
      const color = this.wok.geometry.attributes.color as THREE.BufferAttribute;
      this.selectedFaceIndex = this.wok.faces.indexOf(face);
      const index = this.selectedFaceIndex * 3;
      color.setX(index, this.selectColor.r);
      color.setY(index, this.selectColor.g);
      color.setZ(index, this.selectColor.b);
      
      color.setX(index + 1, this.selectColor.r);
      color.setY(index + 1, this.selectColor.g);
      color.setZ(index + 1, this.selectColor.b);
      
      color.setX(index + 2, this.selectColor.r);
      color.setY(index + 2, this.selectColor.g);
      color.setZ(index + 2, this.selectColor.b);

      h_position.setX(0, position.getX(index) );
      h_position.setY(0, position.getY(index) );
      h_position.setZ(0, position.getZ(index) );

      h_position.setX(1, position.getX(index + 1) );
      h_position.setY(1, position.getY(index + 1) );
      h_position.setZ(1, position.getZ(index + 1) );

      h_position.setX(2, position.getX(index + 2) );
      h_position.setY(2, position.getY(index + 2) );
      h_position.setZ(2, position.getZ(index + 2) );

      h_position.needsUpdate = true;
      this.faceHelperGeometry.computeBoundingSphere();
      this.faceHelperMaterial.visible = false;
      color.needsUpdate = true;
      this.ui3DRenderer.transformControls.detach();
    }
    this.processEventListener('onFaceSelected', [face]);
  }

  selectVertex(index: number = -1){
    this.selectedVertexIndex = index;
    this.ui3DRenderer.transformControls.detach();
    for(let i = 0; i < this.vertexHelpersGroup.children.length; i++){
      const helper = this.vertexHelpersGroup.children[i] as THREE.Mesh;
      const material = helper.material as THREE.MeshBasicMaterial;
      if(i == index){
        material.color.setHex(0xFFFFFF);
        this.ui3DRenderer.transformControls.attach(helper);
        this.ui3DRenderer.transformControls.size = 0.5;
      }else{
        material.color.setHex(0x000000);
      }
    }
  }

  getExportBuffer(): Buffer {
    const buffer = this.wok.toExportBuffer();
    return buffer;
  }

}
