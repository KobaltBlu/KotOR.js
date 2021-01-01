/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameOverlay menu class.
 */

class InGameOverlay extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.args = $.extend({
      loadscreen: '',
    }, this.args);

    this.lastTarget = undefined;
    this.lastCurrentPlayer = undefined;
    this.targetSkills = undefined;
    this.target0_idx = 0;
    this.target1_idx = 0;
    this.target2_idx = 0;

    this.LoadMenu({
      name: 'mipc28x6_p',
      scale: true,
      onLoad: () => {

        //this.lbl_combatbg2 = this.getControlByName('LBL_COMBATBG2');
        //this.lbl_combatbg3 = this.getControlByName('LBL_COMBATBG3');
        //this.lbl_combatbg1 = this.getControlByName('LBL_COMBATBG1');
        this.LBL_MOULDING3 = this.getControlByName('LBL_MOULDING3');
        //this.LBL_MOULDING4 = this.getControlByName('LBL_MOULDING4');
        this.LBL_ACTIONDESC = this.getControlByName('LBL_ACTIONDESC');
        this.LBL_MENUBG = this.getControlByName('LBL_MENUBG');
        //this.LBL_MOULDING2 = this.getControlByName('LBL_MOULDING2');
        this.LBL_MOULDING1 = this.getControlByName('LBL_MOULDING1');
        //this.LBL_INDICATE = this.getControlByName('LBL_INDICATE');
        //this.LBL_INDICATEBG = this.getControlByName('LBL_INDICATEBG');

        this.LBL_STEALTHXP = this.getControlByName('LBL_STEALTHXP');
        this.BTN_ACTION0 = this.getControlByName('BTN_ACTION0');
        this.BTN_ACTIONUP0 = this.getControlByName('BTN_ACTIONUP0');
        this.BTN_ACTIONDOWN0 = this.getControlByName('BTN_ACTIONDOWN0');
        this.BTN_ACTION1 = this.getControlByName('BTN_ACTION1');
        this.BTN_ACTIONUP1 = this.getControlByName('BTN_ACTIONUP1');
        this.BTN_ACTIONDOWN1 = this.getControlByName('BTN_ACTIONDOWN1');
        this.BTN_ACTION2 = this.getControlByName('BTN_ACTION2');
        this.BTN_ACTIONUP2 = this.getControlByName('BTN_ACTIONUP2');
        this.BTN_ACTIONDOWN2 = this.getControlByName('BTN_ACTIONDOWN2');
        this.BTN_ACTION3 = this.getControlByName('BTN_ACTION3');
        this.BTN_ACTIONUP3 = this.getControlByName('BTN_ACTIONUP3');
        this.BTN_ACTIONDOWN3 = this.getControlByName('BTN_ACTIONDOWN3');
        this.BTN_ACTION4 = this.getControlByName('BTN_ACTION4');
        this.BTN_ACTIONUP4 = this.getControlByName('BTN_ACTIONUP4');
        this.BTN_ACTIONDOWN4 = this.getControlByName('BTN_ACTIONDOWN4');
        this.BTN_ACTION5 = this.getControlByName('BTN_ACTION5');
        this.BTN_ACTIONUP5 = this.getControlByName('BTN_ACTIONUP5');
        this.BTN_ACTIONDOWN5 = this.getControlByName('BTN_ACTIONDOWN5');

        this.TB_PAUSE = this.getControlByName('TB_PAUSE');
        this.TB_STEALTH = this.getControlByName('TB_STEALTH');
        this.TB_SOLO = this.getControlByName('TB_SOLO');

        //Menu Buttons
        this.BTN_MSG = this.getControlByName('BTN_MSG');
        this.BTN_JOU = this.getControlByName('BTN_JOU');
        this.BTN_MAP = this.getControlByName('BTN_MAP');
        this.BTN_OPT = this.getControlByName('BTN_OPT');
        this.BTN_CHAR = this.getControlByName('BTN_CHAR');
        this.BTN_ABI = this.getControlByName('BTN_ABI');
        this.BTN_INV = this.getControlByName('BTN_INV');
        this.BTN_EQU = this.getControlByName('BTN_EQU');

        //Map
        this.BTN_MINIMAP = this.getControlByName('BTN_MINIMAP');
        this.LBL_MAP = this.getControlByName('LBL_MAP');
        this.LBL_MAPBORDER = this.getControlByName('LBL_MAPBORDER');
        this.LBL_MAPVIEW = this.getControlByName('LBL_MAPVIEW');
        this.LBL_ARROW = this.getControlByName('LBL_ARROW');
        this.LBL_ARROW_MARGIN = this.getControlByName('LBL_ARROW_MARGIN');

        //Character 1
        this.LBL_CMBTEFCTRED1 = this.getControlByName('LBL_CMBTEFCTRED1');
        this.LBL_CMBTEFCTINC1 = this.getControlByName('LBL_CMBTEFCTINC1');
        this.LBL_LEVELUP1 = this.getControlByName('LBL_LEVELUP1');
        //this.LBL_LVLUPBG1 = this.getControlByName('LBL_LVLUPBG1');
        this.LBL_DEBILATATED1 = this.getControlByName('LBL_DEBILATATED1');
        this.LBL_DISABLE1 = this.getControlByName('LBL_DISABLE1');
        this.LBL_CHAR1 = this.getControlByName('LBL_CHAR1');
        this.BTN_CHAR1 = this.getControlByName('BTN_CHAR1');
        this.LBL_BACK1 = this.getControlByName('LBL_BACK1');
        this.PB_FORCE1 = this.getControlByName('PB_FORCE1');
        this.PB_VIT1 = this.getControlByName('PB_VIT1');

        //Character 2
        this.LBL_CMBTEFCTRED2 = this.getControlByName('LBL_CMBTEFCTRED2');
        this.LBL_CMBTEFCTINC2 = this.getControlByName('LBL_CMBTEFCTINC2');
        this.LBL_LEVELUP2 = this.getControlByName('LBL_LEVELUP2');
        //this.LBL_LVLUPBG2 = this.getControlByName('LBL_LVLUPBG2');
        this.LBL_DEBILATATED2 = this.getControlByName('LBL_DEBILATATED2');
        this.LBL_DISABLE2 = this.getControlByName('LBL_DISABLE2');
        this.LBL_CHAR2 = this.getControlByName('LBL_CHAR2');
        this.BTN_CHAR2 = this.getControlByName('BTN_CHAR2');
        this.LBL_BACK2 = this.getControlByName('LBL_BACK2');
        this.PB_FORCE2 = this.getControlByName('PB_FORCE2');
        this.PB_VIT2 = this.getControlByName('PB_VIT2');

        //Character 3
        this.LBL_CMBTEFCTRED3 = this.getControlByName('LBL_CMBTEFCTRED3');
        this.LBL_CMBTEFCTINC3 = this.getControlByName('LBL_CMBTEFCTINC3');
        this.LBL_LEVELUP3 = this.getControlByName('LBL_LEVELUP3');
        //this.LBL_LVLUPBG3 = this.getControlByName('LBL_LVLUPBG3');
        this.LBL_DEBILATATED3 = this.getControlByName('LBL_DEBILATATED3');
        this.LBL_DISABLE3 = this.getControlByName('LBL_DISABLE3');
        this.LBL_CHAR3 = this.getControlByName('LBL_CHAR3');
        this.BTN_CHAR3 = this.getControlByName('BTN_CHAR3');
        this.LBL_BACK3 = this.getControlByName('LBL_BACK3');
        this.PB_FORCE3 = this.getControlByName('PB_FORCE3');
        this.PB_VIT3 = this.getControlByName('PB_VIT3');

        //Nameplate
        this.LBL_NAME = this.getControlByName('LBL_NAME');
        this.LBL_NAMEBG = this.getControlByName('LBL_NAMEBG');
        this.PB_HEALTH = this.getControlByName('PB_HEALTH');
        this.LBL_HEALTHBG = this.getControlByName('LBL_HEALTHBG');

        //Action Description
        this.LBL_ACTIONDESC = this.getControlByName('LBL_ACTIONDESC');
        this.LBL_ACTIONDESCBG = this.getControlByName('LBL_ACTIONDESCBG');

        //Statuses
        this.LBL_LIGHTSHIFT = this.getControlByName('LBL_LIGHTSHIFT');
        this.LBL_DARKSHIFT = this.getControlByName('LBL_DARKSHIFT');
        this.LBL_JOURNAL = this.getControlByName('LBL_JOURNAL');
        this.LBL_CASH = this.getControlByName('LBL_CASH');
        this.LBL_PLOTXP = this.getControlByName('LBL_PLOTXP');
        this.LBL_STEALTHXP = this.getControlByName('LBL_STEALTHXP');
        this.LBL_ITEMRCVD = this.getControlByName('LBL_ITEMRCVD');
        this.LBL_ITEMLOST = this.getControlByName('LBL_ITEMLOST');


        //Combat
        this.BTN_CLEARALL = this.getControlByName('BTN_CLEARALL');
        this.BTN_CLEARONE = this.getControlByName('BTN_CLEARONE'); //Holds the graphic of the current attack icon
        //this.LBL_COMBATBG1 = this.getControlByName('LBL_COMBATBG1');
        //this.LBL_COMBATBG2 = this.getControlByName('LBL_COMBATBG2');
        //this.LBL_COMBATBG3 = this.getControlByName('LBL_COMBATBG3');
        this.LBL_QUEUE0 = this.getControlByName('LBL_QUEUE0');
        this.LBL_QUEUE1 = this.getControlByName('LBL_QUEUE1');
        this.LBL_QUEUE2 = this.getControlByName('LBL_QUEUE2');
        this.LBL_QUEUE3 = this.getControlByName('LBL_QUEUE3');

        this.LBL_TARGET0 = this.getControlByName('LBL_TARGET0');
        this.BTN_TARGET0 = this.getControlByName('BTN_TARGET0');
        this.BTN_TARGETDOWN0 = this.getControlByName('BTN_TARGETDOWN0');
        this.BTN_TARGETUP0 = this.getControlByName('BTN_TARGETUP0');
        this.LBL_TARGET1 = this.getControlByName('LBL_TARGET1');
        this.BTN_TARGET1 = this.getControlByName('BTN_TARGET1');
        this.BTN_TARGETDOWN1 = this.getControlByName('BTN_TARGETDOWN1');
        this.BTN_TARGETUP1 = this.getControlByName('BTN_TARGETUP1');
        this.LBL_TARGET2 = this.getControlByName('LBL_TARGET2');
        this.BTN_TARGET2 = this.getControlByName('BTN_TARGET2');
        this.BTN_TARGETDOWN2 = this.getControlByName('BTN_TARGETDOWN2');
        this.BTN_TARGETUP2 = this.getControlByName('BTN_TARGETUP2');

        this.LBL_CMBTMSGBG = this.getControlByName('LBL_CMBTMSGBG');
        this.LBL_CMBTMODEMSG = this.getControlByName('LBL_CMBTMODEMSG');

        //Auto scale anchor hack/fix
        this.BTN_ACTION5.anchor = 'bl';
        this.BTN_ACTION5.recalculate();
        this.LBL_QUEUE0.anchor = 'bc';
        this.LBL_QUEUE0.recalculate();

        this.tGuiPanel.widget.fill.visible = false;

        /*this.TB_STEALTH.hideBorder();
        this.TB_PAUSE.hideBorder();
        this.TB_SOLO.hideBorder();*/

        this.LBL_LIGHTSHIFT.hide();
        this.LBL_DARKSHIFT.hide();
        this.LBL_JOURNAL.hide();
        this.LBL_CASH.hide();
        this.LBL_PLOTXP.hide();
        this.LBL_STEALTHXP.hide();
        this.LBL_ITEMRCVD.hide();
        this.LBL_ITEMLOST.hide();

        //Map INIT
        //this.LBL_MAPBORDER.hideBorder();
        this.LBL_MAP.hide();
        this.LBL_ARROW_MARGIN.hide();

        this.LBL_CMBTEFCTRED1.hide();
        this.LBL_CMBTEFCTINC1.hide();
        this.LBL_LEVELUP1.hide();
        //this.LBL_LVLUPBG1.hide();
        this.LBL_DEBILATATED1.hide();
        this.LBL_DISABLE1.hide();

        this.LBL_CMBTEFCTRED2.hide();
        this.LBL_CMBTEFCTINC2.hide();
        this.LBL_LEVELUP2.hide();
        //this.LBL_LVLUPBG2.hide();
        this.LBL_DEBILATATED2.hide();
        this.LBL_DISABLE2.hide();

        this.LBL_CMBTEFCTRED3.hide();
        this.LBL_CMBTEFCTINC3.hide();
        this.LBL_LEVELUP3.hide();
        //this.LBL_LVLUPBG3.hide();
        this.LBL_DEBILATATED3.hide();
        this.LBL_DISABLE3.hide();


        this.LBL_ACTIONDESC.hide();
        this.LBL_ACTIONDESCBG.hide();

        this.LBL_NAME.hide();
        this.LBL_NAMEBG.hide();
        this.PB_HEALTH.hide();
        this.LBL_HEALTHBG.hide();

        this.LBL_CMBTMSGBG.hide();
        this.LBL_CMBTMODEMSG.hide();
        this.BTN_CLEARALL.hideBorder();

        this.LBL_MOULDING3.widget.position.z = -1;
        this.LBL_MENUBG.widget.position.z = -1;


        this.BTN_MSG.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuPartySelection.Open();
        });

        this.BTN_JOU.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuJournal.Open();
        });

        this.BTN_MAP.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuMap.Open();
        });

        this.BTN_OPT.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuOptions.Open();
        });

        this.BTN_CHAR.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuCharacter.Open();
        });

        this.BTN_ABI.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuCharacter.Open();
        });

        this.BTN_INV.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuInventory.Open();
        });

        this.BTN_EQU.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuEquipment.Open();
        });

        this.TB_PAUSE.addEventListener('click', (e) => {
          e.stopPropagation();

          if(Game.State == Game.STATES.PAUSED){
            Game.State = Game.STATES.RUNNING;
          }else{
            Game.State = Game.STATES.PAUSED
          }

        });

        this.TB_SOLO.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        this.TB_STEALTH.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        this.BTN_CHAR1.addEventListener('click', (e) => {
          Game.MenuEquipment.Open()
        });

        this.BTN_CHAR2.addEventListener('click', (e) => {
          PartyManager.party.unshift(PartyManager.party.splice(2, 1)[0]);
        });

        this.BTN_CHAR3.addEventListener('click', (e) => {
          PartyManager.party.unshift(PartyManager.party.splice(1, 1)[0]);
        });

        this.BTN_CLEARALL.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.getCurrentPlayer().clearAllActions();
          Game.getCurrentPlayer().combatState = false;
        });

        this.LBL_QUEUE0.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.getCurrentPlayer().combatAction = undefined;
        });

        this.LBL_QUEUE1.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.getCurrentPlayer().combatQueue.splice(0, 1);
        });

        this.LBL_QUEUE2.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.getCurrentPlayer().combatQueue.splice(1, 1);
        });

        this.LBL_QUEUE3.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.getCurrentPlayer().combatQueue.splice(2, 1);
        });

        for(let i = 0; i < 3; i++){
            
          //this['BTN_TARGET'+i]

          this['LBL_TARGET'+i].addEventListener('click', (e) => {
            e.stopPropagation();
            let action = this.targetSkills['target'+i][this['target'+i+'_idx']];

            if(action){
              if(i==0){
                Game.getCurrentPlayer().attackCreature(action.action.object, action.action.feat);
              }else{
                Game.getCurrentPlayer().actionQueue.push(
                  action.action
                );
              }
            }

          });

          this['BTN_TARGETUP'+i].addEventListener('click', (e) => {
            e.stopPropagation();
            
            this['target'+i+'_idx'] -= 1;
            if(this['target'+i+'_idx'] < 0){
              this['target'+i+'_idx'] = this.targetSkills['target'+i].length - 1;
            }

            this.UpdateTargetUIIcon(i);

          });

          this['BTN_TARGETDOWN'+i].addEventListener('click', (e) => {
            e.stopPropagation();

            this['target'+i+'_idx'] += 1;
            if(this['target'+i+'_idx'] >= this.targetSkills['target'+i].length){
              this['target'+i+'_idx'] = 0;
            }

            this.UpdateTargetUIIcon(i);

          });

        }

        //BTN_ACTION buttons alignment fix
        this.BTN_ACTIONUP5.anchor = 'bl';
        this.BTN_ACTIONDOWN5.anchor = 'bl';
        this.RecalculatePosition();

        //this.lbl_combatbg2.visible = false;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  showCombatUI(){
    /*this.BTN_CLEARALL.show();
    this.BTN_CLEARONE.show(); //Holds the graphic of the current attack icon
    //this.LBL_COMBATBG1.show();
    //this.LBL_COMBATBG2.show();
    //this.LBL_COMBATBG3.show();
    this.LBL_QUEUE0.show();
    this.LBL_QUEUE1.show()

    this.LBL_TARGET0.show();
    this.BTN_TARGET0.show();
    this.BTN_TARGETDOWN0.show();
    this.BTN_TARGETUP0.show();
    this.LBL_TARGET1.show();
    this.BTN_TARGET1.show();
    this.BTN_TARGETDOWN1.show();
    this.BTN_TARGETUP1.show();
    this.LBL_TARGET2.show();
    this.BTN_TARGET2.show();
    this.BTN_TARGETDOWN2.show();
    this.BTN_TARGETUP2.show();*/

    //this.LBL_CMBTMSGBG.show();
    //this.LBL_CMBTMODEMSG.show();
  }

  hideCombatUI(){
    /*this.BTN_CLEARALL.hide();
    this.BTN_CLEARONE.hide(); //Holds the graphic of the current attack icon
    //this.LBL_COMBATBG1.hide();
    //this.LBL_COMBATBG2.hide();
    //this.LBL_COMBATBG3.hide();
    this.LBL_QUEUE0.hide();
    this.LBL_QUEUE1.hide()

    this.LBL_TARGET0.hide();
    this.BTN_TARGET0.hide();
    this.BTN_TARGETDOWN0.hide();
    this.BTN_TARGETUP0.hide();
    this.LBL_TARGET1.hide();
    this.BTN_TARGET1.hide();
    this.BTN_TARGETDOWN1.hide();
    this.BTN_TARGETUP1.hide();
    this.LBL_TARGET2.hide();
    this.BTN_TARGET2.hide();
    this.BTN_TARGETDOWN2.hide();
    this.BTN_TARGETUP2.hide();

    this.LBL_CMBTMSGBG.hide();
    this.LBL_CMBTMODEMSG.hide();*/
  }

  TogglePartyMember(nth = 0, bVisible = false){

    if(!bVisible){
      this['LBL_CMBTEFCTRED'+(nth+1)].hide();
      this['LBL_CMBTEFCTINC'+(nth+1)].hide();
      this['LBL_LEVELUP'+(nth+1)].hide();
      //this['LBL_LVLUPBG'+(nth+1)].hide();
      this['LBL_DEBILATATED'+(nth+1)].hide();
      this['LBL_DISABLE'+(nth+1)].hide();
      this['LBL_CHAR'+(nth+1)].hide();
      this['BTN_CHAR'+(nth+1)].hide();
      this['LBL_BACK'+(nth+1)].hide();
      this['PB_FORCE'+(nth+1)].hide();
      this['PB_VIT'+(nth+1)].hide();
    }else{
      this['LBL_CHAR'+(nth+1)].show();
      this['BTN_CHAR'+(nth+1)].show();
      this['LBL_BACK'+(nth+1)].show();
      this['PB_FORCE'+(nth+1)].show();
      this['PB_VIT'+(nth+1)].show();
    }
  }

  SetMapTexture(sTexture = ''){
    try{
      this.LBL_MAPVIEW.getFill().material.transparent = false;
      this.LBL_MAPVIEW.setFillTextureName(sTexture);
      TextureLoader.tpcLoader.fetch(sTexture, (texture) => {
        this.LBL_MAPVIEW.setFillTexture(texture);
        texture.repeat.x = 0.25;
        texture.repeat.y = 0.50;
      });
    }catch(e){}
  }

  UpdateTargetUISkills(){

    let currentPlayer = Game.getCurrentPlayer();
    
    this.target0_idx = 0;
    this.target1_idx = 0;
    this.target2_idx = 0;

    let skills = {
      target0: [],
      target1: [],
      target2: []
    }

    if(Game.selectedObject instanceof ModuleObject){

      if(Game.selectedObject instanceof ModulePlaceable){
        if(Game.selectedObject.isLocked() && !Game.selectedObject.requiresKey()){
          skills.target1.push({
            action: {
              goal: ModuleCreature.ACTION.OPENLOCK,
              object:Game.selectedObject
            },
            icon: 'isk_security'
          });

          skills.target0.push({
            action: {
              goal: ModuleCreature.ACTION.ATTACKOBJECT,
              object:Game.selectedObject,
              feat: undefined
            },
            icon: 'i_attack'
          });
        }
      }else if(Game.selectedObject instanceof ModuleDoor){
        if(Game.selectedObject.isLocked() && !Game.selectedObject.requiresKey()){
          skills.target1.push({
            action: {
              goal: ModuleCreature.ACTION.OPENLOCK,
              object:Game.selectedObject
            },
            icon: 'isk_security'
          });

          skills.target0.push({
            action: {
              goal: ModuleCreature.ACTION.ATTACKOBJECT,
              object:Game.selectedObject,
              feat: undefined
            },
            icon: 'i_attack'
          });
        }
      }else if(Game.selectedObject instanceof ModuleCreature && Game.selectedObject.isHostile(Game.player)){
        skills.target0.push({
          action: {
            goal: ModuleCreature.ACTION.ATTACKOBJECT,
            object: Game.selectedObject,
            feat: undefined
          },
          icon: 'i_attack'
        });

        if(currentPlayer.getEquippedWeaponType() == 1){

          //Critical
          if(currentPlayer.getFeat(81)){ //Master
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(81)
              },
              icon: currentPlayer.getFeat(81).icon
            });
          }else if(currentPlayer.getFeat(19)){ //Imporved
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(19)
              },
              icon: currentPlayer.getFeat(19).icon
            });
          }else if(currentPlayer.getFeat(8)){ //Basic
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(8)
              },
              icon: currentPlayer.getFeat(8).icon
            });
          }

          //Powerstrike
          if(currentPlayer.getFeat(83)){ //Master
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(83)
              },
              icon: currentPlayer.getFeat(83).icon
            });
          }else if(currentPlayer.getFeat(17)){ //Imporved
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(17)
              },
              icon: currentPlayer.getFeat(17).icon
            });
          }else if(currentPlayer.getFeat(28)){ //Basic
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(28)
              },
              icon: currentPlayer.getFeat(28).icon
            });
          }

          //Flurry
          if(currentPlayer.getFeat(53)){ //Master
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(53)
              },
              icon: currentPlayer.getFeat(53).icon
            });
          }else if(currentPlayer.getFeat(91)){ //Imporved
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(91)
              },
              icon: currentPlayer.getFeat(91).icon
            });
          }else if(currentPlayer.getFeat(11)){ //Basic
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(11)
              },
              icon: currentPlayer.getFeat(11).icon
            });
          }

        }

        if(currentPlayer.getEquippedWeaponType() == 4){

          //Snipershot
          if(currentPlayer.getFeat(77)){ //Master
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(77)
              },
              icon: currentPlayer.getFeat(77).icon
            });
          }else if(currentPlayer.getFeat(20)){ //Imporved
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(20)
              },
              icon: currentPlayer.getFeat(20).icon
            });
          }else if(currentPlayer.getFeat(31)){ //Basic
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(31)
              },
              icon: currentPlayer.getFeat(31).icon
            });
          }


          //Powerblast
          if(currentPlayer.getFeat(82)){ //Master
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(82)
              },
              icon: currentPlayer.getFeat(82).icon
            });
          }else if(currentPlayer.getFeat(18)){ //Imporved
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(18)
              },
              icon: currentPlayer.getFeat(18).icon
            });
          }else if(currentPlayer.getFeat(29)){ //Basic
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(29)
              },
              icon: currentPlayer.getFeat(29).icon
            });
          }


          //Rapidshot
          if(currentPlayer.getFeat(26)){ //Master
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(26)
              },
              icon: currentPlayer.getFeat(26).icon
            });
          }else if(currentPlayer.getFeat(92)){ //Imporved
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(92)
              },
              icon: currentPlayer.getFeat(92).icon
            });
          }else if(currentPlayer.getFeat(30)){ //Basic
            skills.target0.push({
              action: {
                goal: ModuleCreature.ACTION.ATTACKOBJECT,
                object: Game.selectedObject,
                feat: currentPlayer.getFeat(30)
              },
              icon: currentPlayer.getFeat(30).icon
            });
          }

        }

      }

    }

    return (!skills.target0.length && !skills.target1.length && !skills.target2.length) ? null : skills;

  }

  _canShowTargetUI(){
    if(Game.selectedObject instanceof ModuleCreature && Game.selectedObject.isDead())
      return false;

    return (!Game.MenuContainer.bVisible && CursorManager.reticle2.visible && Game.selectedObject instanceof ModuleObject && !(Game.selectedObject instanceof ModuleRoom));
  }

  UpdateTargetUIIcon(index = 0){
    let guiControl = this['LBL_TARGET'+index];
    if(this.targetSkills['target'+index].length){
      let action = this.targetSkills['target'+index][this['target'+index+'_idx']];

      if(guiControl.getFillTextureName() != action.icon){
        guiControl.setFillTextureName(action.icon);
        TextureLoader.tpcLoader.fetch(action.icon, (texture) => {
          guiControl.setMaterialTexture(guiControl.border.fill.material, texture);
          guiControl.setMaterialTexture(guiControl.highlight.fill.material, texture);
          guiControl.border.fill.material.transparent = true;
          guiControl.highlight.fill.material.transparent = true;
        });
      }
      
    }else{
      guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
      guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
    }
  }

  UpdateTargetUI(){

    if(this._canShowTargetUI()){

      if(this.lastTarget != Game.selectedObject || this.lastCurrentPlayer != Game.getCurrentPlayer()){
        this.lastCurrentPlayer = Game.getCurrentPlayer();
        this.targetSkills = this.UpdateTargetUISkills();
      }

      if(Game.selectedObject instanceof ModuleCreature){
        if(Game.selectedObject.isHostile(Game.getCurrentPlayer()) && this.PB_HEALTH.getFillTextureName() == 'friend_bar'){
          this.PB_HEALTH.setFillTextureName('enemy_bar');
          TextureLoader.Load('enemy_bar', (map) => {
            this.PB_HEALTH.setFillTexture(map)
          });
        }else if(!Game.selectedObject.isHostile(Game.getCurrentPlayer()) && this.PB_HEALTH.getFillTextureName() == 'enemy_bar'){
          this.PB_HEALTH.setFillTextureName('friend_bar');
          TextureLoader.Load('friend_bar', (map) => {
            this.PB_HEALTH.setFillTexture(map)
          });
        }
      }else{
        if(this.PB_HEALTH.getFillTextureName() != 'friend_bar'){
          this.PB_HEALTH.setFillTextureName('friend_bar');
          TextureLoader.Load('friend_bar', (map) => {
            this.PB_HEALTH.setFillTexture(map)
          });
        }
      }

      if(Game.InGameOverlay.LBL_NAME.text.text != Game.selectedObject.getName()){
        this.LBL_NAME.setText(Game.selectedObject.getName(), 25);
      }

      //if(Game.selectedObject instanceof ModuleObject){
        let health = 100 * Game.selectedObject.getHP()/Game.selectedObject.getMaxHP();
        if(health > 100)
          health = 100;
        this.PB_HEALTH.setProgress(health)
      //}

      let maxBoundsX = (window.innerWidth / 2 + 640/2) - 125;
      let maxBoundsX2 = (window.innerWidth / 2) - (640/2) - 125;

      let targetScreenPosition = new THREE.Vector3(
        640/2,
        480/2,
        0
      );

      let pos = new THREE.Vector3();
      if(Game.selectedObject instanceof ModuleCreature){
        pos.copy(Game.selectedObject.position);
        pos.z += 2;
      }else{
        pos = pos.setFromMatrixPosition(CursorManager.reticle2.matrixWorld);
      }
      pos.project(Game.currentCamera);
      
      let widthHalf = window.innerWidth / 2;
      let heightHalf = window.innerHeight / 2;

      pos.x = (pos.x * widthHalf);
      pos.y = - (pos.y * heightHalf);
      pos.z = 0;

      targetScreenPosition.add(pos);
      
      if(targetScreenPosition.x > maxBoundsX){
            targetScreenPosition.x = maxBoundsX;
      }

      if(targetScreenPosition.x < -maxBoundsX2){
            targetScreenPosition.x = -maxBoundsX2;
      }

      if(targetScreenPosition.y > (640/2)){
          targetScreenPosition.y = (640/2);
      }

      if(targetScreenPosition.y < 100){
          targetScreenPosition.y = 100;
      }


      this.LBL_NAME.scale = this.LBL_NAMEBG.scale = this.PB_HEALTH.scale = this.LBL_HEALTHBG.scale = false;
      
      this.LBL_NAME.show();
      this.LBL_NAMEBG.show();
      this.PB_HEALTH.show();
      this.LBL_HEALTHBG.show();

      this.LBL_NAME.extent.left = targetScreenPosition.x - 20;
      this.LBL_NAME.anchor = 'user';
      this.LBL_NAMEBG.extent.left = targetScreenPosition.x - 20;
      this.LBL_NAMEBG.anchor = 'user';
      this.PB_HEALTH.extent.left = targetScreenPosition.x - 20;
      this.PB_HEALTH.anchor = 'user';
      this.LBL_HEALTHBG.extent.left = targetScreenPosition.x - 20;
      this.LBL_HEALTHBG.anchor = 'user';

      this.LBL_NAME.extent.top = targetScreenPosition.y - (38);
      this.LBL_NAMEBG.extent.top = targetScreenPosition.y - (38);
      this.PB_HEALTH.extent.top = targetScreenPosition.y - 12;
      this.LBL_HEALTHBG.extent.top = targetScreenPosition.y - 12;

      this.LBL_NAME.recalculate();
      this.LBL_NAMEBG.recalculate();
      this.PB_HEALTH.recalculate();
      this.LBL_HEALTHBG.recalculate();

      if(this.targetSkills){

        for(let i = 0; i < 3; i++){
          let xPos = ((this['BTN_TARGET'+i].extent.width + 5) *i) + 20;

          this['BTN_TARGET'+i].scale = false;
          this['BTN_TARGET'+i].extent.left = targetScreenPosition.x + xPos;
          this['BTN_TARGET'+i].extent.top = targetScreenPosition.y;
          this['BTN_TARGET'+i].anchor = 'user';

          this['LBL_TARGET'+i].scale = false;
          this['LBL_TARGET'+i].extent.left = targetScreenPosition.x + xPos + 3;
          this['LBL_TARGET'+i].extent.top = targetScreenPosition.y + 14;
          this['LBL_TARGET'+i].anchor = 'user';

          this['BTN_TARGETUP'+i].scale = false;
          this['BTN_TARGETUP'+i].extent.left = targetScreenPosition.x + xPos;
          this['BTN_TARGETUP'+i].extent.top = targetScreenPosition.y + 5;
          this['BTN_TARGETUP'+i].anchor = 'user';

          this['BTN_TARGETDOWN'+i].scale = false;
          this['BTN_TARGETDOWN'+i].extent.left = targetScreenPosition.x + xPos;
          this['BTN_TARGETDOWN'+i].extent.top = targetScreenPosition.y + ((this['BTN_TARGET'+i].extent.height/2) + 12);
          this['BTN_TARGETDOWN'+i].widget.rotation.z = Math.PI;
          this['BTN_TARGETDOWN'+i].anchor = 'user';

          this.UpdateTargetUIIcon(i);

          this['BTN_TARGET'+i].recalculate();
          this['LBL_TARGET'+i].recalculate();
          this['BTN_TARGETUP'+i].recalculate();
          this['BTN_TARGETDOWN'+i].recalculate();
          this['BTN_TARGET'+i].show();
          this['LBL_TARGET'+i].show();
          this['BTN_TARGETUP'+i].show();
          this['BTN_TARGETDOWN'+i].show();
        }

      }else{
        for(let i = 0; i < 3; i++){
          this['BTN_TARGET'+i].hide();
          this['LBL_TARGET'+i].hide();
          this['BTN_TARGETUP'+i].hide();
          this['BTN_TARGETDOWN'+i].hide();
        }
      }

      this.lastTarget = Game.selectedObject;

    }else{
      this.targetSkills = undefined;
      this.lastTarget = undefined;
      this.LBL_NAME.hide();
      this.LBL_NAMEBG.hide();
      this.PB_HEALTH.hide();
      this.LBL_HEALTHBG.hide();
      for(let i = 0; i < 3; i++){
        this['BTN_TARGET'+i].hide();
        this['LBL_TARGET'+i].hide();
        this['BTN_TARGETUP'+i].hide();
        this['BTN_TARGETDOWN'+i].hide();
      }
    }

  }

  Update(delta = 0){
    super.Update(delta);

    this.UpdateTargetUI();

    let mapTexture = this.LBL_MAPVIEW.getFillTexture();
    if(mapTexture){
      let map = Game.module.area.Map;
      let position = Game.getCurrentPlayer().position;
      switch(Game.module.area.Map.NorthAxis){
          case 0:
            let scaleX = (map.MapPt1X - map.MapPt2X) / (map.WorldPt1X - map.WorldPt2X);
            let scaleY = (map.MapPt1Y - map.MapPt2Y) / (map.WorldPt1Y - map.WorldPt2Y);
            
            let pointX = (position.x - map.WorldPt1X) * scaleX + map.MapPt1X;
            let pointY = (position.y - map.WorldPt1Y) * scaleY + map.MapPt1Y;

            //console.log(scaleX);

            mapTexture.offset.x = pointX - .1;
            mapTexture.offset.y = (1-pointY) - .25;
            this.LBL_ARROW.widget.rotation.set(0, 0, PartyManager.party[0].facing);
          break;
          case 3:
            this.LBL_ARROW.widget.rotation.set(0, 0, PartyManager.party[0].facing - Math.PI/2);
          break;
      }

      //console.log(pointX, pointY);
    }

    this.TogglePartyMember(0, false);
    this.TogglePartyMember(1, false);
    this.TogglePartyMember(2, false);

    for(let i = 0; i < PartyManager.party.length; i++){
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];

      let id = i;
      switch(i){
        case 1:
          id = 2;
        break;
        case 2:
          id = 1;
        break;
      }

      this.TogglePartyMember(id, true);

      let pmBG = this['LBL_BACK'+(id+1)];
      pmBG.setFillColor(1, 1, 1);
      Game.InGameOverlay['PB_VIT'+(id+1)].setFillColor(1, 0, 0);
      Game.InGameOverlay['PB_FORCE'+(id+1)].setFillColor(0, 0.5, 1);

      if(pmBG.getFillTextureName() != portrait.baseresref){
        pmBG.setFillTextureName(portrait.baseresref)
        TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture) => {
          pmBG.setFillTexture(texture);
        });
      }

      this['PB_VIT'+(id+1)].setProgress( Math.max( 1.0, partyMember.getHP() / partyMember.getMaxHP() ) * 100 );
      this['PB_FORCE'+(id+1)].setProgress( Math.max( 1.0, partyMember.getFP() / partyMember.getMaxFP() ) * 100 );

    }

    if((Game.selectedObject && Game.selectedObject.isHostile()) || (Game.getCurrentPlayer().combatAction || Game.getCurrentPlayer().combatQueue.length)){
      this.showCombatUI();

      let action0 = Game.getCurrentPlayer().combatAction;
      let action1 = Game.getCurrentPlayer().combatQueue[0];
      let action2 = Game.getCurrentPlayer().combatQueue[1];
      let action3 = Game.getCurrentPlayer().combatQueue[2];

      if(action0 != undefined){
        if(this.LBL_QUEUE0.getFillTextureName() != action0.icon){
          this.LBL_QUEUE0.setFillTextureName(action0.icon)
          TextureLoader.tpcLoader.fetch(action0.icon, (texture) => {
            this.LBL_QUEUE0.setFillTexture(texture)
          });

        }
      }else{
        this.LBL_QUEUE0.setFillTextureName('');
        this.LBL_QUEUE0.setFillTexture(undefined);
      }

      if(action1 != undefined){
        if(this.LBL_QUEUE1.getFillTextureName() != action1.icon){
          this.LBL_QUEUE1.setFillTextureName(action1.icon)
          TextureLoader.tpcLoader.fetch(action1.icon, (texture) => {
            this.LBL_QUEUE1.setFillTexture(texture)
          });
        }
      }else{
        this.LBL_QUEUE1.setFillTextureName('');
        this.LBL_QUEUE1.setFillTexture(undefined);
      }

      if(action2 != undefined){
        if(this.LBL_QUEUE2.getFillTextureName() != action2.icon){
          this.LBL_QUEUE2.setFillTextureName(action2.icon)
          TextureLoader.tpcLoader.fetch(action2.icon, (texture) => {
            this.LBL_QUEUE2.setFillTexture(texture)
          });
        }
      }else{
        this.LBL_QUEUE2.setFillTextureName('');
        this.LBL_QUEUE2.setFillTexture(undefined);
      }

      if(action3 != undefined){
        if(this.LBL_QUEUE3.getFillTextureName() != action3.icon){
          this.LBL_QUEUE3.setFillTextureName(action3.icon)
          TextureLoader.tpcLoader.fetch(action3.icon, (texture) => {
            this.LBL_QUEUE3.setFillTexture(texture)
          });
        }
      }else{
        this.LBL_QUEUE3.setFillTextureName('');
        this.LBL_QUEUE3.setFillTexture(undefined);
      }

    }else{
      this.hideCombatUI();
    }

  }


  Show(){
    super.Show();

    Game.MenuActive = false;

    this.BTN_ACTIONDOWN0.flipY();
    this.BTN_ACTIONDOWN1.flipY();
    this.BTN_ACTIONDOWN2.flipY();
    this.BTN_ACTIONDOWN3.flipY();
    this.BTN_ACTIONDOWN4.flipY();
    this.BTN_ACTIONDOWN5.flipY();

  }

  Resize(){
    this.RecalculatePosition();
  }


}

module.exports = InGameOverlay;