/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuSound menu class.
 */

class MenuSaveName extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.isOverlayGUI = true;
    this.isModal = true;

    this.LoadMenu({
      name: 'savename',
      onLoad: () => {

        this.EDITBOX.setEditable(true);

        this.BTN_OK.addEventListener('click', () => {
          if(typeof this.onSave == 'function')
            this.onSave(this.EDITBOX.getValue())

          this.Close();
        });

        this.BTN_CANCEL.addEventListener('click', () => {


          this.Close();
        });
        

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    this.tGuiPanel.widget.position.z = 10;
    this.EDITBOX.setText('');
    super.Show();
    Game.activeGUIElement = this.EDITBOX;
  }

}

module.exports = MenuSaveName;