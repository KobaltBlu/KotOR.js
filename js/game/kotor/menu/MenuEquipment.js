/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuEquipment menu class.
 */

class MenuEquipment extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;
    this.slot = null;


    this.LoadMenu({
      name: 'equip',
      onLoad: () => {
        this.selectedItem = null;

        this.LBL_PORTRAIT = this.getControlByName('LBL_PORTRAIT');
        this.BTN_CHANGE1 = this.getControlByName('BTN_CHANGE1');
        this.BTN_CHANGE2 = this.getControlByName('BTN_CHANGE2');
        this.BTN_EQUIP = this.getControlByName('BTN_EQUIP');
        this.LB_ITEMS = this.getControlByName('LB_ITEMS');
        this.LB_DESC = this.getControlByName('LB_DESC');
        this.LBL_CANTEQUIP = this.getControlByName('LBL_CANTEQUIP');

        this.BTN_INV_IMPLANT = this.getControlByName('BTN_INV_IMPLANT');
        this.BTN_INV_HEAD = this.getControlByName('BTN_INV_HEAD');
        this.BTN_INV_HANDS = this.getControlByName('BTN_INV_HANDS');
        this.BTN_INV_ARM_L = this.getControlByName('BTN_INV_ARM_L');
        this.BTN_INV_BODY = this.getControlByName('BTN_INV_BODY');
        this.BTN_INV_ARM_R = this.getControlByName('BTN_INV_ARM_R');
        this.BTN_INV_WEAP_L = this.getControlByName('BTN_INV_WEAP_L');
        this.BTN_INV_BELT = this.getControlByName('BTN_INV_BELT');
        this.BTN_INV_WEAP_R = this.getControlByName('BTN_INV_WEAP_R');

        this.LBL_INV_IMPLANT =  this.getControlByName('LBL_INV_IMPLANT');
        this.LBL_INV_HEAD =     this.getControlByName('LBL_INV_HEAD');
        this.LBL_INV_HANDS =    this.getControlByName('LBL_INV_HANDS');
        this.LBL_INV_ARM_L =    this.getControlByName('LBL_INV_ARM_L');
        this.LBL_INV_BODY =     this.getControlByName('LBL_INV_BODY');
        this.LBL_INV_ARM_R =    this.getControlByName('LBL_INV_ARM_R');
        this.LBL_INV_WEAP_L =   this.getControlByName('LBL_INV_WEAP_L');
        this.LBL_INV_BELT =     this.getControlByName('LBL_INV_BELT');
        this.LBL_INV_WEAP_R =   this.getControlByName('LBL_INV_WEAP_R');

        this.LB_ITEMS.padding = 5;
        this.LB_ITEMS.offset.x = 0;
        
        this.LB_DESC.hide();
        this.LBL_CANTEQUIP.hide();

        this.BTN_EXIT = this.getControlByName('BTN_BACK');
        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.equipmentSelectionActive){
            this.slot = null;
            this.equipmentSelectionActive = false;
            this.UpdateList();
          }else{
            this.Close();
          }
        });

        this.BTN_INV_IMPLANT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.IMPLANT;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_IMPLANT.addEventListener('hover', (e) => {
          this.slot = UTCObject.SLOT.IMPLANT;
          this.UpdateList();
        });

        this.BTN_INV_HEAD.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.HEAD;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_HEAD.addEventListener('hover', (e) => {
          this.slot = UTCObject.SLOT.HEAD;
          this.UpdateList();
        });

        this.BTN_INV_HANDS.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.ARMS;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_ARM_L.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.LEFTARMBAND;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_BODY.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.ARMOR;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_ARM_R.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.RIGHTARMBAND;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_WEAP_L.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.LEFTHAND;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_BELT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.BELT;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_INV_WEAP_R.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.RIGHTHAND;
          this.equipmentSelectionActive = true;
          this.UpdateList();
        });

        this.BTN_EQUIP.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.selectedItem instanceof ModuleItem){
            //console.log('selectedItem', this.selectedItem, this.slot, );
            let currentPC = PartyManager.party[0];
            currentPC.equipItem(this.slot, this.selectedItem, () => {
              this.UpdateSlotIcons();
            });
            this.equipmentSelectionActive = false;
            this.UpdateSelected(null);
            this.UpdateSlotIcons();
            this.UpdateList();
          }
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  UpdateList(){

    if(!this.equipmentSelectionActive){
      this.BTN_EQUIP.hide();
      this.BTN_EXIT.setText(Global.kotorTLK.GetStringById(1582));
      this.LB_DESC.hide();

      this.BTN_INV_IMPLANT.show();
      this.BTN_INV_HEAD.show();
      this.BTN_INV_HANDS.show();
      this.BTN_INV_ARM_L.show();
      this.BTN_INV_BODY.show();
      this.BTN_INV_ARM_R.show();
      this.BTN_INV_WEAP_L.show();
      this.BTN_INV_BELT.show();
      this.BTN_INV_WEAP_R.show();

      this.LBL_INV_IMPLANT.show();
      this.LBL_INV_HEAD.show();
      this.LBL_INV_HANDS.show();
      this.LBL_INV_ARM_L.show();
      this.LBL_INV_BODY.show();
      this.LBL_INV_ARM_R.show();
      this.LBL_INV_WEAP_L.show();
      this.LBL_INV_BELT.show();
      this.LBL_INV_WEAP_R.show();
      
      this.LBL_PORTRAIT.show();
      this.LBL_PORT_BORD.show();
      this.LBL_SLOTNAME.show();
      this.LBL_TXTBAR.show();

      this.LBL_SELECTTITLE.setText('');
    }else{
      this.BTN_EQUIP.show();
      this.BTN_EQUIP.setText(Global.kotorTLK.GetStringById(31387));
      this.BTN_EXIT.setText(Global.kotorTLK.GetStringById(1581));
      this.LB_DESC.show();

      this.BTN_INV_IMPLANT.hide();
      this.BTN_INV_HEAD.hide();
      this.BTN_INV_HANDS.hide();
      this.BTN_INV_ARM_L.hide();
      this.BTN_INV_BODY.hide();
      this.BTN_INV_ARM_R.hide();
      this.BTN_INV_WEAP_L.hide();
      this.BTN_INV_BELT.hide();
      this.BTN_INV_WEAP_R.hide();

      this.LBL_INV_IMPLANT.hide();
      this.LBL_INV_HEAD.hide();
      this.LBL_INV_HANDS.hide();
      this.LBL_INV_ARM_L.hide();
      this.LBL_INV_BODY.hide();
      this.LBL_INV_ARM_R.hide();
      this.LBL_INV_WEAP_L.hide();
      this.LBL_INV_BELT.hide();
      this.LBL_INV_WEAP_R.hide();
      
      this.LBL_PORTRAIT.hide();
      this.LBL_PORT_BORD.hide();
      this.LBL_SLOTNAME.hide();
      this.LBL_TXTBAR.hide();

      this.LBL_SELECTTITLE.setText('');
    }

    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    this.selectedItem = null;
    //console.log('updatelist', this.slot);
    this.UpdateSelected(null);
    let currentPC = PartyManager.party[0];
    if(this.slot){
      let inv = InventoryManager.getInventory(this.slot, currentPC);
      for(let i = 0; i < inv.length; i++){
        this.LB_ITEMS.addItem(inv[i], () => {
          this.UpdateSelected(inv[i]);
        });
      }

      TextureLoader.LoadQueue();
    }
  }

  UpdateSelected(item = null){
    this.selectedItem = item;
    if(this.selectedItem instanceof ModuleItem){
      //this.BTN_EQUIP.setText('OK');
    }else{
      //this.BTN_EQUIP.setText('OK');
    }
  }

  UpdateSlotIcons(){
    let currentPC = PartyManager.party[0];

    if(currentPC.getRace() == 6){
      let implant = currentPC.GetItemInSlot(UTCObject.SLOT.IMPLANT);
      if(implant){
        let icon = 'i'+implant.getBaseItem().itemclass+'_'+("000" + implant.getModelVariation()).slice(-3);
        if(this.LBL_INV_IMPLANT.getFillTextureName() != icon){
          this.LBL_INV_IMPLANT.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_IMPLANT.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_IMPLANT.getFillTextureName() != 'iimplant'){
        this.LBL_INV_IMPLANT.setFillTextureName('iimplant')
        TextureLoader.tpcLoader.fetch('iimplant', (texture) => {
          this.LBL_INV_IMPLANT.setFillTexture(texture);
        });
      }

      let head = currentPC.GetItemInSlot(UTCObject.SLOT.HEAD);
      if(head){
        let icon = 'i'+head.getBaseItem().itemclass+'_'+("000" + head.getModelVariation()).slice(-3);
        if(this.LBL_INV_HEAD.getFillTextureName() != icon){
          this.LBL_INV_HEAD.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_HEAD.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_HEAD.getFillTextureName() != 'ihead'){
        this.LBL_INV_HEAD.setFillTextureName('ihead')
        TextureLoader.tpcLoader.fetch('ihead', (texture) => {
          this.LBL_INV_HEAD.setFillTexture(texture);
        });
      }

      let hands = currentPC.GetItemInSlot(UTCObject.SLOT.ARMS);
      if(hands){
        let icon = 'i'+hands.getBaseItem().itemclass+'_'+("000" + hands.getModelVariation()).slice(-3);
        if(this.LBL_INV_HANDS.getFillTextureName() != icon){
          this.LBL_INV_HANDS.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_HANDS.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_HANDS.getFillTextureName() != 'ihands'){
        this.LBL_INV_HANDS.setFillTextureName('ihands')
        TextureLoader.tpcLoader.fetch('ihands', (texture) => {
          this.LBL_INV_HANDS.setFillTexture(texture);
        });
      }

      let l_arm = currentPC.GetItemInSlot(UTCObject.SLOT.LEFTARMBAND);
      if(l_arm){
        let icon = 'i'+l_arm.getBaseItem().itemclass+'_'+("000" + l_arm.getModelVariation()).slice(-3);
        if(this.LBL_INV_ARM_L.getFillTextureName() != icon){
          this.LBL_INV_ARM_L.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_ARM_L.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_ARM_L.getFillTextureName() != 'iforearm_l'){
        this.LBL_INV_ARM_L.setFillTextureName('iforearm_l')
        TextureLoader.tpcLoader.fetch('iforearm_l', (texture) => {
          this.LBL_INV_ARM_L.setFillTexture(texture);
        });
      }

      let armor = currentPC.GetItemInSlot(UTCObject.SLOT.ARMOR);
      if(armor){
        let icon = 'i'+armor.getBaseItem().itemclass+'_'+("000" + armor.getModelVariation()).slice(-3);
        if(this.LBL_INV_BODY.getFillTextureName() != icon){
          this.LBL_INV_BODY.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_BODY.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_BODY.getFillTextureName() != 'iarmor'){
        this.LBL_INV_BODY.setFillTextureName('iarmor')
        TextureLoader.tpcLoader.fetch('iarmor', (texture) => {
          this.LBL_INV_BODY.setFillTexture(texture);
        });
      }

      let r_arm = currentPC.GetItemInSlot(UTCObject.SLOT.RIGHTARMBAND);
      if(r_arm){
        let icon = 'i'+r_arm.getBaseItem().itemclass+'_'+("000" + r_arm.getModelVariation()).slice(-3);
        if(this.LBL_INV_ARM_R.getFillTextureName() != icon){
          this.LBL_INV_ARM_R.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_ARM_R.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_ARM_R.getFillTextureName() != 'iforearm_r'){
        this.LBL_INV_ARM_R.setFillTextureName('iforearm_r')
        TextureLoader.tpcLoader.fetch('iforearm_r', (texture) => {
          this.LBL_INV_ARM_R.setFillTexture(texture);
        });
      }

      let l_weap = currentPC.GetItemInSlot(UTCObject.SLOT.LEFTHAND);
      if(l_weap){
        let icon = 'i'+l_weap.getBaseItem().itemclass+'_'+("000" + l_weap.getModelVariation()).slice(-3);
        if(this.LBL_INV_WEAP_L.getFillTextureName() != icon){
          this.LBL_INV_WEAP_L.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_WEAP_L.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_WEAP_L.getFillTextureName() != 'iweap_l'){
        this.LBL_INV_WEAP_L.setFillTextureName('iweap_l')
        TextureLoader.tpcLoader.fetch('iweap_l', (texture) => {
          this.LBL_INV_WEAP_L.setFillTexture(texture);
        });
      }

      let belt = currentPC.GetItemInSlot(UTCObject.SLOT.BELT);
      if(belt){
        let icon = 'i'+belt.getBaseItem().itemclass+'_'+("000" + belt.getModelVariation()).slice(-3);
        if(this.LBL_INV_BELT.getFillTextureName() != icon){
          this.LBL_INV_BELT.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_BELT.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_BELT.getFillTextureName() != 'ibelt'){
        this.LBL_INV_BELT.setFillTextureName('ibelt')
        TextureLoader.tpcLoader.fetch('ibelt', (texture) => {
          this.LBL_INV_BELT.setFillTexture(texture);
        });
      }

      let r_weap = currentPC.GetItemInSlot(UTCObject.SLOT.RIGHTHAND);
      if(r_weap){
        let icon = 'i'+r_weap.getBaseItem().itemclass+'_'+("000" + r_weap.getModelVariation()).slice(-3);
        if(this.LBL_INV_WEAP_R.getFillTextureName() != icon){
          this.LBL_INV_WEAP_R.setFillTextureName(icon)
          TextureLoader.tpcLoader.fetch(icon, (texture) => {
            this.LBL_INV_WEAP_R.setFillTexture(texture);
          });
        }
      }else if(this.LBL_INV_WEAP_R.getFillTextureName() != 'iweap_r'){
        this.LBL_INV_WEAP_R.setFillTextureName('iweap_r')
        TextureLoader.tpcLoader.fetch('iweap_r', (texture) => {
          this.LBL_INV_WEAP_R.setFillTexture(texture);
        });
      }
    }else{

    }
  }

  Show(){
    super.Show();
    
    Game.MenuActive = true;
    /*Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    //Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();*/

    this.equipmentSelectionActive = false;

    this.UpdateList();

    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();

    this.UpdateSlotIcons();

    let currentPC = PartyManager.party[0];
    if(currentPC){
      this.LBL_VITALITY.setText(currentPC.getHP()+'/'+currentPC.getMaxHP());
      this.LBL_DEF.setText(currentPC.getAC());
    }

    for(let i = 0; i < PartyManager.party.length; i++){
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];

      if(!i){
        
        if(this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref){
          this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref)
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
            this.LBL_PORTRAIT.setFillTexture(texture);
          });
        }

      }else{
        this['BTN_CHANGE'+(i)].show();
        if(this['BTN_CHANGE'+(i)].getFillTextureName() != portrait.baseresref){
          this['BTN_CHANGE'+(i)].setFillTextureName(portrait.baseresref)
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
            this['BTN_CHANGE'+(i)].setFillTexture(texture);
          });
        }
      }
    }

  }

}

class GUIInventoryItem extends GUIProtoItem {

  constructor(menu = null, control = null, parent = null, scale = false){
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
        buttonIcon.widget.text.position.set(6, -10, 5);
      }else if(this.node.getStackSize() >= 10){
        buttonIcon.widget.text.position.set(10, -10, 5);
      }else{
        buttonIcon.widget.text.position.set(14, -10, 5);
      }

      this.widget.add(_buttonIconWidget);

      this.widget.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.widget.iconMaterial.transparent = true;
      this.widget.iconSprite = new THREE.Sprite( this.widget.iconMaterial );
      //console.log(this.node.getIcon());
      TextureLoader.enQueue(this.node.getIcon(), this.widget.iconMaterial, TextureLoader.Type.TEXTURE);
      
      this.widget.spriteGroup = new THREE.Group();
      //this.widget.spriteGroup.position.x = -(this.extent.width/2)-(52/2); //HACK
      //this.widget.spriteGroup.position.y -= 4;
      this.widget.iconSprite.scale.x = 52;
      this.widget.iconSprite.scale.y = 52;
      this.widget.iconSprite.position.z = 1;

      this.widget.hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.widget.hexMaterial.transparent = true;
      this.widget.hexSprite = new THREE.Sprite( this.widget.hexMaterial );
      this.widget.hexSprite.scale.x = this.widget.hexSprite.scale.y = 64;
      this.widget.hexSprite.position.z = 1;

      if(GameKey != 'TSL')
        this.widget.spriteGroup.add(this.widget.hexSprite);
        
      this.widget.spriteGroup.add(this.widget.iconSprite);

      if(this.node.getStackSize() >= 100){
        this.widget.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_7');
        this.widget.hexMaterial.needsUpdate = true;
      }else if(this.node.getStackSize() > 1){
        this.widget.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_6');
        this.widget.hexMaterial.needsUpdate = true;
      }else{
        this.widget.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_3');
        this.widget.hexMaterial.needsUpdate = true;
      }

      this.onSelect = () => {
        if(this.selected){
          this.showHighlight();
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
          button.text.material.needsUpdate = true;
        }else{
          this.hideHighlight();
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
          button.text.material.needsUpdate = true;
        }
      };
      this.onSelect();

      //StackCount Text
      _buttonIconWidget.add(this.widget.spriteGroup);
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}

module.exports = MenuEquipment;