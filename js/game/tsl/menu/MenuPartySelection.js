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

      this.background = 'blackfill';
      this.voidFill = true;
  
      this.LoadMenu({
        name: 'partyselect_p',
        onLoad: () => {

          this.BTN_NPC0 = this.getControlByName('BTN_NPC0');
          this.BTN_NPC1 = this.getControlByName('BTN_NPC1');
          this.BTN_NPC2 = this.getControlByName('BTN_NPC2');
          this.BTN_NPC3 = this.getControlByName('BTN_NPC3');
          this.BTN_NPC4 = this.getControlByName('BTN_NPC4');
          this.BTN_NPC5 = this.getControlByName('BTN_NPC5');
          this.BTN_NPC6 = this.getControlByName('BTN_NPC6');
          this.BTN_NPC7 = this.getControlByName('BTN_NPC7');
          this.BTN_NPC8 = this.getControlByName('BTN_NPC8');

          this.LBL_NA0 = this.getControlByName('LBL_NA0');
          this.LBL_NA1 = this.getControlByName('LBL_NA1');
          this.LBL_NA2 = this.getControlByName('LBL_NA2');
          this.LBL_NA3 = this.getControlByName('LBL_NA3');
          this.LBL_NA4 = this.getControlByName('LBL_NA4');
          this.LBL_NA5 = this.getControlByName('LBL_NA5');
          this.LBL_NA6 = this.getControlByName('LBL_NA6');
          this.LBL_NA7 = this.getControlByName('LBL_NA7');
          this.LBL_NA8 = this.getControlByName('LBL_NA8');
    
          this.LBL_CHAR0 = this.getControlByName('LBL_CHAR0');
          this.LBL_CHAR1 = this.getControlByName('LBL_CHAR1');
          this.LBL_CHAR2 = this.getControlByName('LBL_CHAR2');
          this.LBL_CHAR3 = this.getControlByName('LBL_CHAR3');
          this.LBL_CHAR4 = this.getControlByName('LBL_CHAR4');
          this.LBL_CHAR5 = this.getControlByName('LBL_CHAR5');
          this.LBL_CHAR6 = this.getControlByName('LBL_CHAR6');
          this.LBL_CHAR7 = this.getControlByName('LBL_CHAR7');
          this.LBL_CHAR8 = this.getControlByName('LBL_CHAR8');

          this.lbl_count = this.getControlByName('LBL_COUNT');

          this.LBL_3D = this.getControlByName('LBL_3D');

          this.BTN_DONE = this.getControlByName('BTN_DONE');
          this.BTN_BACK = this.getControlByName('BTN_BACK');
          this.BTN_ACCEPT = this.getControlByName('BTN_ACCEPT');
    
          /*this.BTN_NPC0.hideBorder();
          this.BTN_NPC1.hideBorder();
          this.BTN_NPC2.hideBorder();
          this.BTN_NPC3.hideBorder();
          this.BTN_NPC4.hideBorder();
          this.BTN_NPC5.hideBorder();
          this.BTN_NPC6.hideBorder();
          this.BTN_NPC7.hideBorder();
          this.BTN_NPC8.hideBorder();

          this.BTN_NPC0.showHighlight();
          this.BTN_NPC1.showHighlight();
          this.BTN_NPC2.showHighlight();
          this.BTN_NPC3.showHighlight();
          this.BTN_NPC4.showHighlight();
          this.BTN_NPC5.showHighlight();
          this.BTN_NPC6.showHighlight();
          this.BTN_NPC7.showHighlight();
          this.BTN_NPC8.showHighlight();*/

          /*this.LBL_NA0.hideBorder();
          this.LBL_NA1.hideBorder();
          this.LBL_NA2.hideBorder();
          this.LBL_NA3.hideBorder();
          this.LBL_NA4.hideBorder();
          this.LBL_NA5.hideBorder();
          this.LBL_NA6.hideBorder();
          this.LBL_NA7.hideBorder();
          this.LBL_NA8.hideBorder();*/

          this.default0 = this.LBL_NA0.getFillTextureName();
          this.default1 = this.LBL_NA1.getFillTextureName();
          this.default2 = this.LBL_NA2.getFillTextureName();
          this.default3 = this.LBL_NA3.getFillTextureName();
          this.default4 = this.LBL_NA4.getFillTextureName();
          this.default5 = this.LBL_NA5.getFillTextureName();
          this.default6 = this.LBL_NA6.getFillTextureName();
          this.default7 = this.LBL_NA7.getFillTextureName();
          this.default8 = this.LBL_NA8.getFillTextureName();
    
          /*this.LBL_CHAR0.hideBorder();
          this.LBL_CHAR1.hideBorder();
          this.LBL_CHAR2.hideBorder();
          this.LBL_CHAR3.hideBorder();
          this.LBL_CHAR4.hideBorder();
          this.LBL_CHAR5.hideBorder();
          this.LBL_CHAR6.hideBorder();
          this.LBL_CHAR7.hideBorder();
          this.LBL_CHAR8.hideBorder();*/
    
          this.BTN_NPC0.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(0)){
              this.selectedNPC = 0;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC1.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(1)){
              this.selectedNPC = 1;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC2.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(2)){
              this.selectedNPC = 2;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC3.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(3)){
              this.selectedNPC = 3;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC4.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(4)){
              this.selectedNPC = 4;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC5.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(5)){
              this.selectedNPC = 5;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC6.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(6)){
              this.selectedNPC = 6;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC7.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(7)){
              this.selectedNPC = 7;
              this.UpdateSelection();
            }
          });
    
          this.BTN_NPC8.addEventListener('click', (e) => {
            e.stopPropagation();
            if(PartyManager.IsAvailable(8)){
              this.selectedNPC = 8;
              this.UpdateSelection();
            }
          });

          this.BTN_DONE.addEventListener('click', (e) => {
            e.stopPropagation();

            if(!this.canClose())
              return;

            if(this.onCloseScript instanceof NWScriptInstance){
              this.Close();
              this.onCloseScript.run(undefined, () => {
                this.onCloseScript = undefined;
              });
            }else{
              this.Close();
            }
            
          });

          this.BTN_BACK.addEventListener('click', (e) => {
            e.stopPropagation();
            this.Close();
          });

          this.BTN_ACCEPT.addEventListener('click', (e) => {
            e.stopPropagation();

            //Area Unescapable disables party selection as well as transit
            if(!Game.module.area.Unescapable || this.ignoreUnescapable){
              if(this.npcInParty(selected)){
                PartyManager.RemoveNPCById(selected);
                this.UpdateSelection();
              }else if(this.isSelectable(selected) && PartyManager.CurrentMembers.length < PartyManager.MaxSize){
                this.addToParty(this.selectedNPC);
              }
              this.UpdateCount();
            }

          });

          this.LBL_3D_VIEW = new LBL_3DView(this.LBL_3D.extent.width, this.LBL_3D.extent.height);
          this.LBL_3D_VIEW.setControl(this.LBL_3D);

          Game.ModelLoader.load({
            file: 'cgmain_light',
            onLoad: (mdl) => {
              this.cgmain_light = mdl;

              THREE.AuroraModel.FromMDL(this.cgmain_light, { 
                onComplete: (model) => {
                  //console.log('Model Loaded', model);
                  this.LBL_3D_VIEW.model = model;
                  this.LBL_3D_VIEW.addModel(this.LBL_3D_VIEW.model);
        
                  this.LBL_3D_VIEW.camerahook = this.LBL_3D_VIEW.model.getObjectByName('camerahook');
                  
                  this.LBL_3D_VIEW.camera.position.copy(
                    this.LBL_3D_VIEW.camerahook.position
                  );
        
                  this.LBL_3D_VIEW.camera.quaternion.copy(
                    this.LBL_3D_VIEW.camerahook.quaternion
                  ); 
                  this.LBL_3D_VIEW.camera.position.z = 1;

                  this.LBL_3D_VIEW.camera.updateProjectionMatrix();
                  this.LBL_3D_VIEW.visible = true;       
                  
                },
                manageLighting: false,
                context: this.LBL_3D_VIEW
              });

              if(typeof this.onLoad === 'function')
                this.onLoad();
            }
          });
            
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
        this.BTN_ACCEPT.setText('Remove');
      }else{
        this.BTN_ACCEPT.setText('Add');
      }

      if(!(this.char instanceof ModuleCreature) || ((this.char instanceof ModuleCreature) && this.char.selectedNPC != this.selectedNPC)){

        PartyManager.LoadPartyMemberCreature(this.selectedNPC, (creature) => {

          if(creature instanceof ModuleCreature){

            if(this.char instanceof ModuleCreature){
              this.char.destroy();
            }

            this.char = creature;
            creature.selectedNPC = this.selectedNPC;
            creature.model.position.set(0, 0, 0);
            creature.model.rotation.z = -Math.PI/2
            this.LBL_3D_VIEW.group.creatures.add(creature.model);
            process.nextTick( ()=> {
              this.char.LoadModel();
            });

          }

        });

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
      Game.MenuActive = false;
    }

    async Show(scriptName = '', forceNPC1 = -1, forceNPC2 = -1){
      super.Show();

      this.forceNPC1 = forceNPC1;
      this.forceNPC2 = forceNPC2;

      if(this.forceNPC1 > -1)
        this.addToParty(this.forceNPC1);

      if(this.forceNPC2 > -1)
        this.addToParty(this.forceNPC2);

      Game.MenuActive = true;

      //Check to see if this window was activated from scripting
      if(this.ignoreUnescapable){
        //Hide the MenuTop navigation buttons since we don't want the user getting into the other menus from this screen
        Game.MenuTop.toggleNavUI(false);
      }

      for(let i = 0; i < 10; i++){
        this['LBL_CHAR'+i].hide();
        this['LBL_NA'+i].show();
        if(PartyManager.IsAvailable(i)){
          this['LBL_NA'+i].hide();
          let portrait = PartyManager.GetPortraitByIndex(i);
            
          if(this['LBL_NA'+i].getFillTextureName() != portrait){
            this['LBL_CHAR'+i].setFillTextureName(portrait)
            TextureLoader.Load(portrait, (texture) => {
              this['LBL_CHAR'+i].setFillTexture(texture);
              if(this.isSelectable(i)){
                this['LBL_CHAR'+i].getFill().material.uniforms.opacity.value = 1;
              }else{
                this['LBL_CHAR'+i].getFill().material.uniforms.opacity.value = 0.5;
              }
            });
          }else{
            if(this.isSelectable(i)){
              this['LBL_CHAR'+i].getFill().material.uniforms.opacity.value = 1;
            }else{
              this['LBL_CHAR'+i].getFill().material.uniforms.opacity.value = 0.5;
            }
          }
          this['LBL_CHAR'+i].show();
        }
      }

      TextureLoader.LoadQueue(() => {
        
      }, (texName) => {
        
      });

      if(scriptName != '' || scriptName != null){
        this.onCloseScript = await NWScript.Load(scriptName);
        // ResourceLoader.loadResource(ResourceTypes['ncs'], scriptName, (buffer) => {
        //   this.onCloseScript = new NWScript(buffer);
        //   this.onCloseScript.name = scriptName;
        // });
      }

    }

    Update(delta){
      if(!this.bVisible)
        return;
  
      if(this.char instanceof ModuleCreature)
        this.char.update(delta);
  
      try{
        this.LBL_3D_VIEW.render(delta);
      }catch(e){}
    }

    canClose(){

      if(this.forceNPC1 > -1 && this.forceNPC2 > -1 && this.GetCurrentMemberCount() == 2){
        return false;
      }else if( (this.forceNPC1 > -1 || this.forceNPC2 > -1) && this.GetCurrentMemberCount() >= 1 ){
        return false;
      }

      return true;

    }

    isSelectable(index){
      if(this.forceNPC1 > -1 || this.forceNPC2 > -1){
        return ( (this.forceNPC1 > -1 && this.forceNPC1 == index) || (this.forceNPC2 > -1 && this.forceNPC2 == index) ) && PartyManager.IsSelectable(index);
      }else{
        return PartyManager.IsSelectable(index);
      }
    }

  
  }
  
  module.exports = MenuPartySelection;