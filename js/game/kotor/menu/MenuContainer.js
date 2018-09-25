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

    this.LoadMenu({
      name: 'container',
      onLoad: () => {

        this.LBL_MESSAGE = this.getControlByName('LBL_MESSAGE');
        this.LB_ITEMS = this.getControlByName('LB_ITEMS');
        this.BTN_OK = this.getControlByName('BTN_OK');
        this.BTN_GIVEITEMS = this.getControlByName('BTN_GIVEITEMS');
        this.BTN_CANCEL = this.getControlByName('BTN_CANCEL');
  
        this.BTN_CANCEL.onClick = (e) => {
          e.stopPropagation();
          this.LB_ITEMS.clearItems();
          this.Hide();
        };

        this.BTN_OK.onClick = (e) => {
          e.stopPropagation();
          this.LB_ITEMS.clearItems();
          this.Hide();
          if(this.container instanceof ModulePlaceable){
            this.container.retrieveInventory();
          }
          
        };

        for(let i = 0; i < 7; i++){
          if(!i){
            let textureName = 'lbl_hex';
            TextureLoader.Load(textureName, (texture) => {
              this.protoTextures[textureName] = texture
            });
          }else{
            let textureName = 'lbl_hex_'+(i+1);
            TextureLoader.Load(textureName, (texture) => {
              this.protoTextures[textureName] = texture
            });
          }
        }

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show( object = null ){

    super.Show();
    this.container = object;
    let inventory = this.container.getInventory();
    for(let i = 0; i < inventory.length; i++){

      let item = inventory[i];
      this.LB_ITEMS.addItem(item, null, (control, type) => {
        control.GetFieldByLabel('TEXT').GetChildStructs()[0].GetFieldByLabel('TEXT').SetValue(
          item.getName()
        );
        let _ctrl2 = new GUIProtoItem(this.LB_ITEMS.menu, control, this.LB_ITEMS.widget, this.LB_ITEMS.scale);
        _ctrl2.extent.width -= 52;
        _ctrl2.extent.left += 52;
        _ctrl2.setList( this.LB_ITEMS );
        this.LB_ITEMS.children.push(_ctrl2);
        let idx2 = this.LB_ITEMS.itemGroup.children.length;
        let item2 = _ctrl2.createControl();

        let iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
        iconMaterial.transparent = true;
        let iconSprite = new THREE.Sprite( iconMaterial );
        //console.log(item.getIcon());
        TextureLoader.enQueue(item.getIcon(), iconMaterial, TextureLoader.Type.TEXTURE);
        
        item2.spriteGroup = new THREE.Group();

        let iconScale = 48;

        item2.spriteGroup.position.x = -(_ctrl2.extent.width/2)-(iconScale/2); //HACK
        item2.spriteGroup.position.y -= 4;
        iconSprite.scale.x = iconScale;
        iconSprite.scale.y = iconScale;

        let hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
        hexMaterial.transparent = true;
        let hexSprite = new THREE.Sprite( hexMaterial );

        hexSprite.name = 'lbl_hex';
        hexMaterial.map = this.protoTextures[hexSprite.name];
        hexSprite.visible = true;
        hexMaterial.needsUpdate = true;
        hexSprite.scale.x = hexSprite.scale.y = iconScale;
        item2.spriteGroup.add(hexSprite);

        item2.add(item2.spriteGroup);
        item2.spriteGroup.add(iconSprite);
        this.LB_ITEMS.itemGroup.add(item2);

        _ctrl2.onClick = (e) => {
          e.stopPropagation();
        };

      });
    }

    TextureLoader.LoadQueue();

  }

}

module.exports = MenuContainer;