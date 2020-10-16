/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

const Game = require("../KOTOR");

/* @file
 * The CharGenSkills menu class.
 */

class CharGenSkills extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'skchrgen',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.availPoints = 0;

        this.computerUse = 0;
        this.demolitions = 0;
        this.stealth = 0;
        this.awareness = 0;
        this.persuade = 0;
        this.repair = 0;
        this.security = 0;
        this.treatInjury = 0;

        this.BTN_BACK = this.getControlByName('BTN_BACK');
        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.BTN_ACCEPT.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('CharGenSkills', 'Assigning skillpoints')
          Game.getCurrentPlayer().skills[0].rank = this.computerUse;
          Game.getCurrentPlayer().skills[1].rank = this.demolitions;
          Game.getCurrentPlayer().skills[2].rank = this.stealth;
          Game.getCurrentPlayer().skills[3].rank = this.awareness;
          Game.getCurrentPlayer().skills[4].rank = this.persuade;
          Game.getCurrentPlayer().skills[5].rank = this.repair;
          Game.getCurrentPlayer().skills[6].rank = this.security;
          Game.getCurrentPlayer().skills[7].rank = this.treatInjury;
          this.Close();
        });

        this.BTN_RECOMMENDED.addEventListener('click', (e) => {

          this.resetPoints();
          this.availPoints = this.getMaxSkillPoints();
          let skillOrder = this.getRecommendedOrder();
          
          while(this.availPoints > 0){
            for(let i = 0; i < 8; i++){
              let skillIndex = skillOrder[i];

              if(!this.availPoints)
                break;

              switch(skillIndex){
                case 0:
                  this.computerUse++;
                break;
                case 1:
                  this.demolitions++;
                break;
                case 2:
                  this.stealth++;
                break;
                case 3:
                  this.awareness++;
                break;
                case 4:
                  this.persuade++;
                break;
                case 5:
                  this.repair++;
                break;
                case 6:
                  this.security++;
                break;
                case 7:
                  this.treatInjury++;
                break;
              }
              
              if(skillIndex >= 0){
                this.availPoints -= 1;
              }
            }
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
    this.COMPUTER_USE_POINTS_BTN.setText(this.computerUse);
    this.DEMOLITIONS_POINTS_BTN.setText(this.demolitions);
    this.STEALTH_POINTS_BTN.setText(this.stealth);
    this.AWARENESS_POINTS_BTN.setText(this.awareness);
    this.PERSUADE_POINTS_BTN.setText(this.persuade);
    this.REPAIR_POINTS_BTN.setText(this.repair);
    this.SECURITY_POINTS_BTN.setText(this.security);
    this.TREAT_INJURY_POINTS_BTN.setText(this.treatInjury);

    this.REMAINING_SELECTIONS_LBL.setText(this.availPoints);
  }

  reset(){
    this.availPoints = this.getMaxSkillPoints();
    this.resetPoints();
  }

  resetPoints(){
    for(let i = 0; i < 8; i++){
      Game.getCurrentPlayer().skills[i].rank = 0;
    }
    this.computerUse = Game.getCurrentPlayer().skills[0].rank;
    this.demolitions = Game.getCurrentPlayer().skills[1].rank;
    this.stealth = Game.getCurrentPlayer().skills[2].rank;
    this.awareness = Game.getCurrentPlayer().skills[3].rank;
    this.persuade = Game.getCurrentPlayer().skills[4].rank;
    this.repair = Game.getCurrentPlayer().skills[5].rank;
    this.security = Game.getCurrentPlayer().skills[6].rank;
    this.treatInjury = Game.getCurrentPlayer().skills[7].rank;
  }

  getMaxSkillPoints(){
    return 10 + parseInt(Game.player.classes[0].skillpointbase);
  }

  getSkillTableColumn(){
    return Game.player.classes[0].skillstable.toLowerCase()+'_class';
  }

  getSkillTableColumnRecommended(){
    return Game.player.classes[0].skillstable.toLowerCase()+'_reco';
  }

  getRecommendedOrder(){
    let skillOrder = {'0': -1, '1': -1, '2': -1, '3': -1, '4': -1, '5': -1, '6': -1, '7': -1};
    for(let i = 0; i < 8; i++){
      let value = Global.kotor2DA.skills.rows[i][this.getSkillTableColumnRecommended()];
      if(value != '****'){
        skillOrder[value-1] = i;
      }
    }
    return skillOrder;
  }

}

module.exports = CharGenSkills;