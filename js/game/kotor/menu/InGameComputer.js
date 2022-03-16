/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameComputer menu class.
 */

class InGameComputer extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.args = Object.assign({
      //compscreen: '1600x1200comp0',
    }, this.args);

    this.background = '1600x1200comp0';
    this.state = 0;

    this.LoadMenu({
      name: 'computer',
      onLoad: () => {

        this.LB_MESSAGE = this.getControlByName('LB_MESSAGE');
        this.LB_REPLIES = this.getControlByName('LB_REPLIES');
        this.LBL_OBSCURE = this.getControlByName('LBL_OBSCURE');

        this.LBL_REP_UNITS_ICON = this.getControlByName('LBL_REP_UNITS_ICON');;
        this.LBL_COMP_SPIKES_ICON = this.getControlByName('LBL_COMP_SPIKES_ICON');;
        this.LBL_REP_SKILL_ICON = this.getControlByName('LBL_REP_SKILL_ICON');;
        this.LBL_COMP_SKILL_ICON = this.getControlByName('LBL_COMP_SKILL_ICON');;
        this.LBL_REP_UNITS = this.getControlByName('LBL_REP_UNITS');;
        this.LBL_REP_SKILL = this.getControlByName('LBL_REP_SKILL');;
        this.LBL_COMP_SPIKES = this.getControlByName('LBL_COMP_SPIKES');;
        this.LBL_COMP_SKILL = this.getControlByName('LBL_COMP_SKILL');;
        this.LBL_COMP_SKILL_VAL = this.getControlByName('LBL_COMP_SKILL_VAL');;
        this.LBL_COMP_SPIKES_VAL = this.getControlByName('LBL_COMP_SPIKES_VAL');;
        this.LBL_REP_SKILL_VAL = this.getControlByName('LBL_REP_SKILL_VAL');;
        this.LBL_REP_UNITS_VAL = this.getControlByName('LBL_REP_UNITS_VAL');;

        this.LB_MESSAGE.clearItems();

        /*this.LB_REPLIES.extent.left = -(window.innerWidth/2) + this.LB_REPLIES.extent.width/2 + 16;
        this.LB_REPLIES.extent.top = (window.innerHeight/2) - this.LB_REPLIES.extent.height/2;
        this.LB_REPLIES.calculatePosition();
        this.LB_REPLIES.calculateBox();*/

        /*this.LB_MESSAGE.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.isListening){
            this.PlayerSkipEntry(this.currentEntry);
          }
        });*/

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Hide(){
    super.Hide();
    Game.currentCamera = Game.camera;
  }

  Show(){
    super.Show();
    //Game.InGameAreaTransition.Hide();
  }

  StartConversation(gff = null, owner, listener = Game.player){

    this.LB_MESSAGE.clearItems();
    this.Open();
    this.LB_REPLIES.clearItems();
    this.nodeIndex = 0;
    this.owner = owner;
    this.listener = listener;
    this.paused = false;
    this.ended = false;
    this.currentEntry = null;

    if(this.audioEmitter === undefined){

    }

    Game.inDialog = true;

    this.entryList = [];
    this.replyList = [];
    this.startingList = [];
    this.vo_id = '';

    this.isListening = true;

    this.LB_REPLIES.hide();



    if(gff instanceof GFFObject){
      Game.inDialog = true;

      if(gff.json.fields.VO_ID)
        this.vo_id = gff.json.fields.VO_ID.value;
      
      if(gff.json.fields.EndConverAbort)
        this.onEndConversationAbort = gff.json.fields.EndConverAbort.value;

      if(gff.json.fields.EndConversation)
        this.onEndConversation = gff.json.fields.EndConversation.value;

      if(gff.json.fields.AnimatedCut)
        this.isAnimatedCutscene = gff.json.fields.AnimatedCut.value ? true : false;

      if(gff.json.fields.AmbientTrack)
        this.ambientTrack = gff.json.fields.AmbientTrack.value;


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
          isActive: _node.Active.value,
          index: _node.Index.value
        };

        this.startingList.push(node);
      }

      this.updateTextPosition();

      let begin = () => {
        //if(Game.Mode == Game.MODES.INGAME){
        //  Game.InGameOverlay.Hide();
        //}
        if(this.ambientTrack != ''){
          AudioLoader.LoadMusic(this.ambientTrack, (data) => {
            Game.audioEngine.stopBackgroundMusic();
            Game.audioEngine.SetDialogBackgroundMusic(data);
            this.showEntry(this.startingEntry);
          }, () => {
            this.showEntry(this.startingEntry);
          });
        }else{
          this.showEntry(this.startingEntry);
        }
      };

      this.startingEntry = null;
      this.getNextEntry(this.startingList, (entry) => {
        this.startingEntry = entry;
        if(entry.replies.length == 1 && this.isEndDialog(this.replyList[entry.replies[0].index])){
          this.EndConversation();
        }else{
          begin();
        }
      });

    }else{
      this.Close();
      Game.inDialog = false;
    }

  }

  getNextEntry(entries = [], callback = null){

    if(!entries.length){
      this.EndConversation();
    }

    this.isListening = true;
    this.updateTextPosition();

    let totalEntries = entries.length;

    let entryLoop = async (idx = 0) => {
      if(idx < totalEntries){
        let entry = entries[idx];
        if(entry.isActive == ''){
          if(typeof callback === 'function'){
            callback(this.entryList[entry.index]);
          }else{
            this.showEntry(this.entryList[entry.index]);
          }
        }else{
          let script = await NWScript.Load(entry.isActive);
          if(script instanceof NWScriptInstance){
            console.log('dialog', script);
            script.name = entry.isActive;
            console.log(this.owner);
            script.run(this.owner, 0, (bSuccess) => {
              console.log('dialog', script, bSuccess);
              //this.listener = Game.player;
              if(bSuccess){
                if(typeof callback === 'function'){
                  callback(this.entryList[entry.index]);
                }else{
                  this.showEntry(this.entryList[entry.index]);
                }
              }else{
                entryLoop(++idx);
              }
            })
          }else{
            entryLoop(++idx);
          }
        }
      }else{ 
        //No further branches
        this.EndConversation();
      }
    };
    entryLoop();
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
      this.audioEmitter.Stop();
      this.showReplies(entry);
    }
  }

  async showEntry(entry){
    //console.log('showEntry', entry);

    if(!Game.inDialog)
      return;

    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(entry.text.split('##')[0], () => {
      //this.onReplySelect(_reply);
    });
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

    let checkList = {
      voiceOverComplete: false,
      alreadyAllowed: false,
      scriptComplete: true,
      delayComplete: true,

      isComplete: function(entry){
        console.log('checkList', entry);

        if(this.alreadyAllowed){
          return false;
        }

        if(this.voiceOverComplete && this.delayComplete){
          this.alreadyAllowed = true;
          return true;
        }
        return false;

      }

    };

    let nodeDelay = 0;

    this.GetAvailableReplies(entry);

    if(entry.delay > -1){
      nodeDelay = entry.delay * 1000;
    }else{
      checkList.delayComplete = true;
    }

    if(entry.script != ''){
      checkList.scriptComplete = false;
      let script = await NWScript.Load(entry.script);
      if(script instanceof NWScriptInstance){
        script.name = entry.script;
        script.run(this.owner, 0, () => {
          checkList.scriptComplete = true;
        });
      }else{
        checkList.scriptComplete = true;
      }
    }

    //this.audioEmitter.Stop();
    console.error('entry delay', entry, nodeDelay);

    this.showReplies(entry);

    if(entry.sound != ''){
      console.log('lip', entry.sound);
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.sound, (buffer) => {
        if(entry.speaker instanceof ModuleCreature){
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      this.audioEmitter.PlayStreamWave(entry.sound, null, (error = false) => {
        checkList.voiceOverComplete = true;
      });
    }else if(entry.vo_resref != ''){
      console.log('lip', entry.vo_resref);
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.vo_resref, (buffer) => {
        if(entry.speaker instanceof ModuleCreature){
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      this.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
        checkList.voiceOverComplete = true;
      });
    }else{
      console.error('VO ERROR', entry, nodeDelay);
    }

    this.state = 0;
    
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

  async showReplies(entry){

    if(!Game.inDialog)
      return;

    console.log('showReplies', entry);
    if(entry.replies.length == 1 && this.isContinueDialog(this.replyList[entry.replies[0].index])){
      let reply = this.replyList[entry.replies[0].index];
      console.log('We seem to have found a dialog continue entry we are going to attempt to auto pick and continue', reply);
      if(reply.script == ''){
        let _reply = this.replyList[reply.index];
        console.log('showEntry.replies', _reply);
        this.getNextEntry(reply.entries);
      }else{
        let script = await NWScript.Load(reply.script);
        if(script instanceof NWScriptInstance){
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
        let script = await NWScript.Load(reply.script);
        if(script instanceof NWScriptInstance){
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
      }
      //Return so none of the node specific code runs
      return;
    }else if(!entry.replies.length){
      console.log('No more replies and can\'t continue');
      this.EndConversation();
    }

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

    this.state = 1;

  }

  GetAvailableReplies(entry){
    let totalReplies = entry.replies.length;
    console.log('GetAvailableReplies', entry);
    let replyLoop = async (idx = 0) => {
      if(idx < totalReplies){
        console.log('replyLoop', entry.replies[idx], idx, idx < totalReplies);
        let reply = entry.replies[idx];
        if(reply.isActive == ''){
          let _reply = this.replyList[reply.index];
          console.log('showEntry.replies', _reply);
          this.LB_REPLIES.addItem(this.StringTokenParser(this.LB_REPLIES.children.length+1+'. '+_reply.text.split('##')[0]), (e) => {
            this.onReplySelect(_reply);
          });
          replyLoop(++idx);
        }else{
          let script = await NWScript.Load(reply.isActive);
          if(script instanceof NWScriptInstance){
            console.log('dialog', script);
            script.name = entry.isActive;
            console.log(this.owner);
            script.run(this.owner, 0, (bSuccess) => {
              console.log('dialog', script, bSuccess);
              if(bSuccess){
                let _reply = this.replyList[reply.index];
                console.log('showEntry.replies', _reply);
                this.LB_REPLIES.addItem(this.StringTokenParser(this.LB_REPLIES.children.length+1+'. '+_reply.text.split('##')[0]), () => {
                  this.onReplySelect(_reply);
                });
              }
              replyLoop(++idx);
            });
          }else{
            replyLoop(++idx);
          }
        }
      }else{ 
        //No further branches
        //this.EndConversation();
      }
    };
    replyLoop();
  }

  StringTokenParser(text = '', entry = null){

    if(this.owner instanceof ModuleCreature){
      text = text.replace('<FullName>', Game.player.firstName);
      text = text.replace('<CUSTOM31>', () => { return 3; });
      text = text.replace('<CUSTOM32>', () => { return 5; });
      text = text.replace('<CUSTOM33>', () => { return 8; });
      text = text.replace('<CUSTOM34>', () => { return 10; });
      text = text.replace('<CUSTOM35>', () => { return 2; });

      text = text.replace('<CUSTOM41>', () => { return 1; });
      text = text.replace('<CUSTOM42>', () => { return 4; });
      text = text.replace('<CUSTOM43>', () => { return 4; });
      text = text.replace('<CUSTOM44>', () => { return 5; });
      text = text.replace('<CUSTOM45>', () => { return 6; });
    }

    return text;
  }

  async onReplySelect(reply = null){

    //Try to run script 1
    if(reply.script != ''){
      let script = await NWScript.Load(reply.script);
      if(script instanceof NWScriptInstance){
        console.log('dialog.reply', script);
        script.name = reply.script;
        console.log(this.owner);
        script.run(this.owner, 0, (bSuccess) => {
          
        })
        this.getNextEntry(reply.entries);
      }else{
        this.getNextEntry(reply.entries);
      }
    }else{
      this.getNextEntry(reply.entries);
    }

  }

  async OnBeforeConversationEnd( onEnd = null ){

    if(this.onEndConversation != ''){
      let script = await NWScript.Load(this.onEndConversation);
      if(script instanceof NWScriptInstance){
        //console.log('dialog.onEndScript', script);
        script.name = this.onEndConversation;
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
    }

  }

  updateTextPosition(){

    if(typeof this.LB_MESSAGE.text.geometry !== 'undefined'){
      this.LB_MESSAGE.text.geometry.computeBoundingBox();

      let bb = this.LB_MESSAGE.text.geometry.boundingBox;
      let height = Math.abs(bb.min.y) + Math.abs(bb.max.y);
      let width = Math.abs(bb.min.x) + Math.abs(bb.max.x);
      let padding = 10;

      if(this.isListening){
        this.LB_MESSAGE.widget.position.y = (-window.innerHeight / 2 ) + ( 100 - (height));
      }else{
        this.LB_MESSAGE.widget.position.y = (window.innerHeight / 2) - ( 100 - (height / 2) );
      }

      this.LB_MESSAGE.box = new THREE.Box2(
        new THREE.Vector2(
          this.LB_MESSAGE.widget.position.x - width/2,
          this.LB_MESSAGE.widget.position.y - height/2
        ),
        new THREE.Vector2(
          this.LB_MESSAGE.widget.position.x + width/2,
          this.LB_MESSAGE.widget.position.y + height/2
        )
      );

    }

  }

  EndConversation(aborted = false){
    
    this.audioEmitter.Stop();
    //this.Hide();
    this.Close();
    Game.currentCamera = Game.camera;
    Game.inDialog = false;
    //if(Game.Mode == Game.MODES.INGAME){
    //  Game.InGameOverlay.Show();
    //}

    this.state = -1;

    process.nextTick( async () => {

      if(!aborted){
        if(this.onEndConversation != ''){
          let script = await NWScript.Load(this.onEndConversation);
          if(script instanceof NWScriptInstance){
            //console.log('dialog.onEndScript', script);
            script.name = this.onEndConversation;
            //console.log(this.owner);
            script.run(this.owner, 0, (bSuccess) => {
              //console.log('dialog.onEndScript', script, bSuccess);
            });
          }
        }
      }else{
        if(this.onEndConversationAbort != ''){
          let script = await NWScript.Load(this.onEndConversationAbort);
          if(script instanceof NWScriptInstance){
            //console.log('dialog.onEndScript', script);
            script.name = this.onEndConversationAbort;
            //console.log(this.owner);
            script.run(this.owner, 0, (bSuccess) => {
              //console.log('dialog.onEndScript', script, bSuccess);
            })
          }
        }
      }
    });

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
      sound: '',
      soundExists: 0,
      speakerTag: '',
      text: '',
      vo_resref: '',
      waitFlags: 0,
      fade: {
        type: 0,
        length: 0,
        delay: 0,
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
        delay: 0,
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

module.exports = InGameComputer;