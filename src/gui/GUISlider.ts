import { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "@/loaders";
import { TextureType } from "@/enums/loaders/TextureType";
import { GameState } from "@/GameState";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUISliderDirection } from "@/enums/gui/GUISliderDirection";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { GUIControl } from "@/gui/GUIControl";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { asExtentInt, hitCheckMouseLocal, truncDiv } from "@/gui/GUICoord";

/** Retail HitCheckSlider result codes. */
export enum SliderHit {
  MISS = 0,
  THUMB = 1,
  BEFORE = 2,
  AFTER = 3,
}

/**
 * GUISlider class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUISlider.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUISlider extends GUIControl{

  onValueChanged: Function;

  thumbStruct: GFFStruct;
  scrollPos: number;
  scrollMax: number;
  mouseOffset: { x: number; y: number; };
  value: number;
  thumb: { texture: string; material: THREE.SpriteMaterial; mesh: THREE.Sprite; geometry: THREE.BufferGeometry; width: number; height: number; };
  direction: GUISliderDirection = GUISliderDirection.Horizontal;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUISlider;
    this.setControlType(GUIControlType.Slider);

    this.scrollPos = 0.5;
    this.scrollMax = 1;
    this.mouseOffset = {x: 0, y: 0};
    this.value = 0.50;

    this.thumb = {
      texture: '',
      material: undefined,
      mesh: undefined,
      geometry: undefined,
      width: 8,
      height: 32,
    };

    this.thumb.material = new THREE.SpriteMaterial( { map: null, color: new THREE.Color(0xFFFFFF) } );
    this.thumb.material.transparent = true;
    this.thumb.mesh = new THREE.Sprite( this.thumb.material );
    this.widget.add(this.thumb.mesh);

    this.thumb.mesh.addEventListener('click', () => {
      this.mouseInside();
    });

    if(this.control.hasField('THUMB')){
      this.thumbStruct = this.control.getFieldByLabel('THUMB').getChildStructs()[0];

      this.thumb.mesh.position.z = 2;
      this.thumb.mesh.name = 'SCROLLBAR thumb';
      this.thumb.mesh.scale.x = asExtentInt(this.thumb.width);
      this.thumb.mesh.scale.y = asExtentInt(this.thumb.height);

      let parentPos = this.widget.getWorldPosition(new THREE.Vector3());
      const halfW = truncDiv(asExtentInt(this.extent.width), 2);
      const halfH = truncDiv(asExtentInt(this.extent.height), 2);

      this.thumb.mesh.userData.box = new THREE.Box2(
        new THREE.Vector2(
          asExtentInt(parentPos.x) - halfW,
          asExtentInt(parentPos.y) - halfH
        ),
        new THREE.Vector2(
          asExtentInt(parentPos.x) + halfW,
          asExtentInt(parentPos.y) + halfH
        )
      )

      if(this.thumbStruct.hasField('IMAGE')){
        TextureLoader.enQueue(this.thumbStruct.getFieldByLabel('IMAGE').getValue(), this.thumb.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          this.thumb.material.alphaTest = 0.5;
          this.thumb.material.needsUpdate = true;
          this.thumb.material.depthTest = false;
          this.thumb.material.depthWrite = false;
          this.thumb.material.transparent = true;
          if(texture.header){
            this.thumb.width = asExtentInt(texture.header.width);
            this.thumb.height = asExtentInt(texture.header.height);
            this.thumb.mesh.scale.set(this.thumb.width, this.thumb.height, 1);
            this.setValue(this.value);
          }
        });
        TextureLoader.LoadQueue();
      }
    }

    this.addEventListener('mouseMove', () => {
      this.mouseInside();
    })

    this.addEventListener('click', (e) =>{
      e.stopPropagation();
      const local = this.getPanelLocalMouse();
      const hit = this.hitCheckSlider(local.x, local.y);
      if (hit === SliderHit.MISS) return;
      this.mouseInside();
    });

    this.addEventListener('mouseDown', (e) => {
      e.stopPropagation();
      const local = this.getPanelLocalMouse();
      const hit = this.hitCheckSlider(local.x, local.y);
      if (hit === SliderHit.MISS) return;
      this.mouseInside();
    });

    this.addEventListener('mouseUp', () => {
      this.mouseInside();
    });

    this.setValue(this.value);

  }

  onINIPropertyAttached(){
    if(this.iniProperty)
      this.setValue(GameState.iniConfig.getProperty(this.iniProperty) * .01);
  }

  /**
   * Retail HitCheckSlider.
   * Thumb (1) / before (2) / after (3) / miss (0) in panel-local ints.
   * Axis: vertical when extent.width < extent.height.
   */
  hitCheckSlider(panelLocalX: number, panelLocalY: number): SliderHit {
    const x = asExtentInt(panelLocalX);
    const y = asExtentInt(panelLocalY);
    const left = asExtentInt(this.extent.left);
    const top = asExtentInt(this.extent.top);
    const w = asExtentInt(this.extent.width);
    const h = asExtentInt(this.extent.height);
    if (!hitCheckMouseLocal(this.extent, x, y)) {
      return SliderHit.MISS;
    }

    const thumbW = asExtentInt(this.thumb.width);
    const thumbH = asExtentInt(this.thumb.height);
    const vertical = w < h;

    if (vertical) {
      const maxTravel = Math.max(0, h - thumbH);
      const thumbTop = top + asExtentInt(maxTravel * (1 - this.value));
      if (hitCheckMouseLocal({ left, top: thumbTop, width: w, height: thumbH }, x, y)) {
        return SliderHit.THUMB;
      }
      if (y < thumbTop) return SliderHit.BEFORE;
      if (y > thumbTop + thumbH) return SliderHit.AFTER;
      return SliderHit.MISS;
    }

    const maxTravel = Math.max(0, w - thumbW);
    const thumbLeft = left + asExtentInt(maxTravel * this.value);
    if (hitCheckMouseLocal({ left: thumbLeft, top, width: thumbW, height: h }, x, y)) {
      return SliderHit.THUMB;
    }
    if (x < thumbLeft) return SliderHit.BEFORE;
    if (x > thumbLeft + thumbW) return SliderHit.AFTER;
    return SliderHit.MISS;
  }

  mouseInside(){
    if(this.disableSelection) return;

    const local = this.getPanelLocalMouse();
    const left = asExtentInt(this.extent.left);
    const top = asExtentInt(this.extent.top);
    const w = asExtentInt(this.extent.width);
    const h = asExtentInt(this.extent.height);

    let value = this.value;
    let valueChanged = false;

    if(this.direction == GUISliderDirection.Horizontal){
      const thumbW = asExtentInt(this.thumb.width);
      const maxWidth = Math.max(0, w - thumbW);
      let lx = asExtentInt(local.x) - left - truncDiv(thumbW, 2);
      if (lx < 0) lx = 0;
      if (lx > maxWidth) lx = maxWidth;
      const scrollX = maxWidth > 0 ? lx / maxWidth : 0;
      this.thumb.mesh.position.x = asExtentInt(maxWidth * (scrollX - 0.5));
      this.thumb.mesh.position.y = 0;
      valueChanged = (scrollX != this.value);
      value = scrollX;
    }else{
      const thumbH = asExtentInt(this.thumb.height);
      const maxHeight = Math.max(0, h - thumbH);
      // Panel Y-down: top = high value end for vertical (matches setValue)
      let ly = asExtentInt(local.y) - top - truncDiv(thumbH, 2);
      if (ly < 0) ly = 0;
      if (ly > maxHeight) ly = maxHeight;
      const scrollY = maxHeight > 0 ? 1 - (ly / maxHeight) : 0;
      this.thumb.mesh.position.x = 0;
      this.thumb.mesh.position.y = asExtentInt(maxHeight * (scrollY - 0.5));
      valueChanged = (scrollY != this.value);
      value = scrollY;
    }

    this.value = value;

    if(this.iniProperty){
      GameState.iniConfig.setProperty(this.iniProperty, (this.value * 100) | 0);
    }

    if(valueChanged && typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

  }

  setValue(value = 0){

    this.value = value;

    if(this.direction == GUISliderDirection.Horizontal){
      const maxWidth = Math.max(0, asExtentInt(this.extent.width) - asExtentInt(this.thumb.width));
      const threshold = truncDiv(maxWidth, 2);
      const thumbX = asExtentInt((maxWidth * value) - threshold);

      this.thumb.mesh.position.x = thumbX;
      this.thumb.mesh.position.y = 0;
    }else{
      const maxHeight = Math.max(0, asExtentInt(this.extent.height) - asExtentInt(this.thumb.height));
      const threshold = truncDiv(maxHeight, 2);
      const thumbY = asExtentInt((maxHeight * value) - threshold);

      this.thumb.mesh.position.y = thumbY;
      this.thumb.mesh.position.x = 0;
    }

    if(this.iniProperty){
      GameState.iniConfig.setProperty(this.iniProperty, (this.value * 100) | 0);
    }
    
    if(typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

  }

  setVertical(){
    this.direction = GUISliderDirection.Vertical;
  }

  setHorizontal(){
    this.direction = GUISliderDirection.Horizontal;
  }

}
