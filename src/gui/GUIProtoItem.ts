import type { GameMenu } from "./GameMenu";
import { GUIControl } from "./GUIControl";
import type { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";
import { Anchor } from "../enums/gui/Anchor";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import { ResolutionManager } from "../managers/ResolutionManager";
import type { GUIListBox } from "./GUIListBox";

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
  isProtoItem: boolean;
  list: GUIListBox;
  startX: number;
  startY: number;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIProtoItem;
    this.zOffset = 2;
    this.isProtoItem = false;

    this.onSelect = () => {
      if(this.selected){
        this.showHighlight();
        this.hideBorder();
        this.pulsing = true;
        this.text.color.setRGB(1, 1, 0);
        this.text.material.uniforms.diffuse.value = this.text.color;
        this.text.material.needsUpdate = true;
      }else{
        this.hideHighlight();
        this.showBorder();
        this.pulsing = false;
        this.text.color.setRGB(0, 0.658824, 0.980392);
        this.text.material.uniforms.diffuse.value = this.text.color;
        this.text.material.needsUpdate = true;
      }
    };
  }

  setList(list: GUIListBox){
    this.list = list;
  }

  calculatePosition(){
    let parentExtent = { width: this.menu.width, height: this.menu.height };
    let parentOffsetX, parentOffsetY;
    if(!(this.parent instanceof THREE.Scene)){
      parentExtent = this.menu.tGuiPanel.extent;
      //console.log(this.parent)
      //parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x;
      //parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y;
      parentOffsetX = this.menu.tGuiPanel.worldPosition.x;
      parentOffsetY = this.menu.tGuiPanel.worldPosition.y;

    }else{
      parentOffsetX = parentOffsetY = 0;
    }

    let wRatio = ResolutionManager.getViewportWidth() / this.menu.tGuiPanel.extent.width;
    let hRatio = ResolutionManager.getViewportHeight() / this.menu.tGuiPanel.extent.height;

    //let posX = (this.extent.left - ( (parentExtent.width  - this.extent.width) / 2 ) );

    let listIndex = this.list.children.indexOf(this);
    //console.log('List Index', listIndex);

    //let posX = -(this.list.extent.left - this.extent.left)/2;
    let posX = ((this.list.extent.width - this.extent.width)/2) - this.list.padding;

    if(!this.list.isScrollBarLeft()){
      posX = posX * -1;
    }

    let height = this.getItemHeight();
    let posY = this.list.extent.height/2 - (height + this.list.lastHeight);//((this.list.extent.height - 4) + ( (height - 4) - ((this.extent.height) * listIndex) ));
    posY += height/2;
    this.list.lastHeight += height;
    this.startX = posX;
    this.startY = posY;
    this.anchor = Anchor.None;
    this.anchorOffset.set(posX, posY);

    this.widget.position.x = this.anchorOffset.x + this.offset.x;
    this.widget.position.y = this.anchorOffset.y + this.offset.y;
    
    this.calculateBox();

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
    return height;
  }

  calculateBox(){
    let worldPosition = this.parent.widget.position.clone();
    //console.log('worldPos', worldPosition);
    this.box.min.x = this.widget.position.x - this.extent.width/2 + worldPosition.x;
    this.box.min.y = this.widget.position.y - this.extent.height/2 + worldPosition.y;
    this.box.max.x = this.widget.position.x + this.extent.width/2 + worldPosition.x;
    this.box.max.y = this.widget.position.y + this.extent.height/2 + worldPosition.y;

    /*this.box = new THREE.Box2(
      new THREE.Vector2(
        this.widget.position.x - this.extent.width/2 + worldPosition.x,
        this.widget.position.y - this.extent.height/2 + worldPosition.y
      ),
      new THREE.Vector2(
        this.widget.position.x + this.extent.width/2 + worldPosition.x,
        this.widget.position.y + this.extent.height/2 + worldPosition.y
      )
    );*/
    
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
