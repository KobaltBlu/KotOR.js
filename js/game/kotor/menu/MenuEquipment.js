/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuEquipment menu class.
 */

class MenuEquipment extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
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

        this.BTN_EXIT = this.getControlByName('BTN_BACK');
        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.InGameOverlay.Show();
        });

        this.BTN_INV_IMPLANT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.IMPLANT;
          this.UpdateList();
        });

        this.BTN_INV_HEAD.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.HEAD;
          this.UpdateList();
        });

        this.BTN_INV_HANDS.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.ARMS;
          this.UpdateList();
        });

        this.BTN_INV_ARM_L.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.LEFTARMBAND;
          this.UpdateList();
        });

        this.BTN_INV_BODY.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.ARMOR;
          this.UpdateList();
        });

        this.BTN_INV_ARM_R.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.RIGHTARMBAND;
          this.UpdateList();
        });

        this.BTN_INV_WEAP_L.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.LEFTHAND;
          this.UpdateList();
        });

        this.BTN_INV_BELT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.BELT;
          this.UpdateList();
        });

        this.BTN_INV_WEAP_R.addEventListener('click', (e) => {
          e.stopPropagation();
          this.slot = UTCObject.SLOT.RIGHTHAND;
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
            this.UpdateSelected(null);
            this.UpdateSlotIcons();
          }
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  UpdateList(){
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
        });/*, null, (control, type) => {
          this.ListItemBuilder(inv[i], control, type);
        });*/
      }

      TextureLoader.LoadQueue();
    }
  }

  ListItemBuilder(item, control, type){
    control.GetFieldByLabel('TEXT').GetChildStructs()[0].GetFieldByLabel('TEXT').SetValue(
      item.getName()
    );
    let ctrl = new GUIProtoItem(this, control, this.LB_ITEMS.widget, this.LB_ITEMS.scale);

    ctrl.extent.width -= 52;
    ctrl.extent.left -= 46;
    ctrl.setList( this.LB_ITEMS );
    this.LB_ITEMS.children.push(ctrl);
    let idx2 = this.LB_ITEMS.itemGroup.children.length;
    let item2 = ctrl.createControl();

    let iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
    iconMaterial.transparent = true;
    let iconSprite = new THREE.Sprite( iconMaterial );
     
    TextureLoader.enQueue(item.getIcon(), iconMaterial, TextureLoader.Type.TEXTURE);
    
    item2.spriteGroup = new THREE.Group();
    item2.spriteGroup.position.x = -(ctrl.extent.width/2)-(52/2); //HACK
    item2.spriteGroup.position.y += 1;
    iconSprite.scale.x = 48;
    iconSprite.scale.y = 48;
    iconSprite.position.z = 1;

    for(let i = 0; i < 7; i++){
      let hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      hexMaterial.transparent = true;
      let hexSprite = new THREE.Sprite( hexMaterial );
      
      if(!i){
        hexSprite.name = 'lbl_hex';
        TextureLoader.enQueue('lbl_hex', hexMaterial, TextureLoader.Type.TEXTURE);
        hexSprite.visible = true;
      }else{
        hexSprite.name = 'lbl_hex_'+(i+1);
        TextureLoader.enQueue('lbl_hex_'+(i+1), hexMaterial, TextureLoader.Type.TEXTURE);
        hexSprite.visible = false;
      }
      hexSprite.scale.x = hexSprite.scale.y = 64;
      hexSprite.position.z = 1;
      item2.spriteGroup.add(hexSprite);
    }

    item2.add(item2.spriteGroup);
    item2.spriteGroup.add(iconSprite);
    this.LB_ITEMS.itemGroup.add(item2);

    ctrl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.UpdateSelected(item);
    });
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
    Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    //Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();

    this.UpdateList();

    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();

    this.UpdateSlotIcons();

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

module.exports = MenuEquipment;