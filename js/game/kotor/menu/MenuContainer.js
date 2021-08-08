/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuContainer menu class.
 */

class MenuContainer extends GameMenu {

  constructor( args = {} ){
    super(args);

    this.args = $.extend({
      loadscreen: '',
    }, this.args);

    this.protoTextures = {};
    this.isOverlayGUI = true;

    this.LoadMenu({
      name: 'container',
      onLoad: () => {

        this.LBL_MESSAGE = this.getControlByName('LBL_MESSAGE');
        this.LB_ITEMS = this.getControlByName('LB_ITEMS');
        this.BTN_OK = this.getControlByName('BTN_OK');
        this.BTN_GIVEITEMS = this.getControlByName('BTN_GIVEITEMS');
        this.BTN_CANCEL = this.getControlByName('BTN_CANCEL');
  
        this.BTN_CANCEL.addEventListener('click', (e) => {
          e.stopPropagation();
          this.LB_ITEMS.clearItems();
          if(this.container instanceof ModulePlaceable){
            this.container.close(Game.player);
          }
          this.Close();
        });
        this._button_b = this.BTN_CANCEL;

        this.BTN_OK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.LB_ITEMS.clearItems();
          if(this.container instanceof ModulePlaceable){
            this.container.retrieveInventory();
            this.container.close(Game.player);
          }else if(this.container instanceof ModuleCreature){
            this.container.retrieveInventory();
            //this.container.close(Game.player);
          }
          this.Close(true);
        });
        this._button_a = this.BTN_OK;

        for(let i = 0; i < 7; i++){
          if(!i){
            let textureName = 'lbl_hex';
            TextureLoader.Load(textureName, (texture) => {
              this.protoTextures[textureName] = texture
            }, null);
          }else{
            let textureName = 'lbl_hex_'+(i+1);
            TextureLoader.Load(textureName, (texture) => {
              this.protoTextures[textureName] = texture
            }, null);
          }
        }

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Hide (onClosed = false){
    super.Hide();
    if(onClosed && this.container instanceof ModulePlaceable){
      try{
        this.container.close(Game.getCurrentPlayer());
      }catch(e){}
    }
    //this.container = undefined;
  }

  Open(object = undefined){
    this.container = object;
    super.Open();
  }

  Show(){
    super.Show();
    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    if(this.container instanceof ModuleCreature || this.container instanceof ModulePlaceable){
      let inventory = this.container.getInventory();
      for(let i = 0; i < inventory.length; i++){
        let item = inventory[i];
        this.LB_ITEMS.addItem(item, null);
      }
      TextureLoader.LoadQueue();
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
      buttonIcon.widget.text.position.set(6, -8, 5);
    }else if(this.node.getStackSize() >= 10){
      buttonIcon.widget.text.position.set(10, -8, 5);
    }else{
      buttonIcon.widget.text.position.set(14, -8, 5);
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
    this.widget.hexSprite.scale.x = this.widget.hexSprite.scale.y = 52;
    this.widget.hexSprite.position.z = 1;

    if(GameKey != 'TSL')
      this.widget.spriteGroup.add(this.widget.hexSprite);
      
    this.widget.spriteGroup.add(this.widget.iconSprite);

    if(this.node.getStackSize() >= 100){
      this.widget.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_4');
      this.widget.hexMaterial.needsUpdate = true;
    }else if(this.node.getStackSize() > 1){
      this.widget.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_4');
      this.widget.hexMaterial.needsUpdate = true;
    }else{
      this.widget.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex');
      this.widget.hexMaterial.needsUpdate = true;
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
    this.onSelect();

    //StackCount Text
    _buttonIconWidget.add(this.widget.spriteGroup);
    return this.widget;
  }

}

module.exports = MenuContainer;