import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { CameraFocusMode, UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import { TabWOKEditor } from "../../components/tabs/tab-wok-editor/TabWOKEditor";

export enum TabWOKEditorControlMode {
  FACE = 0,
  VERTEX = 1,
  EDGE = 2,
  PAINT = 3,
};

/**
 * Get the complementary color of a given hex color
 * @param hexColor 
 * @returns 
 */
const getComplementaryColor = (hexColor: number) => {
  // Extract RGB components from 0xRRGGBB
  const r = (hexColor >> 16) & 0xff;
  const g = (hexColor >> 8) & 0xff;
  const b = hexColor & 0xff;

  // Invert each channel
  const invertedR = 255 - r;
  const invertedG = 255 - g;
  const invertedB = 255 - b;

  // Combine back into a 0xRRGGBB number
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

  edgeHelperGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 6);
  edgeHelpersGroup: THREE.Group = new THREE.Group();
  edgeHelpers: THREE.Mesh[] = [];
  edgeIndexByHelper: Map<THREE.Mesh, number> = new Map();
  edgeNormalHelpersGroup: THREE.Group = new THREE.Group();
  faceNormalHelpersGroup: THREE.Group = new THREE.Group();

  controlMode: TabWOKEditorControlMode = TabWOKEditorControlMode.FACE;

  paintWalkIndex: number = 0;
  wireframeVisible: boolean = true;
  edgeNormalHelpersVisible: boolean = true;
  faceNormalHelpersVisible: boolean = false;

  selectedFaceIndex: number = -1;
  selectedVertexIndex: number = -1;
  selectedEdgeIndex: number = -1;

  box3: THREE.Box3 = new THREE.Box3();
  center: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    
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

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.scene.add(grid1);
    this.ui3DRenderer.scene.add(grid2);
    this.ui3DRenderer.scene.add(this.faceHelperMesh);
    this.ui3DRenderer.group.light_helpers.visible = false;
    this.ui3DRenderer.setCameraFocusMode(CameraFocusMode.SELECTABLE);
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onSelect', this.onSelect.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onMouseDown', this.onMouseDown.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onMouseMove', this.onMouseMove.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', this.syncPaintCursor.bind(this));

    this.setContentView(<TabWOKEditor tab={this}></TabWOKEditor>);
    this.openFile();

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

    this.addEventListener('onKeyUp', (e: KeyboardEvent) => {
      
    });
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
          this.wok.material.opacity = 0.75;
          this.wok.material.transparent = true;
          this.ui3DRenderer.selectable.add(this.wok.mesh);

          

          this.wireMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true, wireframeLinewidth: 1, depthTest: false } );
          this.wireframe = new THREE.Mesh(this.wok.geometry, this.wireMaterial);
          this.wireframe.visible = this.wireframeVisible;
          this.ui3DRenderer.unselectable.add(this.wireframe);
          this.ui3DRenderer.selectable.add(this.vertexHelpersGroup);
          this.ui3DRenderer.selectable.add(this.edgeHelpersGroup);

          /**
           * Center the mesh and wireframe if the walkmesh type is AABB
           */
          if(this.wok.header.walkMeshType == KotOR.OdysseyWalkMeshType.AABB){
            this.wok.box.getCenter(this.center);
            this.center.z = this.wok.getMinZ();
            this.wok.mesh.position.sub(this.center);
            this.wireframe.position.sub(this.center);
          }

          const arrowPosition = new THREE.Vector3();
          while (this.edgeNormalHelpersGroup.children.length) {
            this.edgeNormalHelpersGroup.remove(this.edgeNormalHelpersGroup.children[0]);
          }
          this.wok.edges.forEach( (edge, index) => {
            arrowPosition.copy(edge.center_point).sub(this.center);
            const arrowHelper = new THREE.ArrowHelper( edge.normal, arrowPosition, 0.5, getComplementaryColor(edge.face.color.getHex()) );
            arrowHelper.layers.set(2);
            this.edgeNormalHelpersGroup.add(arrowHelper);
          });
          this.edgeNormalHelpersGroup.visible = this.edgeNormalHelpersVisible;
          this.ui3DRenderer.unselectable.add(this.edgeNormalHelpersGroup);

          const faceArrowPosition = new THREE.Vector3();
          while (this.faceNormalHelpersGroup.children.length) {
            this.faceNormalHelpersGroup.remove(this.faceNormalHelpersGroup.children[0]);
          }
          this.wok.faces.forEach((face, index) => {
            faceArrowPosition.copy(face.centroid).sub(this.center);
            const arrowHelper = new THREE.ArrowHelper(face.normal, faceArrowPosition, 0.5, getComplementaryColor(face.color.getHex()));
            arrowHelper.layers.set(2);
            this.faceNormalHelpersGroup.add(arrowHelper);
          });
          this.faceNormalHelpersGroup.visible = this.faceNormalHelpersVisible;
          this.ui3DRenderer.unselectable.add(this.faceNormalHelpersGroup);

          this.buildVertexHelpers();
          this.buildEdgeHelpers();

          this.setControlMode(this.controlMode);

          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.wok);
        });
      }
    });
  }

  onSelect(object: THREE.Object3D | undefined){
    this.ui3DRenderer.selectionBox.visible = false;

    if(!this.wok) return;

    switch(this.controlMode){
      case TabWOKEditorControlMode.FACE:
        if(object === this.wok.mesh){
          // UI3DRenderer passes the object, not the intersection. Perform raycast to get face.
          this.ui3DRenderer.raycaster.setFromCamera(KotOR.Mouse.Vector, this.ui3DRenderer.camera);
          const intersects = this.ui3DRenderer.raycaster.intersectObject(this.wok.mesh);
          if(intersects.length && intersects[0].face){
            const face = intersects[0].face;
            const f_idx = Math.floor(face.a / 3);
            const odysseyFace: KotOR.OdysseyFace3 = this.wok.faces[f_idx];
            this.selectFace(odysseyFace);
          }else{
            this.selectFace(undefined);
          }
        }else{
          this.selectFace(undefined);
        }
      break;
      case TabWOKEditorControlMode.VERTEX:
        if(object && object !== this.wok.mesh){
          const helperIndex = this.vertexHelpersGroup.children.indexOf(object);
          if(helperIndex >= 0) this.selectVertex(helperIndex);
        }else{
          this.selectVertex(-1);
        }
      break;
      case TabWOKEditorControlMode.EDGE:
        if(object === this.wok.mesh){
          this.ui3DRenderer.raycaster.setFromCamera(KotOR.Mouse.Vector, this.ui3DRenderer.camera);
          const intersects = this.ui3DRenderer.raycaster.intersectObject(this.wok.mesh);
          if(intersects.length && intersects[0].point){
            const point = intersects[0].point;
            const face = intersects[0].face;
            const f_idx = Math.floor(face!.a / 3);
            const closestEdgeIndex = this.findClosestEdgeToPoint(point, f_idx);
            if(closestEdgeIndex >= 0) this.selectEdge(closestEdgeIndex);
            else this.selectEdge(-1);
          }else{
            this.selectEdge(-1);
          }
        }else if(object && this.edgeIndexByHelper.has(object as THREE.Mesh)){
          const edgeIndex = this.edgeIndexByHelper.get(object as THREE.Mesh)!;
          this.selectEdge(edgeIndex);
        }else{
          this.selectEdge(-1);
        }
      break;
      case TabWOKEditorControlMode.PAINT:
        break;
    }
  }

  setControlMode(mode: TabWOKEditorControlMode = 0) {
    this.controlMode = mode;
    this.ui3DRenderer.disableSelection = mode === TabWOKEditorControlMode.PAINT;
    this.syncPaintCursor();
    if (this.ui3DRenderer.orbitControls) {
      this.ui3DRenderer.orbitControls.enabled = mode !== TabWOKEditorControlMode.PAINT;
    }
    if (this.wok) {
      const sel = this.ui3DRenderer.selectable;
      const needsMesh = mode === TabWOKEditorControlMode.FACE || mode === TabWOKEditorControlMode.EDGE || mode === TabWOKEditorControlMode.PAINT;
      const needsVertexHelpers = mode === TabWOKEditorControlMode.VERTEX;
      const needsEdgeHelpers = mode === TabWOKEditorControlMode.EDGE;
      if (needsMesh && !sel.children.includes(this.wok.mesh)) sel.add(this.wok.mesh);
      if (!needsMesh && sel.children.includes(this.wok.mesh)) sel.remove(this.wok.mesh);
      if (needsVertexHelpers && !sel.children.includes(this.vertexHelpersGroup)) sel.add(this.vertexHelpersGroup);
      if (!needsVertexHelpers && sel.children.includes(this.vertexHelpersGroup)) sel.remove(this.vertexHelpersGroup);
      if (needsEdgeHelpers && !sel.children.includes(this.edgeHelpersGroup)) sel.add(this.edgeHelpersGroup);
      if (!needsEdgeHelpers && sel.children.includes(this.edgeHelpersGroup)) sel.remove(this.edgeHelpersGroup);
    }
    this.processEventListener('onControlModeChange', [mode]);
  }

  private syncPaintCursor(): void {
    if (this.ui3DRenderer.canvas) {
      this.ui3DRenderer.canvas.style.cursor = this.controlMode === TabWOKEditorControlMode.PAINT ? 'crosshair' : 'default';
    }
  }

  setPaintWalkIndex(walkIndex: number) {
    this.paintWalkIndex = walkIndex;
    this.processEventListener('onPaintWalkIndexChange', [walkIndex]);
  }

  setWireframeVisible(visible: boolean) {
    this.wireframeVisible = visible;
    if (this.wireframe) this.wireframe.visible = visible;
    this.processEventListener('onWireframeVisibilityChange', [visible]);
  }

  toggleWireframe() {
    this.setWireframeVisible(!this.wireframeVisible);
  }

  setEdgeNormalHelpersVisible(visible: boolean) {
    this.edgeNormalHelpersVisible = visible;
    this.edgeNormalHelpersGroup.visible = visible;
    this.processEventListener('onEdgeNormalHelpersVisibilityChange', [visible]);
  }

  toggleEdgeNormalHelpers() {
    this.setEdgeNormalHelpersVisible(!this.edgeNormalHelpersVisible);
  }

  setFaceNormalHelpersVisible(visible: boolean) {
    this.faceNormalHelpersVisible = visible;
    this.faceNormalHelpersGroup.visible = visible;
    this.processEventListener('onFaceNormalHelpersVisibilityChange', [visible]);
  }

  toggleFaceNormalHelpers() {
    this.setFaceNormalHelpersVisible(!this.faceNormalHelpersVisible);
  }

  private findClosestEdgeToPoint(point: THREE.Vector3, faceIndex: number): number {
    const tmpLine = new THREE.Line3();
    const tmpPoint = new THREE.Vector3();
    let bestIndex = -1;
    let bestDist = Infinity;
    for (let side = 0; side < 3; side++) {
      const edgeIndex = faceIndex * 3 + side;
      const edge = this.wok.edges.get(edgeIndex);
      if (!edge) continue;
      tmpLine.start.copy(edge.line.start).sub(this.center);
      tmpLine.end.copy(edge.line.end).sub(this.center);
      tmpLine.closestPointToPoint(point, true, tmpPoint);
      const dist = tmpPoint.distanceTo(point);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = edgeIndex;
      }
    }
    return bestIndex;
  }

  private getMouseNDC(event: MouseEvent): { x: number; y: number } | null {
    const canvas = this.ui3DRenderer.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return {
      x: (x / canvas.width) * 2 - 1,
      y: -(y / canvas.height) * 2 + 1,
    };
  }

  private paintFaceAtCursor(event: MouseEvent): void {
    if (!this.wok || this.controlMode !== TabWOKEditorControlMode.PAINT) return;
    const ndc = this.getMouseNDC(event);
    if (!ndc) return;
    this.ui3DRenderer.raycaster.setFromCamera(
      new THREE.Vector2(ndc.x, ndc.y),
      this.ui3DRenderer.camera
    );
    const intersects = this.ui3DRenderer.raycaster.intersectObject(this.wok.mesh);
    if (intersects.length && intersects[0].face) {
      const face = intersects[0].face;
      const f_idx = Math.floor(face.a / 3);
      this.wok.setFaceWalkIndex(f_idx, this.paintWalkIndex);
      if (this.selectedFaceIndex === f_idx) {
        this.resetFaceColors();
        const selFace = this.wok.faces[this.selectedFaceIndex];
        const color = this.wok.geometry.attributes.color as THREE.BufferAttribute;
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
        color.needsUpdate = true;
      }
      this.processEventListener('onFacePainted', [this.wok.faces[f_idx]]);
    }
  }

  onMouseDown(event: MouseEvent): void {
    if (this.controlMode === TabWOKEditorControlMode.PAINT && event.button === 0) {
      this.paintFaceAtCursor(event);
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (
      this.controlMode === TabWOKEditorControlMode.PAINT &&
      KotOR.Mouse.MouseDown &&
      KotOR.Mouse.ButtonState === KotOR.MouseState.LEFT
    ) {
      this.paintFaceAtCursor(event);
    }
  }

  private updateCameraFocus(): void {
    this.box3 = new THREE.Box3();
    if(!this.wok) return;
    this.box3.setFromObject(this.wok.mesh);
    this.box3.getCenter(this.center);
    this.ui3DRenderer.orbitControls.target.copy(this.center);
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
    if (this.ui3DRenderer.canvas) {
      this.ui3DRenderer.canvas.style.cursor = 'default';
    }
  }

  animate(delta: number = 0){

    this.vertexHelpersGroup.visible = false;
    this.edgeHelpersGroup.visible = false;
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

        }

      break;
      case TabWOKEditorControlMode.EDGE:
        this.selectVertex(-1);
        this.selectFace(undefined);
        this.edgeHelpersGroup.visible = true;
      break;
      case TabWOKEditorControlMode.PAINT:
        this.selectVertex(-1);
      break;
    }
    
  }

  buildVertexHelpers(){
    while(this.vertexHelpers.length){
      const helper = this.vertexHelpers.splice(this.vertexHelpers.length - 1, 1)[0];
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
      helper.position.copy(vertex).sub(this.center);
      helper.scale.setScalar(this.vertexHelperSize);
    }
  }

  buildEdgeHelpers(){
    this.edgeIndexByHelper.clear();
    while(this.edgeHelpers.length){
      const helper = this.edgeHelpers.pop()!;
      helper.removeFromParent();
    }
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    this.wok.edges.forEach((edge, edgeIndex) => {
      const length = edge.line.distance();
      if(length < 0.001) return;
      dir.copy(edge.line.end).sub(edge.line.start).normalize();
      const helper = new THREE.Mesh(
        this.edgeHelperGeometry,
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      helper.scale.set(1, length, 1);
      helper.position.copy(edge.center_point).sub(this.center);
      helper.quaternion.setFromUnitVectors(up, dir);
      helper.userData.edgeIndex = edgeIndex;
      this.edgeHelpers.push(helper);
      this.edgeHelpersGroup.add(helper);
      this.edgeIndexByHelper.set(helper, edgeIndex);
    });
  }

  selectEdge(index: number = -1){
    this.selectedEdgeIndex = index;
    for(let i = 0; i < this.edgeHelpers.length; i++){
      const helper = this.edgeHelpers[i];
      const material = helper.material as THREE.MeshBasicMaterial;
      const edgeIdx = this.edgeIndexByHelper.get(helper);
      material.color.setHex(edgeIdx === index ? 0xFFFFFF : 0x000000);
    }
    this.processEventListener('onEdgeSelected', [index >= 0 ? this.wok.edges.get(index) : undefined]);
  }

  setEdgeTransition(edgeIndex: number, transition: number) {
    const edge = this.wok?.edges.get(edgeIndex);
    if (edge) {
      edge.transition = transition;
      this.processEventListener('onEdgeTransitionChange', [edge]);
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

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    return this.wok.toExportBuffer();
  }

}
