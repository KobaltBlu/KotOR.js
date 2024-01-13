import { GameState } from "../GameState";
import { AreaMap, ModuleWaypoint } from "../module";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import type { GUIControl, GUILabel } from ".";
import { MapNorthAxis } from "../enums/engine/MapNorthAxis";
import { MapMode } from "../enums/engine/MapMode";
import * as THREE from "three";
import { GameEngineType } from "../enums/engine";
import { TextureLoader } from "../loaders";
// import { ShaderManager, MenuManager, PartyManager } from "../managers";

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
    this.camera = new THREE.OrthographicCamera( 
      this.width / -2,
      this.width / 2,
      this.height / 2,
      this.height / -2,
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

    const material = this.control.getFill().material;
    if(material instanceof THREE.ShaderMaterial){
      material.uniforms.diffuse.value.setHex(0xFFFFFF);
    }
  }

  setVisible(bVisible: boolean){
    this.visible = bVisible;
  }

  setMode(mode: MapMode){
    this.mode = mode;
  }

  setSize(width = 0, height = 0){
    this.width = width;
    this.height = height;
    this.texture.setSize(this.width, this.height);
    this.tDepth.setSize(this.width, this.height);
    this.updateRatio();
  }

  updateRatio(){
    this.texture.setSize(this.width, this.height);
    this.camera.left = this.width / -2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = this.height / -2;
    this.camera.updateProjectionMatrix();
  }

  setTexture(texture: OdysseyTexture){
    this.mapTexture = texture;
    if(!this.mapTexture) return;

    this.mapTexture.wrapS = THREE.RepeatWrapping;
    this.mapTexture.wrapT = THREE.RepeatWrapping;
    const material = this.mapPlane.material as THREE.MeshBasicMaterial;
    material.map = this.mapTexture;

    const textureSize = this.getMapTextureSize();
    this.mapPlane.scale.set(textureSize.width, textureSize.height, 1);

    const scaleSize = this.getMapTextureScaleSize();
    this.mapGroup.position.x = textureSize.width/2;
    this.mapGroup.position.y = textureSize.height/2;

    this.fogPlane.scale.set(scaleSize.width, scaleSize.height, 1);
    this.fogPlane.position.z = 5;
    this.fogPlane.position.x = scaleSize.width/2;
    this.fogPlane.position.y = scaleSize.height/2;
  }

  setAreaMap(areaMap: AreaMap){
    this.areaMap = areaMap;
    if(!this.areaMap) return;

    (this.fogPlane.material as THREE.ShaderMaterial).uniforms.alphaMap.value = this.areaMap.fogAlphaTexture;
    (this.fogPlane.material as THREE.ShaderMaterial).uniforms.mapRes.value.set(this.areaMap.mapResX+1, this.areaMap.mapResY+1);

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
          (scaleSize.width * mapPos.x) + 4,
          (scaleSize.height * mapPos.y) + 4, 
          10
        );
        noteMesh.scale.set(this.mapNoteSize * this.mapNoteDefaultScale, this.mapNoteSize * this.mapNoteDefaultScale, 1);
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
        this.bounds.min.set(mesh.position.x - (this.mapNoteDefaultScale*this.mapNoteSize/2), mesh.position.y - (this.mapNoteDefaultScale*this.mapNoteSize/2));
        this.bounds.max.set(mesh.position.x + (this.mapNoteDefaultScale*this.mapNoteSize/2), mesh.position.y + (this.mapNoteDefaultScale*this.mapNoteSize/2));
        if(this.bounds.containsPoint(this.mousePosition)){
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
    if(!this.visible || !this.control)
      return;

    if(!this.currentCamera) this.currentCamera = this.camera;

    if(this.currentCamera){
      this.frustumMat4.multiplyMatrices( this.currentCamera.projectionMatrix, this.currentCamera.matrixWorldInverse )
      this.viewportFrustum.setFromProjectionMatrix(this.frustumMat4);
    }

    this.updateFog();

    const scaleSize = this.getMapTextureScaleSize();
    
    this.areaMap.revealPosition(this.position.x, this.position.y);
    const mapPos = this.areaMap.toMapCoordinates(this.position.x, this.position.y);
    this.currentCamera.position.x = (scaleSize.width * mapPos.x);
    this.currentCamera.position.y = (scaleSize.height * mapPos.y);
    const minX = this.width/2;
    const maxX = Math.max(this.width/2, 440 - this.width/2)

    if(this.currentCamera.position.x < minX){
      this.currentCamera.position.x = minX;
    }

    if(this.currentCamera.position.x > maxX){
      this.currentCamera.position.x = maxX;
    }

    const maxY = Math.max(this.height/2, 256 - this.height/2);
    const minY = this.height/2;

    if(this.currentCamera.position.y < minY){
      this.currentCamera.position.y = minY;
    }

    if(this.currentCamera.position.y > maxY){
      this.currentCamera.position.y = maxY;
    }

    if(this.arrowPlane){
      this.arrowPlane.position.set(
        (scaleSize.width * mapPos.x) + 4,
        (scaleSize.height * mapPos.y) + 4, 
        10
      );
      this.arrowPlane.rotation.set(0, 0, this.arrowAngle);
      if(this.mode == MapMode.FULLMAP){
        (this.arrowPlane.material as THREE.MeshBasicMaterial).opacity = 1 - (0.5 *GameState.MenuManager.pulseOpacity);
      }
    }

    for(let i = 0; i < 2; i++){
      const pm = GameState.PartyManager.party[i+1];
      const mesh = this.partyGroup.children[i];
      if(this.mode == MapMode.MINIMAP){
        mesh.visible = false;
        continue;
      }

      if(pm){
        mesh.visible = true;
        const pos = this.areaMap.toMapCoordinates(pm.position.x, pm.position.y);
        mesh.position.set(
          (scaleSize.width * pos.x) + 4,
          (scaleSize.height * pos.y) + 4, 
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
          this.bounds.min.set(mesh.position.x - (this.mapNoteDefaultScale*this.mapNoteSize/2), mesh.position.y - (this.mapNoteDefaultScale*this.mapNoteSize/2));
          this.bounds.max.set(mesh.position.x + (this.mapNoteDefaultScale*this.mapNoteSize/2), mesh.position.y + (this.mapNoteDefaultScale*this.mapNoteSize/2));

          if(this.mapNoteSelected == note){
            material.color.copy(this.LBL_MAPVIEW.defaultHighlightColor);
            mesh.scale.set(this.mapNoteSize*this.mapNodeHoverScale, this.mapNoteSize*this.mapNodeHoverScale, 1);
          }else if(this.bounds.containsPoint(this.mousePosition)){
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
      let material = this.control.getFill().material;
      if(material instanceof THREE.Material){
        if(material instanceof THREE.ShaderMaterial){
          material.uniforms.map.value = this.texture.texture;
        }else if(material instanceof THREE.MeshBasicMaterial){
          material.map = this.texture.texture;
        }
        material.transparent = true;
        material.needsUpdate = true;
      }
    }

  }

  getMapTextureScaleSize(): { width: number, height: number } {
    let width = 440;
    let height = 256;

    if(GameState.GameKey == GameEngineType.TSL){
      width = 512;
      height = 256;
    }

    return { width: width, height: height };
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

  setRotation(angle: number = 0){
    this.arrowAngle = angle;
    switch(this.areaMap.northAxis){
      case MapNorthAxis.NORTH:
        {
          this.arrowAngle = angle;
        }
      break;
      case MapNorthAxis.SOUTH:
        {
          this.arrowAngle = angle + (Math.PI / 2);
        }
      break;
      case MapNorthAxis.EAST:
        {
          this.arrowAngle = angle + (Math.PI / 2);
        }
      break;
      case MapNorthAxis.WEST:
        {
          this.arrowAngle = angle - (Math.PI / 2);
        }
      break;
    }
  }

}
