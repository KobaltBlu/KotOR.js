import React from "react";
import * as THREE from 'three';

import { TabWOKEditor } from "@/apps/forge/components/tabs/tab-wok-editor/TabWOKEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { CameraFocusMode, UI3DRenderer, UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export enum TabWOKEditorControlMode {
  FACE = 0,
  VERTEX = 1,
  EDGE = 2,
}

/**
 * Get the complementary color of a given hex color
 * @param hexColor
 * @returns
 */
const getComplementaryColor = (hexColor: number) => {
  // Extract RGB components from packed hex color
  const r = (hexColor >> 16) & 0xff;
  const g = (hexColor >> 8) & 0xff;
  const b = hexColor & 0xff;

  // Invert each channel
  const invertedR = 255 - r;
  const invertedG = 255 - g;
  const invertedB = 255 - b;

  // Combine back into packed RGB number
  const complementary = (invertedR << 16) | (invertedG << 8) | invertedB;

  return complementary;
}

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

  box3: THREE.Box3 = new THREE.Box3();
  center: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(options: BaseTabStateOptions = {}){
    log.trace("TabWOKEditorState constructor entry");
    super(options);

    log.trace("TabWOKEditorState constructor ground");
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );

    const grid1 = new THREE.GridHelper( 250, 26, 0x00FF00 );
    grid1.rotation.x = -Math.PI / 2;

    // center line
    const grid2 = new THREE.GridHelper( 250, 2, 0xFF0000 );
    grid2.rotation.x = -Math.PI / 2;
    // (grid2.material as THREE.Material).depthFunc = THREE.AlwaysDepth;

    (grid2.material as THREE.Material).onBeforeCompile = function ( shader ) {
      // Emulate GL_POLYGON_OFFSET_LINE
      shader.vertexShader = shader.vertexShader.replace( '<worldpos_vertex>', '<worldpos_vertex>\ngl_Position.z -= 0.0001;' );
    };


    this.faceHelperGeometry = new THREE.BufferGeometry();
    this.faceHelperGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));

    this.faceHelperMaterial = new THREE.MeshBasicMaterial();
    this.faceHelperMaterial.wireframe = true;
    this.faceHelperMaterial.visible = false;
    this.faceHelperMesh = new THREE.Mesh(this.faceHelperGeometry, this.faceHelperMaterial)

    log.trace("TabWOKEditorState constructor UI3DRenderer");
    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', (delta: number) => this.animate(delta));
    this.ui3DRenderer.scene.add(grid1);
    this.ui3DRenderer.scene.add(grid2);
    this.ui3DRenderer.scene.add(this.faceHelperMesh);
    this.ui3DRenderer.group.light_helpers.visible = false;
    this.ui3DRenderer.setCameraFocusMode(CameraFocusMode.SELECTABLE);
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onSelect', (intersect: THREE.Intersection) => this.onSelect(intersect));
    log.debug("TabWOKEditorState constructor scene configured");

    this.setContentView(<TabWOKEditor tab={this}></TabWOKEditor>);
    log.trace("TabWOKEditorState constructor setContentView");
    this.openFile();
    log.trace("TabWOKEditorState constructor exit");

    this.saveTypes = [
      {
        description: 'Odyssey Walk Mesh File',
        accept: {
          'application/octet-stream': ['.wok']
        }
      },
      {
        description: 'Odyssey Door Walk Mesh File',
        accept: {
          'application/octet-stream': ['.dwk']
        }
      },
      {
        description: 'Odyssey Placeable Walk Mesh File',
        accept: {
          'application/octet-stream': ['.pwk']
        }
      }
    ];

    this.addEventListener('onKeyUp', (_e: KeyboardEvent) => {

    });
  }

  public openFile(file?: EditorFile){
    log.trace("TabWOKEditorState openFile entry", file?.getFilename?.() ?? String(file));
    return new Promise<KotOR.OdysseyWalkMesh>( (resolve, _reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
        log.trace("TabWOKEditorState openFile using this.file");
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        log.debug("TabWOKEditorState openFile tabName", this.tabName);

        log.trace("TabWOKEditorState openFile readFile");
        file.readFile().then( (response) => {
          log.debug('TabWOKEditorState file.readFile response buffer length', response.buffer?.length ?? 0);
          this.wok = new KotOR.OdysseyWalkMesh(new KotOR.BinaryReader(response.buffer));
          log.trace("TabWOKEditorState openFile OdysseyWalkMesh created");
          this.wok.material.visible = true;
          this.wok.material.side = THREE.DoubleSide;
          this.wok.material.opacity = 0.75;
          this.wok.material.transparent = true;
          this.ui3DRenderer.selectable.add(this.wok.mesh);



          this.wireMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true, wireframeLinewidth: 2 } );
          this.wireframe = new THREE.Mesh(this.wok.geometry, this.wireMaterial);
          this.ui3DRenderer.unselectable.add(this.wireframe);
          this.ui3DRenderer.selectable.add(this.vertexHelpersGroup);

          /**
           * Center the mesh and wireframe if the walkmesh type is AABB
           */
          if(this.wok.header.walkMeshType == KotOR.OdysseyWalkMeshType.AABB){
            log.trace("TabWOKEditorState openFile AABB center");
            this.wok.box.getCenter(this.center);
            this.center.z = this.wok.getMinZ();
            this.wok.mesh.position.sub(this.center);
            this.wireframe.position.sub(this.center);
          } else {
            log.trace("TabWOKEditorState openFile not AABB");
          }

          log.trace("TabWOKEditorState openFile building edge arrows");
          const arrowPosition = new THREE.Vector3();
          this.wok.edges.forEach( (edge) => {
            arrowPosition.copy(edge.center_point).sub(this.center);
            const arrowHelper = new THREE.ArrowHelper( edge.normal, arrowPosition, 0.5, getComplementaryColor(edge.face.color.getHex()) );
            arrowHelper.layers.set(2);
            this.ui3DRenderer.unselectable.add(arrowHelper);
          });
          this.buildVertexHelpers();
          log.trace("TabWOKEditorState openFile vertex helpers built");

          this.processEventListener('onEditorFileLoad', [this]);
          log.info("TabWOKEditorState openFile loaded");
          resolve(this.wok);
        });
      } else {
        log.trace("TabWOKEditorState openFile file not EditorFile");
      }
    });
  }

  onSelect(intersect: THREE.Intersection){
    log.trace("TabWOKEditorState onSelect entry", "controlMode=%s", this.controlMode);
    this.ui3DRenderer.selectionBox.visible = false;

    switch(this.controlMode){
      case TabWOKEditorControlMode.FACE:
        log.trace("TabWOKEditorState onSelect FACE mode");
        if(intersect && intersect.face){
          if(intersect.object == this.wok.mesh){
            const f_idx = Math.floor(intersect.face.a / 3);
            log.debug("TabWOKEditorState onSelect face index", f_idx);
            const face: KotOR.OdysseyFace3 = this.wok.faces.find( (f: KotOR.OdysseyFace3, index: number) => index == f_idx ) as KotOR.OdysseyFace3;
            this.selectFace(face);
          }else{
            log.trace("TabWOKEditorState onSelect object not wok.mesh");
            this.selectFace(undefined);
          }
        }else{
          log.trace("TabWOKEditorState onSelect no intersect/face");
          this.selectFace(undefined);
        }
      break;
      case TabWOKEditorControlMode.VERTEX:
        log.trace("TabWOKEditorState onSelect VERTEX mode");
        if(intersect && intersect.object){
          if(intersect.object != this.wok.mesh){
            const helperIndex = this.vertexHelpersGroup.children.indexOf(intersect.object);
            log.trace("TabWOKEditorState onSelect helperIndex", helperIndex);
            if(helperIndex >= 0) this.selectVertex(helperIndex);
          }else{
            log.trace("TabWOKEditorState onSelect wok.mesh selectVertex -1");
            this.selectVertex(-1);
          }
        }else{
          log.trace("TabWOKEditorState onSelect no intersect selectVertex -1");
          this.selectVertex(-1);
        }
      break;
      default:
        log.trace("TabWOKEditorState onSelect default case");
    }
    log.trace("TabWOKEditorState onSelect exit");
  }

  setControlMode(mode: TabWOKEditorControlMode = 0) {
    log.trace("TabWOKEditorState setControlMode", mode);
    this.controlMode = mode;
    this.processEventListener('onControlModeChange', [mode]);
    log.trace("TabWOKEditorState setControlMode done");
  }

  private updateCameraFocus(): void {
    log.trace("TabWOKEditorState updateCameraFocus entry");
    this.box3 = new THREE.Box3();
    if(!this.wok) {
      log.trace("TabWOKEditorState updateCameraFocus no wok");
      return;
    }
    this.box3.setFromObject(this.wok.mesh);
    this.box3.getCenter(this.center);
    this.ui3DRenderer.orbitControls.target.copy(this.center);
    log.trace("TabWOKEditorState updateCameraFocus done");
  }

  show(): void {
    log.trace("TabWOKEditorState show entry");
    super.show();
    this.ui3DRenderer.enabled = true;
    this.updateCameraFocus();
    this.ui3DRenderer.render();
    log.trace("TabWOKEditorState show exit");
  }

  hide(): void {
    log.trace("TabWOKEditorState hide entry");
    super.hide();
    this.ui3DRenderer.enabled = false;
    log.trace("TabWOKEditorState hide exit");
  }

  animate(delta: number = 0){
    log.trace("TabWOKEditorState animate", "delta=%s controlMode=%s", delta, this.controlMode);

    this.vertexHelpersGroup.visible = false;
    (this.ui3DRenderer.transformControls as unknown as THREE.Object3D).visible = false;
    this.faceHelperMesh.visible = false;

    switch(this.controlMode){
      case TabWOKEditorControlMode.FACE:
        log.trace("TabWOKEditorState animate FACE");
        this.selectVertex(-1);
      break;
      case TabWOKEditorControlMode.VERTEX: {
        log.trace("TabWOKEditorState animate VERTEX");
        this.selectFace(undefined);
        this.vertexHelpersGroup.visible = true;

        const tc = this.ui3DRenderer.transformControls as unknown as THREE.Object3D;
        if(!(this.ui3DRenderer.transformControls as { object: unknown }).object)
          tc.visible = false;
        else
          tc.visible = true;

        const selectedVertex = this.wok.vertices[this.selectedVertexIndex];
        if(selectedVertex){
          log.trace("TabWOKEditorState animate selectedVertex", this.selectedVertexIndex);
          const selectedVertexHelper = this.vertexHelpers[this.selectedVertexIndex];
          const vertexNeedsUpdate = (
            !selectedVertexHelper.position.equals(selectedVertex)
          );
          if(vertexNeedsUpdate){
            log.trace("TabWOKEditorState animate vertexNeedsUpdate");
            const position = this.wok.geometry.attributes.position as THREE.BufferAttribute;
            selectedVertex.copy(selectedVertexHelper.position);
            for(let i = 0; i < this.wok.faces.length; i++){
              const face = this.wok.faces[i];
              if(face.a == this.selectedVertexIndex){
                position.setX( (i * 3) + 0, selectedVertex.x + this.center.x);
                position.setY( (i * 3) + 0, selectedVertex.y + this.center.y);
                position.setZ( (i * 3) + 0, selectedVertex.z + this.center.z);
              }

              if(face.b == this.selectedVertexIndex){
                position.setX( (i * 3) + 1, selectedVertex.x + this.center.x);
                position.setY( (i * 3) + 1, selectedVertex.y + this.center.y);
                position.setZ( (i * 3) + 1, selectedVertex.z + this.center.z);
              }

              if(face.c == this.selectedVertexIndex){
                position.setX( (i * 3) + 2, selectedVertex.x + this.center.x);
                position.setY( (i * 3) + 2, selectedVertex.y + this.center.y);
                position.setZ( (i * 3) + 2, selectedVertex.z + this.center.z);
              }
            }
            position.needsUpdate = true;
          }
        } else {
          log.trace("TabWOKEditorState animate no selectedVertex");
        }

      break;
      }
      case TabWOKEditorControlMode.EDGE:
        log.trace("TabWOKEditorState animate EDGE (no-op)");
      break;
    }
    log.trace("TabWOKEditorState animate exit");
  }

  buildVertexHelpers(){
    log.trace("TabWOKEditorState buildVertexHelpers entry");
    while(this.vertexHelpers.length){
      const helper = this.vertexHelpers.splice(this.vertexHelpers.length - 1, 1)[0];
      helper.removeFromParent();
      log.trace("TabWOKEditorState buildVertexHelpers removed");
    }
    log.debug("TabWOKEditorState buildVertexHelpers vertex count", this.wok.vertices.length);
    for(let i = 0; i < this.wok.vertices.length; i++){
      const helper = new THREE.Mesh(this.vertexHelperGeometry, new THREE.MeshBasicMaterial({color: 0x000000}));
      this.vertexHelpers.push(helper);
      this.vertexHelpersGroup.add(helper);
    }
    this.alignVertexHelpers();
    log.trace("TabWOKEditorState buildVertexHelpers exit");
  }

  alignVertexHelpers(){
    log.trace("TabWOKEditorState alignVertexHelpers entry");
    for(let i = 0; i < this.wok.vertices.length; i++){
      const vertex = this.wok.vertices[i];
      const helper = this.vertexHelpers[i];
      helper.position.copy(vertex).sub(this.center);
      helper.scale.setScalar(this.vertexHelperSize);
    }
    log.trace("TabWOKEditorState alignVertexHelpers exit");
  }

  resetFaceColors(){
    log.trace("TabWOKEditorState resetFaceColors entry");
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
    log.trace("TabWOKEditorState resetFaceColors exit");
  }

  selectFace(face?: KotOR.OdysseyFace3){
    log.trace("TabWOKEditorState selectFace entry", !!face);
    this.resetFaceColors();
    this.selectedFaceIndex = -1;
    if(face){
      log.debug("TabWOKEditorState selectFace index", this.wok.faces.indexOf(face));
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
    log.trace("TabWOKEditorState selectFace exit");
  }

  selectVertex(index: number = -1){
    log.trace("TabWOKEditorState selectVertex", index);
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
    log.trace("TabWOKEditorState selectVertex exit");
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace("TabWOKEditorState getExportBuffer entry");
    const buf = this.wok.toExportBuffer();
    log.trace("TabWOKEditorState getExportBuffer length", buf?.length);
    return buf;
  }

}
