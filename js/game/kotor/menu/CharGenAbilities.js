/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenAbilities menu class.
 */

class CharGenAbilities extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'abchrgen',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');
        this.availPoints = 30;
        this.str = 8;
        this.dex = 8;
        this.con = 8;
        this.wis = 8;
        this.int = 8;
        this.cha = 8;

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.BTN_ACCEPT.addEventListener('click', (e) => {
          e.stopPropagation();

          let character = Game.getCurrentPlayer();
          character.str = this.str;
          character.dex = this.dex;
          character.con = this.con;
          character.wis = this.wis;
          character.int = this.int;
          character.cha = this.cha;

          Game.CharGenMain.updateAttributes();

          this.Close();
        });

        this.BTN_RECOMMENDED.addEventListener('click', (e) => {
          this.availPoints = 0;
          this.str = parseInt(Game.getCurrentPlayer().classes[0].str);
          this.dex = parseInt(Game.getCurrentPlayer().classes[0].dex);
          this.con = parseInt(Game.getCurrentPlayer().classes[0].con);
          this.wis = parseInt(Game.getCurrentPlayer().classes[0].wis);
          this.int = parseInt(Game.getCurrentPlayer().classes[0].int);
          this.cha = parseInt(Game.getCurrentPlayer().classes[0].cha);

          this.updateButtonStates();
        });

        //MINUS Buttons
        this.STR_MINUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.str > Game.getCurrentPlayer().str && this.str > 8){
            let cost = this.getAttributeCost(ATTRIBUTE.STR);
            this.str -= 1;
            this.availPoints += cost;
          }
          this.updateButtonStates();
        });

        this.DEX_MINUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.dex > Game.getCurrentPlayer().dex && this.dex > 8){
            let cost = this.getAttributeCost(ATTRIBUTE.DEX);
            this.dex -= 1;
            this.availPoints += cost;
          }
          this.updateButtonStates();
        });
        
        this.CON_MINUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.con > Game.getCurrentPlayer().con && this.con > 8){
            let cost = this.getAttributeCost(ATTRIBUTE.CON);
            this.con -= 1;
            this.availPoints += cost;
          }
          this.updateButtonStates();
        });

        this.WIS_MINUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.wis > Game.getCurrentPlayer().wis && this.wis > 8){
            let cost = this.getAttributeCost(ATTRIBUTE.WIS);
            this.wis -= 1;
            this.availPoints += cost;
          }
          this.updateButtonStates();
        });

        this.INT_MINUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.int > Game.getCurrentPlayer().int && this.int > 8){
            let cost = this.getAttributeCost(ATTRIBUTE.INT);
            this.int -= 1;
            this.availPoints += cost;
          }
          this.updateButtonStates();
        });

        this.CHA_MINUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.cha > Game.getCurrentPlayer().cha && this.cha > 8){
            let cost = this.getAttributeCost(ATTRIBUTE.CHA);
            this.cha -= 1;
            this.availPoints += cost;
          }
          this.updateButtonStates();
        });
        
        //PLUS Buttons
        this.STR_PLUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.getAttributeCost(ATTRIBUTE.STR) <= this.availPoints){
            this.str += 1;
            let cost = this.getAttributeCost(ATTRIBUTE.STR);
            this.availPoints -= cost;
          }
          this.updateButtonStates();
        });

        this.DEX_PLUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.getAttributeCost(ATTRIBUTE.DEX) <= this.availPoints){
            this.dex += 1;
            let cost = this.getAttributeCost(ATTRIBUTE.DEX);
            this.availPoints -= cost;
          }
          this.updateButtonStates();
        });

        this.CON_PLUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.getAttributeCost(ATTRIBUTE.CON) <= this.availPoints){
            this.con += 1;
            let cost = this.getAttributeCost(ATTRIBUTE.CON);
            this.availPoints -= cost;
          }
          this.updateButtonStates();
        });

        this.WIS_PLUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.getAttributeCost(ATTRIBUTE.WIS) <= this.availPoints){
            this.wis += 1;
            let cost = this.getAttributeCost(ATTRIBUTE.WIS);
            this.availPoints -= cost;
          }
          this.updateButtonStates();
        });

        this.INT_PLUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.getAttributeCost(ATTRIBUTE.INT) <= this.availPoints){
            this.int += 1;
            let cost = this.getAttributeCost(ATTRIBUTE.INT);
            this.availPoints -= cost;
          }
          this.updateButtonStates();
        });

        this.CHA_PLUS_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.getAttributeCost(ATTRIBUTE.CHA) <= this.availPoints){
            this.cha += 1;
            let cost = this.getAttributeCost(ATTRIBUTE.CHA);
            this.availPoints -= cost;
          }
          this.updateButtonStates();
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();

    this.updateButtonStates();
  }

  updateButtonStates(){
    this.STR_POINTS_BTN.setText(this.str);
    this.DEX_POINTS_BTN.setText(this.dex);
    this.CON_POINTS_BTN.setText(this.con);
    this.WIS_POINTS_BTN.setText(this.wis);
    this.INT_POINTS_BTN.setText(this.int);
    this.CHA_POINTS_BTN.setText(this.cha);

    //Selected Attribute Cost
    //this.COST_POINTS_LBL

    //Selected Attribute Modifier
    //this.LBL_ABILITY_MOD

    this.STR_MINUS_BTN.show();
    this.DEX_MINUS_BTN.show();
    this.CON_MINUS_BTN.show();
    this.WIS_MINUS_BTN.show();
    this.INT_MINUS_BTN.show();
    this.CHA_MINUS_BTN.show();

    this.STR_PLUS_BTN.show();
    this.DEX_PLUS_BTN.show();
    this.CON_PLUS_BTN.show();
    this.WIS_PLUS_BTN.show();
    this.INT_PLUS_BTN.show();
    this.CHA_PLUS_BTN.show();

    if(this.str <= 8 || Game.getCurrentPlayer().str == this.str)
      this.STR_MINUS_BTN.hide();

    if(this.dex <= 8 || Game.getCurrentPlayer().dex == this.dex)
      this.DEX_MINUS_BTN.hide();

    if(this.con <= 8 || Game.getCurrentPlayer().con == this.con)
      this.CON_MINUS_BTN.hide();

    if(this.wis <= 8 || Game.getCurrentPlayer().wis == this.wis)
      this.WIS_MINUS_BTN.hide();

    if(this.int <= 8 || Game.getCurrentPlayer().int == this.int)
      this.INT_MINUS_BTN.hide();

    if(this.cha <= 8 || Game.getCurrentPlayer().cha == this.cha)
      this.CHA_MINUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.STR) > this.availPoints)
      this.STR_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.DEX) > this.availPoints)
      this.DEX_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.CON) > this.availPoints)
      this.CON_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.WIS) > this.availPoints)
      this.WIS_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.INT) > this.availPoints)
      this.INT_PLUS_BTN.hide();

    if(this.getAttributeCost(ATTRIBUTE.CHA) > this.availPoints)
      this.CHA_PLUS_BTN.hide();

    this.REMAINING_SELECTIONS_LBL.setText(this.availPoints);
  }

  getAttributeCost(index = 0){
    let mod = 0;
    switch(index){
      case ATTRIBUTE.STR:
        mod = Math.floor((this.str - 10)/2);
      break;
      case ATTRIBUTE.DEX:
        mod = Math.floor((this.dex - 10)/2);
      break;
      case ATTRIBUTE.CON:
        mod = Math.floor((this.con - 10)/2);
      break;
      case ATTRIBUTE.WIS:
        mod = Math.floor((this.wis - 10)/2);
      break;
      case ATTRIBUTE.INT:
        mod = Math.floor((this.int - 10)/2);
      break;
      case ATTRIBUTE.CHA:
        mod = Math.floor((this.cha - 10)/2);
      break;
    }
    return Math.max(1, mod);
  }

  reset(){
    this.availPoints = 30;
    Game.getCurrentPlayer().str = 8;
    Game.getCurrentPlayer().dex = 8;
    Game.getCurrentPlayer().con = 8;
    Game.getCurrentPlayer().wis = 8;
    Game.getCurrentPlayer().int = 8;
    Game.getCurrentPlayer().cha = 8;
  }

}

const ATTRIBUTE = {
  STR: 0,
  DEX: 1,
  CON: 2,
  WIS: 3,
  INT: 4,
  CHA: 5,
}

module.exports = CharGenAbilities;