/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { TextureType } from "../../../enums/loaders/TextureType";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIListBox, GUIButton, GUIProtoItem, GUIControl } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { ModuleCreature, ModuleItem, ModuleObject, ModulePlaceable } from "../../../module";
import { GFFStruct } from "../../../resource/GFFStruct";
import { MenuContainerMode } from "../../../enums/gui/MenuContainerMode";
import * as THREE from "three";
import { TLKManager } from "../../../managers";

/* @file
* The MenuContainer menu class.
*/

const STR_SWITCH_TO = 47884;
const STR_GET_ITEMS = 38542;
const STR_GIVE_ITEMS = 38543;

export class MenuContainer extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_MESSAGE: GUILabel;
  LB_ITEMS: GUIListBox;
  BTN_OK: GUIButton;
  BTN_GIVEITEMS: GUIButton;
  BTN_CANCEL: GUIButton;
  container: ModuleObject;
  mode: MenuContainerMode = MenuContainerMode.TAKE_ITEMS;

  constructor(){
    super();
    this.gui_resref = 'container';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_CANCEL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        if(this.container instanceof ModulePlaceable){
          this.container.close(GameState.player);
        }
        this.Close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.mode == MenuContainerMode.TAKE_ITEMS){
          this.LB_ITEMS.clearItems();
          if(this.container instanceof ModulePlaceable){
            this.container.retrieveInventory();
            this.container.close(GameState.player);
          }else if(this.container instanceof ModuleCreature){
            this.container.retrieveInventory();
            //this.container.close(Game.player);
          }
          this.Close();
        }else{

        }
      });
      this._button_a = this.BTN_OK;

      this.BTN_GIVEITEMS.addEventListener('click', (e: any) => {
        e.stopPropagation();

        switch(this.mode){
          case MenuContainerMode.TAKE_ITEMS:
            this.setMode(MenuContainerMode.GIVE_ITEMS);
          break;
          case MenuContainerMode.GIVE_ITEMS:
            this.setMode(MenuContainerMode.TAKE_ITEMS);
          break;
        }
      });
      this._button_x = this.BTN_GIVEITEMS;

      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        if(this.mode == MenuContainerMode.TAKE_ITEMS){

        }else{
          
        }
      }

      resolve();
    });
  }

  Hide(onClosed = false) {
    super.Hide();
    if (onClosed && this.container instanceof ModulePlaceable) {
      try {
        this.container.close(GameState.getCurrentPlayer());
      } catch (e: any) {

      }
    }
  }

  AttachContainer(object: ModuleObject){
    this.container = object;
  }

  Open() {
    super.Open();
  }

  Show() {
    super.Show();
    this.setMode(MenuContainerMode.TAKE_ITEMS);
  }

  setMode(mode: MenuContainerMode){
    this.mode = mode;

    switch(this.mode){
      case MenuContainerMode.TAKE_ITEMS:
        this.BTN_OK.setText(TLKManager.GetStringById(STR_GET_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          TLKManager.GetStringById(STR_SWITCH_TO).Value + ' ' +
          TLKManager.GetStringById(STR_GIVE_ITEMS).Value
        )
      break;
      case MenuContainerMode.GIVE_ITEMS:
        this.BTN_OK.setText(TLKManager.GetStringById(STR_GIVE_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          TLKManager.GetStringById(STR_SWITCH_TO).Value + ' ' +
          TLKManager.GetStringById(STR_GET_ITEMS).Value
        )
      break;
    }

    //Update list items
    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    if (this.container instanceof ModuleCreature || this.container instanceof ModulePlaceable) {
      let inventory = this.container.getInventory();
      for (let i = 0; i < inventory.length; i++) {
        let item = inventory[i];
        this.LB_ITEMS.addItem(item, null);
      }
      TextureLoader.LoadQueue();
    }

  }
  
}

class GUIInventoryItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    super.createControl();
    //Create the actual control elements below
    let button = new GUIButton(this.menu, this.control, this, this.scale);
    button.extent.width = 200;
    button.text.text = this.node.getName();
    button.text.alignment = 9;
    button.autoCalculatePosition = false;
    this.children.push(button);

    let _buttonWidget = button.createControl();
    _buttonWidget.position.x = (this.extent.width - button.extent.width) / 2;
    _buttonWidget.position.y = 0;
    _buttonWidget.position.z = this.zIndex + 1;
    this.widget.add(_buttonWidget);

    let buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
    buttonIcon.text.text = this.node.getStackSize() > 1 ? this.node.getStackSize().toString() : '';
    buttonIcon.text.mesh.scale.setScalar(.9);
    buttonIcon.disableTextAlignment();
    buttonIcon.extent.width = 42;
    buttonIcon.extent.height = 42;
    buttonIcon.extent.top = 0;
    buttonIcon.extent.left = 0;
    buttonIcon.hasBorder = false;
    buttonIcon.hasHighlight = false;
    buttonIcon.hasText = true;
    buttonIcon.autoCalculatePosition = false;
    this.children.push(buttonIcon);

    let _buttonIconWidget = buttonIcon.createControl();
    _buttonIconWidget.position.x = -(this.extent.width/2 - buttonIcon.extent.width/2);
    _buttonIconWidget.position.y = 0;
    _buttonIconWidget.position.z = this.zIndex + 1;

    //Stack Count Text Position
    if(this.node.getStackSize() >= 100){
      buttonIcon.widget.userData.text.position.set(6, -8, 5);
    }else if(this.node.getStackSize() >= 10){
      buttonIcon.widget.userData.text.position.set(10, -8, 5);
    }else{
      buttonIcon.widget.userData.text.position.set(14, -8, 5);
    }

    this.widget.add(_buttonIconWidget);

    this.widget.userData.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
    this.widget.userData.iconMaterial.transparent = true;
    this.widget.userData.iconSprite = new THREE.Sprite( this.widget.userData.iconMaterial );
    //console.log(this.node.getIcon());
    TextureLoader.enQueue(this.node.getIcon(), this.widget.userData.iconMaterial, TextureType.TEXTURE);
    
    this.widget.userData.spriteGroup = new THREE.Group();
    //this.widget.spriteGroup.position.x = -(this.extent.width/2)-(52/2); //HACK
    //this.widget.spriteGroup.position.y -= 4;
    this.widget.userData.iconSprite.scale.x = 52;
    this.widget.userData.iconSprite.scale.y = 52;
    this.widget.userData.iconSprite.position.z = 1;

    this.widget.userData.hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
    this.widget.userData.hexMaterial.transparent = true;
    this.widget.userData.hexSprite = new THREE.Sprite( this.widget.userData.hexMaterial );
    this.widget.userData.hexSprite.scale.x = this.widget.userData.hexSprite.scale.y = 52;
    this.widget.userData.hexSprite.position.z = 1;

    if(GameState.GameKey != 'TSL')
      this.widget.userData.spriteGroup.add(this.widget.userData.hexSprite);
      
    this.widget.userData.spriteGroup.add(this.widget.userData.iconSprite);

    if(this.node.getStackSize() >= 100){
      this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_4');
      this.widget.userData.hexMaterial.needsUpdate = true;
    }else if(this.node.getStackSize() > 1){
      this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_4');
      this.widget.userData.hexMaterial.needsUpdate = true;
    }else{
      this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex');
      this.widget.userData.hexMaterial.needsUpdate = true;
    }

    this.onSelect = () => {
      if(this.selected){
        /*this.showHighlight();
        this.hideBorder();
        this.pulsing = true;
        this.text.color.setRGB(1, 1, 0);
        this.text.material.color = this.text.color;
        this.text.material.needsUpdate = true;
        button.showHighlight();
        button.hideBorder();
        this.widget.hexMaterial.color.setRGB(1, 1, 0);
        button.setHighlightColor(1, 1, 0);
        button.pulsing = true;
        buttonIcon.pulsing = true;
        button.text.color.setRGB(1, 1, 0);
        button.text.material.color = button.text.color;
        button.text.material.needsUpdate = true;*/
      }else{
        /*this.hideHighlight();
        this.showBorder();
        this.pulsing = false;
        this.text.color.setRGB(0, 0.658824, 0.980392);
        this.text.material.color = this.text.color;
        this.text.material.needsUpdate = true;
        button.hideHighlight();
        button.showBorder();
        this.widget.hexMaterial.color.setRGB(0, 0.658823549747467, 0.9803921580314636);
        button.setBorderColor(0, 0.658823549747467, 0.9803921580314636);
        button.pulsing = false;
        buttonIcon.pulsing = false;
        button.text.color.setRGB(0, 0.658824, 0.980392);
        button.text.material.color = button.text.color;
        button.text.material.needsUpdate = true;*/
      }
    };
    this.onSelect.call(this);

    //StackCount Text
    _buttonIconWidget.add(this.widget.userData.spriteGroup);
    return this.widget;
  }

}
