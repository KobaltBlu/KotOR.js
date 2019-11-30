/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuPartySelection menu class.
 */

class MenuPartySelection extends GameMenu {
  
    constructor( args = {} ){
      super(args);

      this.args = $.extend({
        loadscreen: '',
      }, this.args);

      this.ignoreUnescapable = false;
      this.forceNPC1 = -1;
      this.forceNPC2 = -1;

      this.party = {
        0: {selected: false, available: false},
        1: {selected: false, available: false},
        2: {selected: false, available: false},
        3: {selected: false, available: false},
        4: {selected: false, available: false},
        5: {selected: false, available: false},
        6: {selected: false, available: false},
        7: {selected: false, available: false},
        8: {selected: false, available: false}
      };

      this.selectedNPC = 0;

      this.background = '1600x1200back';
  
      this.LoadMenu({
        name: 'partyselection',
        onLoad: () => {

          this.btn_party0 = this.getControlByName('BTN_NPC0');
          this.btn_party1 = this.getControlByName('BTN_NPC1');
          this.btn_party2 = this.getControlByName('BTN_NPC2');
          this.btn_party3 = this.getControlByName('BTN_NPC3');
          this.btn_party4 = this.getControlByName('BTN_NPC4');
          this.btn_party5 = this.getControlByName('BTN_NPC5');
          this.btn_party6 = this.getControlByName('BTN_NPC6');
          this.btn_party7 = this.getControlByName('BTN_NPC7');
          this.btn_party8 = this.getControlByName('BTN_NPC8');

          this.lbl_na0 = this.getControlByName('LBL_NA0');
          this.lbl_na1 = this.getControlByName('LBL_NA1');
          this.lbl_na2 = this.getControlByName('LBL_NA2');
          this.lbl_na3 = this.getControlByName('LBL_NA3');
          this.lbl_na4 = this.getControlByName('LBL_NA4');
          this.lbl_na5 = this.getControlByName('LBL_NA5');
          this.lbl_na6 = this.getControlByName('LBL_NA6');
          this.lbl_na7 = this.getControlByName('LBL_NA7');
          this.lbl_na8 = this.getControlByName('LBL_NA8');
    
          this.lbl_party0 = this.getControlByName('LBL_CHAR0');
          this.lbl_party1 = this.getControlByName('LBL_CHAR1');
          this.lbl_party2 = this.getControlByName('LBL_CHAR2');
          this.lbl_party3 = this.getControlByName('LBL_CHAR3');
          this.lbl_party4 = this.getControlByName('LBL_CHAR4');
          this.lbl_party5 = this.getControlByName('LBL_CHAR5');
          this.lbl_party6 = this.getControlByName('LBL_CHAR6');
          this.lbl_party7 = this.getControlByName('LBL_CHAR7');
          this.lbl_party8 = this.getControlByName('LBL_CHAR8');

          this.lbl_count = this.getControlByName('LBL_COUNT');

          this.btn_done = this.getControlByName('BTN_DONE');
          this.btn_back = this.getControlByName('BTN_BACK');
          this.btn_accept = this.getControlByName('BTN_ACCEPT');
    
          this.btn_party0.hideBorder();
          this.btn_party1.hideBorder();
          this.btn_party2.hideBorder();
          this.btn_party3.hideBorder();
          this.btn_party4.hideBorder();
          this.btn_party5.hideBorder();
          this.btn_party6.hideBorder();
          this.btn_party7.hideBorder();
          this.btn_party8.hideBorder();

          this.lbl_na0.hideBorder();
          this.lbl_na1.hideBorder();
          this.lbl_na2.hideBorder();
          this.lbl_na3.hideBorder();
          this.lbl_na4.hideBorder();
          this.lbl_na5.hideBorder();
          this.lbl_na6.hideBorder();
          this.lbl_na7.hideBorder();
          this.lbl_na8.hideBorder();

          this.default0 = this.lbl_na0.getFillTextureName();
          this.default1 = this.lbl_na1.getFillTextureName();
          this.default2 = this.lbl_na2.getFillTextureName();
          this.default3 = this.lbl_na3.getFillTextureName();
          this.default4 = this.lbl_na4.getFillTextureName();
          this.default5 = this.lbl_na5.getFillTextureName();
          this.default6 = this.lbl_na6.getFillTextureName();
          this.default7 = this.lbl_na7.getFillTextureName();
          this.default8 = this.lbl_na8.getFillTextureName();
    
          this.lbl_party0.hideBorder();
          this.lbl_party1.hideBorder();
          this.lbl_party2.hideBorder();
          this.lbl_party3.hideBorder();
          this.lbl_party4.hideBorder();
          this.lbl_party5.hideBorder();
          this.lbl_party6.hideBorder();
          this.lbl_party7.hideBorder();
          this.lbl_party8.hideBorder();

          this.btn_done.hideBorder();
          this.btn_back.hideBorder();
          this.btn_accept.hideBorder();
    
          this.btn_party0.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(0)){
              this.selectedNPC = 0;
              this.UpdateSelection();
            }
          });
    
          this.btn_party1.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(1)){
              this.selectedNPC = 1;
              this.UpdateSelection();
            }
          });
    
          this.btn_party2.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(2)){
              this.selectedNPC = 2;
              this.UpdateSelection();
            }
          });
    
          this.btn_party3.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(3)){
              this.selectedNPC = 3;
              this.UpdateSelection();
            }
          });
    
          this.btn_party4.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(4)){
              this.selectedNPC = 4;
              this.UpdateSelection();
            }
          });
    
          this.btn_party5.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(5)){
              this.selectedNPC = 5;
              this.UpdateSelection();
            }
          });
    
          this.btn_party6.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(6)){
              this.selectedNPC = 6;
              this.UpdateSelection();
            }
          });
    
          this.btn_party7.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(7)){
              this.selectedNPC = 7;
              this.UpdateSelection();
            }
          });
    
          this.btn_party8.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(8)){
              this.selectedNPC = 8;
              this.UpdateSelection();
            }
          });

          this.btn_done.addEventListener('click', (e) => {
            e.stopPropagation();

            if(!this.canAccept())
              return;

            if(this.onCloseScript instanceof NWScript){
              this.Close();
              this.onCloseScript.run(undefined);
            }else{
              this.Close();
            }
          });

          this.btn_back.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if(!this.canClose())
              return;

            this.Close();
          });

          this.btn_accept.addEventListener('click', (e) => {
            e.stopPropagation();

            if(!Game.module.area.Unescapable || this.ignoreUnescapable){
              if(this.npcInParty(this.selectedNPC)){
                if(this.forceNPC1 == this.selectedNPC || this.forceNPC2 == this.selectedNPC){
                  console.error('You cannot remove this party member at this time');
                }else{
                  PartyManager.RemoveNPCById(this.selectedNPC);
                }
              }else if(PartyManager.CurrentMembers.length < PartyManager.MaxSize){
                this.addToParty(this.selectedNPC);
              }

            }

            this.UpdateCount();

          });

          if(typeof this.onLoad === 'function')
            this.onLoad();

        }
      })
  
    }

    addToParty(selected){
      let idx = PartyManager.CurrentMembers.push({
        isLeader: false,
        memberID: selected
      }) - 1;

      PartyManager.LoadPartyMember(idx, () => {
        this.UpdateSelection();
        if(!this.npcInParty(selected)){
          PartyManager.RemoveNPCById(selected);
        }
        this.UpdateCount();
      });

      this.UpdateSelection();
    }

    npcInParty(nID){
      for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
        let cpm = PartyManager.CurrentMembers[i];
        if(cpm.memberID == nID){
          return true;
        }
      }
      return false;
    }

    indexOfSelectedNPC(nID){
      for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
        let cpm = PartyManager.CurrentMembers[i];
        if(cpm.memberID == nID){
          return i;
        }
      }
      return -1;
    }

    
    UpdateSelection(){

      if(this.npcInParty(this.selectedNPC)){
        this.btn_accept.setText('Remove');
      }else{
        this.btn_accept.setText('Add');
      }

    }

    GetCurrentMemberCount(){
      return PartyManager.CurrentMembers.length;
    }

    UpdateCount(){
      this.lbl_count.setText((PartyManager.MaxSize - PartyManager.CurrentMembers.length).toString());
    }

    Hide(){
      super.Hide();
      this.ignoreUnescapable = false;
    }

    Open(scriptName = '', forceNPC1 = -1, forceNPC2 = -1){
      this.scriptName = scriptName;
      this.forceNPC1 = forceNPC1;
      this.forceNPC2 = forceNPC2;
      super.Open();
    }

    Show(){
      super.Show();
      Game.MenuActive = true;

      if(this.forceNPC1 > -1)
        this.addToParty(this.forceNPC1);

      if(this.forceNPC2 > -1)
        this.addToParty(this.forceNPC2);

      for(let i = 0; i < 9; i++){
        this['lbl_party'+i].hide();
        this['lbl_na'+i].show();

        if(PartyManager.IsAvailable(i)){
          this['lbl_na'+i].hide();
          let portrait = PartyManager.GetPortraitByIndex(i);
            
          if(this['lbl_na'+i].getFillTextureName() != portrait){
            this['lbl_party'+i].setFillTextureName(portrait)
            TextureLoader.Load(portrait, (texture) => {
              this['lbl_party'+i].setFillTexture(texture);
              if(this.isSelectable(i)){
                this['lbl_party'+i].getFill().material.opacity = 1;
              }else{
                this['lbl_party'+i].getFill().material.opacity = 0.5;
              }
            });
          }else{
            if(this.isSelectable(i)){
              this['lbl_party'+i].getFill().material.opacity = 1;
            }else{
              this['lbl_party'+i].getFill().material.opacity = 0.5;
            }
          }
          this['lbl_party'+i].show();
        }

        /*if(PartyManager.IsAvailable(i)){
          this['lbl_na'+i].hide();
          let portrait = PartyManager.GetPortraitByIndex(i);
            
          if(this['lbl_na'+i].getFillTextureName() != portrait){
            console.log(portrait);
            this['lbl_party'+i].setFillTextureName(portrait)
            TextureLoader.tpcLoader.fetch(portrait, (texture) => {

              this['lbl_party'+i].setFillTexture(texture);
            });
          }
          this['lbl_party'+i].show();
        }*/
      }

      TextureLoader.LoadQueue(() => {
        
      });

      this.onCloseScript = undefined;
      if(this.scriptName != '' || this.scriptName != null){
        ResourceLoader.loadResource(ResourceTypes['ncs'], this.scriptName, (buffer) => {
          this.onCloseScript = new NWScript(buffer);
          this.onCloseScript.name = this.scriptName;
        });
      }

    }

    canClose(){

      if(this.forceNPC1 > -1 || this.forceNPC2 > -1){
        return false;
      }

      return true;

    }

    canAccept(){

      if(this.forceNPC1 > -1 && this.forceNPC2 > -1 && this.GetCurrentMemberCount() < 2){
        return false;
      }else if( (this.forceNPC1 > -1 || this.forceNPC2 > -1) && this.GetCurrentMemberCount() < 1 ){
        return false;
      }

      return true;

    }

    isSelectable(index){
      return PartyManager.IsSelectable(index);
      /*if(this.forceNPC1 > -1 || this.forceNPC2 > -1){
        return ( (this.forceNPC1 > -1 && this.forceNPC1 == index) || (this.forceNPC2 > -1 && this.forceNPC2 == index) ) && PartyManager.IsSelectable(index);
      }else{
        return PartyManager.IsSelectable(index);
      }*/
    }
  
  }
  
  module.exports = MenuPartySelection;