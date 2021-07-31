/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuDialog menu class.
 */

class MenuDialog extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.state = -1;

    this.isSkippable = false;
    this.unequipHeadItem = false;
    this.unequipItems = false;

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
        this.LB_REPLIES.padding = 5;

        this.barHeight = 100;

        let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
        let material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
        this.topBar = new THREE.Mesh( geometry, material );
        this.bottomBar = new THREE.Mesh( geometry, material );

        this._resetLetterBox();

        this.tGuiPanel.widget.add(this.topBar);
        this.tGuiPanel.widget.add(this.bottomBar);

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    });

  }

  Hide(){
    super.Hide();
    Game.currentCamera = Game.camera;
  }

  getCurrentListener(){
    if(this.currentEntry){
      return this.currentEntry.listener
    }
    return this.listener;
  }

  getCurrentOwner(){
    if(this.currentEntry){
      return this.currentEntry.owner
    }
    return this.owner;
  }

  StartConversation(dlg, owner, listener = Game.player, options = {}){

    options = Object.assign({
      onLoad: null
    }, options);

    //I think the player is always the one that the conversation owner is talking to.
    this.LBL_MESSAGE.setText(' ');
    this.LB_REPLIES.clearItems();
    this.Open();
    this.nodeIndex = 0;

    this.owner = owner;
    this.listener = listener;
    this.paused = false;
    this.ended = false;
    this.currentEntry = null;
    this.state = -1;

    if(this.owner == Game.player){
      let old_listener = this.listener;
      this.listener = this.owner;
      this.owner = old_listener;
    }

    this.unequipHeadItem = false;
    this.unequipItems = false;

    Game.inDialog = true;
    
    this.isListening = true;
    
    this.canLetterbox = false;
    this.letterBoxed = false;
    this.topBar.position.y = (window.innerHeight / 2) + (100 / 2);
    this.bottomBar.position.y = -this.topBar.position.y;
    this._resetLetterBox();

    this.LB_REPLIES.hide();

    if(typeof dlg != 'string' || dlg == ''){
      dlg = this.owner.GetConversation();
    }

    if(typeof dlg === 'string' && dlg != ''){
      this.LoadDialog(dlg, (gff) => {
        this.UpdateCamera();

        this.isListening = true;
        this.updateTextPosition();

        this.startingEntry = null;
        this.getNextEntry(this.dialog.startingList, async (entry) => {
          this.startingEntry = entry;
          let isBarkDialog = ( entry.replies.length == 1 && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index)) );
          if(isBarkDialog){ //Bark
            this.EndConversation();
            Game.InGameBark.bark( entry );
            entry.runScripts();
            let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
            if(reply){
              reply.runScripts();
            }
          }else{ //Conversation
            if(this.startingEntry.cameraAngle == 6){
              //Placeable camera
              this.SetPlaceableCamera(this.startingEntry.cameraAnimation > -1 ? this.startingEntry.cameraAnimation : this.startingEntry.cameraID, this.startingEntry.cameraAngle);
            }else{
              Game.currentCamera = Game.camera_dialog;
              this.UpdateCamera();
            }

            this.canLetterbox = true;
            if(this.dialog.isAnimatedCutscene){
              Game.holdWorldFadeInForDialog = true;
              this.dialog.loadStuntCamera().then( () => {
                this.dialog.loadStuntActors().then( () => {
                  this.beginDialog();
                });
              });
            }else{
              Game.holdWorldFadeInForDialog = false;
              this.dialog.loadStuntCamera().then( () => {
                this.dialog.loadStuntActors().then( () => {
                  this.beginDialog();
                });
              });
            }
          }
        });

        if(typeof options.onLoad === 'function')
          options.onLoad();

      });
    }else{
      if(typeof options.onLoad === 'function')
        options.onLoad();
      
      this.EndConversation();
    }

  }

  beginDialog(){
    if(this.dialog.ambientTrack != ''){
      AudioLoader.LoadMusic(this.dialog.ambientTrack, (data) => {
        Game.audioEngine.stopBackgroundMusic();
        Game.audioEngine.SetDialogBackgroundMusic(data);
        this.showEntry(this.startingEntry);
      }, () => {
        this.showEntry(this.startingEntry);
      });
    }else{
      this.showEntry(this.startingEntry);
    }
  }

  async getNextEntry(entryLinks = [], callback = null){
    console.log('getNextEntry', entryLinks);
    if(!entryLinks.length){
      this.EndConversation();
      return;
    }

    this.isListening = true;
    this.updateTextPosition();

    let entryIndex = await this.dialog.getNextEntryIndex(entryLinks);
    let entry = this.dialog.getEntryByIndex( entryIndex );
    if(entry){
      if(typeof callback === 'function'){
        callback(entry);
      }else{
        this.showEntry(entry);
      }
    }else{
      this.EndConversation();
      return;
    }
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
    //console.log('isContinueDialog', node, returnValue);
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

  PlayerSkipEntry(){
    if(this.currentEntry != null){
      this.currentEntry.checkList.isSkipped = true;
      clearTimeout(this.currentEntry.timeout);
      //console.log('PlayerSkipEntry', entry.checkList);
      this.UpdateCamera();
      this.audioEmitter.Stop();
      this.showReplies(this.currentEntry);
    }
  }

  async showEntry( entry ){

    this.state = 0;
    entry.initProperties();
    //this.owner = entry.owner;
    //this.listener = entry.listener;

    if(!Game.inDialog)
      return;

    Game.VideoEffect = entry.videoEffect == -1 ? null : entry.videoEffect;

    this.LBL_MESSAGE.setText(entry.getCompiledString(), entry);
    this.LB_REPLIES.hide();
    this.LB_REPLIES.clearItems();
    this.updateTextPosition();
    
    this.currentEntry = entry;
    clearTimeout(entry.timeout);
    entry.timeout = null;

    this.UpdateEntryAnimations(entry);

    if(!this.dialog.isAnimatedCutscene){
      if(this.currentEntry.listener instanceof ModuleObject && this.currentEntry.speaker instanceof ModuleObject){
        if(!this.currentEntry.listener.lockDialogOrientation && this.currentEntry.listener instanceof ModuleCreature){
          this.currentEntry.listener.FacePoint(this.currentEntry.speaker.position);
        }

        if(!this.currentEntry.speaker.lockDialogOrientation && this.currentEntry.speaker instanceof ModuleCreature){
          this.currentEntry.speaker.FacePoint(this.currentEntry.listener.position);
        }
      }
    }

    entry.checkList = {
      isSkipped: false,
      cameraAnimationComplete: Game.InGameDialog.dialog.isAnimatedCutscene ? false : true,
      voiceOverComplete: false,
      alreadyAllowed: false,
      isComplete: function(){

        if(this.alreadyAllowed || this.isSkipped){
          return false;
        }

        if(Game.InGameDialog.dialog.isAnimatedCutscene){
          if(this.cameraAnimationComplete){
            this.alreadyAllowed = true;
            if(Game.InGameDialog.paused){
              return false
            }else{
              return true;
            }
          }
        }else{
          if(this.voiceOverComplete){
            this.alreadyAllowed = true;
            if(Game.InGameDialog.paused){
              return false
            }else{
              return true;
            }
          }
        }

      }

    };

    let nodeDelay = 3000;
    if(!this.dialog.isAnimatedCutscene && entry.delay > -1){
      nodeDelay = entry.delay * 1000;
    }

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

    if(this.dialog.isAnimatedCutscene && (entry.cameraAngle == 4 || this.dialog.cameraModel)){
      //Animated camera
      if(entry.cameraAnimation > -1){
        entry.checkList.cameraAnimationComplete = false;
        this.SetAnimatedCamera(entry.cameraAnimation, () => {
          entry.checkList.cameraAnimationComplete = true;
          if(entry.checkList.isComplete()){
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

    if(entry.fade.type == 3){
      setTimeout( () => {
        Game.FadeOverlay.FadeIn(entry.fade.length, 0, 0, 0);
      }, entry.fade.delay * 1000);
    }else if(entry.fade.type == 4){
      setTimeout( () => {
        Game.FadeOverlay.FadeOut(entry.fade.length, 0, 0, 0);
      }, entry.fade.delay * 1000);
    }

    entry.runScripts();

    if(entry.sound != ''){
      //console.log('lip', entry.sound);
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.sound, (buffer) => {
        if(entry.speaker instanceof ModuleCreature){
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      this.audioEmitter.PlayStreamWave(entry.sound, null, (error = false) => {
        entry.checkList.voiceOverComplete = true;
        if(entry.checkList.isComplete()){
          this.showReplies(entry);
        }
      });
    }else if(entry.vo_resref != ''){
      //console.log('lip', entry.vo_resref);
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.vo_resref, (buffer) => {
        if(entry.speaker instanceof ModuleCreature){
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      this.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
        entry.checkList.voiceOverComplete = true;
        if(entry.checkList.isComplete()){
          this.showReplies(entry);
        }
      });
    }else{
      console.error('VO ERROR', entry);
      entry.timeout = setTimeout( () => {
        entry.checkList.voiceOverComplete = true;
        if(entry.checkList.isComplete()){
          this.showReplies(entry);
        }
      }, nodeDelay);
    }
    
  }

  async GetAvailableReplies(entry){
    let replyLinks = await entry.getActiveReplies();
    for(let i = 0; i < replyLinks.length; i++){
      let reply = this.dialog.getReplyByIndex(replyLinks[i]);
      if(reply){
        this.LB_REPLIES.addItem(this.LB_REPLIES.children.length+1+'. '+reply.getCompiledString(), (e) => {
          this.onReplySelect(reply);
        });
      }else{
        console.warn('GetAvailableReplies() Failed to find reply at index: '+replyLinks[i]);
      }
    }

    //Update the replies list GUI element
    this.LB_REPLIES.updateList();
  }

  async onReplySelect(reply = null){

    if(reply){
      reply.runScripts();
      this.getNextEntry(reply.entries);
    }else{
      //If we are here something went wrong
      this.EndConversation();
    }

  }

  async showReplies( entry ){

    this.state = 1;

    if(!Game.inDialog)
      return;

    this.currentEntry = null;

    let isContinueDialog = (entry.replies.length == 1 && this.isContinueDialog(this.dialog.getReplyByIndex(entry.replies[0].index)));
    let isEndDialog = (entry.replies.length == 1 && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index)));

    console.log('showReplies', entry, isContinueDialog, isEndDialog);
    if(isContinueDialog){
      //console.log('We seem to have found a dialog continue entry we are going to attempt to auto pick and continue', reply);
      let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
      if(reply){
        reply.runScripts();
        this.getNextEntry(reply.entries);
      }else{
        //If this happens something went wrong
        this.EndConversation();
      }

      //Return so none of the node specific code runs
      return;
    }else if(isEndDialog){
      //console.log('We seem to have found a dialog end entry we are going to attempt to end', reply);
      let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
      if(reply){
        reply.runScripts();
      }
      this.EndConversation();
      //Return so none of the node specific code runs
      return;
    }else if(!entry.replies.length){
      //console.log('No more replies and can\'t continue');
      this.EndConversation();
      return;
    }

    try{
      this.getCurrentOwner().dialogPlayAnimation('listen', true);
    }catch(e){}
    
    try{
      this.getCurrentListener().dialogPlayAnimation('listen', true);
    }catch(e){}

    this.isListening = false;
    this.updateTextPosition();
    this.LB_REPLIES.show();
    this.LB_REPLIES.updateList();
    this.UpdateCamera();

    this.state = 1;

  }

  LoadDialog(resref = '', onLoad = null){

    this.conversation_name = resref;
    this.dialog = new DLGObject(resref);
    this.dialog.owner    = this.owner;
    this.dialog.listener = this.listener;
    this.dialog.load().then( () => {
      switch(this.dialog.getConversationType()){
        //COMPUTER
        case DLGObject.ConversationType.COMPUTER:
          this.Close();
          Game.InGameComputer.StartConversation(this.dialog.gff, this.owner, this.listener);
        break;

        //CONVERSATION
        case DLGObject.ConversationType.CONVERSATION:
        default:
          if(typeof onLoad === 'function')
            onLoad(this.dialog.gff);
        break;
      }
    }).catch( () => {
      this.EndConversation();
      console.error('InGameDialog.LoadDialog() Failed to load conversation resref: '+resref);
    });

  }

  async OnBeforeConversationEnd( onEnd = null ){
    if(this.dialog.onEndConversation != ''){
      let script = await NWScript.Load(this.dialog.onEndConversation);
      if(script instanceof NWScriptInstance){
        //console.log('dialog.onEndScript', script);
        script.name = this.dialog.onEndConversation;
        //console.log(this.owner);
        script.run(this.getCurrentOwner(), 0, (bSuccess) => {
          //console.log('dialog', script, bSuccess);
          if(typeof onEnd === 'function')
            onEnd();
        })
      }else{
        if(typeof onEnd === 'function')
          onEnd();
      }
    }
  }

  EndConversation(aborted = false){
    //console.log('EndConversation')

    if(this.paused){
      this.ended = true;
      //return;
    }
    
    this.audioEmitter.Stop();
    //this.Hide();
    this.Close();
    Game.currentCamera = Game.camera;
    Game.inDialog = false;
    //if(Game.Mode == Game.MODES.INGAME){
    //  Game.InGameOverlay.Show();
    //}


    this.state = -1;

    if(this.dialog.animatedCamera instanceof THREE.AuroraModel)
      this.dialog.animatedCamera.animationManager.currentAnimation = undefined;

    process.nextTick( async () => {

      if(!aborted){
        if(this.dialog.onEndConversation != ''){
          let script = await NWScript.Load(this.dialog.onEndConversation);
          if(script instanceof NWScriptInstance){
            //console.log('dialog.onEndScript', script);
            script.name = this.dialog.onEndConversation;
            //console.log(this.getCurrentOwner());
            script.run(this.getCurrentOwner(), 0, (bSuccess) => {
              //console.log('dialog.onEndScript', script, bSuccess);
            })
          }
        }
      }else{
        if(this.dialog.onEndConversationAbort != ''){
          let script = await NWScript.Load(this.dialog.onEndConversationAbort);
          if(script instanceof NWScriptInstance){
            //console.log('dialog.onEndScript', script);
            script.name = this.dialog.onEndConversationAbort;
            //console.log(this.getCurrentOwner());
            script.run(this.getCurrentOwner(), 0, (bSuccess) => {
              //console.log('dialog.onEndScript', script, bSuccess);
            })
          }
        }
      }
    });

    //Clear cutscene actors
    while (Game.group.stunt.children.length){
      Game.group.stunt.remove(Game.group.stunt.children[0]);
    }

    for(let actor in this.dialog.stunt){
      try{
        //this.dialog.stunt[actor].model.buildSkeleton();
        if(this.dialog.stunt[actor].model.skins){
          for(let i = 0; i < this.dialog.stunt[actor].model.skins.length; i++){
            this.dialog.stunt[actor].model.skins[i].frustumCulled = true;
          }
        }
        this.dialog.stunt[actor].clearAllActions();
      }catch(e){
        
      }
    }

    this.dialog.stunt = {};

  }

  PauseConversation(){
    this.paused = true;
  }

  ResumeConversation(){
    this.paused = false;
    if(this.ended){
      this.EndConversation();
    }else{
      if(this.currentEntry && this.currentEntry.checkList.alreadyAllowed){
        this.showReplies(this.currentEntry);
      }else{
        //the entry checklist is still going. Let it do it's thing
      }
    }
  }

  UpdateEntryAnimations(entry){
    if(this.dialog.isAnimatedCutscene){
      for(let i = 0; i < entry.animations.length; i++){
        let participant = entry.animations[i];
        if(this.dialog.stunt[participant.participant]){
          //console.log('STUNT', this.dialog.stunt[participant.participant], participant.animation-1200, this.GetActorAnimation(participant.animation));
          //this.dialog.stunt[participant.participant].model.playAnimation(this.GetActorAnimation(participant.animation), false);
          try{
            //this.dialog.stunt[participant.participant].model.poseAnimation(this.GetActorAnimation(participant.animation));
            this.dialog.stunt[participant.participant].dialogPlayAnimation(this.GetActorAnimation(participant.animation), true);
          }catch(e){}
        }else{
          let actor = Game.GetObjectByTag(participant.participant);
          if(actor && participant.animation >= 10000){
            let anim = this.GetDialogAnimation(participant.animation-10000);
            //console.log('DialogAnim', participant.animation-10000, anim)
            if(anim){
              //actor.anim = true;
              //actor.model.playAnimation(anim.name, anim.looping  == '1');
              actor.dialogPlayAnimation(anim.name, anim.looping  == '1');
            }else{
              console.error('Anim', participant.animation-10000)
            }
          }
        }
      }
    }else{

      if(this.currentEntry.speaker instanceof ModuleCreature){
        this.currentEntry.speaker.dialogPlayAnimation('tlknorm', true);
      }

      if(this.currentEntry.listener instanceof ModuleCreature){
        this.currentEntry.listener.dialogPlayAnimation('listen', true);
      }

      for(let i = 0; i < entry.animations.length; i++){
        let participant = entry.animations[i];
        let actor = Game.GetObjectByTag(participant.participant);
        if(actor && participant.animation >= 10000){
          let anim = this.GetDialogAnimation(participant.animation-10000);
          //console.log('DialogAnim', participant.animation-10000, anim)
          if(anim){
            //actor.anim = true;
            //actor.model.playAnimation(anim.name, anim.looping  == '1');
            actor.dialogPlayAnimation(anim.name, anim.looping  == '1');
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
    console.log('GetDialogAnimation', index);
    if(index >= 1000 && index < 1400){
      //Indexes above 1000 appear to be fire and forget CUTXXX model animations
      switch(index){
        case 1009: //Tank Float
          return {name: "cut"+("000" + (index-1400 + 1)).slice(-3), looping: "0"};
        case 1010: //Tank Float Jerk
          return {name: "cut"+("000" + (index-1000 + 1)).slice(-3), looping: "0"};
        case 1011: //Tank Float Fall
          return {name: "cut"+("000" + (index-1000 + 1)).slice(-3), looping: "0"};
        case 1012: //Floor Scanning Loop
          return {name: "cut"+("000" + (index-1000 + 1)).slice(-3), looping: "0"};
        case 1013: //Floor Scanning Get Up
          return {name: "cut"+("000" + (index-1000 + 1)).slice(-3), looping: "0"};
      }
    }else if(index >= 1400 && index < 1500){
      //Indexes above 1400 appear to be looping CUTXXXL model animations
      switch(index){
        case 1409: //Tank Float
          return {name: "cut"+("000" + (index-1400 + 1)).slice(-3)+"L", looping: "1"};
        case 1410: //Tank Float Jerk
          return {name: "cut"+("000" + (index-1400 + 1)).slice(-3)+"L", looping: "1"};
        case 1411: //Tank Float Fall
          return {name: "cut"+("000" + (index-1400 + 1)).slice(-3)+"L", looping: "1"};
        case 1412: //Floor Scanning Loop
          return {name: "cut"+("000" + (index-1400 + 1)).slice(-3)+"L", looping: "1"};
        case 1413: //Floor Scanning Get Up
          return {name: "cut"+("000" + (index-1400)).slice(-3)+"L", looping: "1"};
      }
    }else if(index >= 10000){
      //Indexes above 10000 appear to reference the dialoganimations.2da
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
        case 403: //Touch_Heart
          return {name: 'touchheart', looping: "0"};
        break;
        case 404: //Roll_Eyes
          return {name: 'rolleyes', looping: "0"};
        break;
        case 405: //Use_Item_On_Other
          return {name: 'itemequip', looping: "0"};
        break;
        case 406: //Stand_Attention
          return {name: 'standstill', looping: "0"};
        break;
        case 407: //Nod_Yes
          return {name: 'nodyes', looping: "0"};
        break;
        case 408: //Nod_No
          return {name: 'nodno', looping: "0"};
        break;
        case 409: //Point
          return {name: 'point', looping: "0"};
        break;
        case 410: //Point_Loop
          return {name: 'pointloop', looping: "1"};
        break;
        case 411: //Point_Down
          return {name: 'pointdown', looping: "0"};
        break;
        case 412: //Scanning
          return {name: 'scanning', looping: "0"};
        break;
        case 413: //Shrug
          return {name: 'shrug', looping: "0"};
        break;
        case 424: //Sit_Chair
          return {name: 'sit', looping: "0"};
        break;
        case 425: //Sit_Chair_Drink
          return {name: 'animloop2', looping: "1"};
        break;
        case 426: //Sit_Chair_Pazak
          return {name: 'animloop3', looping: "1"};
        break;
        case 427: //Sit_Chair_Comp1
          return {name: 'animloop1', looping: "1"};
        break;
        case 428: //Sit_Chair_Comp2
          return {name: 'animloop1', looping: "1"};
        break;
        case 499: //Cut_Hands
          return {name: 'cuthand', looping: "0"};
        break;
        case 500: //L_Hand_Chop
          return {name: 'lhandchop', looping: "0"};
        break;
        case 501: //Collapse
          return {name: 'Collapse', looping: "0"};
        break;
        case 503: //Collapse_Stand
          return {name: 'Collapsestand', looping: "0"};
        break;
        case 504: //Bao_Dur_Power_Punch
        return {name: 'powerpunch', looping: "0"};
        break;
        case 507: //Hood_Off
          return {name: 'offhood', looping: "0"};
        break;
        case 508: //Hood_On
          return {name: 'onhood', looping: "0"};
        break;
        default:
          return undefined;
        break;
      }
    }
  }

  SetPlaceableCamera(nCamera){
    let cam = Game.getCameraById(nCamera);
    if(cam){
      Game.currentCamera = cam;
    }
  }

  SetAnimatedCamera(nCamera, onComplete = undefined){
    if(this.dialog.animatedCamera instanceof THREE.AuroraModel){
      this.dialog.animatedCamera.playAnimation(this.GetActorAnimation(nCamera), false, () => {
        process.nextTick( () => {
          if(typeof onComplete === 'function')
            onComplete();
        });
      });

      return;
    }
  }

  UpdateCamera(){

    if(!this.dialog)
      return;

    if(this.dialog.isAnimatedCutscene && this.dialog.animatedCamera instanceof THREE.AuroraModel){
      Game.currentCamera = Game.camera_animated;
      return;
    }

    if(this.isListening){
      //Show the speaker

      if(this.currentEntry){

        if(this.currentEntry.cameraAngle == 4 && this.dialog.animatedCamera instanceof THREE.AuroraModel){
          this.SetAnimatedCamera(this.currentEntry.cameraAnimation);
          Game.currentCamera = Game.camera_animated;
        }else{

          if(this.currentEntry.cameraAngle == 1 && this.currentEntry.listener instanceof ModuleObject){
            let position = this.currentEntry.speaker.position.clone();
            let lposition = this.currentEntry.listener.position.clone();
            let lookAt = this.currentEntry.speaker.position.clone();

            if(this.currentEntry.speaker.model instanceof THREE.AuroraModel){
              if(this.currentEntry.speaker.model.camerahook instanceof THREE.Object3D){
                lookAt = this.currentEntry.speaker.model.camerahook.getWorldPosition(new THREE.Vector3());
                position = this.currentEntry.speaker.model.camerahook.getWorldPosition(new THREE.Vector3());
              }else{
                position.add({x:0, y:0, z: this.currentEntry.speaker.getCameraHeight()})
              }
            }

            if(this.currentEntry.listener.model instanceof THREE.AuroraModel){
              if(this.currentEntry.listener.model.camerahook instanceof THREE.Object3D){
                lposition = this.currentEntry.listener.model.camerahook.getWorldPosition(new THREE.Vector3());
              }else{
                lposition.add({x:0, y:0, z: this.currentEntry.listener.getCameraHeight()})
              }
            }

            position.add({x:-.5, y:.25, z: 0});

            let AxisFront = new THREE.Vector3();
            let tangent = lookAt.clone().sub(lposition.clone());
            let atan = Math.atan2(-tangent.y, -tangent.x);
            AxisFront.x = Math.cos(atan);
            AxisFront.y = Math.sin(atan);
            AxisFront.normalize();
            position.add(AxisFront);
            

            Game.camera_dialog.position.copy(position);
            Game.camera_dialog.lookAt(lookAt);  
          }else if(this.currentEntry.cameraAngle == 2 && this.currentEntry.listener instanceof ModuleObject){
            let position = this.currentEntry.listener.position.clone();
            let lookAt = this.currentEntry.speaker.position.clone();

            if(this.currentEntry.speaker.model instanceof THREE.AuroraModel){
              if(this.currentEntry.speaker.model.camerahook instanceof THREE.Object3D){
                lookAt = this.currentEntry.speaker.model.camerahook.getWorldPosition(new THREE.Vector3());
                lookAt.add({x:0, y:0, z: .5});
              }else{
                position.add({x:0, y:0, z: 1.5})
              }
            }

            if(this.currentEntry.listener.model instanceof THREE.AuroraModel){
              if(this.currentEntry.listener.model.camerahook instanceof THREE.Object3D){
                position = this.currentEntry.listener.model.camerahook.getWorldPosition(new THREE.Vector3());
                //position.add({x:0, y:0, z: .5});
              }else{
                position.add({x:0, y:0, z: 1.5})
              }
            }

            position.add({x:-1, y:1, z: 0});

            let AxisFront = new THREE.Vector3();
            let tangent = lookAt.clone().sub(position.clone());
            let atan = Math.atan2(-tangent.y, -tangent.x);
            AxisFront.x = Math.cos(atan);
            AxisFront.y = Math.sin(atan);
            AxisFront.normalize();
            position.add(AxisFront);
            

            Game.camera_dialog.position.copy(position);
            Game.camera_dialog.lookAt(lookAt);  
          }else{
            let position = this.currentEntry.speaker.position.clone().sub(
              new THREE.Vector3(
                1*Math.cos(this.currentEntry.speaker.rotation.z - Math.PI/1.5), 
                1*Math.sin(this.currentEntry.speaker.rotation.z - Math.PI/1.5), 
                -1.75
              )
            );
    
            Game.camera_dialog.position.set(position.x, position.y, position.z);
            Game.camera_dialog.lookAt(this.currentEntry.speaker.position.clone().add({x:0, y:0, z: this.currentEntry.speaker.getCameraHeight()}));
          }
          
        }
      }else{
        let position = this.getCurrentListener().position.clone().sub(
          new THREE.Vector3(
            -1.5*Math.cos(this.getCurrentListener().rotation.z - Math.PI/4), 
            -1.5*Math.sin(this.getCurrentListener().rotation.z - Math.PI/4), 
            -1.75
          )
        );
  
        Game.camera_dialog.position.set(position.x, position.y, position.z);
        Game.camera_dialog.lookAt(this.getCurrentOwner().position.clone().add({x:0, y:0, z: this.getCurrentOwner().getCameraHeight()}));  
        
      }

    }else{
      Game.currentCamera = Game.camera_dialog;
      //Show the listener
      let position = this.getCurrentListener().position.clone().sub(
        new THREE.Vector3(
          0.5*Math.cos(this.getCurrentListener().rotation.z - (Math.PI/4)*2), 
          0.5*Math.sin(this.getCurrentListener().rotation.z - (Math.PI/4)*2), 
          -1.75
        )
      );
      Game.camera_dialog.position.set(position.x, position.y, position.z);
      Game.camera_dialog.lookAt(this.getCurrentListener().position.clone().add({x:0, y:0, z: this.getCurrentListener().getCameraHeight()}));
    }

  }

  GetCameraMidPoint(pointA, pointB, percentage = 0.5){

    let dir = pointB.clone().sub(pointA);
    let len = dir.length();
    dir = dir.normalize().multiplyScalar(len*percentage);
    return pointA.clone().add(dir);
  }

  Update(delta){
    super.Update(delta);

    if(!this.dialog)
      return;

    if(this.dialog.isAnimatedCutscene){

      if(this.dialog.animatedCamera instanceof THREE.AuroraModel){
        this.dialog.animatedCamera.update(delta);
        this.dialog.animatedCamera.camerahook.updateMatrixWorld();
        let pos = new THREE.Vector3(
          this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).x,
          this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).y,
          this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).z
        );
        Game.camera_animated.position.copy(
          pos
        );
        Game.camera_animated.quaternion.copy(
          this.dialog.animatedCamera.camerahook.quaternion
        );
        //Game.dialog.camera_animated.rotation.y -= Math.PI/2
        //Game.dialog.camera_animated.rotation.z= Math.PI
        Game.camera_animated.updateProjectionMatrix();
        Game.currentCamera = Game.camera_animated;
      }

      for(let actor in this.dialog.stunt){
        //console.log('STUNT', actor);
        //this.dialog.stunt[actor].model.update(delta)
      }

      if(this.canLetterbox){
        this.bottomBar.position.y = -(window.innerHeight / 2) + (100 / 2);
        this.topBar.position.y = (window.innerHeight / 2) - (100 / 2);
        this.letterBoxed = true;
        this.LBL_MESSAGE.show();
      }

    }else{
      if(this.dialog.animatedCamera instanceof THREE.AuroraModel){
        this.dialog.animatedCamera.update(delta);
        this.dialog.animatedCamera.camerahook.updateMatrixWorld();
        let pos = new THREE.Vector3(
          this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).x,
          this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).y,
          this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).z
        );
        Game.camera_animated.position.copy(
          pos
        );
        Game.camera_animated.quaternion.copy(
          this.dialog.animatedCamera.camerahook.quaternion
        );
        Game.camera_animated.updateProjectionMatrix();
      }else{
        this.UpdateCamera();
      }

      if(this.canLetterbox){
        if(this.bottomBar.position.y < -(window.innerHeight / 2) + (100 / 2)){
          this.bottomBar.position.y += 5;
          this.topBar.position.y -= 5;
          this.LBL_MESSAGE.hide();
        }else{
          this.bottomBar.position.y = -(window.innerHeight / 2) + (100 / 2);
          this.topBar.position.y = (window.innerHeight / 2) - (100 / 2);
          this.letterBoxed = true;
          this.LBL_MESSAGE.show();
        }
      }

    }
    
  }

  updateTextPosition(){

    if(typeof this.LBL_MESSAGE.text.geometry !== 'undefined'){
      this.LBL_MESSAGE.text.geometry.computeBoundingBox();

      let bb = this.LBL_MESSAGE.text.geometry.boundingBox;
      let height = Math.abs(bb.min.y) + Math.abs(bb.max.y);
      let width = Math.abs(bb.min.x) + Math.abs(bb.max.x);
      let padding = 10;

      if(this.isListening){
        this.LBL_MESSAGE.widget.position.y = (-window.innerHeight / 2 ) + ( 50 );
      }else{
        this.LBL_MESSAGE.widget.position.y = (window.innerHeight / 2) - ( 50 );
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
    if(!this.letterBoxed){
      this.topBar.position.y = (window.innerHeight / 2) + (100 / 2);
      this.bottomBar.position.y = -this.topBar.position.y;
    }else{
      this.bottomBar.position.y = -(window.innerHeight / 2) + (100 / 2);
      this.topBar.position.y = (window.innerHeight / 2) - (100 / 2);
    }
  }

}

module.exports = MenuDialog;