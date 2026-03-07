import type { GFFStruct } from "../resource/GFFStruct";

import * as THREE from "three";
import { TextureLoader } from "../loaders";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { TextureType } from "../enums/loaders/TextureType";
import { Mouse } from "../controls/Mouse";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import { ResolutionManager } from "../managers/ResolutionManager";
import { GUIControl } from "./GUIControl";
import type { GUIListBox } from "./GUIListBox";
import type { GameMenu } from "./GameMenu";

/**
 * GUIScrollBar class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIScrollBar.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIScrollBar extends GUIControl{
  _dir: GFFStruct | undefined;
  arrowTex: THREE.Texture;
  upArrowGeometry: THREE.PlaneGeometry;
  upArrowMaterial: THREE.MeshBasicMaterial;
  scrollPos: number;
  scrollMax: number;
  mouseOffset: { x: number; y: number; };
  upArrow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  downArrowGeometry: THREE.PlaneGeometry;
  downArrowMaterial: THREE.MeshBasicMaterial;
  downArrow: THREE.Mesh<any, any>;
  _thumb: GFFStruct;
  geometry: THREE.PlaneGeometry;
  thumbMaterial: THREE.MeshBasicMaterial;
  thumb: THREE.Mesh<any, any>;
  inner_box: any;

  arrowSize: number = 16;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIScrollBar;

    this.scrollPos = 0;
    this.scrollMax = 1;
    this.mouseOffset = {x: 0, y: 0};
    this.arrowSize = this.extent.width;

    this.extent.height -= (this.arrowSize + this.border.dimension) * 2;

    this.arrowTex = undefined;

    if(this.control.hasField('DIR')){
      this._dir = this.control.getFieldByLabel('DIR')?.getChildStructs()[0];
      if(this._dir?.hasField('IMAGE')){
        TextureLoader.tpcLoader.fetch(this._dir.getFieldByLabel('IMAGE')?.getValue()).then((texture: OdysseyTexture) => {
          this.arrowTex = texture;
          
          //Up Arrow
          this.upArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.upArrowMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), map: this.arrowTex, side: THREE.DoubleSide} );
          this.upArrow = new THREE.Mesh( this.upArrowGeometry, this.upArrowMaterial );

          this.widget.add(this.upArrow);
          this.upArrow.name = 'SCROLLBAR up arrow';
          this.upArrow.scale.x = this.arrowSize;
          this.upArrow.scale.y = this.arrowSize;
          this.upArrow.position.z = 5;

          this.upArrow.position.y = this.extent.height/2 + this.arrowSize/2;
          this.upArrow.userData.worldPosition = new THREE.Vector3();

          this.upArrowMaterial.transparent = true;
          this.upArrowMaterial.needsUpdate = true;

          let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

          this.upArrow.userData.updateBox = () => {
            this.upArrow.getWorldPosition(this.upArrow.userData.worldPosition);
            this.upArrow.userData.box = new THREE.Box2(
              new THREE.Vector2(
                -this.extent.width/2,
                -this.extent.width/2
              ),
              new THREE.Vector2(
                this.extent.width/2,
                this.extent.width/2
              )
            );
            this.upArrow.userData.box.translate(this.upArrow.userData.worldPosition);
          };
          this.upArrow.userData.updateBox();

          //Down Arrow
          this.downArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.downArrowMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), map: this.arrowTex, side: THREE.DoubleSide} );
          this.downArrow = new THREE.Mesh( this.downArrowGeometry, this.downArrowMaterial );

          this.widget.add(this.downArrow);
          this.downArrow.name = 'SCROLLBAR up arrow';
          this.downArrow.scale.x = this.arrowSize;
          this.downArrow.scale.y = this.arrowSize;
          this.downArrow.position.z = 5;
          this.downArrow.position.y = -(this.extent.height/2 + this.arrowSize/2);
          this.downArrow.rotation.z = Math.PI;
          this.downArrow.userData.worldPosition = new THREE.Vector3();

          parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

          this.downArrowMaterial.transparent = true;
          this.downArrowMaterial.needsUpdate = true;

          this.downArrow.userData.updateBox = () => {
            this.downArrow.getWorldPosition(this.downArrow.userData.worldPosition);
            this.downArrow.userData.box = new THREE.Box2(
              new THREE.Vector2(
                -this.extent.width/2,
                -this.extent.width/2
              ),
              new THREE.Vector2(
                this.extent.width/2,
                this.extent.width/2
              )
            );
            this.downArrow.userData.box.translate(this.downArrow.userData.worldPosition)
          };
          this.downArrow.userData.updateBox();

          this.upArrow.userData.onClick = (e: any) => {
            this.scrollUp();
          };

          this.downArrow.userData.onClick = (e: any) => {
            this.scrollDown();
          };

        });
      }
    }

    if(this.control.hasField('THUMB')){
      this._thumb = this.control.getFieldByLabel('THUMB').getChildStructs()[0];
      /*this.thumbMaterial = new THREE.SpriteMaterial( { map: null, color: new THREE.Color(0xFFFFFF) } );
      this.thumbMaterial.transparent = true;
      this.thumb = new THREE.Sprite( this.thumbMaterial );*/

      this.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      this.thumbMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
      this.thumb = new THREE.Mesh( this.geometry, this.thumbMaterial );

      this.widget.add(this.thumb);
      this.thumb.name = 'SCROLLBAR thumb';
      this.thumb.scale.x = this.extent.width/2;
      this.thumb.scale.y = this.extent.height/2;
      this.thumb.position.z = 5;

      let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

      this.thumb.userData.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (parentPos.y - this.extent.height/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (parentPos.y + this.extent.height/2)
        )
      )

      this.thumb.userData.onClick = (e: any) => {
        this.processEventListener('click', [e]);
      };

      this.thumb.userData.onMouseMove = (e: any) =>{
        this.processEventListener('mouseMove', [e]);
      }

      this.thumb.userData.onMouseDown = (e: any) => {
        this.processEventListener('mouseDown', [e]);
      };

      this.thumb.userData.onMouseUp = (e: any) => {
        this.processEventListener('mouseUp', [e]);
      };
      
      this.thumb.userData.onHover = (e: any) => {
        this.processEventListener('hover', [e]);
      };

      this.thumb.userData.getControl = (e: any) => {
        return this;
      };

      // this.thumb.click = (e: any) => {
      //   console.log('scroll thumb')
      // };

      if(this._thumb.hasField('IMAGE')){
        TextureLoader.enQueue(this._thumb.getFieldByLabel('IMAGE').getValue(), this.thumbMaterial, TextureType.TEXTURE);
        TextureLoader.LoadQueue();
      }
    }

    this.addEventListener('mouseMove', () => {
      //if(this.inner_box.containsPoint(Mouse.positionUI)){
        this.mouseInside();
      //}
    });

    this.addEventListener('click', () =>{
      let mouseX = Mouse.positionViewport.x - (ResolutionManager.getViewportWidthScaled() / 2);
      let mouseY = Mouse.positionViewport.y - (ResolutionManager.getViewportHeightScaled() / 2);

      let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      if(this.upArrow.userData.box.containsPoint(Mouse.positionUI)){
        this.list.scrollUp();
      }else if(this.downArrow.userData.box.containsPoint(Mouse.positionUI)){
        this.list.scrollDown();
      }else if(this.inner_box.containsPoint(Mouse.positionUI)){
        this.mouseInside();
      }
    })

    this.addEventListener('mouseDown', (e) => {
      e.stopPropagation();
      let mouseX = Mouse.positionViewport.x - (ResolutionManager.getViewportWidthScaled() / 2);
      let mouseY = Mouse.positionViewport.y - (ResolutionManager.getViewportHeightScaled() / 2);
      let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      this.upArrow.userData.updateBox();
      this.downArrow.userData.updateBox();
    });

    this.addEventListener('mouseUp', () => {
      let mouseX = Mouse.positionViewport.x - (ResolutionManager.getViewportWidthScaled() / 2);
      let mouseY = Mouse.positionViewport.y - (ResolutionManager.getViewportHeightScaled() / 2);
      //let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      //this.mouseOffset.y = scrollTop;
      //console.log('GUIScrollBar', 'blah');
      /*if(this.upArrow.box.containsPoint(Mouse.Mouse.positionUI)){
        console.log('GUIScrollBar', 'up');
        this.list.scrollUp();
      }else if(this.downArrow.box.containsPoint(Mouse.Mouse.positionUI)){
        console.log('GUIScrollBar', 'down');
        this.list.scrollDown();
      }else */if(this.inner_box.containsPoint(Mouse.positionUI)){
        //console.log('GUIScrollBar', 'scroll');
        this.mouseInside();
      }
    });

  }
  
  scrollUp() {
    // throw new Error("Method not implemented.");
  }
  scrollDown() {
    // throw new Error("Method not implemented.");
  }

  mouseInside(){

    let mouseX = Mouse.positionViewport.x - (ResolutionManager.getViewportWidthScaled() / 2);
    let mouseY = Mouse.positionViewport.y - (ResolutionManager.getViewportHeightScaled() / 2);
    //console.log(mouseY);
    //if(this.inner_box.containsPoint({x: mouseX, y: mouseY})){

      let centerPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

      let scrollBarHeight = this.extent.height;

      this.thumb.position.y = -(mouseY) || 0;

      if(this.thumb.position.y < -((scrollBarHeight - this.thumb.scale.y))/2 ){
        this.thumb.position.y = -((scrollBarHeight - this.thumb.scale.y))/2 || 0
      }

      if(this.thumb.position.y > ((scrollBarHeight - this.thumb.scale.y))/2 ){
        this.thumb.position.y = ((scrollBarHeight - this.thumb.scale.y))/2 || 0
      }

      let maxScroll = ((scrollBarHeight - this.thumb.scale.y)/2);
      scrollY = (this.thumb.position.y + maxScroll) / (maxScroll*2);
      this.scrollPos = 1.0 - scrollY;
      this.update();

    //}

  }

  setList(list: GUIListBox){
    this.list = list;
    this.calculatePosition();
    this.update();
  }

  update(){

    if(this.list){

      let contentHeight = this.list.getContentHeight();

      let scaleY = this.list.extent.height / contentHeight;
      if(scaleY > 1){
        scaleY = 1;
        this.thumb.scale.y = this.extent.height * scaleY;
      }else{
        if(scaleY < 0.01)
          scaleY = 0.01;
        this.thumb.scale.y = this.extent.height * scaleY;
      }

      let offsetY = contentHeight*this.scrollPos;
      let offsetYMax = contentHeight - this.extent.height;
      let nodeHeight = this.list.getNodeHeight();
      if(offsetY > offsetYMax){
        offsetY = offsetYMax;//Math.floor(offsetYMax / nodeHeight) * nodeHeight;
      }

      //console.log((Math.floor(offsetY / nodeHeight)) * nodeHeight);
      /*offsetY = (Math.ceil(offsetY / nodeHeight)) * nodeHeight;

      for(let i = 0; i < this.list.itemGroup.children.length; i++){
        let node = this.list.itemGroup.children[i];
        let control = node.control;
        node.position.y = control.startY + offsetY;
        control.calculateBox();
        //node.box.translate(new THREE.Vector2( offsetY))
      }
      this.list.cullOffscreen();*/

      this.list.scroll = Math.floor(this.list.maxScroll * this.scrollPos) || 0;
      this.list.updateList();

      let scrollThumbOffset = (this.extent.height - this.thumb.scale.y) - (this.border.dimension*2);
      this.thumb.position.y = scrollThumbOffset/2 - (scrollThumbOffset * this.list.scroll / this.list.maxScroll) || 0;

    }

  }

  calculatePosition(){
    let parentExtent = { width: this.menu.width, height: this.menu.height };
    let parentOffsetX, parentOffsetY;
    if(!(this.parent.widget instanceof THREE.Scene)){
      parentExtent = this.menu.tGuiPanel.extent;
      //console.log(this.parent)
      //parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x + this.offset.x;
      //parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y + this.offset.y;
      parentOffsetX = this.menu.tGuiPanel.worldPosition.x + this.offset.x;
      parentOffsetY = this.menu.tGuiPanel.worldPosition.y + this.offset.y;

    }else{
      parentOffsetX = parentOffsetY = 0;
    }

    // let wRatio = ResolutionManager.getViewportWidth() / this.menu.tGuiPanel.extent.width;
    // let hRatio = ResolutionManager.getViewportHeight() / this.menu.tGuiPanel.extent.height;

    if(this.list){
      if(this.list.isScrollBarLeft()){
        this.anchorOffset.set(-(this.list.extent.width/2 - this.extent.width/2 - this.list.border.inneroffset/2), 0);
      }else{
        this.anchorOffset.set((this.list.extent.width/2 - this.extent.width/2 - this.list.border.inneroffset/2), 0);
      }      
    }else{
      this.anchorOffset.set(0, 0);
    }

    this.widget.position.x = this.anchorOffset.x;
    this.widget.position.y = this.anchorOffset.y;

    let worldPosition = new THREE.Vector3();
    try{
      worldPosition = this.parent.widget.position.clone();
    }catch(e){
      console.error(e);
    }
    let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());
    //console.log('worldPos', worldPosition);
    this.box = new THREE.Box2(
      new THREE.Vector2(
        this.anchorOffset.x - this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y - (this.extent.height + 64)/2 + worldPosition.y
      ),
      new THREE.Vector2(
        this.anchorOffset.x + this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y + (this.extent.height + 64)/2 + worldPosition.y
      )
    );

    this.inner_box = new THREE.Box2(
      new THREE.Vector2(
        this.anchorOffset.x - this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y - (this.extent.height)/2 + worldPosition.y
      ),
      new THREE.Vector2(
        this.anchorOffset.x + this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y + (this.extent.height)/2 + worldPosition.y
      )
    );
    if(this.thumb){
      this.thumb.userData.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (parentPos.y - this.extent.height/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (parentPos.y + this.extent.height/2)
        )
      );
    }

    if(this.upArrow){
      this.upArrow.userData.updateBox();
    }

    if(this.downArrow){
      this.downArrow.userData.updateBox();
    }

  }

  directionalNavigate(direction = ''){
    if(this.list){
      this.list.directionalNavigate(direction);
    }
  }

}
