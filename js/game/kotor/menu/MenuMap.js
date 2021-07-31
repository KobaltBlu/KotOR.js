/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuMap menu class.
 */

class MenuMap extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'map',
      onLoad: async () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.LBL_Map = this.getControlByName('LBL_Map'); //BTN_PRTYSLCT
        this.BTN_PRTYSLCT = this.getControlByName('BTN_PRTYSLCT');
        this.BTN_RETURN = this.getControlByName('BTN_RETURN');

        this.BTN_PRTYSLCT.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuPartySelection.Open();
        });

        this.BTN_RETURN.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
          if(!Game.module.area.Unescapable){
            if(this.onTransitScript instanceof NWScriptInstance)
              this.onTransitScript.run();
          }
        });

        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.openScript = 'k_sup_guiopen';
        this.transitScript = 'k_sup_gohawk';

        this.onOpenScript = await NWScript.Load('k_sup_guiopen');
        this.onTransitScript = await NWScript.Load('k_sup_gohawk');
        NWScript.SetGlobalScript('k_sup_guiopen', true);
        NWScript.SetGlobalScript('k_sup_gohawk', true);

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

    /*Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    //Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();*/

    if(this.onOpenScript instanceof NWScriptInstance)
      this.onOpenScript.run();

  }

}

module.exports = MenuMap;