/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuDialog menu class.
 */

class MenuDialog extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.isAnimated = false;
    this.cameraModel = null;
    this.ambientTrack = null;
    this.computerType = 0;
    this.conversationType = 2;
    this.delayEntry = 0;
    this.delayReply = 0;

    this.state = -1;

    this.entryList = [];
    this.replyList = [];
    this.startingList = [];
    this.isSkippable = false;
    this.unequipHeadItem = false;
    this.unequipItems = false;
    this.vo_id = '';

    this.audioEmitter = undefined;

    this.LoadMenu({
      name: 'dialog_p',
      onLoad: () => {

        this.LBL_MESSAGE = this.getControlByName('LBL_MESSAGE');
        this.LB_REPLIES = this.getControlByName('LB_REPLIES');

        this.LBL_MESSAGE.setText('');

        this.LB_REPLIES.extent.left = -(window.innerWidth/2) + this.LB_REPLIES.extent.width/2 + 16;
        this.LB_REPLIES.extent.top = (window.innerHeight/2) - this.LB_REPLIES.extent.height/2;
        this.LB_REPLIES.calculatePosition();
        this.LB_REPLIES.calculateBox();

        this.barHeight = 100;

        var geometry = new THREE.PlaneGeometry( 1, 1, 1 );
        var material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
        this.topBar = new THREE.Mesh( geometry, material );
        this.bottomBar = new THREE.Mesh( geometry, material );

        this._resetLetterBox();

        this.tGuiPanel.widget.add(this.topBar);
        this.tGuiPanel.widget.add(this.bottomBar);

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }


  StartConversation(dlg, owner, listener = Game.player, options = {}){

    options = Object.assign({
      onLoad: null
    }, options);

    //I think the player is always the one that the conversation owner is talking to.
    this.LBL_MESSAGE.setText(' ');
    this.Show();
    this.LB_REPLIES.clearItems();
    this.nodeIndex = 0;
    this.owner = owner;
    this.listener = listener;
    this.paused = false;
    this.currentEntry = null;

    this.unequipHeadItem = false;
    this.unequipItems = false;

    this.animatedCamera = null;

    this.LBL_MESSAGE.onClick = (e) => {
      e.stopPropagation();
      if(this.isListening){
        this.PlayerSkipEntry(this.currentEntry);
      }
    };

    if(this.audioEmitter === undefined){

    }

    Game.inDialog = true;

    this.entryList = [];
    this.replyList = [];
    this.startingList = [];
    this.vo_id = '';
    this.isAnimatedCutscene = false;
    this.stunt = {};
    this.stuntActors = [];

    //this.audioEmitter.SetPosition(Game.player.model.position.x, Game.player.model.position.y, Game.player.model.position.z);

    this.isListening = true;

    this._resetLetterBox();
    this.canLetterbox = false;
    this.letterBoxed = false;

    this.LB_REPLIES.hide();

    if(typeof dlg != 'string' || dlg == ''){
      dlg = this.owner.GetConversation();
    }
    
    if(typeof dlg === 'string' && dlg != ''){
      this.LoadDialog(dlg, (gff) => {
        //console.log(gff.json);

        if(gff.json.fields.VO_ID)
          this.vo_id = gff.json.fields.VO_ID.value;
        
        if(gff.json.fields.CameraModel)
          this.cameraModel = gff.json.fields.CameraModel.value;
        
        if(gff.json.fields.EndConverAbort)
          this.onEndConversationAbort = gff.json.fields.EndConverAbort.value;

        if(gff.json.fields.EndConversation)
          this.onEndConversation = gff.json.fields.EndConversation.value;

        if(gff.json.fields.AnimatedCut)
          this.isAnimatedCutscene = gff.json.fields.AnimatedCut.value ? true : false;

        if(gff.json.fields.AmbientTrack)
          this.ambientTrack = gff.json.fields.AmbientTrack.value;

        if(gff.json.fields.UnequipHItem)
          this.unequipHeadItem = gff.json.fields.UnequipHItem.value ? true : false;

        if(gff.json.fields.UnequipItems)
          this.unequipItems = gff.json.fields.UnequipItems.value ? true : false;

        for(let i = 0; i < gff.json.fields.EntryList.structs.length; i++){
          this.entryList.push(
            this._parseEntryStruct(gff.json.fields.EntryList.structs[i].fields)
          );
        }

        for(let i = 0; i < gff.json.fields.ReplyList.structs.length; i++){
          this.replyList.push(
            this._parseReplyStruct(gff.json.fields.ReplyList.structs[i].fields)
          );
        }

        for(let i = 0; i < gff.json.fields.StartingList.structs.length; i++){
          let _node = gff.json.fields.StartingList.structs[i].fields;

          let node = {
            isActiveParams: {
              Not: _node.Not.value,
              Param1: _node.Param1.value,
              Param2: _node.Param2.value,
              Param3: _node.Param3.value,
              Param4: _node.Param4.value,
              Param5: _node.Param5.value,
              String: _node.ParamStrA.value
            },
            isActive2Params: {
              Not: _node.Not2.value,
              Param1: _node.Param1b.value,
              Param2: _node.Param2b.value,
              Param3: _node.Param3b.value,
              Param4: _node.Param4b.value,
              Param5: _node.Param5b.value,
              String: _node.ParamStrB.value
            },
            Logic: _node.Logic.value,
            isActive: _node.Active.value,
            isActive2: _node.Active2.value,
            index: _node.Index.value
          };

          this.startingList.push(node);
        }

        if(Game.Mode == Game.MODES.INGAME){
          Game.InGameOverlay.Hide();
        }
        this.canLetterbox = true;

        for(let i = 0; i < gff.json.fields.StuntList.structs.length; i++){
          let stnt = gff.json.fields.StuntList.structs[i].fields;
          this.stuntActors.push({
            participant: stnt.Participant.value != '' ? stnt.Participant.value : 'OWNER',
            model: stnt.StuntModel.value
          });
        }

        Game.currentCamera = Game.camera_dialog;
        this.UpdateCamera();

        this.isListening = true;
        this.updateTextPosition();

        //Face the listener towards the owner of the conversation
        if(!this.isAnimatedCutscene){
          if(this.listener instanceof ModuleCreature && this.owner instanceof ModuleObject){
            if(!this.listener.lockDialogOrientation && !this.listener.notReorienting){
              this.listener.rotation.z = Math.atan2(
                this.listener.position.y - this.owner.position.y,
                this.listener.position.x - this.owner.position.x
              ) + Math.PI/2;
            }
          }

          if(this.owner instanceof ModuleCreature && this.listener instanceof ModuleObject){
            if(!this.owner.lockDialogOrientation && !this.listener.notReorienting){
              this.owner.rotation.z = Math.atan2(
                this.owner.position.y - this.listener.position.y,
                this.owner.position.x - this.listener.position.x
              ) + Math.PI/2;
            }
          }
        }

        let canStart = () => {
          if(this.letterBoxed){

            Game.holdWorldFadeInForDialog = false;

            if(this.ambientTrack != ''){
              AudioLoader.LoadMusic(this.ambientTrack, (data) => {
                //console.log('Loaded Background Music', bgMusic);
                Game.audioEngine.stopBackgroundMusic();
                Game.audioEngine.SetDialogBackgroundMusic(data);
                this.getNextEntry(this.startingList);
              }, () => {
                this.getNextEntry(this.startingList);
              });
            }else{
              this.getNextEntry(this.startingList);
            }
            
          }else{
            setTimeout(canStart, 300);
          }
        };

        if(this.isAnimatedCutscene){
          Game.holdWorldFadeInForDialog = true;
          this.loadStuntCamera( () => {
            this.loadStuntActors(0, () => {
              canStart();
            });
          });
        }else{
          this.loadStuntCamera( () => {
            this.loadStuntActors(0, () => {
              canStart();
            });
          });
        }

        if(typeof options.onLoad === 'function')
          options.onLoad();

      });
    }else{
      if(typeof options.onLoad === 'function')
        options.onLoad();
      
      this.EndConversation();
    }

  }

  loadStuntCamera(onLoad = null){
    if(this.cameraModel != ''){
      Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel(this.cameraModel, ResourceTypes['mdl']), (mdlBuffer) => {
        Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel(this.cameraModel, ResourceTypes['mdx']), (mdxBuffer) => {
          try{
  
            let model = new AuroraModel( new BinaryReader(new Buffer(mdlBuffer)), new BinaryReader(new Buffer(mdxBuffer)) );
            THREE.AuroraModel.FromMDL(model, { 
              onComplete: (model) => {
                
                this.animatedCamera = model;
                //this.animatedCamera.position.copy(Game.player.model.position);
                //this.animatedCamera.quaternion.setFromEuler(Game.player.model.rotation.copy());

                //this.animatedCamera.camerahook.add(Game.camera_animated);

                this.animatedCamera.bonesInitialized = true;
                if(typeof onLoad === 'function')
                  onLoad();
              }
            });
          }catch(e){
            if(typeof onLoad === 'function')
              onLoad();
          }
        });
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  loadStuntActors(i, onLoad = null){

    if(i < this.stuntActors.length){
      let actor = this.stuntActors[i];
      let model;
      if(actor.participant == 'PLAYER'){
        let stunt = new ModuleCreature(GFFObject.FromStruct(Game.player.template.RootNode));

        stunt.Load( () => {
          stunt.LoadModel( (model) => {
            model = Game.player.model;
            //Load the actor's supermodel
            Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel(actor.model, ResourceTypes['mdl']), (mdlBuffer) => {
              Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel(actor.model, ResourceTypes['mdx']), (mdxBuffer) => {
                try{
        
                  let actorModel = new AuroraModel( new BinaryReader(new Buffer(mdlBuffer)), new BinaryReader(new Buffer(mdxBuffer)) );
                  THREE.AuroraModel.FromMDL(actorModel, { 
                    onComplete: (actorSuperModel) => {

                      model.animations = actorSuperModel.animations;
                      //console.log('actor', actorSuperModel.animations)
                      Game.player.anim = true;

                      if(this.unequipItems)
                        Game.player.UnequipItems();

                      if(this.unequipHeadItem)
                        Game.player.UnequipHeadItem();
          
                      this.stunt[actor.participant] = Game.player;
                      //console.log('STUNT', this.stunt[actor.participant]);
                      this.loadStuntActors(++i, onLoad);

                    }
                  });
                }catch(e){
                  //canStart();
                }
              });
            });
          });
        });
      }else if(actor.participant == 'OWNER'){
        this.stunt['OWNER'.toLowerCase()] = this.owner;
        this.loadStuntActors(++i, onLoad);
      }else{
        let creature = Game.GetObjectByTag(actor.participant);
        if(creature){
          model = creature.model;
          //Load the actor's supermodel
          Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel(actor.model, ResourceTypes['mdl']), (mdlBuffer) => {
            Global.kotorBIF['models'].GetResourceData(Global.kotorBIF['models'].GetResourceByLabel(actor.model, ResourceTypes['mdx']), (mdxBuffer) => {
              try{
      
                let actorModel = new AuroraModel( new BinaryReader(new Buffer(mdlBuffer)), new BinaryReader(new Buffer(mdxBuffer)) );
                THREE.AuroraModel.FromMDL(actorModel, { 
                  onComplete: (actorSuperModel) => {
                    model.animations = actorSuperModel.animations;
                    //console.log('actor', actorSuperModel.animations)
                    model.rotation.z = 0;
                    model.box = new THREE.Box3().setFromObject(model);

                    creature.anim = true;

                    if(this.unequipItems)
                      creature.UnequipItems();

                    if(this.unequipHeadItem)
                      creature.UnequipHeadItem();
        
                    this.stunt[actor.participant.toLowerCase()] = creature;
                    //console.log('STUNT', this.stunt[actor.participant.toLowerCase()]);
                    this.loadStuntActors(++i, onLoad);

                  }
                });
              }catch(e){
                //canStart();
              }
            });
          });
        }
      }
    }else{
      if(typeof onLoad == 'function')
        onLoad();
    }

  }

  getNextEntry(entries = []){

    if(!entries.length){
      this.EndConversation();
    }

    this.isListening = true;
    this.updateTextPosition();

    //console.log('getNextEntry', entries);

    let totalEntries = entries.length;

    let entryLoop = (idx = 0) => {
      if(idx < totalEntries){
        let entry = entries[idx];
        if(entry.isActive == ''){
          this.showEntry(this.entryList[entry.index]);
        }else{
          ResourceLoader.loadResource(ResourceTypes['ncs'], entry.isActive, (buffer) => {
            let script = new NWScript(buffer);
            script.setScriptParam(1, entry.isActiveParams.Param1);
            script.setScriptParam(2, entry.isActiveParams.Param2);
            script.setScriptParam(3, entry.isActiveParams.Param3);
            script.setScriptParam(4, entry.isActiveParams.Param4);
            script.setScriptParam(5, entry.isActiveParams.Param5);
            script.setScriptStringParam(entry.isActiveParams.String)

            //console.log('dialog conditional', script);
            script.name = entry.isActive;
            //console.log(this.owner);
            script.run(Game.player, 0, (bSuccess) => {
              console.log('dialog cond1', {
                entry: entry,
                script: entry.isActive, 
                returnValue: bSuccess,
                params: entry.isActiveParams,
                shouldPass: (entry.isActiveParams.Not == 1 && !bSuccess) || (entry.isActiveParams.Not == 0 && bSuccess)
              });
              this.listener = Game.player;
              if((entry.isActiveParams.Not == 1 && !bSuccess) || (entry.isActiveParams.Not == 0 && bSuccess)){
                if(entry.isActive2 == ''){
                  this.showEntry(this.entryList[entry.index]);
                }else{
                  ResourceLoader.loadResource(ResourceTypes['ncs'], entry.isActive2, (buffer) => {
                    let script = new NWScript(buffer);
                    script.setScriptParam(1, entry.isActive2Params.Param1);
                    script.setScriptParam(2, entry.isActive2Params.Param2);
                    script.setScriptParam(3, entry.isActive2Params.Param3);
                    script.setScriptParam(4, entry.isActive2Params.Param4);
                    script.setScriptParam(5, entry.isActive2Params.Param5);
                    script.setScriptStringParam(entry.isActive2Params.String)
                    script.name = entry.isActive2;
                    //console.log(this.owner);
                    script.run(Game.player, 0, (bSuccess) => {
                      console.log('dialog cond2', {
                        entry: entry,
                        script: entry.isActive2, 
                        returnValue: bSuccess,
                        params: entry.isActive2Params,
                        shouldPass: (entry.isActive2Params.Not == 1 && !bSuccess) || (entry.isActive2Params.Not == 0 && bSuccess)
                      });
                      this.listener = Game.player;
                      if(entry.isActive2Params.Not == 1 && !bSuccess){
                        this.showEntry(this.entryList[entry.index]);
                      }else if(entry.isActive2Params.Not == 0 && bSuccess){
                        this.showEntry(this.entryList[entry.index]);
                      }else{
                        entryLoop(++idx);
                      }
                    })
                  });
                }
              }else{
                entryLoop(++idx);
              }
            })
          });
        }
      }else{ 
        //No further branches
        this.EndConversation();
      }
    };
    entryLoop();
  }

  isEndDialog(node){

    return false;

    if(typeof node.entries !== 'undefined'){
      return node.text == '' && !node.entries.length;
    }else if(typeof node.replies !== 'undefined'){
      return node.text == '' && !node.replies.length;
    }else{
      return true;
    }

  }

  isContinueDialog(node){

    if(typeof node.entries !== 'undefined'){
      return node.text == '' && node.entries.length;
    }else if(typeof node.replies !== 'undefined'){
      return node.text == '' && node.replies.length;
    }else{
      return true;
    }

  }

  PlayerSkipEntry(entry = null){
    if(entry != null){
      clearTimeout(entry.timeout);
      if(this.animatedCamera instanceof THREE.AuroraModel){
        this.animatedCamera.currentAnimation = undefined;
      }
      this.UpdateCamera();
      this.audioEmitter.Stop();
      this.showReplies(entry);
    }
  }

  showEntry(entry){
    //console.log('showEntry', entry);

    if(!Game.inDialog)
      return;

    this.LBL_MESSAGE.setText(entry.text.split('##')[0]);
    this.LB_REPLIES.hide();
    this.LB_REPLIES.clearItems();
    this.updateTextPosition();
    
    this.currentEntry = entry;
    entry.timeout = null;
    if(entry.speakerTag != ''){
      entry.speaker = Game.GetObjectByTag(entry.speakerTag);
    }else{
      entry.speaker = this.owner;
    }

    if(entry.listenerTag != ''){
      if(entry.listenerTag == 'PLAYER'){
        this.listener = Game.player;
      }else{
        this.listener = Game.GetObjectByTag(entry.listenerTag);
      }
    }else{
      entry.listener = Game.player;
    }

    this.UpdateEntryAnimations(entry);

    /*this.owner.anim = true;
    this.owner.model.playAnimation(this.owner.model.getAnimationByName('talknorm'), true, () => {
      this.owner.anim = null;
    });*/

    let checkList = {
      cameraAnimationComplete: true,
      voiceOverComplete: false,
      cameraModel: false,
      alreadyAllowed: false,
      scriptComplete: true,

      isComplete: function(entry){
        //console.log('checkList', this);

        if(this.alreadyAllowed){
          return false;
        }

        if(Game.InGameDialog.isAnimatedCutscene || (entry.cameraAngle == 4 && Game.InGameDialog.cameraModel)){
          if(this.cameraAnimationComplete){
            this.alreadyAllowed = true;
            return true;
          }
          return false;
        }else{
          if(this.voiceOverComplete){
            this.alreadyAllowed = true;
            return true;
          }
          return false;
        }

      }

    };

    let nodeDelay = 3000;

    if(entry.camFieldOfView != -1){
      Game.camera_animated.fov = entry.camFieldOfView;
    }

    if(!entry.cameraID){
      Game.currentCamera = Game.camera_dialog;
      this.UpdateCamera();
    }else{
      Game.currentCamera = Game.getCameraById(entry.cameraID);
    }

    this.GetAvailableReplies(entry);

    if(!this.isAnimatedCutscene && entry.dealy > -1){
      nodeDelay = node.delay * 1000;
    }

    if((entry.cameraAngle == 4 && this.cameraModel)){
      //Animated camera
      if(entry.cameraAnimation > -1){
        checkList.cameraAnimationComplete = false;
        this.SetAnimatedCamera(entry.cameraAnimation, () => {
          checkList.cameraAnimationComplete = true;
          if(checkList.isComplete(entry)){
            this.showReplies(entry);
          }
        });
      }
    }else if(entry.cameraAngle == 6){
      //Placeable camera
      this.SetPlaceableCamera(entry.cameraAnimation > -1 ? entry.cameraAnimation : entry.cameraID, entry.cameraAngle);
    }else{
      Game.currentCamera = Game.camera_dialog;
      this.UpdateCamera();
    }

    if(entry.script != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], entry.script, (buffer) => {
        let script = new NWScript(buffer);
        script.setScriptParam(1, entry.scriptParams.Param1);
        script.setScriptParam(2, entry.scriptParams.Param2);
        script.setScriptParam(3, entry.scriptParams.Param3);
        script.setScriptParam(4, entry.scriptParams.Param4);
        script.setScriptParam(5, entry.scriptParams.Param5);
        script.setScriptStringParam(entry.scriptParams.String)
        script.name = entry.script;
        script.run(this.owner);
        if(entry.script2 != ''){
          ResourceLoader.loadResource(ResourceTypes['ncs'], entry.script, (buffer) => {
            let script = new NWScript(buffer);
            script.setScriptParam(1, entry.script2Params.Param1);
            script.setScriptParam(2, entry.script2Params.Param2);
            script.setScriptParam(3, entry.script2Params.Param3);
            script.setScriptParam(4, entry.script2Params.Param4);
            script.setScriptParam(5, entry.script2Params.Param5);
            script.setScriptStringParam(entry.scriptParams.String)
            script.name = entry.script;
            script.run(this.owner);
          });
        }
      });
    }else if(entry.script2 != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], entry.script, (buffer) => {
        let script = new NWScript(buffer);
        script.setScriptParam(1, entry.script2Params.Param1);
        script.setScriptParam(2, entry.script2Params.Param2);
        script.setScriptParam(3, entry.script2Params.Param3);
        script.setScriptParam(4, entry.script2Params.Param4);
        script.setScriptParam(5, entry.script2Params.Param5);
        script.setScriptStringParam(entry.script2Params.String)
        script.name = entry.script;
        script.run(this.owner);
      });
    }

    let fadeDuration = ((entry.fade.length * 1000) + (entry.fade.delay * 1000));
    if(nodeDelay < fadeDuration){
      nodeDelay = fadeDuration;
    }

    if(entry.fade.type == 0){
      Game.FadeOverlay.FadeIn(1, 0, 0, 0);
    }else if(entry.fade.type == 3){
      setTimeout( () => {
        Game.FadeOverlay.FadeIn(entry.fade.length, 0, 0, 0);
      }, entry.fade.delay * 1000);
    }else if(entry.fade.type == 4){
      setTimeout( () => {
        Game.FadeOverlay.FadeOut(entry.fade.length, 0, 0, 0);
      }, entry.fade.delay * 1000);
    }

    //While the conversation is paused loop until unpaused then run callback
    this._pauseLoop( ()=>{
      //this.audioEmitter.Stop();

      //I currently believe that entry.sound is a backup for when vo_resref fails...
      //Alien vo seems to be missing. Maybe they were pefilled by the bioware dialog editor
      //So vo in basic could be dropped in later into the proper folder.
      if(entry.sound != ''){
        this.audioEmitter.PlayStreamWave(entry.sound, null, (error = false) => {
          checkList.voiceOverComplete = true;
          if(checkList.isComplete(entry)){
            this.showReplies(entry);
          }
        });
      }else if(entry.vo_resref != ''){
        this.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
          checkList.voiceOverComplete = true;
          if(checkList.isComplete(entry)){
            this.showReplies(entry);
          }
        });
      }else{
        console.error('VO ERROR', entry);
        setTimeout( () => {
          checkList.voiceOverComplete = true;
          if(checkList.isComplete(entry)){
            this.showReplies(entry);
          }
        }, nodeDelay);
      }
    });

    this.state = 0;
    
  }

  entrySound( onComplete = null ){

  }

  entryCamera( onComplete = null ){

  }

  loadReplies(entry){
    if(!entry.replies.length){
      //this.EndConversation();
    }else{
      if(entry.replies.length == 1 && this.isContinueDialog(entry.replies[0])){
        let reply = this.replyList[entry.replies[0].index]
        this.getNextEntry(reply.entries);
      }else{
        
      } 

    }
  }

  showReplies(entry){

    if(!Game.inDialog)
      return;

    //console.log('showReplies', entry);
    if(!entry.replies.length){
      this.EndConversation();
    }else{
      if(entry.replies.length == 1 && this.isContinueDialog(entry.replies[0])){
        let reply = this.replyList[entry.replies[0].index];

        //Try to run script 1
        if(reply.script != ''){
          ResourceLoader.loadResource(ResourceTypes['ncs'], reply.script, (buffer) => {
            if(buffer.length){
              let script = new NWScript(buffer);
              script.setScriptParam(1, reply.scriptParams.Param1);
              script.setScriptParam(2, reply.scriptParams.Param2);
              script.setScriptParam(3, reply.scriptParams.Param3);
              script.setScriptParam(4, reply.scriptParams.Param4);
              script.setScriptParam(5, reply.scriptParams.Param5);
              script.setScriptStringParam(reply.scriptParams.String);
              script.name = reply.script;
              script.run(this.owner, 0, (bSuccess) => {
                //Try to run script 2
                if(reply.script2 != ''){
                  ResourceLoader.loadResource(ResourceTypes['ncs'], reply.script2, (buffer) => {
                    if(buffer.length){
                      let script = new NWScript(buffer);
                      script.setScriptParam(1, reply.script2Params.Param1);
                      script.setScriptParam(2, reply.script2Params.Param2);
                      script.setScriptParam(3, reply.script2Params.Param3);
                      script.setScriptParam(4, reply.script2Params.Param4);
                      script.setScriptParam(5, reply.script2Params.Param5);
                      script.setScriptStringParam(reply.script2Params.String);
                      script.name = reply.script2;
                      script.run(this.owner, 0, (bSuccess) => {
                        
                      })
                      this.getNextEntry(reply.entries);
                    }else{
                      this.getNextEntry(reply.entries);
                    }
                  }, () => {
                    this.getNextEntry(reply.entries);
                  });
                }else{
                  this.getNextEntry(reply.entries);
                }

              });
            }else{
              this.getNextEntry(reply.entries);
            }
          }, () => {
            this.getNextEntry(reply.entries);
          });
        }else{
          this.getNextEntry(reply.entries);
        }


        //Return so none of the node specific code runs
        return;
      }
    }

    this.owner.anim = true;
    this.owner.model.playAnimation(this.owner.model.getAnimationByName('talknorm'), true, () => {
      this.owner.anim = null;
    });

    this.listener.anim = true;
    this.listener.model.playAnimation(this.listener.model.getAnimationByName('talknorm'), true, () => {
      this.listener.anim = null;
    });

    this.isListening = false;
    this.updateTextPosition();
    this.LB_REPLIES.show();

    //DEBUG log replies
    console.log('DEBUG: Dialog Reply Options');
    for(let i = 0; i < this.LB_REPLIES.children.length; i++){
      try{
        console.log(this.LB_REPLIES.children[i].text.text);
      }catch(e){

      }
    }

    this.UpdateCamera();

    this.state = 1;

  }

  GetAvailableReplies(entry){
    let totalReplies = entry.replies.length;
    //console.log('GetAvailableReplies', entry);
    let replyLoop = (idx = 0) => {
      if(idx < totalReplies){
        //console.log('replyLoop', entry.replies[idx], idx, idx < totalReplies);
        let reply = entry.replies[idx];
        if(reply.isActive == ''){
          let _reply = this.replyList[reply.index];
          //console.log('showEntry.replies', _reply);
          this.LB_REPLIES.addItem(this.LB_REPLIES.children.length+1+'. '+_reply.text.split('##')[0], () => {
            this.onReplySelect(_reply);
          });
          replyLoop(++idx);
        }else{
          ResourceLoader.loadResource(ResourceTypes['ncs'], reply.isActive, (buffer) => {
            if(buffer.length){
              let script = new NWScript(buffer);
              /*script.setScriptParam(1, reply.scriptParams.Param1);
              script.setScriptParam(2, reply.scriptParams.Param2);
              script.setScriptParam(3, reply.scriptParams.Param3);
              script.setScriptParam(4, reply.scriptParams.Param4);
              script.setScriptParam(5, reply.scriptParams.Param5);
              script.setScriptStringParam(reply.scriptParams.String);*/
              //console.log('dialog', script);
              script.name = reply.isActive;
              //console.log(this.owner);
              script.run(this.listener, 0, (bSuccess) => {
                //console.log('dialog', script, bSuccess);
                if(bSuccess){
                  let _reply = this.replyList[reply.index];
                  //console.log('showEntry.replies', _reply);
                  this.LB_REPLIES.addItem(this.LB_REPLIES.children.length+1+'. '+_reply.text.split('##')[0], () => {
                    this.onReplySelect(_reply);
                  });
                }
                replyLoop(++idx);
              })
            }else{
              replyLoop(++idx);
            }
          }, () => {
            replyLoop(++idx);
          });
        }
      }else{ 
        //No further branches
        //this.EndConversation();
      }
    };
    replyLoop();
  }

  onReplySelect(reply = null){

    //Try to run script 1
    if(reply.script != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], reply.script, (buffer) => {
        if(buffer.length){
          let script = new NWScript(buffer);
          script.setScriptParam(1, reply.scriptParams.Param1);
          script.setScriptParam(2, reply.scriptParams.Param2);
          script.setScriptParam(3, reply.scriptParams.Param3);
          script.setScriptParam(4, reply.scriptParams.Param4);
          script.setScriptParam(5, reply.scriptParams.Param5);
          script.setScriptStringParam(reply.scriptParams.String);
          script.name = reply.script;
          script.run(this.owner, 0, (bSuccess) => {
            //Try to run script 2
            if(reply.script2 != ''){
              ResourceLoader.loadResource(ResourceTypes['ncs'], reply.script2, (buffer) => {
                if(buffer.length){
                  let script = new NWScript(buffer);
                  script.setScriptParam(1, reply.script2Params.Param1);
                  script.setScriptParam(2, reply.script2Params.Param2);
                  script.setScriptParam(3, reply.script2Params.Param3);
                  script.setScriptParam(4, reply.script2Params.Param4);
                  script.setScriptParam(5, reply.script2Params.Param5);
                  script.setScriptStringParam(reply.script2Params.String);
                  script.name = reply.script2;
                  script.run(this.owner, 0, (bSuccess) => {
                    
                  })
                  this.getNextEntry(reply.entries);
                }else{
                  this.getNextEntry(reply.entries);
                }
              }, () => {
                this.getNextEntry(reply.entries);
              });
            }else{
              this.getNextEntry(reply.entries);
            }

          });
        }else{
          this.getNextEntry(reply.entries);
        }
      }, () => {
        this.getNextEntry(reply.entries);
      });
    }else{
      this.getNextEntry(reply.entries);
    }

  }

  OnBeforeConversationEnd( onEnd = null ){

    if(this.onEndConversation != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], this.onEndConversation, (buffer) => {
        if(this.buffer.length){
          let script = new NWScript(buffer);
          //console.log('dialog.OnEndScript', script);
          script.name = entry.isActive;
          //console.log(this.owner);
          script.run(this.owner, 0, (bSuccess) => {
            //console.log('dialog', script, bSuccess);
            if(typeof onEnd === 'function')
              onEnd();
          })
        }else{
          if(typeof onEnd === 'function')
            onEnd();
        }
      });
    }

  }

  EndConversation(aborted = false){

    if(this.onEndConversation != '')

    if(this.owner)
      this.owner.anim = false;
    
    if(this.listener)
      this.listener.anim = false;
    
    this.audioEmitter.Stop();
    this.Hide();
    Game.currentCamera = Game.camera;
    Game.inDialog = false;
    if(Game.Mode == Game.MODES.INGAME){
      Game.InGameOverlay.Show();
    }

    this.state = -1;

    if(this.animatedCamera instanceof THREE.AuroraModel)
      this.animatedCamera.currentAnimation = undefined;

    process.nextTick( () => {

      if(!aborted){
        if(this.onEndConversation != ''){
          ResourceLoader.loadResource(ResourceTypes['ncs'], this.onEndConversation, (buffer) => {
            if(buffer.length){
              let script = new NWScript(buffer);
              //console.log('dialog.OnEndScript', script);
              script.name = this.onEndConversation;
              //console.log(this.owner);
              script.run(this.owner, 0, (bSuccess) => {
                //console.log('dialog.OnEndScript', script, bSuccess);
              })
            }
          });
        }
      }else{
        if(this.onEndConversationAbort != ''){
          ResourceLoader.loadResource(ResourceTypes['ncs'], this.onEndConversationAbort, (buffer) => {
            if(buffer.length){
              let script = new NWScript(buffer);
              //console.log('dialog.OnEndScript', script);
              script.name = this.onEndConversationAbort;
              //console.log(this.owner);
              script.run(this.owner, 0, (bSuccess) => {
                //console.log('dialog.OnEndScript', script, bSuccess);
              })
            }
          });
        }
      }
    });

    //Clear cutscene actors
    while (Game.group.stunt.children.length){
      Game.group.stunt.remove(Game.group.stunt.children[0]);
    }

    for(let actor in this.stunt){
      try{
        this.stunt[actor].model.buildSkeleton();
        this.stunt[actor].anim = false;
      }catch(e){
        
      }
    }

    this.stunt = {};

    if(Game.FadeOverlay.state == Game.FadeOverlay.STATES.FADE_OUT){
      Game.FadeOverlay.FadeIn(1, 0, 0, 0);
    }

  }

  _pauseLoop( onResume = null ){

    if(this.paused){
      this.pauseLoop = setTimeout( () => {
        this._pauseLoop(onResume);
      }, 300);
    }else{
      if(typeof onResume === 'function')
        onResume();
    }

  }

  PauseConversation(){
    this.paused = true;
  }

  ResumeConversation(){
    this.paused = false;
  }

  UpdateEntryAnimations(entry){
    for(let i = 0; i < entry.animations.length; i++){
      let participant = entry.animations[i];

      console.log('UpdateEntryAnimations', participant, this.stunt[participant.participant], this.stunt);

      if(this.stunt[participant.participant]){
        //console.log('STUNT', this.stunt[participant.participant], participant.animation-1200, this.GetActorAnimation(participant.animation));
        this.stunt[participant.participant].anim = true;
        this.stunt[participant.participant].model.playAnimation(this.GetActorAnimation(participant.animation), false);
      }else{
        let actor = Game.GetObjectByTag(participant.participant);
        if(actor && participant.animation >= 10000){
          let anim = this.GetDialogAnimation(participant.animation-10000);
          //console.log('DialogAnim', participant.animation-10000, anim)
          if(anim){
            actor.anim = true;
            actor.model.playAnimation(anim.name, anim.looping  == '1');
          }else{
            //console.error('Anim', participant.animation-10000)
          }
        }
      }
    }
    /*if(this.isAnimatedCutscene){
      for(let i = 0; i < entry.animations.length; i++){
        let participant = entry.animations[i];
        if(this.stunt[participant.participant]){
          //console.log('STUNT', this.stunt[participant.participant], participant.animation-1200, this.GetActorAnimation(participant.animation));
          this.stunt[participant.participant].model.playAnimation(this.GetActorAnimation(participant.animation), false);
        }else{
          let actor = Game.GetObjectByTag(participant.participant);
          if(actor && participant.animation >= 10000){
            let anim = this.GetDialogAnimation(participant.animation-10000);
            //console.log('DialogAnim', participant.animation-10000, anim)
            if(anim){
              actor.anim = true;
              actor.model.playAnimation(anim.name, anim.looping  == '1');
            }else{
              //console.error('Anim', participant.animation-10000)
            }
          }
        }
      }
    }else{
      for(let i = 0; i < entry.animations.length; i++){
        let participant = entry.animations[i];
        let actor = Game.GetObjectByTag(participant.participant);
        if(actor && participant.animation >= 10000){
          let anim = this.GetDialogAnimation(participant.animation-10000);
          //console.log('DialogAnim', participant.animation-10000, anim)
          if(anim){
            actor.anim = true;
            actor.model.playAnimation(anim.name, anim.looping  == '1');
          }else{
            //console.error('Anim', participant.animation-10000)
          }
        }
      }
    }*/
  }

  GetActorAnimation(index = 0){
    return "CUT"+("000" + (index-1200 +1)).slice(-3)+"W";
  }

  GetDialogAnimation(index = 0){
    switch(index){
      case 30: //Listen
        return Global.kotor2DA.animations.rows[18];
      break;
      case 35: //Meditate
        return Global.kotor2DA.animations.rows[24];
      break;
      case 38://Talk_Normal
        return Global.kotor2DA.animations.rows[25];
      break;
      case 39://Talk_Pleading
        return Global.kotor2DA.animations.rows[27];
      break;
      case 40://Talk_Forceful
        return Global.kotor2DA.animations.rows[26];
      break;
      case 41://Talk_Laughing
        return Global.kotor2DA.animations.rows[29];
      break;
      case 42://Talk_Sad
        return Global.kotor2DA.animations.rows[28];
      break;
      case 121: //Use_Computer_LP
        return Global.kotor2DA.animations.rows[44];
      break;
      case 127: //Activate
        return Global.kotor2DA.animations.rows[38];
      break;
      default:
        return undefined;
      break;
    }
  }

  SetPlaceableCamera(nCamera){
    let cam = Game.getCameraById(nCamera);
    if(cam){
      Game.currentCamera = cam;
    }
  }

  SetAnimatedCamera(nCamera, onComplete = undefined){
    if(this.animatedCamera instanceof THREE.AuroraModel){
      Game.currentCamera = Game.camera_animated;
      //this.animatedCamera.pose();
      //this.animatedCamera.currentAnimation = undefined;
      //console.log('animatedCamera', this.GetActorAnimation(nCamera), 'Begin');
      //this.animatedCamera.poseAnimation(GetActorAnimation(nCamera));
      this.animatedCamera.playAnimation(this.GetActorAnimation(nCamera), false, () => {
        //console.log('animatedCamera', this.GetActorAnimation(nCamera), 'End');
        process.nextTick( () => {
          if(Game.inDialog && typeof onComplete === 'function')
            onComplete();
        });
      });

      return
    }
  }

  UpdateCamera(){

    /*if(this.animatedCamera instanceof THREE.AuroraModel){
      Game.currentCamera = Game.camera_animated;
      return;
    }*/

    if(this.isListening){
      //Show the speaker

      if(this.currentEntry){
        let position = this.currentEntry.speaker.GetPosition().sub(
          new THREE.Vector3(
            1*Math.cos(this.currentEntry.speaker.GetOrientation().z - Math.PI/1.5), 
            1*Math.sin(this.currentEntry.speaker.GetOrientation().z - Math.PI/1.5), 
            -1.75
          )
        );

        Game.camera_dialog.position.set(position.x, position.y, position.z);
        Game.camera_dialog.lookAt(this.currentEntry.speaker.GetPosition().add({x:0, y:0, z: 1.5}));
      }else{
        let position = this.listener.GetPosition().sub(
          new THREE.Vector3(
            -1.5*Math.cos(this.listener.GetOrientation().z - Math.PI/4), 
            -1.5*Math.sin(this.listener.GetOrientation().z - Math.PI/4), 
            -1.75
          )
        );
  
        Game.camera_dialog.position.set(position.x, position.y, position.z)
        Game.camera_dialog.lookAt(this.owner.GetPosition().add({x:0, y:0, z: 1.5}));  
      }

    }else{
      //Show the listener
      let position = this.listener.GetPosition().sub(
        new THREE.Vector3(
          0.5*Math.cos(this.listener.GetOrientation().z - (Math.PI/4)*2), 
          0.5*Math.sin(this.listener.GetOrientation().z - (Math.PI/4)*2), 
          -1.75
        )
      );
      Game.camera_dialog.position.set(position.x, position.y, position.z);
      Game.camera_dialog.lookAt(this.listener.GetPosition().add({x:0, y:0, z: 1.6}));

    }

  }

  GetCameraMidPoint(pointA, pointB, percentage = 0.5){

    var dir = pointB.clone().sub(pointA);
    var len = dir.length();
    dir = dir.normalize().multiplyScalar(len*percentage);
    return pointA.clone().add(dir);
  }

  Update(delta){
    super.Update(delta);

    if(!this.canLetterbox)
      return;

    if(this.animatedCamera){

      if(this.animatedCamera instanceof THREE.AuroraModel && this.animatedCamera.currentAnimation){
        this.animatedCamera.update(delta);
        this.animatedCamera.camerahook.updateMatrixWorld();
        let pos = new THREE.Vector3(
          this.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).x,
          this.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).y,
          this.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).z
        );
        Game.camera_animated.position.copy(
          pos
        );
        Game.camera_animated.quaternion.copy(
          this.animatedCamera.camerahook.quaternion
        );
        //Game.camera_animated.rotation.y -= Math.PI/2
        //Game.camera_animated.rotation.z= Math.PI
        Game.camera_animated.updateProjectionMatrix();
        Game.currentCamera = Game.camera_animated;
      }

      for(let actor in this.stunt){
        //console.log('STUNT', actor);
        //this.stunt[actor].model.update(delta)
      }

    }

    if(this.bottomBar.position.y < -(window.innerHeight / 2) + (100 / 2)){
      this.bottomBar.position.y += 5;
      this.topBar.position.y -= 5;
    }else{
      this.bottomBar.position.y = -(window.innerHeight / 2) + (100 / 2);
      this.topBar.position.y = (window.innerHeight / 2) - (100 / 2);
      this.letterBoxed = true;
    }

    /*if(this.topBar.position.y > (window.innerHeight / 2) - (100 / 2)){
      
    }else{
      
      this.letterBoxed = true;
    }*/
    
  }

  updateTextPosition(){

    if(typeof this.LBL_MESSAGE.textGeometry !== 'undefined'){
      this.LBL_MESSAGE.textGeometry.computeBoundingBox();

      let bb = this.LBL_MESSAGE.textGeometry.boundingBox;
      let height = Math.abs(bb.min.y) + Math.abs(bb.max.y);
      let width = Math.abs(bb.min.x) + Math.abs(bb.max.x);
      let padding = 10;

      if(this.isListening){
        this.LBL_MESSAGE.widget.position.y = (-window.innerHeight / 2 ) + ( 100 - (height));
      }else{
        this.LBL_MESSAGE.widget.position.y = (window.innerHeight / 2) - ( 100 - (height / 2) );
      }

      this.LBL_MESSAGE.box = new THREE.Box2(
        new THREE.Vector2(
          this.LBL_MESSAGE.widget.position.x - width/2,
          this.LBL_MESSAGE.widget.position.y - height/2
        ),
        new THREE.Vector2(
          this.LBL_MESSAGE.widget.position.x + width/2,
          this.LBL_MESSAGE.widget.position.y + height/2
        )
      );

    }

  }

  LoadDialog(resref = '', onLoad = null){

    TemplateLoader.Load({
      ResRef: resref,
      ResType: ResourceTypes.dlg,
      onLoad: (gff) => {
        if(typeof onLoad === 'function')
          onLoad(gff);
      },
      onFail: () => {
        this.EndConversation();
        console.error('Failed to load conversation bt resref: '+resref);
      }
    });

  }

  Resize(){
    this._resetLetterBox();
    this.RecalculatePosition();
    this.updateTextPosition();
  }

  RecalculatePosition(){

    this.LB_REPLIES.extent.left = -(window.innerWidth/2) + this.LB_REPLIES.extent.width/2 + 16;
    this.LB_REPLIES.extent.top = (window.innerHeight/2) - this.LB_REPLIES.extent.height/2;
    this.LB_REPLIES.calculatePosition();
    this.LB_REPLIES.calculateBox();

    this._resetLetterBox();
  }

  _resetLetterBox(){
    this.topBar.scale.x = this.bottomBar.scale.x = window.innerWidth;
    this.topBar.scale.y = this.bottomBar.scale.y = this.barHeight;

    this.topBar.position.y = (window.innerHeight / 2) + (100 / 2);
    this.bottomBar.position.y = -this.topBar.position.y;
  }

  _parseEntryStruct(struct){

    let node = {
      animations: [],
      cameraAngle: 0,
      cameraID: 0,
      cameraAnimation: -1,
      camFieldOfView: -1,
      comment: '',
      delay: 0,
      fadeType: 0,
      listenerTag: '',
      plotIndex: -1,
      plotXPPercentage: 1,
      quest: '',
      replies: [],
      script: '',
      script2: '',
      sound: '',
      soundExists: 0,
      speakerTag: '',
      text: '',
      vo_resref: '',
      waitFlags: 0,
      fade: {
        type: 0,
        length: 0,
        dealy: 0,
        color: {r:0, g:0, b:0}
      }
    };

    if(typeof struct.Listener !== 'undefined')
      node.listenerTag = struct.Listener.value;

    if(typeof struct.Speaker !== 'undefined')
      node.speakerTag = struct.Speaker.value;

    if(typeof struct.VO_ResRef !== 'undefined')
      node.vo_resref = struct.VO_ResRef.value;

    if(typeof struct.Sound !== 'undefined')
      node.sound = struct.Sound.value;

    if(typeof struct.CameraID !== 'undefined')
      node.cameraID = struct.CameraID.value;

    if(typeof struct.CameraAnimation !== 'undefined')
      node.cameraAnimation = struct.CameraAnimation.value;

    if(typeof struct.CameraAngle !== 'undefined')
      node.cameraAngle = struct.CameraAngle.value;

    if(typeof struct.Script !== 'undefined')
      node.script = struct.Script.value;

    if(typeof struct.Script2 !== 'undefined'){
      node.script2 = struct.Script2.value;

      //k2 MODE
      node.scriptParams = {
        Param1: struct.ActionParam1.value,
        Param2: struct.ActionParam2.value,
        Param3: struct.ActionParam3.value,
        Param4: struct.ActionParam4.value,
        Param5: struct.ActionParam5.value,
        String: struct.ActionParamStrA.value
      };

      node.script2Params = {
        Param1: struct.ActionParam1b.value,
        Param2: struct.ActionParam2b.value,
        Param3: struct.ActionParam3b.value,
        Param4: struct.ActionParam4b.value,
        Param5: struct.ActionParam5b.value,
        String: struct.ActionParamStrB.value
      };

    }

    if(typeof struct.CamFieldOfView !== 'undefined')
      node.camFieldOfView = struct.CamFieldOfView.value;

    if(typeof struct.RepliesList !== 'undefined'){
      for(let i = 0; i < struct.RepliesList.structs.length; i++){
        let _node = struct.RepliesList.structs[i].fields;

        node.replies.push({
          isActive: _node.Active.value, //Node conditional script
          isActive2: _node.Active2.value, //Node conditional script
          isActiveParams: {
            Not: _node.Not.value,
            Param1: _node.Param1.value,
            Param2: _node.Param2.value,
            Param3: _node.Param3.value,
            Param4: _node.Param4.value,
            Param5: _node.Param5.value,
            String: _node.ParamStrA.value
          },
          isActive2Params: {
            Not: _node.Not2.value,
            Param1: _node.Param1b.value,
            Param2: _node.Param2b.value,
            Param3: _node.Param3b.value,
            Param4: _node.Param4b.value,
            Param5: _node.Param5b.value,
            String: _node.ParamStrB.value
          },
          Logic: _node.Logic.value,
          index: _node.Index.value,
          isChild: _node.IsChild.value
        });

      }
    }

    if(typeof struct.AnimList !== 'undefined'){
      for(let i = 0; i < struct.AnimList.structs.length; i++){
        let _node = struct.AnimList.structs[i].fields;
        node.animations.push({
          animation: _node.Animation.value,
          participant: _node.Participant.value.toLowerCase()
        });
      }
    }

    if(typeof struct.Text !== 'undefined')
      node.text = struct.Text.value.GetValue();

    if(typeof struct.Delay !== 'undefined')
      node.delay = (struct.Delay.value == 4294967295 ? -1 : struct.Delay.value);

    if(typeof struct.FadeType !== 'undefined')
      node.fade.type = struct.FadeType.value;

    if(typeof struct.FadeLength !== 'undefined')
      node.fade.length = struct.FadeLength.value;

    if(typeof struct.FadeDelay !== 'undefined')
      node.fade.delay = struct.FadeDelay.value;

    return node;

  }

  _parseReplyStruct(struct){

    let node = {
      animations: [],
      cameraAngle: 0,
      cameraID: 0,
      comment: '',
      delay: 0,
      fadeType: 0,
      listenerTag: '',
      plotIndex: -1,
      plotXPPercentage: 1,
      quest: '',
      entries: [],
      script: '',
      sound: '',
      soundExists: 0,
      speakerTag: '',
      text: '',
      vo_resref: '',
      waitFlags: 0,
      fade: {
        type: 0,
        length: 0,
        dealy: 0,
        color: {r:0, g:0, b:0}
      }
    };

    if(typeof struct.Listener !== 'undefined')
      node.listenerTag = struct.Listener.value;

    if(typeof struct.Speaker !== 'undefined')
      node.speakerTag = struct.Speaker.value;

    if(typeof struct.Script !== 'undefined')
      node.script = struct.Script.value;

    if(typeof struct.Script2 !== 'undefined'){
      node.script2 = struct.Script2.value;

      //k2 MODE
      node.scriptParams = {
        Param1: struct.ActionParam1.value,
        Param2: struct.ActionParam2.value,
        Param3: struct.ActionParam3.value,
        Param4: struct.ActionParam4.value,
        Param5: struct.ActionParam5.value,
        String: struct.ActionParamStrA.value
      };

      node.script2Params = {
        Param1: struct.ActionParam1b.value,
        Param2: struct.ActionParam2b.value,
        Param3: struct.ActionParam3b.value,
        Param4: struct.ActionParam4b.value,
        Param5: struct.ActionParam5b.value,
        String: struct.ActionParamStrB.value
      };

    }

    if(typeof struct.EntriesList !== 'undefined'){
      for(let i = 0; i < struct.EntriesList.structs.length; i++){
        let _node = struct.EntriesList.structs[i].fields;

        node.entries.push({
          isActive: _node.Active.value, //Node conditional script
          isActive2: _node.Active2.value, //Node conditional script
          isActiveParams: {
            Not: _node.Not.value,
            Param1: _node.Param1.value,
            Param2: _node.Param2.value,
            Param3: _node.Param3.value,
            Param4: _node.Param4.value,
            Param5: _node.Param5.value,
            String: _node.ParamStrA.value
          },
          isActive2Params: {
            Not: _node.Not2.value,
            Param1: _node.Param1b.value,
            Param2: _node.Param2b.value,
            Param3: _node.Param3b.value,
            Param4: _node.Param4b.value,
            Param5: _node.Param5b.value,
            String: _node.ParamStrB.value
          },
          Logic: _node.Logic.value,
          index: _node.Index.value,
          isChild: _node.IsChild.value
        });

      }
    }

    if(typeof struct.CameraID !== 'undefined')
      node.cameraID = struct.CameraID.value;

    if(typeof struct.CameraAngle !== 'undefined')
      node.cameraAngle = struct.CameraAngle.value;

    if(typeof struct.Text !== 'undefined')
      node.text = struct.Text.value.GetValue();

    if(typeof struct.Delay !== 'undefined')
      node.delay = (struct.Delay.value == 4294967295 ? -1 : struct.Delay.value);

    if(typeof struct.FadeType !== 'undefined')
      node.fade.type = struct.FadeType.value;

    if(typeof struct.FadeLength !== 'undefined')
      node.fade.length = struct.FadeLength.value;

    if(typeof struct.FadeDelay !== 'undefined')
      node.fade.delay = struct.FadeDelay.value;

    return node;

  }

}

module.exports = MenuDialog;