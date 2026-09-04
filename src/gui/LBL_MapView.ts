import { GameState } from "@/GameState";
import { AreaMap, ModuleWaypoint } from "@/module";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import type { GUIControl, GUILabel } from "@/gui";
import { MapNorthAxis } from "@/enums/engine/MapNorthAxis";
import { MapMode } from "@/enums/engine/MapMode";
import * as THREE from "three";
import { TextureLoader } from "@/loaders";
import { asExtentInt, truncDiv } from "@/gui/GUICoord";

const FOG_SIZE = 64;
const FOG_SIZE_HALF = FOG_SIZE/2;

const planeGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);

/**
 * LBL_MapView class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LBL_MapView.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LBL_MapView {
  LBL_MAPVIEW: GUILabel;
  control: GUIControl;

  width: number = 120;
  height: number = 120;

  arrowSize: number = 32;

  mode: MapMode = MapMode.MINIMAP;

  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  texture: THREE.WebGLRenderTarget;
  tDepth: THREE.WebGLRenderTarget;
  clearColor: THREE.Color;
  currentCamera: THREE.Camera;
  frustumMat4: THREE.Matrix4;
  viewportFrustum: THREE.Frustum;

  mapGroup: THREE.Group = new THREE.Group();
  mapPlane: THREE.Mesh;
  fogPlane: THREE.Mesh;
  arrowPlane: THREE.Mesh;
  mapNotes: THREE.Mesh[] = [];
  fogGroup: THREE.Group = new THREE.Group();
  partyGroup: THREE.Group = new THREE.Group();

  mapTexture: OdysseyTexture;
  fogTexture: OdysseyTexture;
  noteTexture: OdysseyTexture;
  pmTexture: OdysseyTexture;

  arrowTexture: OdysseyTexture;

  areaMap: AreaMap;
  visible: boolean;

  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  arrowAngle: number = 0;

  mapNoteSize = 32;
  mapNodeHoverScale = 0.75;
  mapNoteDefaultScale = 0.5;
  mapNoteSelected: ModuleWaypoint;
  bounds: THREE.Box2 = new THREE.Box2();

  _mapCoordinates: THREE.Vector2 = new THREE.Vector2(0, 0);
  mousePosition: THREE.Vector2 = new THREE.Vector2(0, 0);
  globalLight: THREE.AmbientLight;

  constructor(
    LBL_MAPVIEW: GUILabel,
  ) {
    this.LBL_MAPVIEW = LBL_MAPVIEW;

    this.visible = true;
    this.frustumMat4 = new THREE.Matrix4();
    this.viewportFrustum = new THREE.Frustum();

    this.scene = new THREE.Scene();
    const halfW = truncDiv(asExtentInt(this.width), 2);
    const halfH = truncDiv(asExtentInt(this.height), 2);
    this.camera = new THREE.OrthographicCamera( 
      -halfW,
      halfW,
      halfH,
      -halfH,
      1, 1000
    );

    this.texture = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
    this.tDepth = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat } );
    this.clearColor = new THREE.Color(0x000000);

    this.currentCamera = this.camera;
    this.camera.position.z = 100;

    this.globalLight = new THREE.AmbientLight(0x7F7F7F);
    this.globalLight.position.x = 0;
    this.globalLight.position.y = 0;
    this.globalLight.position.z = 0;
    this.globalLight.intensity  = 1;
    this.scene.add(this.globalLight);

    //MAP
    const mapPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF
    });

    this.mapPlane = new THREE.Mesh(planeGeometry, mapPlaneMaterial);
    this.mapPlane.position.set(0, 0, 0);
    this.mapGroup.add(this.mapPlane);

    //FOG
    const fogPlaneMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-fow').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-fow').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-fow').getFragment(),
    });
    fogPlaneMaterial.defines.USE_MAP = '';
    fogPlaneMaterial.defines.USE_UV = '';
    fogPlaneMaterial.defines.USE_ALPHAMAP = '';
    fogPlaneMaterial.transparent = true;

    this.fogPlane = new THREE.Mesh(planeGeometry, fogPlaneMaterial);
    this.fogPlane.position.set(0, 0, 0);
    this.scene.add(this.fogPlane);

    //ARROW
    const arrowPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
    });

    this.arrowPlane = new THREE.Mesh(planeGeometry, arrowPlaneMaterial);
    this.arrowPlane.position.set(0, 0, 0);
    this.arrowPlane.scale.set(this.arrowSize, this.arrowSize, 0);
    this.scene.add(this.arrowPlane);

    const pmCircleMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF7F50,
      transparent: true,
    });

    for(let i = 0; i < 2; i++){
      const pmCircle = new THREE.Mesh(planeGeometry, pmCircleMaterial);
      pmCircle.scale.set(16, 16, 1);
      this.partyGroup.add(pmCircle);
    }
    this.scene.add(this.partyGroup);

    this.scene.add(this.mapGroup);
    this.scene.add(this.fogGroup);

    TextureLoader.Load('blackdot').then((texture: OdysseyTexture) => {
      fogPlaneMaterial.uniforms.map.value = texture;
      this.fogTexture = texture;
    });

    TextureLoader.Load('mm_barrow').then((texture: OdysseyTexture) => {
      this.arrowTexture = texture;
      (this.arrowPlane.material as THREE.MeshBasicMaterial).map = texture;
    });

    TextureLoader.Load('whitetarget').then((texture: OdysseyTexture) => {
      this.noteTexture = texture;
    });

    TextureLoader.Load('lbl_mapcircle').then((texture: OdysseyTexture) => {
      this.pmTexture = pmCircleMaterial.map = texture;
    });
  }

  setControl(control: GUIControl){
    this.control = control;
    if(!this.control) return;

    this.control.setFillTexture(this.texture.texture);
    this.control.setFillColor(1, 1, 1);
  }

  setVisible(bVisible: boolean){
    this.visible = bVisible;
  }

  setMode(mode: MapMode){
    this.mode = mode;
  }

  setSize(width = 0, height = 0){
    this.width = Math.max(1, asExtentInt(width));
    this.height = Math.max(1, asExtentInt(height));
    this.texture.setSize(this.width, this.height);
    this.tDepth.setSize(this.width, this.height);
    this.updateRatio();
  }

  updateRatio(){
    this.texture.setSize(this.width, this.height);
    const halfW = truncDiv(asExtentInt(this.width), 2);
    const halfH = truncDiv(asExtentInt(this.height), 2);
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  /** Retail MapZoom — only applied to HUD minimap (InitializeMap). */
  getMapZoom(): number {
    if(this.mode != MapMode.MINIMAP || !this.areaMap) return 1;
    return Math.max(1, this.areaMap.mapZoom || 1);
  }

  setTexture(texture: OdysseyTexture){
    this.mapTexture = texture;
    if(!this.mapTexture) return;

    this.mapTexture.wrapS = THREE.RepeatWrapping;
    this.mapTexture.wrapT = THREE.RepeatWrapping;
    const material = this.mapPlane.material as THREE.MeshBasicMaterial;
    material.map = this.mapTexture;

    this.applyMapPlaneScale();
  }

  applyMapPlaneScale(){
    if(!this.mapTexture) return;

    const zoom = this.getMapZoom();
    const textureSize = this.getMapTextureSize();
    const scaleSize = this.getMapTextureScaleSize();

    this.mapPlane.scale.set(
      Math.max(1, asExtentInt(textureSize.width / zoom)),
      Math.max(1, asExtentInt(textureSize.height / zoom)),
      1
    );
    this.mapGroup.position.x = truncDiv(asExtentInt(textureSize.width / zoom), 2);
    this.mapGroup.position.y = truncDiv(asExtentInt(textureSize.height / zoom), 2);

    this.fogPlane.scale.set(
      Math.max(1, asExtentInt(scaleSize.width)),
      Math.max(1, asExtentInt(scaleSize.height)),
      1
    );
    this.fogPlane.position.z = 5;
    this.fogPlane.position.x = truncDiv(asExtentInt(scaleSize.width), 2);
    this.fogPlane.position.y = truncDiv(asExtentInt(scaleSize.height), 2);
  }

  setAreaMap(areaMap: AreaMap){
    this.areaMap = areaMap;
    if(!this.areaMap) return;

    (this.fogPlane.material as THREE.ShaderMaterial).uniforms.alphaMap.value = this.areaMap.fogAlphaTexture;
    (this.fogPlane.material as THREE.ShaderMaterial).uniforms.mapRes.value.set(this.areaMap.mapResX+1, this.areaMap.mapResY+1);
    this.applyMapPlaneScale();

    if(this.mode == MapMode.FULLMAP){
      this.areaMap.addEventListener('mapNoteAdded', (note: ModuleWaypoint) => {
        const noteMaterial = new THREE.MeshBasicMaterial({
          map: this.noteTexture,
          transparent: true,
          color: this.LBL_MAPVIEW.defaultColor
        });

        const noteMesh = new THREE.Mesh(planeGeometry, noteMaterial);
        this.mapNotes.push(noteMesh);
        this.scene.add(noteMesh);
        noteMesh.userData.moduleObject = note;

        const scaleSize = this.getMapTextureScaleSize();
        const mapPos = this.areaMap.toMapCoordinates(note.position.x, note.position.y);
        noteMesh.position.set(
          asExtentInt(scaleSize.width * mapPos.x),
          asExtentInt(scaleSize.height * mapPos.y),
          10
        );
        const noteScale = Math.max(1, asExtentInt(this.mapNoteSize * this.mapNoteDefaultScale));
        noteMesh.scale.set(noteScale, noteScale, 1);
        if(!this.mapNoteSelected) this.mapNoteSelected = note;
      });

      this.areaMap.addEventListener('mapNoteRemoved', (note: ModuleWaypoint) => {
        let i = this.mapNotes.length;
        while(i--){
          const mesh = this.mapNotes[i];
          if(!mesh) continue;

          if(mesh.userData.moduleObject == note){
            mesh.removeFromParent();
            (mesh.material as THREE.MeshBasicMaterial).dispose();
            this.mapNotes.splice(i, 1);
          }
        }
      });
    }
  }

  updateMousePosition(x: number = 0, y: number = 0){
    this.mousePosition.set(x, y);
  }

  onClick(){
    for(let i = 0, len = this.mapNotes.length; i < len; i++){
      const mesh = this.mapNotes[i];
      const note = mesh.userData.moduleObject;
      if(this.areaMap.isMapPositionExplored(note.position.x, note.position.y)){
        const half = truncDiv(asExtentInt(this.mapNoteDefaultScale * this.mapNoteSize), 2);
        const mx = asExtentInt(mesh.position.x);
        const my = asExtentInt(mesh.position.y);
        this.bounds.min.set(mx - half, my - half);
        this.bounds.max.set(mx + half, my + half);
        const px = asExtentInt(this.mousePosition.x);
        const py = asExtentInt(this.mousePosition.y);
        if(px >= this.bounds.min.x && px <= this.bounds.max.x &&
           py >= this.bounds.min.y && py <= this.bounds.max.y){
          this.mapNoteSelected = note;
          return note;
        }
      }
    }
  }

  updateFog(){
    if(!this.areaMap) return;
  }

  render(delta: number = 0){
    if(!this.visible || !this.control || !this.areaMap)
      return;

    if(!this.currentCamera) this.currentCamera = this.camera;

    if(this.currentCamera){
      this.frustumMat4.multiplyMatrices( this.currentCamera.projectionMatrix, this.currentCamera.matrixWorldInverse )
      this.viewportFrustum.setFromProjectionMatrix(this.frustumMat4);
    }

    this.updateFog();

    if(this.fogPlane){
      this.fogPlane.visible = !GameState.cheatRevealMap;
    }

    this.applyMapPlaneScale();
    const scaleSize = this.getMapTextureScaleSize();
    
    // Retail UpdateMapData: SetWorldPointExplored(..., 1)
    this.areaMap.revealPosition(this.position.x, this.position.y, 1);
    const mapPos = this.areaMap.toMapCoordinates(this.position.x, this.position.y);
    this.currentCamera.position.x = asExtentInt(scaleSize.width * mapPos.x);
    this.currentCamera.position.y = asExtentInt(scaleSize.height * mapPos.y);
    const minX = truncDiv(asExtentInt(this.width), 2);
    const maxX = Math.max(minX, asExtentInt(scaleSize.width) - minX);

    if(this.currentCamera.position.x < minX){
      this.currentCamera.position.x = minX;
    }

    if(this.currentCamera.position.x > maxX){
      this.currentCamera.position.x = maxX;
    }

    const minY = truncDiv(asExtentInt(this.height), 2);
    const maxY = Math.max(minY, asExtentInt(scaleSize.height) - minY);

    if(this.currentCamera.position.y < minY){
      this.currentCamera.position.y = minY;
    }

    if(this.currentCamera.position.y > maxY){
      this.currentCamera.position.y = maxY;
    }

    if(this.arrowPlane){
      this.arrowPlane.position.set(
        asExtentInt(scaleSize.width * mapPos.x),
        asExtentInt(scaleSize.height * mapPos.y),
        10
      );
      this.arrowPlane.rotation.set(0, 0, this.arrowAngle);
      if(this.mode == MapMode.FULLMAP){
        (this.arrowPlane.material as THREE.MeshBasicMaterial).opacity = GameState.MenuManager.pulseOpacity;
      }
    }

    // Retail Draw — companion dots for party[1..] on both minimap and full map
    for(let i = 0; i < 2; i++){
      const pm = GameState.PartyManager.party[i+1];
      const mesh = this.partyGroup.children[i];

      if(pm){
        mesh.visible = true;
        const pos = this.areaMap.toMapCoordinates(pm.position.x, pm.position.y);
        mesh.position.set(
          asExtentInt(scaleSize.width * pos.x),
          asExtentInt(scaleSize.height * pos.y),
          9
        );
      }else{
        mesh.visible = false;
      }
    }

    if(this.mode == MapMode.FULLMAP){
      for(let i = 0, len = this.mapNotes.length; i < len; i++){
        const mesh = this.mapNotes[i];
        const material = mesh.material as THREE.MeshBasicMaterial;
        const note = mesh.userData.moduleObject;
        mesh.visible = note.mapNoteEnabled;
        if(this.areaMap.isMapPositionExplored(note.position.x, note.position.y)){
          const half = truncDiv(asExtentInt(this.mapNoteDefaultScale * this.mapNoteSize), 2);
          const mx = asExtentInt(mesh.position.x);
          const my = asExtentInt(mesh.position.y);
          this.bounds.min.set(mx - half, my - half);
          this.bounds.max.set(mx + half, my + half);

          if(this.mapNoteSelected == note){
            material.color.copy(this.LBL_MAPVIEW.defaultHighlightColor);
            mesh.scale.set(this.mapNoteSize*this.mapNodeHoverScale, this.mapNoteSize*this.mapNodeHoverScale, 1);
          }else if(
            asExtentInt(this.mousePosition.x) >= this.bounds.min.x &&
            asExtentInt(this.mousePosition.x) <= this.bounds.max.x &&
            asExtentInt(this.mousePosition.y) >= this.bounds.min.y &&
            asExtentInt(this.mousePosition.y) <= this.bounds.max.y
          ){
            material.color.copy(this.LBL_MAPVIEW.defaultHighlightColor);
            mesh.scale.set(this.mapNoteSize*this.mapNoteDefaultScale, this.mapNoteSize*this.mapNoteDefaultScale, 1);
          }else{
            material.color.copy(this.LBL_MAPVIEW.defaultColor);
            mesh.scale.set(this.mapNoteSize*this.mapNoteDefaultScale, this.mapNoteSize*this.mapNoteDefaultScale, 1);
          }
        }else{
          mesh.visible = false;
        }
      }
    }

    let oldClearColor = new THREE.Color();
    GameState.renderer.getClearColor(oldClearColor);
    GameState.renderer.setClearColor(this.clearColor, 1);
    GameState.renderer.setRenderTarget(this.texture);
    GameState.renderer.clear();
    GameState.renderer.render(this.scene, this.currentCamera);
    (this.texture as any).needsUpdate = true;
    GameState.renderer.setRenderTarget(null);
    GameState.renderer.setClearColor(oldClearColor, 1);

    if(this.control){
      this.control.setFillTexture(this.texture.texture);
      this.control.setFillOpaque(false);
    }

  }

  /**
   * Logical map display size. MINIMAP applies retail MapZoom (extent *= 1/MapZoom).
   */
  getMapTextureScaleSize(): { width: number, height: number } {
    const logical = AreaMap.getLogicalMapSize();
    const zoom = this.getMapZoom();
    return { width: logical.width / zoom, height: logical.height / zoom };
  }

  getMapTextureSize(): { width: number, height: number } {
    let texWidth = 512;
    let texHeight = 256;

    if(this.mapTexture.mipmaps.length){
      texWidth = this.mapTexture.mipmaps[0].width;
      texHeight = this.mapTexture.mipmaps[0].height;
    }else if(this.mapTexture.source.data){
      texWidth = this.mapTexture.source.data.width;
      texHeight = this.mapTexture.source.data.height;
    }

    return { width: texWidth, height: texHeight };
  }

  setPosition(x: number, y: number){
    this.position.set(x, y, 0);
  }

  /**
   * Retail GetMapRotateCCWFromWorldOrientation / SetPartyMemberWorldOrientation.
   * `angle` is creature yaw (radians); NorthAxis offsets are retail degrees.
   */
  setRotation(angle: number = 0){
    if(!this.areaMap){
      this.arrowAngle = angle;
      return;
    }
    switch(this.areaMap.northAxis){
      case MapNorthAxis.EAST:
        this.arrowAngle = angle + Math.PI;
        break;
      case MapNorthAxis.SOUTH:
        this.arrowAngle = angle + (Math.PI / 2);
        break;
      case MapNorthAxis.WEST:
        this.arrowAngle = angle + (3 * Math.PI / 2);
        break;
      case MapNorthAxis.NORTH:
      default:
        this.arrowAngle = angle;
        break;
    }
  }

}
