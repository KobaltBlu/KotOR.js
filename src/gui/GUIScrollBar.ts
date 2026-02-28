
import * as THREE from "three";

import { Mouse } from "@/controls/Mouse";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { TextureType } from "@/enums/loaders/TextureType";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import type { GUIControlEvent } from "@/gui/GUIControlEvent";
import type { GUIListBox } from "@/gui/GUIListBox";
import { TextureLoader } from "@/loaders";
import { ResolutionManager } from "@/managers/ResolutionManager";
import type { GFFStruct } from "@/resource/GFFStruct";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Game);

interface IScrollArrowUserData {
  worldPosition: THREE.Vector3;
  box: THREE.Box2;
  updateBox: () => void;
  onClick?: (_e: GUIControlEvent) => void;
}

interface IScrollThumbUserData {
  box: THREE.Box2;
  onClick?: (e: GUIControlEvent) => void;
  onMouseMove?: (e: GUIControlEvent) => void;
  onMouseDown?: (e: GUIControlEvent) => void;
  onMouseUp?: (e: GUIControlEvent) => void;
  onHover?: (e: GUIControlEvent) => void;
  getControl?: (_e: GUIControlEvent) => GUIScrollBar;
}

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
  downArrow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  _thumb: GFFStruct;
  geometry: THREE.PlaneGeometry;
  thumbMaterial: THREE.MeshBasicMaterial;
  thumb: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  inner_box: THREE.Box2 | undefined;

  arrowSize: number = 16;

  private getUpArrowUserData(): IScrollArrowUserData | undefined {
    if (!this.upArrow) return undefined;
    return this.upArrow.userData as IScrollArrowUserData;
  }

  private getDownArrowUserData(): IScrollArrowUserData | undefined {
    if (!this.downArrow) return undefined;
    return this.downArrow.userData as IScrollArrowUserData;
  }

  private getThumbUserData(): IScrollThumbUserData | undefined {
    if (!this.thumb) return undefined;
    return this.thumb.userData as IScrollThumbUserData;
  }

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
        TextureLoader.tpcLoader.fetch(this._dir.getStringByLabel('IMAGE')).then((texture: OdysseyTexture) => {
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
          const upArrowUserData = this.getUpArrowUserData() as IScrollArrowUserData;
          upArrowUserData.worldPosition = new THREE.Vector3();

          this.upArrowMaterial.transparent = true;
          this.upArrowMaterial.needsUpdate = true;

          upArrowUserData.updateBox = () => {
            this.upArrow.getWorldPosition(upArrowUserData.worldPosition);
            upArrowUserData.box = new THREE.Box2(
              new THREE.Vector2(
                -this.extent.width/2,
                -this.extent.width/2
              ),
              new THREE.Vector2(
                this.extent.width/2,
                this.extent.width/2
              )
            );
            upArrowUserData.box.translate(upArrowUserData.worldPosition);
          };
          upArrowUserData.updateBox();

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
          const downArrowUserData = this.getDownArrowUserData() as IScrollArrowUserData;
          downArrowUserData.worldPosition = new THREE.Vector3();

          this.downArrowMaterial.transparent = true;
          this.downArrowMaterial.needsUpdate = true;

          downArrowUserData.updateBox = () => {
            this.downArrow.getWorldPosition(downArrowUserData.worldPosition);
            downArrowUserData.box = new THREE.Box2(
              new THREE.Vector2(
                -this.extent.width/2,
                -this.extent.width/2
              ),
              new THREE.Vector2(
                this.extent.width/2,
                this.extent.width/2
              )
            );
            downArrowUserData.box.translate(downArrowUserData.worldPosition)
          };
          downArrowUserData.updateBox();

          upArrowUserData.onClick = (_e: GUIControlEvent) => {
            this.scrollUp();
          };

          downArrowUserData.onClick = (_e: GUIControlEvent) => {
            this.scrollDown();
          };

        });
      }
    }

    if(this.control.hasField('THUMB')){
      this._thumb = this.control.getFieldByLabel('THUMB').getChildStructs()[0];
      this.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      this.thumbMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
      this.thumb = new THREE.Mesh( this.geometry, this.thumbMaterial );

      this.widget.add(this.thumb);
      this.thumb.name = 'SCROLLBAR thumb';
      this.thumb.scale.x = this.extent.width/2;
      this.thumb.scale.y = this.extent.height/2;
      this.thumb.position.z = 5;

      const parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());
      const thumbUserData = this.getThumbUserData() as IScrollThumbUserData;

      thumbUserData.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (parentPos.y - this.extent.height/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (parentPos.y + this.extent.height/2)
        )
      )

      thumbUserData.onClick = (e: GUIControlEvent) => {
        this.processEventListener('click', [e]);
      };

      thumbUserData.onMouseMove = (e: GUIControlEvent) =>{
        this.processEventListener('mouseMove', [e]);
      }

      thumbUserData.onMouseDown = (e: GUIControlEvent) => {
        this.processEventListener('mouseDown', [e]);
      };

      thumbUserData.onMouseUp = (e: GUIControlEvent) => {
        this.processEventListener('mouseUp', [e]);
      };

      thumbUserData.onHover = (e: GUIControlEvent) => {
        this.processEventListener('hover', [e]);
      };

      thumbUserData.getControl = (_e: GUIControlEvent) => {
        return this;
      };

      // this.thumb.click = (e: GUIControlEvent) => {
      //   log.info('scroll thumb')
      // };

      if(this._thumb.hasField('IMAGE')){
        TextureLoader.enQueue(this._thumb.getStringByLabel('IMAGE'), this.thumbMaterial, TextureType.TEXTURE);
        TextureLoader.LoadQueue();
      }
    }

    this.addEventListener('mouseMove', () => {
      //if(this.inner_box.containsPoint(Mouse.positionUI)){
        this.mouseInside();
      //}
    });

    this.addEventListener('click', () =>{
      const mouseY = Mouse.positionViewport.y - (ResolutionManager.getViewportHeightScaled() / 2);
      const upArrowBox = this.getUpArrowUserData()?.box;
      const downArrowBox = this.getDownArrowUserData()?.box;

      const scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      if(upArrowBox?.containsPoint(Mouse.positionUI)){
        this.list.scrollUp();
      }else if(downArrowBox?.containsPoint(Mouse.positionUI)){
        this.list.scrollDown();
      }else if(this.inner_box?.containsPoint(Mouse.positionUI)){
        this.mouseInside();
      }
    })

    this.addEventListener('mouseDown', (e) => {
      e.stopPropagation();
      const mouseY = Mouse.positionViewport.y - (ResolutionManager.getViewportHeightScaled() / 2);
      const scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      this.getUpArrowUserData()?.updateBox();
      this.getDownArrowUserData()?.updateBox();
    });

    this.addEventListener('mouseUp', () => {
      //let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      //this.mouseOffset.y = scrollTop;
      //log.info('GUIScrollBar', 'blah');
      /*if(this.upArrow.box.containsPoint(Mouse.Mouse.positionUI)){
        log.info('GUIScrollBar', 'up');
        this.list.scrollUp();
      }else if(this.downArrow.box.containsPoint(Mouse.Mouse.positionUI)){
        log.info('GUIScrollBar', 'down');
        this.list.scrollDown();
      }else */if(this.inner_box?.containsPoint(Mouse.positionUI)){
        //log.info('GUIScrollBar', 'scroll');
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

    const mouseY = Mouse.positionViewport.y - (ResolutionManager.getViewportHeightScaled() / 2);
    //log.info(mouseY);
    //if(this.inner_box.containsPoint({x: mouseX, y: mouseY})){

      const scrollBarHeight = this.extent.height;

      this.thumb.position.y = -(mouseY) || 0;

      if(this.thumb.position.y < -((scrollBarHeight - this.thumb.scale.y))/2 ){
        this.thumb.position.y = -((scrollBarHeight - this.thumb.scale.y))/2 || 0
      }

      if(this.thumb.position.y > ((scrollBarHeight - this.thumb.scale.y))/2 ){
        this.thumb.position.y = ((scrollBarHeight - this.thumb.scale.y))/2 || 0
      }

      const maxScroll = ((scrollBarHeight - this.thumb.scale.y)/2);
      const scrollPositionVal = (this.thumb.position.y + maxScroll) / (maxScroll*2);
      this.scrollPos = 1.0 - scrollPositionVal;
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

      const contentHeight = this.list.getContentHeight();

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
      const offsetYMax = contentHeight - this.extent.height;
      if(offsetY > offsetYMax){
        offsetY = offsetYMax;//Math.floor(offsetYMax / nodeHeight) * nodeHeight;
      }

      //log.info((Math.floor(offsetY / nodeHeight)) * nodeHeight);
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

      const scrollThumbOffset = (this.extent.height - this.thumb.scale.y) - (this.border.dimension*2);
      this.thumb.position.y = scrollThumbOffset/2 - (scrollThumbOffset * this.list.scroll / this.list.maxScroll) || 0;

    }

  }

  calculatePosition(){
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
      log.error(e);
    }
    const parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());
    //log.info('worldPos', worldPosition);
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
      const thumbUserData = this.getThumbUserData();
      if (thumbUserData) {
        thumbUserData.box = new THREE.Box2(
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
    }

    if(this.upArrow){
      this.getUpArrowUserData()?.updateBox();
    }

    if(this.downArrow){
      this.getDownArrowUserData()?.updateBox();
    }

  }

  directionalNavigate(direction = ''){
    if(this.list){
      this.list.directionalNavigate(direction);
    }
  }

}
