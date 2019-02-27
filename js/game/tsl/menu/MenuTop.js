/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuTop menu class.
 */

class MenuTop extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.LoadMenu({
      name: 'top_p',
      onLoad: () => {

        this.BTN_CHANGE2 = this.getControlByName('BTN_CHANGE2');
        this.BTN_CHANGE3 = this.getControlByName('BTN_CHANGE3');

        //LBL_DEBILATATED1
        this.LBL_BACK1 = this.getControlByName('LBL_BACK1');
        this.LBL_CHAR1 = this.getControlByName('LBL_CHAR1');
        this.LBL_CHAR2 = this.getControlByName('LBL_CHAR2');
        this.LBL_CHAR3 = this.getControlByName('LBL_CHAR3');
        this.LBL_LEVELUP1 = this.getControlByName('LBL_LEVELUP1');
        this.LBL_LEVELUP2 = this.getControlByName('LBL_LEVELUP2');
        this.LBL_LEVELUP3 = this.getControlByName('LBL_LEVELUP3');
        this.LBL_DEBILATATED1 = this.getControlByName('LBL_DEBILATATED1');
        this.LBL_DISABLE1 = this.getControlByName('LBL_DISABLE1');
        this.LBL_CMBTEFCTINC1 = this.getControlByName('LBL_CMBTEFCTINC1');
        this.LBL_CMBTEFCTRED1 = this.getControlByName('LBL_CMBTEFCTRED1');
        this.PB_VIT1 = this.getControlByName('PB_VIT1');
        this.PB_FORCE1 = this.getControlByName('PB_FORCE1');

        this.LBLH_OPT = this.getControlByName('LBLH_OPT');
        this.LBLH_MAP = this.getControlByName('LBLH_MAP');
        this.LBLH_JOU = this.getControlByName('LBLH_JOU');
        this.LBLH_MSG = this.getControlByName('LBLH_MSG');
        this.LBLH_ABI = this.getControlByName('LBLH_ABI');
        this.LBLH_CHA = this.getControlByName('LBLH_CHA');
        this.LBLH_INV = this.getControlByName('LBLH_INV');
        this.LBLH_EQU = this.getControlByName('LBLH_EQU');

        this.BTN_OPT = this.getControlByName('BTN_OPT');
        this.BTN_MAP = this.getControlByName('BTN_MAP');
        this.BTN_JOU = this.getControlByName('BTN_JOU');
        this.BTN_MSG = this.getControlByName('BTN_MSG');
        this.BTN_ABI = this.getControlByName('BTN_ABI');
        this.BTN_CHAR = this.getControlByName('BTN_CHAR');
        this.BTN_INV = this.getControlByName('BTN_INV');
        this.BTN_EQU = this.getControlByName('BTN_EQU');

        this.LBLH_OPT.hideBorder();
        this.LBLH_MAP.hideBorder();
        this.LBLH_JOU.hideBorder();
        this.LBLH_MSG.hideBorder();
        this.LBLH_ABI.hideBorder();
        this.LBLH_CHA.hideBorder();
        this.LBLH_INV.hideBorder();
        this.LBLH_EQU.hideBorder();

        this.LBLH_OPT.widget.position.z = 5;
        this.LBLH_MAP.widget.position.z = 5;
        this.LBLH_JOU.widget.position.z = 5;
        this.LBLH_MSG.widget.position.z = 5;
        this.LBLH_ABI.widget.position.z = 5;
        this.LBLH_CHA.widget.position.z = 5;
        this.LBLH_INV.widget.position.z = 5;
        this.LBLH_EQU.widget.position.z = 5;

        this.BTN_MSG.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuPartySelection.Show();
        });

        this.BTN_JOU.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuJournal.Show();
        });

        this.BTN_MAP.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuMap.Show();
        });

        this.BTN_OPT.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuOptions.Show();
        });

        this.BTN_CHAR.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuCharacter.Show();
        });

        this.BTN_ABI.addEventListener('click', (e) => {
          e.stopPropagation();
          //Game.MenuCharacter.Show();
        });

        this.BTN_INV.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuInventory.Show();
        });

        this.BTN_EQU.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuEquipment.Show();
        });

        this.BTN_CHANGE2.addEventListener('click', (e) => {
          PartyManager.party.unshift(PartyManager.party.splice(1, 1)[0]);
          this.UpdatePartyUI();
        });

        this.BTN_CHANGE3.addEventListener('click', (e) => {
          PartyManager.party.unshift(PartyManager.party.splice(2, 1)[0]);
          this.UpdatePartyUI();
        });

        this.RecalculatePosition();

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();

    /*
    this.LBL_CHAR1 = this.getControlByName('LBL_CHAR1');
    this.LBL_CHAR2 = this.getControlByName('LBL_CHAR2');
    this.LBL_CHAR3 = this.getControlByName('LBL_CHAR3');
    this.LBL_LEVELUP1 = this.getControlByName('LBL_LEVELUP1');
    this.LBL_LEVELUP2 = this.getControlByName('LBL_LEVELUP2');
    this.LBL_LEVELUP3 = this.getControlByName('LBL_LEVELUP3');
    this.LBL_DEBILATATED1 = this.getControlByName('LBL_DEBILATATED1');
    this.LBL_DISABLE1 = this.getControlByName('LBL_DISABLE1');
    this.LBL_CMBTEFCTINC1 = this.getControlByName('LBL_CMBTEFCTINC1');
    this.LBL_CMBTEFCTRED1 = this.getControlByName('LBL_CMBTEFCTRED1');
    */

    this.toggleNavUI(true);

    this.UpdatePartyUI();

  }

  toggleNavUI(visible = true){

    if(!visible){

      this.LBLH_OPT.hide();
      this.LBLH_MAP.hide();
      this.LBLH_JOU.hide();
      this.LBLH_MSG.hide();
      this.LBLH_ABI.hide();
      this.LBLH_CHA.hide();
      this.LBLH_INV.hide();
      this.LBLH_EQU.hide();

      this.BTN_OPT.hide();
      this.BTN_MAP.hide();
      this.BTN_JOU.hide();
      this.BTN_MSG.hide();
      this.BTN_ABI.hide();
      this.BTN_CHAR.hide();
      this.BTN_INV.hide();
      this.BTN_EQU.hide();

    }else{

      this.LBLH_OPT.show();
      this.LBLH_MAP.show();
      this.LBLH_JOU.show();
      this.LBLH_MSG.show();
      this.LBLH_ABI.show();
      this.LBLH_CHA.show();
      this.LBLH_INV.show();
      this.LBLH_EQU.show();

      this.BTN_OPT.show();
      this.BTN_MAP.show();
      this.BTN_JOU.show();
      this.BTN_MSG.show();
      this.BTN_ABI.show();
      this.BTN_CHAR.show();
      this.BTN_INV.show();
      this.BTN_EQU.show();

    }

  }

  UpdatePartyUI(){
    for(let i = 0; i < PartyManager.party.length; i++){
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];

      this.TogglePartyMember(i, true);

      let pmBG = this['LBL_CHAR'+(i+1)];

      if(pmBG.getFillTextureName() != portrait.baseresref){
        pmBG.setFillTextureName(portrait.baseresref)
        TextureLoader.Load(portrait.baseresref, (texture) => {
          pmBG.setFillTexture(texture);
        });
      }

      if(i == 0){
        this['PB_VIT'+(i+1)].setProgress((partyMember.getHP() / partyMember.getMaxHP()) * 100);
        //this['PB_FORCE'+(i+1)].setProgress((partyMember.getHP() / partyMember.getMaxHP()) * 100);
      }

    }
  }

  TogglePartyMember(nth = 0, bVisible = false){

    switch(nth){
      case 0:
        this['LBL_CMBTEFCTRED'+(nth+1)].hide();
        this['LBL_CMBTEFCTINC'+(nth+1)].hide();
        this['LBL_DEBILATATED'+(nth+1)].hide();
        this['LBL_DISABLE'+(nth+1)].hide();
        this['LBL_LEVELUP'+(nth+1)].hide();

        this['LBL_BACK'+(nth+1)].show();
        this['LBL_CHAR'+(nth+1)].show();
        this['LBL_BACK'+(nth+1)].show();
        this['PB_FORCE'+(nth+1)].show();
        this['PB_VIT'+(nth+1)].show();
      break;
      default:
        if(!bVisible){
          this['LBL_LEVELUP'+(nth+1)].hide();
          this['LBL_CHAR'+(nth+1)].hide();
          this['BTN_CHANGE'+(nth+1)].hide();
        }else{
          this['LBL_LEVELUP'+(nth+1)].hide();
          this['LBL_CHAR'+(nth+1)].show();
          this['BTN_CHANGE'+(nth+1)].show();
        }
      break;
    }

  }

}

module.exports = MenuTop;