/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LoadScreen menu class.
 */

class LoadScreen extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.args = $.extend({
      loadscreen: '',
    }, this.args);

    this.background = '1600x1200load';

    this.LoadMenu({
      name: 'loadscreen',
      onLoad: () => {

        this.lbl_hint = this.getControlByName('LBL_HINT');
        this.lbl_name = this.getControlByName('LBL_LOADING');
        this.pb_progress = this.getControlByName('PB_PROGRESS');

        //this.showRandomHint();

        this.lbl_hint.visible = false;

        //this.lbl_name.setText('SAVING')

        if(this.args.loadscreen.length){
          this.LoadTexture(this.args.loadscreen, (texture) => {

            this.tGuiPanel.widget.fill.children[0].material.map = texture;

            if(typeof this.onLoad === 'function')
              this.onLoad();
          });
        }else{
          if(typeof this.onLoad === 'function')
            this.onLoad();
        }

      }
    })

  }

  setProgress(val = 0){
    this.pb_progress.setProgress(val);
  }

  setLoadBackground(resref = null, onLoad = null){
    if(resref){
      this.LoadTexture(resref, (texture) => {
        
        this.tGuiPanel.widget.fill.children[0].material.map = texture;

        if(typeof onLoad === 'function')
          onLoad();

      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  showRandomHint(){
    let id = Math.floor(Math.random() * (Global.kotor2DA.loadscreenhints.RowCount - 0 + 1)) + 0;

    let hint = Global.kotor2DA.loadscreenhints.rows[id].gameplayhint;
    this.lbl_hint.setText(Global.kotorTLK.TLKStrings[hint].Value);
  }

  Show(){
    super.Show();
    Game.InGameAreaTransition.Hide();
  }

}

module.exports = LoadScreen;