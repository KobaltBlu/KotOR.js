/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

const GUIProtoItem = require("../../../gui/GUIProtoItem");

/* @file
 * The MenuInventory menu class.
 */

class MenuInventory extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'inventory',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');
        this.LB_ITEMS = this.getControlByName('LB_ITEMS');
        this.LBL_PORT = this.getControlByName('LBL_PORT');
        this.BTN_CHANGE1 = this.getControlByName('BTN_CHANGE1');
        this.BTN_CHANGE2 = this.getControlByName('BTN_CHANGE2');

        this.LB_ITEMS.padding = 5;
        this.LB_ITEMS.offset.x = 0;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    });

  }

  Show(){
    super.Show();
    
    Game.MenuActive = true;

    /*Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    //Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();*/
    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    let inv = InventoryManager.getNonQuestInventory();
    for(let i = 0; i < inv.length; i++){
      this.LB_ITEMS.addItem(inv[i]);
    }

    TextureLoader.LoadQueue();

    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();

    let currentPC = PartyManager.party[0];
    if(currentPC){
      this.LBL_VIT.setText(currentPC.getHP()+'/'+currentPC.getMaxHP());
      this.LBL_DEF.setText(currentPC.getAC());
    }
    
    this.LBL_CREDITS_VALUE.setText(PartyManager.Gold);

    for(let i = 0; i < PartyManager.party.length; i++){
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];

      if(!i){
        
        if(this.LBL_PORT.getFillTextureName() != portrait.baseresref){
          this.LBL_PORT.setFillTextureName(portrait.baseresref)
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
            this.LBL_PORT.setFillTexture(texture);
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

module.exports = MenuInventory;