import { GameState } from "../GameState";
import { AreaMap } from "../module";
import { OdysseyTexture } from "../resource/OdysseyTexture";
import { GUIControl, GUILabel } from ".";
import { MapNorthAxis } from "../enums/engine/MapNorthAxis";
import { MapMode } from "../enums/engine/MapMode";
import * as THREE from "three";
import { GameEngineType } from "../enums/engine/GameEngineType";
import { TextureLoader } from "../loaders/TextureLoader";

const FOG_SIZE = 64;
const FOG_SIZE_HALF = FOG_SIZE/2;

const fogGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);

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
  arrowPlane: THREE.Mesh;
  fogGroup: THREE.Group = new THREE.Group();
  fogTiles: { x: number; y: number; size: number; explored: boolean; mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; }[] = [];

  mapTexture: OdysseyTexture;
  fogTexture: OdysseyTexture;
  arrowTexture: OdysseyTexture;

  areaMap: AreaMap;
  visible: boolean;

  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  arrowAngle: number = 0;

  _mapCoordinates: THREE.Vector2 = new THREE.Vector2(0, 0);
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
    const mapPlaneGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const mapPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF
    });

    this.mapPlane = new THREE.Mesh(mapPlaneGeometry, mapPlaneMaterial);
    this.mapPlane.position.set(0, 0, 0);
    this.mapGroup.add(this.mapPlane);

    //ARROW
    const arrowPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
    });

    this.arrowPlane = new THREE.Mesh(mapPlaneGeometry, arrowPlaneMaterial);
    this.arrowPlane.position.set(0, 0, 0);
    this.arrowPlane.scale.set(this.arrowSize, this.arrowSize, 0);
    this.scene.add(this.arrowPlane);

    this.scene.add(this.mapGroup);
    this.scene.add(this.fogGroup);

    TextureLoader.Load('blackdot', (texture: OdysseyTexture) => {
      console.log('blackdot', texture);
      this.fogTexture = texture;
    });

    TextureLoader.Load('mm_barrow', (texture: OdysseyTexture) => {
      console.log('mm_barrow', texture);
      this.arrowTexture = texture;
      (this.arrowPlane.material as THREE.MeshBasicMaterial).map = texture;
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
  }

  setAreaMap(areaMap: AreaMap){
    this.areaMap = areaMap;
    if(!this.areaMap) return;

    const resX = this.areaMap.mapResX+1;
    const resY = this.areaMap.mapResY+1;

    const scaleSize = this.getMapTextureScaleSize();

    const scaleX = scaleSize.width / this.areaMap.mapResX;
    const scaleY = scaleSize.height / this.areaMap.mapResY;

    while(this.fogTiles.length){
      const tile = this.fogTiles[0];
      tile.material.dispose();
      tile.mesh.removeFromParent();
      this.fogTiles.shift();
    }

    const stride = (areaMap.mapResX+1);
    const totalBits = stride * (areaMap.mapResY+1);

    let byteIndex = 0;
    let y = 0;
    let x = 0;
    for(let i = 0; i < totalBits; i++){
      let bitIndex = i % 8;
      
      const posX =       (x * (scaleX)),
            posY = 256 - (y * (scaleY));
      const explored = !!(areaMap.data[byteIndex] & 1 << bitIndex);
  
      const fogMaterial = new THREE.MeshBasicMaterial();
      fogMaterial.map = this.fogTexture;
      fogMaterial.color.setHex(0xFFFFFF);
      fogMaterial.transparent = false;

      const mesh = new THREE.Mesh(fogGeometry, fogMaterial);
      mesh.position.set(posX, posY, 1);
      mesh.scale.set(scaleX*2, scaleY*2, 1);

      this.fogGroup.add(mesh);
      mesh.visible = !explored;

      this.fogTiles[i] = {
        x: posX,
        y: posY,
        size: scaleX,
        explored: !!explored,
        material: fogMaterial,
        mesh: mesh,
      }
      
      x++;
      if(!((i+1) % stride)){
        y++;
        x = 0;
      }
      
      if(!((i+1) % 8)){
        byteIndex++;
      }
    }
  }

  updateFog(){
    if(!this.areaMap) return;

    const resX = this.areaMap.mapResX+1;
    const resY = this.areaMap.mapResY+1;

    const stride = resX;
    const totalBits = stride * resY;

    for(let i = 0, len = this.fogTiles.length; i < len; i++){
      const tile = this.fogTiles[i];
      if(tile){
        tile.material.transparent = false;
        tile.mesh.visible = true;
      }
    }

    let byteIndex = 0;
    let y = 0;
    let x = 0;
    for(let i = 0; i < totalBits; i++){
      let bitIndex = i % 8;
      const explored = !!(this.areaMap.data[byteIndex] & 1 << bitIndex);

      const mTile = this.fogTiles[i];
      if(mTile && explored){
        const tlTile = this.fogTiles[(x-1) + ((y-1) * resX)];
        if(tlTile) tlTile.material.transparent = explored;
  
        const tTile = this.fogTiles[x + ((y-1) * resX)];
        if(tTile) tTile.material.transparent = explored;
  
        const trTile = this.fogTiles[(x+1) + ((y-1) * resX)];
        if(trTile) trTile.material.transparent = explored;

        const mlTile = this.fogTiles[(x-1) + (y * resX)];
        if(mlTile) mlTile.material.transparent = explored;

        mTile.material.transparent = explored;
        mTile.mesh.visible = !explored;
        
        const mrTile = this.fogTiles[(x+1) + (y * resX)];
        if(mrTile) mrTile.material.transparent = explored;
  
        const blTile = this.fogTiles[(x-1) + ((y+1) * resX)];
        if(blTile) blTile.material.transparent = explored;
  
        const bTile = this.fogTiles[x + ((y+1) * resX)];
        if(bTile) bTile.material.transparent = explored;
  
        const brTile = this.fogTiles[(x+1) + ((y+1) * resX)];
        if(brTile) brTile.material.transparent = explored;
      }
      
      x++;
      if(!((i+1) % stride)){
        y++;
        x = 0;
      }
      
      if(!((i+1) % 8)){
        byteIndex++;
      }
    }

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
    
    const mapPos = this.toMapCoordinates(this.position.x, this.position.y);
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
      const mapPos = this.toMapCoordinates(this.position.x, this.position.y);
      this.arrowPlane.position.set(
        (scaleSize.width * mapPos.x) + 4,
        (scaleSize.height * mapPos.y) + 4, 
        10
      );
      this.arrowPlane.rotation.set(0, 0, this.arrowAngle);
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

    if(this.control instanceof GUIControl){
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

  toMapCoordinates(x: number = 0, y: number = 0): THREE.Vector2 {
    let scaleX = 0, scaleY = 0;
    switch(this.areaMap.northAxis){
      case MapNorthAxis.NORTH: //end_m01aa
        {
          scaleY = (this.areaMap.mapPt1Y - this.areaMap.mapPt2Y) / (this.areaMap.worldPt1Y - this.areaMap.worldPt2Y);
          scaleX = (this.areaMap.mapPt1X - this.areaMap.mapPt2X) / (this.areaMap.worldPt1X - this.areaMap.worldPt2X);

          this._mapCoordinates.x = (( x - this.areaMap.worldPt1X) * scaleX) + this.areaMap.mapPt1X;
          this._mapCoordinates.y = 1 - (((y - this.areaMap.worldPt1Y) * scaleY) + this.areaMap.mapPt1Y);
        }
      break;
      case MapNorthAxis.SOUTH:
        {
          scaleY = (this.areaMap.mapPt1Y - this.areaMap.mapPt2Y) / (this.areaMap.worldPt1Y - this.areaMap.worldPt2Y);
          scaleX = (this.areaMap.mapPt1X - this.areaMap.mapPt2X) / (this.areaMap.worldPt1X - this.areaMap.worldPt2X);

          this._mapCoordinates.x = (((x - this.areaMap.worldPt1X) * scaleX) + this.areaMap.mapPt1X);
          this._mapCoordinates.y = (((y - this.areaMap.worldPt1Y) * scaleY) + this.areaMap.mapPt1Y);
        }
      break;
      case MapNorthAxis.EAST:
        {
          scaleX = (this.areaMap.mapPt1Y - this.areaMap.mapPt2Y) / (this.areaMap.worldPt1X - this.areaMap.worldPt2X);
			    scaleY = (this.areaMap.mapPt1X - this.areaMap.mapPt2X) / (this.areaMap.worldPt1Y - this.areaMap.worldPt2Y);

          this._mapCoordinates.x = (((y - this.areaMap.worldPt1Y) * scaleY) + this.areaMap.mapPt1X);
          this._mapCoordinates.y = (((x - this.areaMap.worldPt1X) * scaleX) + this.areaMap.mapPt1Y);
        }
      break;
      case MapNorthAxis.WEST: //end_m01ab
        {
          scaleX = (this.areaMap.mapPt1Y - this.areaMap.mapPt2Y) / (this.areaMap.worldPt1X - this.areaMap.worldPt2X);
			    scaleY = (this.areaMap.mapPt1X - this.areaMap.mapPt2X) / (this.areaMap.worldPt1Y - this.areaMap.worldPt2Y);

          this._mapCoordinates.x = (((y - this.areaMap.worldPt1Y) * scaleY) + this.areaMap.mapPt1X);
          this._mapCoordinates.y = 1 - (((x - this.areaMap.worldPt1X) * scaleX) + this.areaMap.mapPt1Y);
        }
      break;
    }
    return this._mapCoordinates;
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
          this.arrowAngle = -angle;
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
