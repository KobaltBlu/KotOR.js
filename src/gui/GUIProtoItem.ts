import type { GameMenu } from '@/gui/GameMenu';
import { GUIControl } from '@/gui/GUIControl';
import type { GFFStruct } from '@/resource/GFFStruct';
import * as THREE from 'three';
import { Anchor } from '@/enums/gui/Anchor';
import { GUIControlTypeMask } from '@/enums/gui/GUIControlTypeMask';
import { ResolutionManager } from '@/managers/ResolutionManager';
import type { GUIListBox } from '@/gui/GUIListBox';
import { Mouse } from '@/controls/Mouse';

// build a normalized unit rect, scale to extent
const points = [
  new THREE.Vector3(-0.5, -0.5, 0),
  new THREE.Vector3(0.5, -0.5, 0),
  new THREE.Vector3(0.5, 0.5, 0),
  new THREE.Vector3(-0.5, 0.5, 0),
  new THREE.Vector3(-0.5, -0.5, 0), // close loop
];

/**
 * GUIProtoItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUIProtoItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIProtoItem extends GUIControl {
  static debugExtentLine: THREE.Line;
  static debugGeom = new THREE.BufferGeometry().setFromPoints(points);
  static debugMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false });

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false) {
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIProtoItem;
    this.zOffset = 2;
    this.isProtoItem = false;

    if (this.parent && this.parent.objectType & GUIControlTypeMask.GUIListBox) {
      const list = this.parent as GUIListBox;
      this.extent.width = list.extent.width - (list.scrollbar ? list.scrollbar.extent.width : 0) - list.padding * 2;
    }

    this.onSelect = () => {
      this.onSelectStateChanged();
    };

    this.addEventListener('mouseIn', (e) => {
      this.onSelectStateChanged();
    });

    this.addEventListener('mouseOut', (e) => {
      this.onSelectStateChanged();
    });
  }

  createControl() {
    const widget = super.createControl();

    GUIProtoItem.debugExtentLine = new THREE.Line(GUIProtoItem.debugGeom, GUIProtoItem.debugMaterial);
    GUIProtoItem.debugExtentLine.scale.set(this.extent.width, this.extent.height, 1);
    GUIProtoItem.debugExtentLine.position.z = 50; // above all UI layers
    GUIProtoItem.debugExtentLine.visible = true; //GameState.debug[EngineDebugType.GUI_PROTO_EXTENTS];
    // this.widget.add(GUIProtoItem.debugExtentLine);
    return widget;
  }

  onSelectStateChanged() {
    if (this.selected || this.hover) {
      this.showHighlight();
      this.hideBorder();
      this.pulsing = true;
      this.text.color.copy(this.defaultHighlightColor);
      this.text.material.uniforms.diffuse.value = this.text.color;
      this.text.material.needsUpdate = true;
    } else {
      this.hideHighlight();
      this.showBorder();
      this.pulsing = false;
      this.text.color.copy(this.defaultColor);
      this.text.material.uniforms.diffuse.value = this.text.color;
      this.text.material.needsUpdate = true;
    }
  }

  buildText() {
    super.buildText();
    this.text.color.copy(this.selected ? this.defaultHighlightColor : this.defaultColor);
    this.text.material.uniforms.diffuse.value = this.text.color;
    this.text.material.needsUpdate = true;
  }

  calculatePosition() {
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

  getItemHeight() {
    let height = this.extent.height;
    if (this.objectType & GUIControlTypeMask.GUIButton) {
      return height;
    }

    if (this.text.geometry) {
      this.text.geometry.computeBoundingBox();
      const tSize = new THREE.Vector3();
      this.text.geometry.boundingBox.getSize(tSize);
      if (tSize.y > height) {
        height = tSize.y;
      }
    }

    return height;
  }

  calculateBox() {
    const worldPosition = this.parent.widget.position.clone();
    //console.log('worldPos', worldPosition);
    this.box.min.x = this.widget.position.x - this.extent.width / 2 + worldPosition.x;
    this.box.min.y = this.widget.position.y - this.extent.height / 2 + worldPosition.y;
    this.box.max.x = this.widget.position.x + this.extent.width / 2 + worldPosition.x;
    this.box.max.y = this.widget.position.y + this.extent.height / 2 + worldPosition.y;

    for (let i = 0; i < this.children.length; i++) {
      this.children[i].updateBounds();
    }
  }

  directionalNavigate(direction = '') {
    if (this.list) {
      this.list.directionalNavigate(direction);
    }
  }
}
