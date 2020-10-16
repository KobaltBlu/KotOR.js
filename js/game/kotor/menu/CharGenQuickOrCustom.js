/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenQuickOrCustom menu class.
 */

class CharGenQuickOrCustom extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '';

    this.LoadMenu({
      name: 'qorcpnl',
      onLoad: () => {

        this.QUICK_CHAR_BTN = this.getControlByName('QUICK_CHAR_BTN');
        this.CUST_CHAR_BTN = this.getControlByName('CUST_CHAR_BTN');

        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.QUICK_CHAR_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          try{
            let class_data = Global.kotor2DA['classes'].rows[CharGenClass.SelectedClass];
            let saving_throw_data = Global.kotor2DA[class_data['savingthrowtable'].toLowerCase()].rows[0];
            let feats_table = Global.kotor2DA['feat'];

            Game.player.str = parseInt(class_data.str);
            Game.player.dex = parseInt(class_data.dex);
            Game.player.con = parseInt(class_data.con);
            Game.player.wis = parseInt(class_data.wis);
            Game.player.int = parseInt(class_data.int);
            Game.player.cha = parseInt(class_data.cha);
            Game.player.str = parseInt(class_data.str);

            Game.player.fortbonus = parseInt(saving_throw_data.fortsave);
            Game.player.willbonus = parseInt(saving_throw_data.willsave);
            Game.player.refbonus = parseInt(saving_throw_data.refsave);

            let featstable_key = class_data['featstable'].toLowerCase();

            for(let i = 0, len = feats_table.rows.length; i < len; i++){
              let feat_data = feats_table.rows[i];
              if(feat_data[featstable_key+'_granted'] == 1){
                Game.player.feats.push(new TalentFeat({type: 1, id: i }));
              }
            }
            console.log('boo');
            //Game.CharGenMain.state = CharGenMain.STATES.QUICK;
            //Game.CharGenQuickPanel.Show();
            Game.CharGenMain.Close();
            Game.CharGenMain.childMenu = Game.CharGenQuickPanel;
            Game.CharGenMain.Open();
          }catch(e){
            console.log(e);
          }
        });

        this.CUST_CHAR_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.CharGenMain.state = CharGenMain.STATES.CUSTOM;
          //Game.CharGenCustomPanel.Show();
          Game.CharGenMain.Close();
          Game.CharGenMain.childMenu = Game.CharGenCustomPanel;
          Game.CharGenMain.Open();

          //Reset the Attributes window
          Game.CharGenAbilities.reset();

          //Reset the Skills window
          Game.CharGenSkills.reset();
        });

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.CharGenMain.Hide();

          try{
            Game.player.model.parent.remove(Game.player.model);
          }catch(e){}

          Game.CharGenClass['_3D_MODEL'+(CharGenClass.SelectedClass+1)]._3dView.scene.add(Game.player.model);

          Game.CharGenMain.Close();
        });

        //Hide because this submenu is very incomplete.
        //Comment out this line to work on the custom chargen screen
        //this.CUST_CHAR_BTN.hide();

        this.tGuiPanel.offset.x = -180;
        this.tGuiPanel.offset.y = 100;
        this.RecalculatePosition();

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

}

module.exports = CharGenQuickOrCustom;