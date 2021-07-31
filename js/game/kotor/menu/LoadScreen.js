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
    this.voidFill = true;

    this.canCancel = false;

    this.LoadMenu({
      name: 'loadscreen',
      onLoad: () => {

        this.lbl_hint = this.getControlByName('LBL_HINT');
        this.lbl_name = this.getControlByName('LBL_LOADING');
        this.pb_progress = this.getControlByName('PB_PROGRESS');

        //this.showRandomHint();

        this.lbl_hint.visible = false;

        this.defaultTex = this.tGuiPanel.getFill().material.uniforms.map.value;

        if(this.args.loadscreen.length){
          this.LoadTexture(this.args.loadscreen, (texture) => {

            this.tGuiPanel.getFill().uniforms.material.uniforms.map.value.value = texture;

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
        if(texture){
          this.tGuiPanel.getFill().material.uniforms.map.value = texture;
          if(typeof onLoad === 'function')
            onLoad();
        }else{
          this.LoadTexture('load_default', (texture) => {
            this.tGuiPanel.getFill().material.uniforms.map.value = this.defaultTex = texture;
            if(typeof onLoad === 'function')
              onLoad();
          });
        }
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  showRandomHint(){
    this.lbl_name.setText(Global.kotorTLK.TLKStrings[42493].Value);
    let id = Math.floor(Math.random() * (Global.kotor2DA.loadscreenhints.RowCount - 0 + 1)) + 0;
    let hint = Global.kotor2DA.loadscreenhints.rows[id];
    if(!hint){
      console.log('showRandomHint', id);
      hint = Global.kotor2DA.loadscreenhints.rows[0];
    }

    this.lbl_hint.setText(Global.kotorTLK.TLKStrings[hint.gameplayhint].Value);
  }

  showSavingMessage(){
    this.lbl_name.setText(Global.kotorTLK.TLKStrings[42528].Value);
    this.lbl_hint.setText(Global.kotorTLK.TLKStrings[41926].Value);
    this.setProgress(0);
  }

  Show(){
    super.Show();
    this.setProgress(0);
    Game.InGameAreaTransition.Hide();
    Game.FadeOverlay.plane.visible = false;
  }

  Hide(){
    super.Hide();
    Game.FadeOverlay.plane.visible = true;
    this.setProgress(0);
  }

}

module.exports = LoadScreen;