/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton, GUIControl, GUIProtoItem, MenuManager } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { InventoryManager } from "../../../managers/InventoryManager";
import { PartyManager } from "../../../managers/PartyManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import * as THREE from "three";
import { TextureType } from "../../../enums/loaders/TextureType";

/* @file
* The MenuInventory menu class.
*/

export class MenuInventory extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_INV: GUILabel;
  LBL_CREDITS_VALUE: GUILabel;
  LBL_CREDITS: GUILabel;
  LB_DESCRIPTION: GUIListBox;
  LBL_BGPORT: GUILabel;
  LBL_BGSTATS: GUILabel;
  LBL_PORT: GUILabel;
  LBL_VIT: GUILabel;
  LBL_DEF: GUILabel;
  BTN_QUESTITEMS: GUIButton;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;
  BTN_USEITEM: GUIButton;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'inventory';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_b = this.BTN_EXIT;

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_INV.onHoverIn();
    GameState.MenuActive = true;
    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    let inv = InventoryManager.getNonQuestInventory();
    for (let i = 0; i < inv.length; i++) {
      this.LB_ITEMS.addItem(inv[i]);
    }
    TextureLoader.LoadQueue();
    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();
    let currentPC = PartyManager.party[0];
    if (currentPC) {
      this.LBL_VIT.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
      this.LBL_DEF.setText(currentPC.getAC());
    }
    this.LBL_CREDITS_VALUE.setText(PartyManager.Gold);

    let btn_change: GUIControl;
    for (let i = 0; i < PartyManager.party.length; i++) {
      btn_change = this.getControlByName('BTN_CHANGE' + i);
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = TwoDAManager.datatables.get('portraits').rows[portraitId];
      if (!i) {
        if (this.LBL_PORT.getFillTextureName() != portrait.baseresref) {
          this.LBL_PORT.setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
            this.LBL_PORT.setFillTexture(texture);
          });
        }
      } else {
        btn_change.show();
        if (btn_change.getFillTextureName() != portrait.baseresref) {
          btn_change.setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
            btn_change.setFillTexture(texture);
          });
        }
      }
    }
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_EQU.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_CHAR.click();
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
    try{
      super.createControl();
      //Create the actual control elements below
      let button = new GUIButton(this.menu, this.control, this, this.scale);
      button.extent.width = 190;
      button.text.text = this.node.getName();
      button.autoCalculatePosition = false;
      this.children.push(button);

      let _buttonWidget = button.createControl();
      _buttonWidget.position.x = (this.extent.width - button.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      let buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      buttonIcon.text.text = this.node.getStackSize() > 1 ? this.node.getStackSize().toString() : '';
      buttonIcon.disableTextAlignment();
      buttonIcon.extent.width = 55;
      buttonIcon.extent.height = 55;
      buttonIcon.extent.top = 0;
      buttonIcon.extent.left = 0;
      buttonIcon.disableBorder();
      buttonIcon.disableHighlight();
      buttonIcon.hasText = true;
      buttonIcon.autoCalculatePosition = false;
      this.children.push(buttonIcon);

      let _buttonIconWidget = buttonIcon.createControl();
      _buttonIconWidget.position.x = -(this.extent.width/2 - buttonIcon.extent.width/2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;

      //Stack Count Text Position
      if(this.node.getStackSize() >= 100){
        buttonIcon.widget.userData.text.position.set(6, -10, 5);
      }else if(this.node.getStackSize() >= 10){
        buttonIcon.widget.userData.text.position.set(10, -10, 5);
      }else{
        buttonIcon.widget.userData.text.position.set(14, -10, 5);
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
      this.widget.userData.hexSprite.scale.x = this.widget.userData.hexSprite.scale.y = 64;
      this.widget.userData.hexSprite.position.z = 1;

      if(GameState.GameKey != 'TSL')
        this.widget.userData.spriteGroup.add(this.widget.userData.hexSprite);
        
      this.widget.userData.spriteGroup.add(this.widget.userData.iconSprite);

      if(this.node.getStackSize() >= 100){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_7');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else if(this.node.getStackSize() > 1){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_6');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else{
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_3');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }

      this.onSelect = () => {
        if(this.selected){
          this.showHighlight();
          this.hideBorder();
          this.pulsing = true;
          this.text.color.setRGB(1, 1, 0);
          this.text.material.uniforms.color.value = this.text.color;
          this.text.material.needsUpdate = true;
  
          button.showHighlight();
          button.hideBorder();
          this.widget.userData.hexMaterial.color.setRGB(1, 1, 0);
          button.setHighlightColor(1, 1, 0);
          button.pulsing = true;
          buttonIcon.pulsing = true;

          button.text.color.setRGB(1, 1, 0);
          button.text.material.uniforms.color.value = button.text.color;
          button.text.material.needsUpdate = true;
        }else{
          this.hideHighlight();
          this.showBorder();
          this.pulsing = false;
          this.text.color.setRGB(0, 0.658824, 0.980392);
          this.text.material.uniforms.color.value = this.text.color;
          this.text.material.needsUpdate = true;
  
          button.hideHighlight();
          button.showBorder();
          this.widget.userData.hexMaterial.color.setRGB(0, 0.658823549747467, 0.9803921580314636);
          button.setBorderColor(0, 0.658823549747467, 0.9803921580314636);
          button.pulsing = false;
          buttonIcon.pulsing = false;

          button.text.color.setRGB(0, 0.658824, 0.980392);
          button.text.material.uniforms.color.value = button.text.color;
          button.text.material.needsUpdate = true;
        }
      };
      this.onSelect();

      //StackCount Text
      _buttonIconWidget.add(this.widget.userData.spriteGroup);
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}

