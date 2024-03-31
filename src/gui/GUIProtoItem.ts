import type { GameMenu } from "./GameMenu";
import { GUIControl } from "./GUIControl";
import type { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";
import { Anchor } from "../enums/gui/Anchor";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import { ResolutionManager } from "../managers/ResolutionManager";
import type { GUIListBox } from "./GUIListBox";
import { Mouse } from "../controls/Mouse";

/**
 * GUIProtoItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIProtoItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIProtoItem extends GUIControl{

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIProtoItem;
    this.zOffset = 2;
    this.isProtoItem = false;

    this.onSelect = () => {
      this.onSelectStateChanged();
    };

    this.addEventListener('mouseIn', (e) => {
      console.log('mouseIn', this);
    })

    this.addEventListener('mouseOut', (e) => {
      console.log('mouseOut', this);
    })
  }

  onSelectStateChanged(){
    if(this.selected){
      this.showHighlight();
      this.hideBorder();
      this.pulsing = true;
      this.text.color.copy(this.defaultHighlightColor);
      this.text.material.uniforms.diffuse.value = this.text.color;
      this.text.material.needsUpdate = true;
    }else{
      this.hideHighlight();
      this.showBorder();
      this.pulsing = false;
      this.text.color.copy(this.defaultColor);
      this.text.material.uniforms.diffuse.value = this.text.color;
      this.text.material.needsUpdate = true;
    }
  }

  calculatePosition(){
    /*let posX = ((this.list.extent.width - this.extent.width)/2) - this.list.border.inneroffset;

    if(!this.list.isScrollBarLeft()){
      posX -= this.parent.border.inneroffset/2;
      posX = posX * -1;
    }else{
      posX -= this.parent.border.inneroffset + this.list.border.inneroffset;
    }

    let height = this.getItemHeight();
    let posY = this.list.lastHeight + (this.list.extent.height/2) - height;
    posY += height/2;
    this.list.lastHeight += height + this.list.padding;
    this.startX = posX;
    this.startY = posY;

    this.anchor = Anchor.None;
    this.anchorOffset.set(0, 0);

    this.widget.position.x = this.anchorOffset.x + this.offset.x;
    this.widget.position.y = this.anchorOffset.y + this.offset.y;
    
    this.calculateBox();*/
  }

  getItemHeight(){
    let height = 0;

    let cHeight = (this.extent.height + (this.getBorderSize()/2));

    if(this.text.geometry){
      this.text.geometry.computeBoundingBox();
      let tSize = this.text.geometry.boundingBox.getSize(new THREE.Vector3);
      if(tSize.y > cHeight){
        cHeight = tSize.y/2;
      }
    }
    height += cHeight;
    // return height;
    return this.extent.height;
  }

  calculateBox(){
    let worldPosition = this.parent.widget.position.clone();
    //console.log('worldPos', worldPosition);
    this.box.min.x = this.widget.position.x - this.extent.width/2 + worldPosition.x;
    this.box.min.y = this.widget.position.y - this.extent.height/2 + worldPosition.y;
    this.box.max.x = this.widget.position.x + this.extent.width/2 + worldPosition.x;
    this.box.max.y = this.widget.position.y + this.extent.height/2 + worldPosition.y;
    
    for(let i = 0; i < this.children.length; i++){
      this.children[i].updateBounds();
    }
  }

  directionalNavigate(direction = ''){
    if(this.list){
      this.list.directionalNavigate(direction);
    }
  }

}
