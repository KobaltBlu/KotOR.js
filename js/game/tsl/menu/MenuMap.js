/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuMap menu class.
 */

class MenuMap extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = 'blackfill';
    this.voidFill = true;

    this.LoadMenu({
      name: 'map_p',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.LBL_Map = this.getControlByName('LBL_Map'); //BTN_PRTYSLCT
        //this.BTN_PRTYSLCT = this.getControlByName('BTN_PRTYSLCT');
        this.BTN_RETURN = this.getControlByName('BTN_RETURN');

        this.BTN_RETURN.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

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

  }

}

module.exports = MenuMap;