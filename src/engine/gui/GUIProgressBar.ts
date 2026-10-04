import * as THREE from "three";
import type { GameMenu } from "@engine/gui/GameMenu";
import { GUIControl } from "@engine/gui/GUIControl";
import { TextureType } from "@core/enums/loaders/TextureType";
import { IGUIControlBorder } from "@engine/interface/gui/IGUIControlBorder";
import type { IGUIControlChrome } from "@engine/interface/gui/IGUIControlChrome";
import { TextureLoader } from "@engine/loaders";
import type { GFFStruct } from "@core/resource/GFFStruct";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { GUIControlTypeMask } from "@core/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@core/enums/gui/GUIControlType";
import {
  bindChromeTexture,
  buildFillChromeGeometry,
  createGuiChrome,
} from "@engine/gui/guiChrome";
import { asExtentInt, truncDiv } from "@engine/gui/GUICoord";
import { commitGuiTransform } from "@engine/gui/guiMatrix";

/**
 * GUIProgressBar class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * Progress overlay uses a second chrome mesh (independent width animation).
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
  progressChrome: IGUIControlChrome;
  hasProgress: boolean;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIProgressBar;
    this.setControlType(GUIControlType.Progress);

    this.startFromLeft = ( control.hasField('STARTFROMLEFT') ? control.getFieldByLabel('STARTFROMLEFT')?.getValue() : 0 );
    this.curValue = ( control.hasField('CURVALUE') ? control.getFieldByLabel('CURVALUE')?.getValue() : 0 );
    this.maxValue = ( control.hasField('MAXVALUE') ? control.getFieldByLabel('MAXVALUE')?.getValue() : 0 );

    this.progress = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      edge: '',
      fill: { texture: '' },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    // Progress overlay sits above base chrome (same widget): zOffset+1 and renderOrder id+1.
    this.progressChrome = createGuiChrome();
    this.progressChrome.material.uniforms.diffuse.value = this.progress.color;
    this.progressChrome.material.uniforms.fillDiffuse.value = this.progress.color;
    this.progressChrome.mesh.name = 'GUIProgressChrome';
    this.progressChrome.mesh.position.z = this.zOffset + 1;
    this.progressChrome.mesh.renderOrder = this.getRenderOrder(this.id + 1);
    commitGuiTransform(this.progressChrome.mesh);
    this.widget.add(this.progressChrome.mesh);

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
            this.progress.color = new THREE.Color(1, 1, 1);
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

    this.progressChrome.material.uniforms.diffuse.value.copy(this.progress.color);
    this.progressChrome.material.uniforms.fillDiffuse.value.copy(this.progress.color);

    const enqueue = (name: string, slot: 'edgeMap' | 'cornerMap' | 'fillMap') => {
      if(!name){
        bindChromeTexture(this.progressChrome.material, slot, null);
        return;
      }
      TextureLoader.enQueue(name, this.progressChrome.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          if(slot === 'fillMap'){
            this.progressChrome.material.uniforms.fillOpacity.value = 0.01;
          }
          return;
        }
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        bindChromeTexture(this.progressChrome.material, slot, texture);
      }, undefined, slot);
    };

    enqueue(this.progress.edge, 'edgeMap');
    enqueue(this.progress.corner, 'cornerMap');
    enqueue(this.progress.fill.texture, 'fillMap');

    this.attachEventListenters(this.progressChrome.mesh);
  }

  buildChrome(){
    super.buildChrome();
    this.buildProgressChrome();
  }

  refreshRenderOrder(){
    super.refreshRenderOrder();
    if(this.progressChrome?.mesh){
      this.progressChrome.mesh.renderOrder = this.getRenderOrder(this.id + 1);
    }
  }

  buildProgressChrome(){
    // Animated overlay is fill-only; frame tiles (if any) stay full-size on a sibling mesh.
    const fillExtent = this.getFillExtent();

    if(this.progressChrome.geometry instanceof THREE.BufferGeometry){
      this.progressChrome.geometry.dispose();
    }
    this.progressChrome.geometry = buildFillChromeGeometry(fillExtent.width, fillExtent.height);
    this.progressChrome.mesh.geometry = this.progressChrome.geometry;
    this.progressChrome.mesh.position.z = this.zOffset + 1;
    commitGuiTransform(this.progressChrome.mesh);
    this.progressChrome.material.uniforms.enableFrame.value = 0;
    this.progressChrome.material.uniforms.enableFill.value = 1;
  }

  setProgress(val: number = 100){

    this.curValue = val < 0 ? 0 : asExtentInt(val);
    this.curValue = !this.curValue ? 0.000000000000001 : this.curValue;
    
    const maxV = asExtentInt(this.maxValue) || 1;
    let value = Math.min(this.curValue / maxV, 1);

    let extent = this.getFillExtent();
    const mesh = this.progressChrome.mesh;
    const fillW = asExtentInt(extent.width);
    const fillH = asExtentInt(extent.height);

    if(fillW > fillH){
      const scaledW = asExtentInt(fillW * value) || 1;
      mesh.scale.set( scaledW / Math.max(fillW, 1), 1, 1.0 );
      let offsetX = truncDiv(fillW - scaledW, 2);
      if(this.startFromLeft)
        mesh.position.x = -offsetX;
      else
        mesh.position.x = +offsetX;
      mesh.position.y = 0;
    }else{
      const scaledH = asExtentInt(fillH * value) || 1;
      mesh.scale.set( 1, scaledH / Math.max(fillH, 1), 1.0 );
      let offsetY = truncDiv(fillH - scaledH, 2);
      if(this.startFromLeft)
        mesh.position.y = +offsetY;
      else
        mesh.position.y = -offsetY;
      mesh.position.x = 0;
    }
    commitGuiTransform(mesh);

    // Match prior UV crop on the growing axis
    const uv = this.progressChrome.geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
    if(uv && uv.count >= 4){
      // PlaneGeometry UV layout: update vMax for vertical growth; keep u for horizontal scale via mesh.scale
      if(fillW <= fillH){
        uv.setY(1, value);
        uv.needsUpdate = true;
      }
    }

    this.progressChrome.material.uniforms.fillOpacity.value = 1;
    this.progressChrome.material.transparent = true;
    this.progressChrome.material.uniformsNeedUpdate = true;
  }

  getFillTextureName(){
    return this.progress.fill.texture;
  }

  setFillTextureName(name = ''){
    this.progress.fill.texture = name;
    return new Promise<OdysseyTexture>( (resolve, reject) => {
      TextureLoader.enQueue(this.progress.fill.texture, this.progressChrome.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        this.setFillTexture(texture);
        resolve(texture);
      }, undefined, 'fillMap');
    })
  }

  setFillTexture(map: THREE.Texture){
    if(!(map instanceof THREE.Texture)){
      map = TextureLoader.textures.get('fx_static');
    }
    bindChromeTexture(this.progressChrome.material, 'fillMap', map instanceof THREE.Texture ? map : null);
  }

  _onCreate(){
    super._onCreate();
    this.buildProgressChrome();
    this.setProgress(this.curValue);
  }

}
