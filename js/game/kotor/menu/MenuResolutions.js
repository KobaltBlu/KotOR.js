/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuResolutions menu class.
 */

class MenuResolutions extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '';

    this.LoadMenu({
      name: 'optresolution',
      onLoad: () => {

        
        this.LBL_RESOLUTION = this.getControlByName('LBL_RESOLUTION');
        this.LB_RESOLUTIONS = this.getControlByName('LB_RESOLUTIONS');

        this.BTN_CANCEL = this.getControlByName('BTN_CANCEL');
        this.BTN_OK = this.getControlByName('BTN_OK');

        this.BTN_CANCEL.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });
        this._button_b = this.BTN_CANCEL;

        this.BTN_OK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();


        this.tGuiPanel.widget.traverse( (obj) => {
          //obj.position.z = 50;
        });

      }
    })

  }

}

module.exports = MenuResolutions;