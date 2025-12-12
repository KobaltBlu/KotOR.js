import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import { TabPTHEditor } from "../../components/tabs/tab-pth-editor/TabPthEditor";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';

export enum TabPTHEditorControlMode {
  POINT = 0,
  CONNECTION = 1,
};

export class TabPTHEditorState extends TabState {
  tabName: string = `PTH`;
  blueprint: KotOR.GFFObject;

  points: KotOR.PathPoint[] = [];
  ui3DRenderer: UI3DRenderer;
  pathHelperGroup: THREE.Group;
  pointMeshes: THREE.Mesh[] = [];
  connectionLines: THREE.LineSegments;
  layoutGroup: THREE.Group;
  layout: KotOR.LYTObject;
  layoutModels: KotOR.OdysseyModel3D[] = [];
  walkmeshes: KotOR.OdysseyWalkMesh[] = [];

  controlMode: TabPTHEditorControlMode = TabPTHEditorControlMode.POINT;
  selectedPointIndex: number = -1;

  box3: THREE.Box3 = new THREE.Box3();
  center: THREE.Vector3 = new THREE.Vector3();

  selectedPointA: KotOR.PathPoint;
  selectedPointB: KotOR.PathPoint;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    
    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    // Create a group to hold all path visualization elements
    this.pathHelperGroup = new THREE.Group();
    this.ui3DRenderer.scene.add(this.pathHelperGroup);

    // Create a group to hold layout room models
    this.layoutGroup = new THREE.Group();
    this.ui3DRenderer.scene.add(this.layoutGroup);

    this.setContentView(<TabPTHEditor tab={this}></TabPTHEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Pathfinding Blueprint',
        accept: {
          'application/octet-stream': ['.pth']
        }
      }
    ];
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onSelect', this.onSelect.bind(this));
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) {
          // Dispose of previous layout when switching files
          this.disposeLayout();
          this.file = file;
        }
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();

        file.readFile().then( async (response) => {
          this.blueprint = new KotOR.GFFObject(response.buffer);
          this.setPropsFromBlueprint();
          
          // Try to load the corresponding LYT file
          await this.loadLayoutFile();
          
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  public setControlMode(mode: any = 0): void {
    this.controlMode = mode;
    this.processEventListener('onControlModeChange', [mode]); 
  }

  public setPropsFromBlueprint(): void {

    /**
     * Parse the Path Points
     */
    if(this.blueprint.RootNode.hasField('Path_Points')){
      const pathPoints = this.blueprint.getFieldByLabel('Path_Points').getChildStructs();
      for(let i = 0, len = pathPoints.length; i < len; i++){
        this.points[i] = KotOR.PathPoint.FromGFFStruct(pathPoints[i]);
        this.points[i].id = i;
      }
    }

    /**
     * Parse the Path Connections
     */
    if(this.blueprint.RootNode.hasField('Path_Conections')){
      const pathConnections = this.blueprint.getFieldByLabel('Path_Conections').getChildStructs();
      for(let i = 0, len = this.points.length; i < len; i++){
        const point = this.points[i];
        if(!point.num_connections) continue;
        
        let connIdx = point.first_connection;
        for(let j = 0; j < point.num_connections; j++){
          const pointIdx = pathConnections[connIdx + j].getFieldByLabel('Destination').getValue();
          point.addConnection(this.points[pointIdx]);
        }
      }
    }

    // Update visualization after parsing
    this.updatePathVisualization();
  }

  private updateCameraFocus(): void {
    this.box3 = new THREE.Box3();
    for(let i = 0; i < this.points.length; i++){
      this.box3.expandByPoint(this.points[i].vector);
    }
    this.box3.getCenter(this.center);
    this.ui3DRenderer.orbitControls.target.copy(this.center);
  }

  public fitCameraToScene(offset: number = 1.25): void {
    this.updateCameraFocus();
    if(!this.center) return;
    const maxSize = Math.max(this.center.x, this.center.y, this.center.z);
    const fov = THREE.MathUtils.degToRad(this.ui3DRenderer.camera.fov); // vertical fov in radians
    const aspect = this.ui3DRenderer.camera.aspect;

    // Distance required to fit box height in view
    const fitHeightDistance = maxSize / (2 * Math.tan(fov / 2));
    // Distance required to fit box width in view
    const fitWidthDistance = fitHeightDistance / aspect;

    // Take the larger one, then apply offset
    const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

    // Get the direction from target to camera so we keep the same orbit angles
    const direction = new THREE.Vector3()
      .subVectors(this.ui3DRenderer.camera.position, this.ui3DRenderer.orbitControls.target)
      .normalize();

    // New camera position
    this.ui3DRenderer.camera.position.copy(this.center).add(direction.multiplyScalar(distance));

    // Update controls target to center the box
    this.ui3DRenderer.orbitControls.target.copy(this.center);

    // Optionally update near/far to better match scene scale
    this.ui3DRenderer.camera.near = distance / 100;
    this.ui3DRenderer.camera.far = distance * 100;
    this.ui3DRenderer.camera.updateProjectionMatrix();

    this.ui3DRenderer.orbitControls.update();
  }

  private onSelect(intersect: THREE.Intersection): void {
    if(intersect && intersect.object){
      const pointIndex = (intersect.object as THREE.Mesh).userData.pointIndex;
      if(pointIndex !== undefined){
        this.selectPoint(pointIndex);
        return;
      }
    }
    this.selectPoint(-1);
  }
  private selectPoint(pointIndex: number = -1): void {
    this.ui3DRenderer.transformControls.detach();
    this.selectedPointIndex = pointIndex;
    const point = this.points[pointIndex];
    if(point){
      const mesh = this.pointMeshes[pointIndex] as THREE.Mesh;
      if(mesh){
        this.ui3DRenderer.transformControls.attach(mesh);
        this.ui3DRenderer.transformControls.size = 0.5;
        this.ui3DRenderer.transformControls.showZ = false;
      }
    }
    // this.updatePathVisualization();
  }

  private updatePathVisualization(): void {
    // Clear existing meshes
    this.pointMeshes.forEach(mesh => {
      this.ui3DRenderer.selectable.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.pointMeshes = [];

    // Remove existing connection lines
    if(this.connectionLines){
      this.pathHelperGroup.remove(this.connectionLines);
      this.connectionLines.geometry.dispose();
      (this.connectionLines.material as THREE.Material).dispose();
      this.connectionLines = undefined as any;
    }

    if(this.points.length === 0) return;

    // Create shared material for points (geometry will be created per mesh)
    const pointMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      wireframe: false
    });

    // Create visual indicators for each point
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const sphere = new THREE.Mesh(sphereGeometry, pointMaterial);
      sphere.position.set(point.vector.x, point.vector.y, point.vector.z || 0);
      sphere.userData.pointIndex = i;
      this.ui3DRenderer.selectable.add(sphere);
      this.pointMeshes.push(sphere);
    }

    // Create lines for connections
    const connectionGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      for(let j = 0; j < point.connections.length; j++){
        const connectedPoint = point.connections[j];
        
        // Add line from current point to connected point
        positions.push(
          point.vector.x, point.vector.y, point.vector.z || 0,
          connectedPoint.vector.x, connectedPoint.vector.y, connectedPoint.vector.z || 0
        );
        
        // Add colors (cyan for connections)
        colors.push(
          0, 1, 1, // cyan
          0, 1, 1  // cyan
        );
      }
    }

    if(positions.length > 0){
      connectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      connectionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const connectionMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2
      });
      
      this.connectionLines = new THREE.LineSegments(connectionGeometry, connectionMaterial);
      this.pathHelperGroup.add(this.connectionLines);
    }
  }

  private async loadLayoutFile(): Promise<void> {
    if(!this.file) return;

    try {
      // Get the resref (filename without extension) from the PTH file
      const pthResref = this.file.resref;
      
      if(!pthResref) return;

      // Use ResourceLoader to load the LYT file with the same name
      const lytBuffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.lyt, pthResref);
      
      if(lytBuffer && lytBuffer.length > 0){
        // Parse the LYT file
        this.layout = new KotOR.LYTObject(lytBuffer);
        
        // Load room models
        await this.loadLayoutRooms();
      }
    } catch (error) {
      // LYT file doesn't exist or couldn't be loaded - that's okay
      console.log('Could not load LYT file:', error);
    }
  }

  private async loadLayoutRooms(): Promise<void> {
    // Clear existing layout models
    this.disposeLayout();

    if(!this.layout || !this.layout.rooms || this.layout.rooms.length === 0) return;

    // Load each room model
    for(let i = 0; i < this.layout.rooms.length; i++){
      const room = this.layout.rooms[i];
      try {
        const mdl = await KotOR.MDLLoader.loader.load(room.name);
        if(mdl){
          const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
            context: this.ui3DRenderer,
            manageLighting: true,
            mergeStatic: true,
          });
          if(model){
            model.position.copy(room.position);
            
            // Load walkmesh for the room
            try {
              const wokBuffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.wok, room.name);
              if(wokBuffer && wokBuffer.length > 0){
                const wok = new KotOR.OdysseyWalkMesh(new KotOR.BinaryReader(wokBuffer));
                model.wok = wok;
                this.ui3DRenderer.unselectable.add(wok.mesh);
                this.walkmeshes.push(wok);
              }
            } catch (wokError) {
              // Walkmesh might not exist for this room - that's okay
              console.log(`No walkmesh found for room: ${room.name}`);
            }
            
            this.layoutGroup.add(model);
            this.layoutModels.push(model);
          }
        }
      } catch (error) {
        console.warn(`Could not load room model: ${room.name}`, error);
      }
    }

    // Load textures
    await KotOR.TextureLoader.LoadQueue();

    // Update point Z positions based on walkmesh raycasting
    await this.updatePointsFromWalkmesh();
  }

  private async updatePointsFromWalkmesh(): Promise<void> {
    if(this.points.length === 0 || this.layoutModels.length === 0) return;

    const raycaster = new THREE.Raycaster();
    const rayDirection = new THREE.Vector3(0, 0, -1); // Point downward
    const rayOrigin = new THREE.Vector3();
    const tempBox = new THREE.Box3();

    // Loop through all points
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      let closestIntersection: THREE.Intersection | null = null;
      let closestDistance = Infinity;

      // Set ray origin to point position, high above to ensure we start above any geometry
      rayOrigin.set(point.vector.x, point.vector.y, (point.vector.z || 0) + 1000);
      
      raycaster.ray.origin.copy(rayOrigin);
      raycaster.ray.direction.copy(rayDirection);
      raycaster.far = 2000; // Large enough to reach the ground

      // Raycast against all room model walkmeshes
      for(let j = 0; j < this.layoutModels.length; j++){
        const model = this.layoutModels[j];
        
        // Check if model has a walkmesh
        if(model.wok && model.wok.mesh){
          // Update model's world matrix to ensure walkmesh is in correct position
          model.updateMatrixWorld(true);
          
          // Create a small bounding box around the ray origin to get relevant faces
          tempBox.setFromCenterAndSize(rayOrigin, new THREE.Vector3(20, 20, 2000));
          let faces = model.wok.getAABBCollisionFaces(tempBox);
          
          // If AABB doesn't return faces, try using all walkable faces
          if(!faces || faces.length === 0){
            faces = model.wok.walkableFaces;
          }
          
          // Raycast against the walkmesh
          const intersects = model.wok.raycast(raycaster, faces);
          
          // Find the closest intersection
          if(intersects && intersects.length > 0){
            for(let k = 0; k < intersects.length; k++){
              const intersect = intersects[k];
              // Only consider intersections that are below the ray origin
              if(intersect.point && intersect.point.z < rayOrigin.z && intersect.distance < closestDistance){
                closestDistance = intersect.distance;
                closestIntersection = intersect;
              }
            }
          }
        }
      }

      // Update point Z position if we found an intersection
      if(closestIntersection && closestIntersection.point){
        point.vector.z = closestIntersection.point.z + 1; // Add 1 unit offset
      }
    }

    this.fitCameraToScene();

    // Update visualization to reflect new Z positions
    this.updatePathVisualization();
  }

  private disposeLayout(): void {
    // Remove and dispose of all layout models
    this.layoutModels.forEach(model => {
      this.layoutGroup.remove(model);
      try {
        model.dispose();
      } catch (e) {
        console.warn('Error disposing layout model:', e);
      }
    });
    this.layoutModels = [];
  }

  animate(delta: number = 0){
    
  }

  public show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;
    this.ui3DRenderer.render();
  }

  public hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'pth'){
      this.updateFile();
      return this.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    const pth = new KotOR.GFFObject();
    pth.FileType = 'PTH ';
    pth.RootNode.type = -1;

    const root = pth.RootNode;
    if(!root) return;

    const pathConnectionsField = root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Path_Conections') );
    const pathPointsField = root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Path_Points') );
    let connIdx = 0;
    for(let i = 0, len = this.points.length; i < len; i++){
      const point = this.points[i];
      const pathPointStruct = new KotOR.GFFStruct(2);
      pathPointStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'First_Conection', connIdx ) );
      pathPointStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Conections', point.connections.length ) );
      pathPointStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', point.vector.x ) );
      pathPointStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', point.vector.y ) );
      pathPointsField?.addChildStruct(pathPointStruct);
      
      for(let j = 0; j < point.connections.length; j++){
        const pathConnectionStruct = new KotOR.GFFStruct(3);
        const destinationPoint = point.connections[j];
        const destinationIndex = this.points.indexOf(destinationPoint);
        pathConnectionStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Destination', destinationIndex ) );
        pathConnectionsField?.addChildStruct(pathConnectionStruct);
        connIdx++;
      }
    }
    
  }
}