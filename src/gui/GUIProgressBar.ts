import * as THREE from "three";
import type { GameMenu } from "./GameMenu";
import { GUIControl } from "./GUIControl";
import { TextureType } from "../enums/loaders/TextureType";
import { IGUIControlBorder } from "../interface/gui/IGUIControlBorder";
import { TextureLoader } from "../loaders";
import { ShaderManager } from "../managers/ShaderManager";
import type { GFFStruct } from "../resource/GFFStruct";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";

/**
 * GUIProgressBar class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIProgressBar.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIProgressBar extends GUIControl {
  curValue: number;
  startFromLeft: boolean;
  maxValue: number;

  progress: IGUIControlBorder;
  hasProgress: boolean;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIProgressBar;

    this.startFromLeft = ( control.hasField('STARTFROMLEFT') ? control.getFieldByLabel('STARTFROMLEFT')?.getValue() : 0 );
    this.curValue = ( control.hasField('CURVALUE') ? control.getFieldByLabel('CURVALUE')?.getValue() : 0 );
    this.maxValue = ( control.hasField('MAXVALUE') ? control.getFieldByLabel('MAXVALUE')?.getValue() : 0 );

    this.widget.userData.progress = new THREE.Group();
    this.widget.add(this.widget.userData.progress);

    //----------//
    // Progress
    //----------//

    this.progress = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      corner_material: {} as THREE.ShaderMaterial,
      edge: '',
      edge_material: {} as THREE.ShaderMaterial,
      mesh: {} as THREE.Mesh,
      geometry: {} as THREE.BufferGeometry,
      fill: {
        texture: '',
        material: {} as THREE.ShaderMaterial,
        mesh: {} as THREE.Mesh,
        geometry: {} as THREE.BufferGeometry
      },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.progress.geometry = new THREE.BufferGeometry();
    
    this.progress.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.progress.edge_material.defines.USE_MAP = '';
    this.progress.edge_material.uniforms.diffuse.value = this.progress.color;

    this.progress.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.progress.corner_material.defines.USE_MAP = '';
    this.progress.corner_material.uniforms.diffuse.value = this.progress.color;

    this.progress.mesh = new THREE.Mesh( this.progress.geometry, [this.progress.edge_material, this.progress.corner_material] );
    this.widget.userData.progress.add(this.progress.mesh);

    //---------------//
    // Progress Fill
    //---------------//
    
    this.progress.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.progress.fill.material.defines.USE_MAP = '';
    this.progress.fill.material.uniforms.diffuse.value = this.progress.color;
    this.progress.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.progress.fill.mesh = new THREE.Mesh( this.progress.fill.geometry, this.progress.fill.material );
    this.progress.fill.mesh.position.z = this.zOffset + 1;

    this.widget.userData.progress.add( this.progress.fill.mesh );

    if(this.control){
      
      //Progress
      this.hasProgress = control.hasField('PROGRESS');
      if(this.hasProgress){
        let progress = control.getFieldByLabel('PROGRESS')?.getChildStructs()[0];
        if(progress){
          if(progress.hasField('COLOR')){
            let color = progress.getFieldByLabel('COLOR')?.getVector();
            if(color){
              this.progress.color.setRGB(color.x, color.y, color.z)
            }
          }

          if(typeof this.progress.color === 'undefined'){
            this.progress.color = new THREE.Color(1, 1, 1); //this.defaultColor;
          }

          this.progress.dimension = progress.getFieldByLabel('DIMENSION')?.getValue() || 0;
          this.progress.corner = progress.getFieldByLabel('CORNER')?.getValue();
          this.progress.edge = progress.getFieldByLabel('EDGE')?.getValue();
          this.progress.fill.texture = progress.getFieldByLabel('FILL')?.getValue();
          this.progress.fillstyle = progress.getFieldByLabel('FILLSTYLE')?.getValue() || 0;
          this.progress.inneroffset = this.progress.inneroffsety = progress.getFieldByLabel('INNEROFFSET')?.getValue() || 0;

          if(progress.hasField('INNEROFFSETY'))
            this.progress.inneroffsety = progress.getFieldByLabel('INNEROFFSETY')?.getValue();

          this.progress.pulsing = progress.getFieldByLabel('PULSING')?.getValue() || 0;
        }
      }

    }

    //----------//
    // Progress
    //----------//

    if(this.progress.edge != ''){
      TextureLoader.enQueue(this.progress.edge, this.progress.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture)
          console.log('initTextures', this.progress.edge, texture);

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.progress.corner != ''){
      TextureLoader.enQueue(this.progress.corner, this.progress.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture)
          console.log('initTextures', this.progress.corner, texture);

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.progress.fill.texture != ''){
      this.progress.fill.material.transparent = true;
      TextureLoader.enQueue(this.progress.fill.texture, this.progress.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(texture == null){
          this.progress.fill.material.uniforms.opacity.value = 0.01;
        }
      });
    }else{
      this.progress.fill.material.visible = false;
    }

  }

  setProgress(val: number = 100){

    this.curValue = val < 0 ? 0 : val;
    this.curValue = !this.curValue ? 0.000000000000001 : this.curValue;
    
    let value = Math.min(this.curValue / this.maxValue, 1);

    let extent = this.getFillExtent();
    let sprite = this.progress.fill.mesh;

    if(extent.width > extent.height){
      sprite.scale.set( extent.width * value, extent.height, 1.0 );
      let offsetX = (extent.width -(extent.width * value))/2;
      if(this.startFromLeft)
        sprite.position.x = -offsetX;
      else
        sprite.position.x = +offsetX;
    }else{
      sprite.scale.set( extent.width, extent.height * value, 1.0 );
      let offsetY = (extent.height -(extent.height * value))/2;
      if(this.startFromLeft)
        sprite.position.y = +offsetY;
      else
        sprite.position.y = -offsetY;
    }

    (this.progress.fill.geometry.attributes.uv as THREE.BufferAttribute).setY(1, value);
    this.progress.fill.geometry.attributes.uv.needsUpdate = true;
    
    (sprite.material as any).uniforms.opacity.value = 1;
    (sprite.material as any).transparent = true;

  }

  getFillTextureName(){
    return this.progress.fill.texture;
  }

  setFillTextureName(name = ''){
    this.progress.fill.texture = name;
    return new Promise<OdysseyTexture>( (resolve, reject) => {
      TextureLoader.enQueue(this.progress.fill.texture, this.progress.fill.material, TextureType.TEXTURE, resolve);
    })
  }

  setFillTexture(map: THREE.Texture){
    if(!(map instanceof THREE.Texture)){
      map = TextureLoader.textures.get('fx_static');
    }

    this.progress.fill.material.uniforms.map.value = map;
    (this.progress.fill as any).material.map = map;

    if(map instanceof THREE.Texture){
      this.progress.fill.material.visible = true;
      this.progress.fill.material.uniforms.opacity.value = 1;
      this.progress.fill.material.uniforms.uvTransform.value = this.progress.fill.material.uniforms.map.value.matrix;
      this.progress.fill.material.uniforms.map.value.updateMatrix();
      this.progress.fill.material.defines.USE_UV = '';
      this.progress.fill.material.defines.USE_MAP = '';
    }else{
      this.progress.fill.material.visible = false;
    }

    this.progress.fill.material.needsUpdate = true;
    this.progress.fill.material.uniformsNeedUpdate = true;
    this.progress.fill.material.visible = (map instanceof THREE.Texture);
  }

  _onCreate(){
    super._onCreate();
    this.setProgress(this.curValue);
  }

}
