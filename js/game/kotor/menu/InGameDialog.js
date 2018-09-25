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
      name: 'dialog',
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

    this.state = -1;

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
      this.audioEmitter = new AudioEmitter({
        engine: Game.audioEngine,
        channel: AudioEngine.CHANNEL.VO,
        props: {
          XPosition: 0,
          YPosition: 0,
          ZPosition: 0
        },
        template: {
          sounds: [],//this.gff.GetFieldByLabel('Sounds').GetChildStructs(),
          isActive: true,
          isLooping: false,
          isRandom: false,
          isRandomPosition: false,
          interval: 0,
          intervalVariation: 0,
          maxDistance: 50,
          volume: 100,
          positional: 0
        },
        onLoad: () => {
        },
        onError: () => {
        }
      });
      Game.audioEngine.AddEmitter(this.audioEmitter);
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

    if(Game.Mode == Game.MODES.INGAME){
      Game.InGameOverlay.Hide();
    }

    if(typeof dlg != 'string' || dlg == ''){
      dlg = this.owner.GetConversation();
    }

    Game.currentCamera = Game.camera_dialog;
    this.UpdateCamera();
    if(typeof dlg === 'string' && dlg != ''){
      this.LoadDialog(dlg, (gff) => {
        console.log(gff.json);

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

        this.canLetterbox = true;

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

        for(let i = 0; i < gff.json.fields.StuntList.structs.length; i++){
          let stnt = gff.json.fields.StuntList.structs[i].fields;
          this.stuntActors.push({
            participant: stnt.Participant.value,
            model: stnt.StuntModel.value
          });
        }

        for(let i = 0; i < gff.json.fields.StartingList.structs.length; i++){
          let _node = gff.json.fields.StartingList.structs[i].fields;

          let node = {
            isActive: _node.Active.value,
            index: _node.Index.value
          };

          this.startingList.push(node);
        }

        this.isListening = true;
        this.updateTextPosition();

        //Face the listener towards the owner of the conversation
        if(!this.isAnimatedCutscene){
          if(this.listener instanceof ModuleCreature && this.owner instanceof ModuleObject){
            if(!this.listener.lockDialogOrientation){
              this.listener.rotation.z = Math.atan2(
                this.listener.position.y - this.owner.position.y,
                this.listener.position.x - this.owner.position.x
              ) + Math.PI/2;
            }
          }

          if(this.owner instanceof ModuleCreature && this.listener instanceof ModuleObject){
            if(!this.owner.lockDialogOrientation){
              this.owner.rotation.z = Math.atan2(
                this.owner.position.y - this.listener.position.y,
                this.owner.position.x - this.listener.position.x
              ) + Math.PI/2;
            }
          }
        }

        let canStart = () => {
          if(this.letterBoxed){
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
      Game.ModelLoader.load({
        file: this.cameraModel,
        onLoad: (model) => {
          THREE.AuroraModel.FromMDL(model, { 
            onComplete: (model) => {
              this.animatedCamera = model;
              this.animatedCamera.bonesInitialized = true;
              if(typeof onLoad === 'function')
                onLoad();
            }
          });
        }
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
        model = Game.player.model;
        //Load the actor's supermodel
        Game.ModelLoader.load({
          file: actor.model,
          onLoad: (actorModel) => {
            THREE.AuroraModel.FromMDL(actorModel, { 
              onComplete: (actorSuperModel) => {
                Game.player.model.animations = Game.player.model.animations.concat(actorSuperModel.animations);
                console.log('actor', actorSuperModel.animations)
                Game.player.anim = true;

                if(this.unequipItems)
                  Game.player.UnequipItems();

                if(this.unequipHeadItem)
                  Game.player.UnequipHeadItem();
    
                this.stunt[actor.participant.toLowerCase()] = Game.player;
                console.log('STUNT', actor.participant, this.stunt[actor.participant]);
                this.loadStuntActors(++i, onLoad);
              }
            });
          }
        });
      }else{
        let creature = Game.GetObjectByTag(actor.participant);
        if(creature){
          model = creature.model;
          //Load the actor's supermodel
          Game.ModelLoader.load({
            file: actor.model,
            onLoad: (actorModel) => {
              THREE.AuroraModel.FromMDL(actorModel, { 
                onComplete: (actorSuperModel) => {
                  model.animations = actorSuperModel.animations;
                  console.log('actor', actorSuperModel.animations)
                  model.rotation.z = 0;
                  model.box = new THREE.Box3().setFromObject(model);

                  creature.anim = true;

                  if(this.unequipItems)
                    creature.UnequipItems();

                  if(this.unequipHeadItem)
                    creature.UnequipHeadItem();
      
                  this.stunt[actor.participant.toLowerCase()] = creature;
                  console.log('STUNT', this.stunt[actor.participant.toLowerCase()]);
                  this.loadStuntActors(++i, onLoad);
                }
              });
            }
          });
        }
      }
    }else{
      if(typeof onLoad == 'function')
        onLoad();
    }

  }

  getNextEntry(entries = []){
    console.log('getNextEntry', entries);
    if(!entries.length){
      this.EndConversation();
      return;
    }

    this.isListening = true;
    this.updateTextPosition();

    

    let totalEntries = entries.length;

    let entryLoop = (idx = 0) => {
      if(idx < totalEntries){
        let entry = entries[idx];
        if(entry.isActive == ''){
          this.showEntry(this.entryList[entry.index]);
        }else{
          ResourceLoader.loadResource(ResourceTypes['ncs'], entry.isActive, (buffer) => {
            let script = new NWScript(buffer);
            console.log('dialog', script);
            script.name = entry.isActive;
            console.log(this.owner);
            script.run(Game.player, 0, (bSuccess) => {
              console.log('dialog', script, bSuccess);
              this.listener = Game.player;
              if(bSuccess){
                this.showEntry(this.entryList[entry.index]);
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

  isContinueDialog(node){
    let returnValue = null;
    if(typeof node.entries !== 'undefined'){
      returnValue = node.text == '' && node.entries.length;
    }else if(typeof node.replies !== 'undefined'){
      returnValue = node.text == '' && node.replies.length;
    }else{
      returnValue = node.text == '';
    }
    console.log('isContinueDialog', node, returnValue);
    return returnValue;
  }

  isEndDialog(node){
    let returnValue = null;
    if(typeof node.entries !== 'undefined'){
      returnValue = node.text == '' && !node.entries.length;
    }else if(typeof node.replies !== 'undefined'){
      returnValue = node.text == '' && !node.replies.length;
    }else{
      returnValue = node.text == '';
    }
    console.log('isEndDialog', node, returnValue);
    return returnValue;
  }

  PlayerSkipEntry(entry = null){
    if(entry != null){
      clearTimeout(entry.timeout);
      this.audioEmitter.Stop();
      this.showReplies(entry);
    }
  }

  showEntry(entry){
    console.log('showEntry', entry);
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

      alreadyAllowed: false,

      isComplete: function(){
        console.log('checkList', this);

        if(this.alreadyAllowed){
          return false;
        }

        if(Game.InGameDialog.isAnimatedCutscene){
          if(this.cameraAnimationComplete){
            this.alreadyAllowed = true;
            return true;
          }
        }else{
          if(this.voiceOverComplete){
            this.alreadyAllowed = true;
            return true;
          }
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

    if(this.isAnimatedCutscene && (entry.cameraAngle == 4 || this.cameraModel)){
      //Animated camera
      if(entry.cameraAnimation > -1){
        checkList.cameraAnimationComplete = false;
        this.SetAnimatedCamera(entry.cameraAnimation, () => {
          checkList.cameraAnimationComplete = true;
          if(checkList.isComplete()){
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
        script.name = entry.script;
        script.run(this.owner);
      });
    }

    if(entry.fade.type == 3){
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
          if(checkList.isComplete()){
            this.showReplies(entry);
          }
        });
      }else if(entry.vo_resref != ''){
        this.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
          checkList.voiceOverComplete = true;
          if(checkList.isComplete()){
            this.showReplies(entry);
          }
        });
      }else{
        console.error('VO ERROR', entry);
        setTimeout( () => {
          checkList.voiceOverComplete = true;
          if(checkList.isComplete()){
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

  showReplies(entry){

    console.log('showReplies', entry);
    if(entry.replies.length == 1 && this.isContinueDialog(this.replyList[entry.replies[0].index])){
      let reply = this.replyList[entry.replies[0].index];
      console.log('We seem to have found a dialog continue entry we are going to attempt to auto pick and continue', reply);
      if(reply.script == ''){
        let _reply = this.replyList[reply.index];
        console.log('showEntry.replies', _reply);
        this.getNextEntry(reply.entries);
      }else{
        ResourceLoader.loadResource(ResourceTypes['ncs'], reply.script, (buffer) => {
          if(buffer.length){
            let script = new NWScript(buffer);
            console.log('dialog', script);
            script.name = entry.script;
            console.log(this.owner);
            script.run(this.owner, 0, (bSuccess) => {
              console.log('dialog', script, bSuccess);
              if(bSuccess){
                let _reply = this.replyList[reply.index];
                console.log('showEntry.replies', _reply);
              }
              this.getNextEntry(reply.entries);
            })
          }else{
            this.getNextEntry(reply.entries);
          }
        }, () => {
          this.getNextEntry(reply.entries);
        });
      }

      //Return so none of the node specific code runs
      return;
    }else if(entry.replies.length == 1 && this.isEndDialog(this.replyList[entry.replies[0].index])){
      let reply = this.replyList[entry.replies[0].index];
      console.log('We seem to have found a dialog end entry we are going to attempt to end', reply);
      if(reply.script == ''){
        let _reply = this.replyList[reply.index];
        console.log('showEntry.replies', _reply);
        this.EndConversation();
      }else{
        ResourceLoader.loadResource(ResourceTypes['ncs'], reply.script, (buffer) => {
          if(buffer.length){
            let script = new NWScript(buffer);
            console.log('dialog', script);
            script.name = entry.script;
            console.log(this.owner);
            script.run(this.owner, 0, (bSuccess) => {
              console.log('dialog', script, bSuccess);
              if(bSuccess){
                let _reply = this.replyList[reply.index];
                console.log('showEntry.replies', _reply);
              }
              this.EndConversation();
            })
          }else{
            this.EndConversation();
          }
        }, () => {
          this.EndConversation();
        });
      }
      //Return so none of the node specific code runs
      return;
    }else if(!entry.replies.length){
      console.log('No more replies and can\'t continue');
      this.EndConversation();
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
    this.UpdateCamera();

    this.state = 1;

  }

  GetAvailableReplies(entry){
    let totalReplies = entry.replies.length;
    console.log('GetAvailableReplies', entry);
    let replyLoop = (idx = 0) => {
      if(idx < totalReplies){
        console.log('replyLoop', entry.replies[idx], idx, idx < totalReplies);
        let reply = entry.replies[idx];
        if(reply.isActive == ''){
          let _reply = this.replyList[reply.index];
          console.log('showEntry.replies', _reply);
          this.LB_REPLIES.addItem(this.LB_REPLIES.children.length+1+'. '+_reply.text.split('##')[0], () => {
            this.onReplySelect(_reply);
          });
          replyLoop(++idx);
        }else{
          ResourceLoader.loadResource(ResourceTypes['ncs'], reply.isActive, (buffer) => {
            if(buffer.length){
              let script = new NWScript(buffer);
              console.log('dialog', script);
              script.name = entry.isActive;
              console.log(this.owner);
              script.run(this.listener, 0, (bSuccess) => {
                console.log('dialog', script, bSuccess);
                if(bSuccess){
                  let _reply = this.replyList[reply.index];
                  console.log('showEntry.replies', _reply);
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

    if(reply.script != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], reply.script, (buffer) => {
        if(buffer.length){
          let script = new NWScript(buffer);
          console.log('dialog.reply', script);
          script.name = reply.script;
          console.log(this.owner);
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

  }

  OnBeforeConversationEnd( onEnd = null ){

    if(this.onEndConversation != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], this.onEndConversation, (buffer) => {
        if(this.buffer.length){
          let script = new NWScript(buffer);
          console.log('dialog.OnEndScript', script);
          script.name = entry.isActive;
          console.log(this.owner);
          script.run(this.owner, 0, (bSuccess) => {
            console.log('dialog', script, bSuccess);
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
    console.log('EndConversation')
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
              console.log('dialog.OnEndScript', script);
              script.name = this.onEndConversation;
              console.log(this.owner);
              script.run(this.owner, 0, (bSuccess) => {
                console.log('dialog.OnEndScript', script, bSuccess);
              })
            }
          });
        }
      }else{
        if(this.onEndConversationAbort != ''){
          ResourceLoader.loadResource(ResourceTypes['ncs'], this.onEndConversationAbort, (buffer) => {
            if(buffer.length){
              let script = new NWScript(buffer);
              console.log('dialog.OnEndScript', script);
              script.name = this.onEndConversationAbort;
              console.log(this.owner);
              script.run(this.owner, 0, (bSuccess) => {
                console.log('dialog.OnEndScript', script, bSuccess);
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
    if(this.isAnimatedCutscene){
      for(let i = 0; i < entry.animations.length; i++){
        let participant = entry.animations[i];
        if(this.stunt[participant.participant]){
          console.log('STUNT', this.stunt[participant.participant], participant.animation-1200, this.GetActorAnimation(participant.animation));
          this.stunt[participant.participant].model.playAnimation(this.GetActorAnimation(participant.animation), false);
        }else{
          let actor = Game.GetObjectByTag(participant.participant);
          if(actor && participant.animation >= 10000){
            let anim = this.GetDialogAnimation(participant.animation-10000);
            console.log('DialogAnim', participant.animation-10000, anim)
            if(anim){
              actor.anim = true;
              actor.model.playAnimation(anim.name, anim.looping  == '1');
            }else{
              console.error('Anim', participant.animation-10000)
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
          console.log('DialogAnim', participant.animation-10000, anim)
          if(anim){
            actor.anim = true;
            actor.model.playAnimation(anim.name, anim.looping  == '1');
          }else{
            console.error('Anim', participant.animation-10000)
          }
        }
      }
    }
  }

  GetActorAnimation(index = 0){
    return "CUT"+("000" + (index-1200 +1)).slice(-3)+"W";
  }

  GetDialogAnimation(index = 0){
    switch(index){
      case 30: //Listen
        return Global.kotor2DA.animations.rows[18];
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
      //Game.currentCamera = Game.camera_animated;
      //this.animatedCamera.pose();
      //this.animatedCamera.currentAnimation = undefined;
      console.log('animatedCamera', this.GetActorAnimation(nCamera), 'Begin');
      //this.animatedCamera.poseAnimation(GetActorAnimation(nCamera));
      this.animatedCamera.playAnimation(this.GetActorAnimation(nCamera), false, () => {
        console.log('animatedCamera', this.GetActorAnimation(nCamera), 'End');
        process.nextTick( () => {
          if(typeof onComplete === 'function')
            onComplete();
        });
      });

      return
    }
  }

  UpdateCamera(){

    if(this.isAnimatedCutscene && this.animatedCamera instanceof THREE.AuroraModel){
      Game.currentCamera = Game.camera_animated;
      return;
    }

    if(this.isListening){
      //Show the speaker

      if(this.currentEntry){
        if(this.currentEntry.cameraAngle == 4 && this.animatedCamera instanceof THREE.AuroraModel){
          this.SetAnimatedCamera(this.currentEntry.cameraAnimation);
          Game.currentCamera = Game.camera_animated;
        }else{
          let position = this.currentEntry.speaker.position.clone().sub(
            new THREE.Vector3(
              1*Math.cos(this.currentEntry.speaker.rotation.z - Math.PI/1.5), 
              1*Math.sin(this.currentEntry.speaker.rotation.z - Math.PI/1.5), 
              -1.75
            )
          );
  
          Game.camera_dialog.position.set(position.x, position.y, position.z);
          Game.camera_dialog.lookAt(this.currentEntry.speaker.position.clone().add({x:0, y:0, z: 1.5}));
        }
      }else{
        let position = this.listener.position.clone().sub(
          new THREE.Vector3(
            -1.5*Math.cos(this.listener.rotation.z - Math.PI/4), 
            -1.5*Math.sin(this.listener.rotation.z - Math.PI/4), 
            -1.75
          )
        );
  
        Game.camera_dialog.position.set(position.x, position.y, position.z)
        Game.camera_dialog.lookAt(this.owner.position.clone().add({x:0, y:0, z: 1.5}));  
      }

    }else{
      //Show the listener
      let position = this.listener.position.clone().sub(
        new THREE.Vector3(
          0.5*Math.cos(this.listener.rotation.z - (Math.PI/4)*2), 
          0.5*Math.sin(this.listener.rotation.z - (Math.PI/4)*2), 
          -1.75
        )
      );
      Game.camera_dialog.position.set(position.x, position.y, position.z);
      Game.camera_dialog.lookAt(this.listener.position.clone().add({x:0, y:0, z: 1.6}));

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

    if(this.isAnimatedCutscene){

      if(this.animatedCamera instanceof THREE.AuroraModel){
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

    }else{
      if(this.animatedCamera instanceof THREE.AuroraModel){
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
        Game.camera_animated.updateProjectionMatrix();
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

    if(typeof struct.CamFieldOfView !== 'undefined')
      node.camFieldOfView = struct.CamFieldOfView.value;

    if(typeof struct.RepliesList !== 'undefined'){
      for(let i = 0; i < struct.RepliesList.structs.length; i++){
        let _node = struct.RepliesList.structs[i].fields;

        node.replies.push({
          isActive: _node.Active.value, //Node conditional script
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

    if(typeof struct.EntriesList !== 'undefined'){
      for(let i = 0; i < struct.EntriesList.structs.length; i++){
        let _node = struct.EntriesList.structs[i].fields;

        node.entries.push({
          isActive: _node.Active.value, //Node conditional script
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