import { GUIProtoItem, GUIButton } from "@/gui";
import type { GUIControl, GameMenu } from "@/gui";
import * as THREE from "three";
import { TextureType } from "@/enums/loaders/TextureType";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import type { GFFStruct } from "@/resource/GFFStruct";
import { GameState } from "@/GameState";
import { TextureLoader } from "@/loaders";
import { Mouse } from "@/controls/Mouse";
import type { ModuleCreature } from "@/module";
import type { TalentFeat } from "@/talents";

/**
 * Display state of one feat icon inside a GUIFeatItem row.
 */
export enum FeatItemState {
  /** prerequisites not met, or the class only receives it at a later level */
  LOCKED = 'locked',
  /** can be picked right now */
  AVAILABLE = 'available',
  /** the creature already has the feat */
  OWNED = 'owned',
  /** picked on the current screen but not committed to the creature yet */
  SELECTED = 'selected',
}

/**
 * What a GUIFeatItem needs from the menu that hosts its list. Every member is
 * optional so the item also works on plain feat listings (e.g. the in-game
 * abilities screen) where nothing can be picked.
 */
export interface IFeatItemHost {
  /** the creature whose feats are listed; GameState.getCurrentPlayer() is used when absent */
  creature?: ModuleCreature;
  getFeatState?: (feat: TalentFeat) => FeatItemState;
  isFeatFocused?: (feat: TalentFeat) => boolean;
  onFeatItemClick?: (feat: TalentFeat, item: GUIFeatItem) => void;
}

interface IFeatItemColumn {
  feat: TalentFeat;
  /** frame behind the icon; also the hit box for clicks */
  button: GUIButton;
  iconMaterial: THREE.SpriteMaterial;
  iconSprite: THREE.Sprite;
  /** arrow leading into this column from the previous chain member */
  arrow?: GUIButton;
}

const TINT_DEFAULT = new THREE.Color(1, 1, 1);
const TINT_SELECTED = new THREE.Color(0.4, 1, 0.4);

/**
 * GUIFeatItem class.
 *
 * One list row showing a feat chain (base -> improved -> master) as up to
 * three icons with arrows between them. The row's node is a TalentFeat[]
 * (see CharGenFeats.buildFeatList).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUIFeatItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIFeatItem extends GUIProtoItem {

  /** frame drawn behind every feat icon */
  protected frameTexture: string = 'lbl_indent';
  /** arrow drawn between chain members */
  protected arrowTexture: string = 'lbl_skarr';
  protected iconSize: number = 56;
  protected arrowSize: number = 32;
  /** when true, locked chain members are not drawn at all (plain feat listings) */
  protected hideLockedFeats: boolean = false;
  protected lockedOpacity: number = 0.25;

  columns: IFeatItemColumn[] = [];

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl = null as any, scale = false){
    super(menu, control, parent, scale);
    this.disableSelection = true;
    this.extent.height = 48;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  getHost(): IFeatItemHost {
    return (this.menu || {}) as unknown as IFeatItemHost;
  }

  /**
   * The creature whose feats are listed: the host menu's creature during
   * character generation (no party exists yet), otherwise the current player.
   */
  getCreature(): ModuleCreature {
    const host = this.getHost();
    if(host.creature){
      return host.creature;
    }
    return GameState.getCurrentPlayer();
  }

  getFeatState(feat: TalentFeat): FeatItemState {
    const host = this.getHost();
    if(typeof host.getFeatState === 'function'){
      return host.getFeatState(feat);
    }

    //Plain listing: only feats the creature owns are lit
    const creature = this.getCreature();
    if(creature && creature.getHasFeat(feat.id)){
      return FeatItemState.OWNED;
    }
    return FeatItemState.LOCKED;
  }

  isFeatFocused(feat: TalentFeat): boolean {
    const host = this.getHost();
    if(typeof host.isFeatFocused === 'function'){
      return host.isFeatFocused(feat);
    }
    return false;
  }

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below

      this.columns = [];
      const featList: TalentFeat[] = Array.isArray(this.node) ? this.node : [];
      for(let i = 0; i < featList.length && i < 3; i++){
        const feat = featList[i];
        if(!feat){ continue; }

        if(this.hideLockedFeats && this.getFeatState(feat) == FeatItemState.LOCKED){
          continue;
        }

        this.buildColumn(feat, i);
      }

      //The row (not the icon buttons) receives the click: resolve the column under the mouse
      this.addEventListener('click', (e) => {
        this.onRowClick();
      });

      this.updateFeatStates();

      //Load the frame/icon/arrow textures queued above
      TextureLoader.LoadQueue();
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

  /**
   * Builds the frame button, icon sprite and (for chain members) the arrow
   * for one column of the row. Each column keeps its own sprite/material.
   */
  protected buildColumn(feat: TalentFeat, index: number): IFeatItemColumn {
    const columnOffset = (this.extent.width/2 - this.iconSize/2);

    const button = new GUIButton(this.menu, this.control, this, this.scale);
    button.name = 'FEAT_'+index;
    button.setText('');
    button.disableTextAlignment();
    button.extent.width = this.iconSize;
    button.extent.height = this.iconSize;
    button.extent.top = 0;
    button.extent.left = 0;
    button.hasBorder = false;
    button.hasHighlight = false;
    button.hasText = false;
    button.autoCalculatePosition = false;
    //The frame is a hit box only: the row resolves clicks, and hover must not swap in highlight edges
    button.disableHover = true;
    this.children.push(button);

    const buttonWidget = button.createControl();
    switch(index){
      case 2:
        buttonWidget.position.x = columnOffset;
      break;
      case 1:
        buttonWidget.position.x = 0;
      break;
      default:
        buttonWidget.position.x = -columnOffset;
      break;
    }
    buttonWidget.position.y = 0;
    buttonWidget.position.z = this.zIndex + 1;
    this.widget.add(buttonWidget);

    /* FEAT ICON */
    const iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
    iconMaterial.transparent = true;
    const iconSprite = new THREE.Sprite( iconMaterial );
    iconSprite.scale.x = 32;
    iconSprite.scale.y = 32;
    iconSprite.position.z = 5;
    iconSprite.renderOrder = 5;
    buttonWidget.add(iconSprite);

    const column: IFeatItemColumn = { feat, button, iconMaterial, iconSprite };

    TextureLoader.enQueue(this.frameTexture, button.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      button.setMaterialTexture( button.border.fill.material, texture);
      button.border.fill.material.transparent = true;
      button.setMaterialTexture( button.highlight.fill.material, texture);
      button.highlight.fill.material.transparent = true;
      //setMaterialTexture resets the opacity, so reapply the column state
      this.applyColumnState(column);
      this.invalidateListRtt();
    });

    TextureLoader.enQueue(feat.icon, iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      if(texture && texture.image){
        iconSprite.scale.x = texture.image.width;
        iconSprite.scale.y = texture.image.height;
      }
      iconMaterial.needsUpdate = true;
      this.applyColumnState(column);
      this.invalidateListRtt();
    });

    /* BLUE ARROW */
    if(index > 0){
      column.arrow = this.buildArrow(index, column);
    }

    this.columns.push(column);
    return column;
  }

  protected buildArrow(index: number, column: IFeatItemColumn): GUIButton {
    const arrowOffset = (this.extent.width/2 - this.iconSize/2)/2;

    const arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
    arrowIcon.name = 'ARROW_'+index;
    arrowIcon.setText('');
    arrowIcon.disableTextAlignment();
    arrowIcon.extent.width = this.arrowSize;
    arrowIcon.extent.height = this.arrowSize;
    arrowIcon.extent.top = 0;
    arrowIcon.extent.left = 0;
    arrowIcon.hasBorder = false;
    arrowIcon.hasHighlight = false;
    arrowIcon.disableBorder();
    arrowIcon.disableHighlight();
    arrowIcon.hasText = false;
    arrowIcon.autoCalculatePosition = false;
    //the arrow is decoration only
    arrowIcon.disableSelection = true;
    arrowIcon.allowClick = false;
    this.children.push(arrowIcon);

    const arrowWidget = arrowIcon.createControl();
    switch(index){
      case 2:
        arrowWidget.position.x = arrowOffset;
      break;
      case 1:
        arrowWidget.position.x = -arrowOffset;
      break;
    }
    arrowWidget.position.y = 0;
    arrowWidget.position.z = this.zIndex + 1;
    this.widget.add(arrowWidget);

    TextureLoader.enQueue(this.arrowTexture, arrowIcon.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      arrowIcon.setMaterialTexture( arrowIcon.border.fill.material, texture);
      arrowIcon.border.fill.material.transparent = true;
      arrowIcon.setMaterialTexture( arrowIcon.highlight.fill.material, texture);
      arrowIcon.highlight.fill.material.transparent = true;
      this.applyColumnState(column);
      this.invalidateListRtt();
    });

    return arrowIcon;
  }

  /**
   * Re-reads every column's state from the host and updates the visuals.
   * Call after the selection changes instead of rebuilding the list. Rows are
   * rendered into the list's render target, so it is marked dirty as well.
   */
  updateFeatStates(){
    for(let i = 0; i < this.columns.length; i++){
      this.applyColumnState(this.columns[i]);
    }
    this.invalidateListRtt();
  }

  protected applyColumnState(column: IFeatItemColumn){
    const state = this.getFeatState(column.feat);
    const focused = this.isFeatFocused(column.feat);
    const locked = (state == FeatItemState.LOCKED);
    const opacity = locked ? this.lockedOpacity : 1;

    const frameMaterial = column.button.border.fill.material;
    if(frameMaterial && frameMaterial.uniforms && frameMaterial.uniforms.opacity){
      frameMaterial.uniforms.opacity.value = opacity;
    }

    const highlightMaterial = column.button.highlight.fill.material;
    if(highlightMaterial && highlightMaterial.uniforms && highlightMaterial.uniforms.opacity){
      highlightMaterial.uniforms.opacity.value = opacity;
    }

    column.iconMaterial.opacity = opacity;
    column.iconMaterial.needsUpdate = true;

    //Frame tint: focused feat uses the menu highlight color, a pending pick is green
    let tint = TINT_DEFAULT;
    if(state == FeatItemState.SELECTED){
      tint = TINT_SELECTED;
    }
    if(focused){
      tint = this.defaultHighlightColor;
    }
    column.button.setFillColor(tint.r, tint.g, tint.b);

    //The arrow leading into a locked feat is dimmed with it
    if(column.arrow){
      const arrowMaterial = column.arrow.border.fill.material;
      if(arrowMaterial && arrowMaterial.uniforms && arrowMaterial.uniforms.opacity){
        arrowMaterial.uniforms.opacity.value = opacity;
      }
      const arrowHighlight = column.arrow.highlight.fill.material;
      if(arrowHighlight && arrowHighlight.uniforms && arrowHighlight.uniforms.opacity){
        arrowHighlight.uniforms.opacity.value = opacity;
      }
    }
  }

  /**
   * The icon buttons are children of a list row, so their inherited bounds
   * are relative to the list instead of the screen. Rebuild them from the
   * row's (screen-space) box so the click can be resolved to a column.
   */
  updateBounds(){
    super.updateBounds();
    this.updateColumnBounds();
  }

  calculateBox(){
    super.calculateBox();
    this.updateColumnBounds();
  }

  protected updateColumnBounds(){
    //May be reached from the base constructor before the field initializers ran
    if(!this.box || !this.columns){ return; }
    const centerX = (this.box.min.x + this.box.max.x) / 2;
    const centerY = (this.box.min.y + this.box.max.y) / 2;
    for(let i = 0; i < this.columns.length; i++){
      const button = this.columns[i].button;
      const halfWidth = button.extent.width / 2;
      const halfHeight = button.extent.height / 2;
      const x = centerX + button.widget.position.x;
      const y = centerY + button.widget.position.y;
      button.box.min.set(x - halfWidth, y - halfHeight);
      button.box.max.set(x + halfWidth, y + halfHeight);
    }
  }

  /**
   * The feat whose icon is under the given UI-space point, if any.
   */
  getFeatAtPoint(point: THREE.Vector2): TalentFeat {
    for(let i = 0; i < this.columns.length; i++){
      const column = this.columns[i];
      if(column.button.box && column.button.box.containsPoint(point)){
        return column.feat;
      }
    }
    return undefined;
  }

  protected onRowClick(){
    const feat = this.getFeatAtPoint(Mouse.positionUI);
    if(!feat){ return; }

    const host = this.getHost();
    if(typeof host.onFeatItemClick === 'function'){
      host.onFeatItemClick(feat, this);
    }
  }

}
