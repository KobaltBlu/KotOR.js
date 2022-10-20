/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { GameMenu, GUIControl } from ".";
import { TextureType } from "../enums/loaders/TextureType";
import { GUIControlBorder } from "../interface/gui/GUIControlBorder";
import { TextureLoader } from "../loaders/TextureLoader";
import { ShaderManager } from "../managers/ShaderManager";
import { GFFStruct } from "../resource/GFFStruct";
import { OdysseyTexture } from "../resource/OdysseyTexture";

/* @file
 * The GUIProgressBar class.
 */

export class GUIProgressBar extends GUIControl {
  curValue: number;
  startFromLeft: boolean;
  maxValue: number;

  progress: GUIControlBorder;
  hasProgress: boolean;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);

    this.startFromLeft = ( control.HasField('STARTFROMLEFT') ? control.GetFieldByLabel('STARTFROMLEFT')?.GetValue() : 0 );
    this.curValue = ( control.HasField('CURVALUE') ? control.GetFieldByLabel('CURVALUE')?.GetValue() : 0 );
    this.maxValue = ( control.HasField('MAXVALUE') ? control.GetFieldByLabel('MAXVALUE')?.GetValue() : 0 );

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
    this.progress.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.progress.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.progress.fill.mesh = new THREE.Mesh( this.progress.fill.geometry, this.progress.fill.material );
    this.progress.fill.mesh.position.z = this.zOffset + 1;

    this.widget.userData.progress.add( this.progress.fill.mesh );

    if(this.control instanceof GFFStruct){
      
      //Progress
      this.hasProgress = control.HasField('PROGRESS');
      if(this.hasProgress){
        let progress = control.GetFieldByLabel('PROGRESS')?.GetChildStructs()[0];
        if(progress){
          if(progress.HasField('COLOR')){
            let color = progress.GetFieldByLabel('COLOR')?.GetVector();
            if(color){
              this.progress.color.setRGB(color.x, color.y, color.z)
            }
          }

          if(typeof this.progress.color === 'undefined'){
            this.progress.color = new THREE.Color(1, 1, 1); //this.defaultColor;
          }

          this.progress.dimension = progress.GetFieldByLabel('DIMENSION')?.GetValue() || 0;
          this.progress.corner = progress.GetFieldByLabel('CORNER')?.GetValue();
          this.progress.edge = progress.GetFieldByLabel('EDGE')?.GetValue();
          this.progress.fill.texture = progress.GetFieldByLabel('FILL')?.GetValue();
          this.progress.fillstyle = progress.GetFieldByLabel('FILLSTYLE')?.GetValue() || 0;
          this.progress.inneroffset = this.progress.inneroffsety = progress.GetFieldByLabel('INNEROFFSET')?.GetValue() || 0;

          if(progress.HasField('INNEROFFSETY'))
            this.progress.inneroffsety = progress.GetFieldByLabel('INNEROFFSETY')?.GetValue();

          this.progress.pulsing = progress.GetFieldByLabel('PULSING')?.GetValue() || 0;
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
    
    // @ts-expect-error
    sprite.material.uniforms.opacity.value = 1;
    // @ts-expect-error
    sprite.material.transparent = true;

  }

  getFillTextureName(){
    return this.progress.fill.texture;
  }

  setFillTextureName(name = ''){
    this.progress.fill.texture = name;
  }

  setFillTexture(map: THREE.Texture){
    if(!(map instanceof THREE.Texture)){
      map = TextureLoader.textures.get('fx_static');
    }

    this.progress.fill.material.uniforms.map.value = map;
    // @ts-expect-error
    this.progress.fill.material.map = map;

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
