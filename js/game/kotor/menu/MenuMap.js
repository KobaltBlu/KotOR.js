/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuMap menu class.
 */

class MenuMap extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'map',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.LBL_Map = this.getControlByName('LBL_Map'); //BTN_PRTYSLCT
        this.BTN_PRTYSLCT = this.getControlByName('BTN_PRTYSLCT');
        this.BTN_RETURN = this.getControlByName('BTN_RETURN');

        this.BTN_PRTYSLCT.onClick = (e) => {
          e.stopPropagation();
          this.Hide();
          Game.MenuPartySelection.Show();
        }

        this.BTN_RETURN.onClick = (e) => {
          e.stopPropagation();
        }

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  SetMapTexture(sTexture = ''){
    this.LBL_Map.setFillTextureName(sTexture);
    TextureLoader.tpcLoader.fetch(sTexture, (texture) => {
      this.LBL_Map.setFillTexture(texture);
    });
  }

  Show(){
    super.Show();
    
    Game.MenuActive = true;

    Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    //Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();

  }

}

module.exports = MenuMap;