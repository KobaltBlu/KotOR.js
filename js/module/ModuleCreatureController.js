/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleCreatureController class.
 */

const interpolateAngle = require('interpolate-angle');

class ModuleCreatureController extends ModuleObject {

  constructor(){
    super();
    this.deferEventUpdate = true;
    //this.combat

  }

  update( delta = 0 ){
    
    super.update(delta);

    if(this.audioEmitter){
      this.audioEmitter.SetPosition(this.position.x, this.position.y, this.position.z + 1.0);
    }

    this.AxisFront.set(0, 0, 0);
    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

    if(Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME){

      if(Game.module){
        if(this === PartyManager.party[0])
          Game.controls.UpdatePlayerControls(delta);
      }

      if(this.animState == ModuleCreature.AnimState.IDLE){
        this.footstepEmitter.Stop();
      }

      if(!this.isReady){
        //this.getModel().visible = true;
        return;
      }else{
        //this.getModel().visible = true;
        this.getModel().rotation.copy(this.rotation);
        //this.getModel().quaternion = this.quaternion;
      }

      //Get the first action in the queue
      this.action = this.actionQueue[0];

      this.areas = [];
      this.area = Game.module.area;

      /*if(this == Game.getCurrentPlayer() && this.room instanceof ModuleRoom){
        //this.room.show(true);
      }else if(this.room instanceof ModuleRoom){
        if(this.room.model instanceof THREE.AuroraModel){
          if(this.model){
            this.model.visible = this.room.model.visible;
          }
        }
      }*/

      if(!this.isDead() && this.animState == ModuleCreature.AnimState.DEAD){
        this.animState = ModuleCreature.AnimState.IDLE;
        this.deathAnimationPlayed = false;
        this.animState = ModuleCreature.AnimState.GET_UP_DEAD;
      }

      if(!this.isDead()){

        //Process DamageList
        let elLen = this.damageList.length - 1;
        for(let i = elLen; i >= 0; i--){
          this.damageList[i].delay -= delta;
          if(this.damageList[i].delay <= 0){
            this.subtractHP(this.damageList[i].amount);

            let painsound = THREE.Math.randInt(0, 1);
            switch(painsound){
              case 1:
                this.PlaySoundSet(SSFObject.TYPES.PAIN_2);
              break;
              default:
                this.PlaySoundSet(SSFObject.TYPES.PAIN_1);
              break;
            }
      
            this.damageList.splice(i, 1);
          }
        }

        this.deathStarted = false;
        
        if(this.animState != ModuleCreature.AnimState.DEAD){
          this.updateActionQueue(delta);
        }

        if(this.dialogAnimation && Game.inDialog && (!this.action || this.action.goal != ModuleCreature.ACTION.ANIMATE)){
          if(this.model){

            if(!this.speed){
                
              let _animShouldChange = false;
    
              if(this.model.animationManager.currentAnimation instanceof AuroraModelAnimation){
                if(this.model.animationManager.currentAnimation.name.toLowerCase() != this.dialogAnimation.animation.toLowerCase()){
                  _animShouldChange = true;
                }
              }else{
                _animShouldChange = true;
              }
    
              if(_animShouldChange){
                let _newAnim = this.model.getAnimationByName(this.dialogAnimation.animation);
                if(_newAnim instanceof AuroraModelAnimation){
                  if(this.dialogAnimation.time == -1){
                    this.model.playAnimation(_newAnim, true);
                  }else{
                    this.model.playAnimation(_newAnim, false, () => {
                      //Kill the dialogAnimation after the animation ends
                      this.dialogAnimation = null;
                    })
                  }
                }else{
                  //Kill the dialogAnimation if the animation isn't found
                  //console.log('dialogAnimation missing!', this.dialogAnimation.animation, this);
                  this.dialogAnimation = null;
                }
              }

            }
  
          }else{
            //Kill the dialogAnimation if there is no model to animate?
            this.dialogAnimation = null;
          }
        }else{
          this.dialogAnimation = null;
        }

      }else{
        this.damageList = [];
        this.getUpAnimationPlayed = false;
        if(this.animState != ModuleCreature.AnimState.DEAD || this.animState != ModuleCreature.AnimState.DIE){
          this.animState = ModuleCreature.AnimState.DEAD;
        }
        if(!this.deathStarted){
          this.deathStarted = true;
          this.clearAllActions();
          this.onDeath();
          this.PlaySoundSet(SSFObject.TYPES.DEAD);
          this.overlayAnimation = undefined;
        }
      }

      if(this.isDebilitated()){
        this.force = 0;
        this.speed = 0;
        this.animState = ModuleCreature.AnimState.IDLE;
      }

      //-------------------------//
      // BEGIN: Move Speed Logic //
      //-------------------------//

      this.AxisFront.z = 0;

      this.speed += (this.getMovementSpeed() * 2.5) * this.force * delta;

      if(this.speed > this.getMovementSpeed()){
        this.speed = this.getMovementSpeed();
      }
      
      let forceDelta = this.speed * delta;
      let gravityDelta = -1 * delta;
      
      if(this.speed){
        this.animSpeed = this.speed / this.getRunSpeed();
      }else{
        this.animSpeed = 1;
      }
        
      if(!this.AxisFront.length()){
        this.AxisFront.x = ( Math.cos(this.rotation.z + Math.PI/2) * forceDelta );
        this.AxisFront.y = ( Math.sin(this.rotation.z + Math.PI/2) * forceDelta );
        if(this.AxisFront.length()){
          if(this.animSpeed > 0.75){
            this.animState = ModuleCreature.AnimState.RUNNING;
          }else{
            this.animState = ModuleCreature.AnimState.WALKING;
          }
          this.invalidateCollision = true;
        }
        //this.AxisFront.z = gravityDelta;
      }else{
        this.AxisFront.multiplyScalar(forceDelta);
        if(this.AxisFront.length()){
          this.invalidateCollision = true;
        }
      }

      if(this.force < 1){
        this.speed -= (this.getMovementSpeed() * 2.5) * delta;
      }

      if(this.speed < 0){
        this.speed = 0;
      }

      if(!this.AxisFront.length() && ( this.animState == ModuleCreature.AnimState.RUNNING || this.animState == ModuleCreature.AnimState.WALKING )){
        this.animState = ModuleCreature.AnimState.IDLE;
        this.speed = 0;
        this.force = 0;
      }

      //-----------------------//
      // END: Move Speed Logic //
      //-----------------------//

      if(this.combatState && this.animState == ModuleCreature.AnimState.PAUSE){
        this.animState = ModuleCreature.AnimState.READY;
      }

      this.updateExcitedDuration(delta);
      this.updateCombat(delta);
      this.updateCasting(delta);
      this.updateAnimationState();
      this.updateItems(delta);
      
      if(this.model instanceof THREE.AuroraModel && this.model.bonesInitialized){
        this.model.update(delta);
        if(this.lipObject instanceof LIPObject){
          this.lipObject.update(delta, this.head ? this.head : this.model);
        }
      }

      //if(this.model instanceof THREE.AuroraModel)
      //  this.model.box.setFromObject(this.model);

      if(this.blocking != this.lastBlocking){
        this.lastBlocking = this.blocking;
        //console.log('blocking script', this.blocking);
        this.onBlocked();
      }

      if(this.invalidateCollision)
        this.updateCollision(delta);

      this.updatePerceptionList(delta);
      this.updateListeningPatterns();

      this.position.add(this.AxisFront);

      //If a non controlled party member is stuck, warp them to their follow position
      if(this.partyID != undefined && this != Game.getCurrentPlayer() && this.collisionTimer >= 1){
        this.setPosition(PartyManager.GetFollowPosition(this));
        this.collisionTimer = 0;
      }

      this.turning = 0;
      if(this.facingAnim){//this.facing != this.rotation.z){
        this.facingTweenTime += 10*delta;
        if(this.facingTweenTime >= 1){
          this.rotation.z = this.facing;
          this.facingAnim = false;
        }else{
          let oldFacing = Utility.NormalizeRadian(this.rotation.z);
          this.rotation.z = interpolateAngle(this.wasFacing, this.facing, this.facingTweenTime);
          let diff = oldFacing - Utility.NormalizeRadian(this.rotation.z);
          this.turning = Math.sign(Utility.NormalizeRadian(oldFacing - Utility.NormalizeRadian(this.rotation.z)));
          if(diff < 0.0000001 || diff > -0.0000001){
              this.facingAnim = false;
              this.rotation.z = interpolateAngle(this.wasFacing, this.facing, 1);
              this.wasFacing = this.facing;
          }
        }
      }

      //Update equipment
      if(this.equipment.HEAD instanceof ModuleItem){
        this.equipment.HEAD.update(delta);
      }
      if(this.equipment.ARMS instanceof ModuleItem){
        this.equipment.ARMS.update(delta);
      }

      if(this.equipment.RIGHTARMBAND instanceof ModuleItem){
        this.equipment.RIGHTARMBAND.update(delta);
      }

      if(this.equipment.LEFTARMBAND instanceof ModuleItem){
        this.equipment.LEFTARMBAND.update(delta);
      }

      if(this.equipment.RIGHTHAND instanceof ModuleItem){
        this.equipment.RIGHTHAND.update(delta);
      }

      if(this.equipment.LEFTHAND instanceof ModuleItem){
        this.equipment.LEFTHAND.update(delta);
      }

      if(this.equipment.ARMOR instanceof ModuleItem){
        this.equipment.ARMOR.update(delta);
      }
      if(this.equipment.BELT instanceof ModuleItem){
        this.equipment.BELT.update(delta);
      }

      if(this.equipment.CLAW1 instanceof ModuleItem){
        this.equipment.CLAW1.update(delta);
      }

      if(this.equipment.CLAW2 instanceof ModuleItem){
        this.equipment.CLAW2.update(delta);
      }

      if(this.equipment.CLAW3 instanceof ModuleItem){
        this.equipment.CLAW3.update(delta);
      }

      //Loop through and update the effects
      if(this.deferEventUpdate){
        for(let i = 0, len = this.effects.length; i < len; i++){
          this.effects[i].update(delta);
        }
      }

    }else{
      this.updateAnimationState();
      this.updateItems(delta);
    }

    this.collisionTimer -= delta;
    if(this.collisionTimer < 0)
      this.collisionTimer = 0;

  }

  updateActionQueue(delta = 0){
    if(this.isDebilitated())
      return;

    if(this.action != null){
            
      this.aqOffset = 0;
      this.processAction(delta, this.action);

    } else {
      //this.force = 0;
      //this.animState = ModuleCreature.AnimState.IDLE;
      /*if(typeof this.model.animationManager.currentAnimation == 'undefined'){
        let randomPauseIdx = Math.round(Math.random()*2) + 1;
        this.model.playAnimation('pause'+randomPauseIdx, false);
      }*/

      if(!this.combatState &&this.isPartyMember() && this != Game.getCurrentPlayer()){
        this.setFacing(
          Math.atan2(
            this.position.y - Game.getCurrentPlayer().position.y,
            this.position.x - Game.getCurrentPlayer().position.x
          ) + Math.PI/2,
          false
        );
      }

    }

    this.action = this.actionQueue[0];

  }

  processAction(delta = 0, action = undefined ){
    let distance = 0;
    if(action){
      switch(action.goal){
        case ModuleCreature.ACTION.ANIMATE:

          if(this.overlayAnimation)
            break;

          if(action.animation >= 10000){
            this.animState = action.animation;
            action.started = true;
          }else{
            console.error('ModuleCreature.ACTION.ANIMATE Invalid animation', this.getName(), action.animation, action);
            //Kill the action if there is no model to animate?
            this.actionQueue.shift();
          }

          if(action.time == -1){
            //Kill the action if there is no model to animate?
            this.actionQueue.shift();
          }else if(action.time > 0){
            action.time -= delta;
            if(action.time < 0){
              action.time = 0;
            }
          }else{
            //Kill the action if there is no model to animate?
            this.actionQueue.shift();
          }

        break;
        case ModuleCreature.ACTION.WAIT:
          action.elapsed += delta;
          if(action.elapsed > action.time){
            this.actionQueue.shift()
          }
        break;
        case ModuleCreature.ACTION.SCRIPT: //run a block of code from an NWScript file
          if(this == Game.player){
            //console.log(ModuleCreature.ACTION.SCRIPT, action);
          }
          //console.log('Action Script', action);
          //console.log(ModuleCreature.ACTION.SCRIPT, action);
          if(action.script instanceof NWScriptInstance){
            //action.action.script.caller = this;
            //action.action.script.debug.action = true;
            action.script.beginLoop({
              _instr: null, 
              index: -1, 
              seek: action.action.offset,
              onComplete: () => {
                //console.log('ACTION.SCRIPT', 'Complete', action);
              }
            });
          }else{
            console.error('Action.SCRIPT ERROR: NOT NWScriptInstance')
          }
          this.actionQueue.shift();
        break;

        case ModuleCreature.ACTION.FOLLOWLEADER:
          //let targetPos = PartyManager.GetFollowPosition(this);

          if(Game.inDialog){
            this.actionQueue.shift();
            this.animState = ModuleCreature.AnimState.IDLE;
            break;
          }

          action.object = {
            position: PartyManager.GetFollowPosition(this)
          };
          distance = Utility.Distance2D(this.position, PartyManager.party[0].position.clone());
          if(distance > 10){
            action.path_realtime = true;
            try{
              this.actionPathfinder(1.5, true, delta);
            }catch(e){}
            /*this.invalidateCollision = true;
            
            let tangent2 = targetPos.clone().sub(this.position);
            this.rotation.z = Math.atan2(tangent2.y, tangent2.x) - Math.PI/2;

            this.AxisFront.x = (tangent2.x / distance);
            this.AxisFront.y = (tangent2.y / distance);
            
            this.force = 5.40;
            this.animState = ModuleCreature.AnimState.RUNNING;*/
          }else{
            this.animState = ModuleCreature.AnimState.IDLE;
            this.force = 0;
            this.actionQueue.shift();
          }
        break;
        case ModuleCreature.ACTION.USEOBJECT:
          distance = Utility.Distance2D(this.position, action.object.position);
          if(distance > 1.5){
            try{
              this.actionPathfinder(1.5, undefined, delta);
            }catch(e){}
          }else{
            this.animState = ModuleCreature.AnimState.IDLE;
            this.force = 0;
            //console.log(action.object);

            this.setFacing(
              Math.atan2(
                this.position.y - action.object.position.y,
                this.position.x - action.object.position.x
              ) + Math.PI/2,
              false
            );

            if(action.object != Game.player){
              action.object.use(this);
            }

            this.actionQueue.shift()
            
          }
        break;
        case ModuleCreature.ACTION.OPENDOOR:
          distance = Utility.Distance2D(this.position, action.object.position);
          
          if(distance > 2 && !action.object.box.intersectsBox(this.box)){
            try{
              this.actionPathfinder(2, undefined, delta);
            }catch(e){}
          }else{
            this.animState = ModuleCreature.AnimState.IDLE;
            this.force = 0;
            //console.log(action.object);

            this.setFacing(
              Math.atan2(
                this.position.y - action.object.position.y,
                this.position.x - action.object.position.x
              ) + Math.PI/2,
              false
            );

            if(action.object == Game.player){
              this.actionQueue.shift()
            }else{
              action.object.use(Game.player);
              this.actionQueue.shift()
            }
            
          }
        break;
        case ModuleCreature.ACTION.OPENLOCK:

          if(!action.shouted){
            action.shouted = true;
            this.PlaySoundSet(SSFObject.TYPES.UNLOCK);
          }

          distance = Utility.Distance2D(this.position, action.object.position);
          if(distance > 1.5){
            try{
              this.actionPathfinder(1.5, undefined, delta);
            }catch(e){}
          }else{
            this.animState = ModuleCreature.AnimState.IDLE;
            this.force = 0;
                              
            this.setFacing(
              Math.atan2(
                this.position.y - action.object.position.y,
                this.position.x - action.object.position.x
              ) + Math.PI/2, 
              false
            );

            if(action.timer == undefined){
              action.timer = 1.5;
              action.object.audioEmitter.PlaySound('gui_lockpick');
            }

            if(!this.isSimpleCreature()){
              if(action.object instanceof ModuleDoor){
                this.overlayAnimation = 'unlockdr';
              }else{
                this.overlayAnimation = 'unlockcntr';
              }
            }

            action.timer -= delta;

            if(action.timer <= 0){
              action.object.attemptUnlock(this);
              this.actionQueue.shift();
            }
            
          }
        break;
        case ModuleCreature.ACTION.DIALOGOBJECT:
          //console.log('DIALOGOBJECT', action);
          if(!Game.inDialog){
            distance = Utility.Distance2D(this.position, action.object.position);
            if(distance > 4.5 && !action.ignoreStartRange){
              try{
                this.actionPathfinder(4.5, undefined, delta);
              }catch(e){}
            }else{
              this.animState = ModuleCreature.AnimState.IDLE;
              this.force = 0;

              action.object._conversation = action.conversation;
              this._conversation = action.conversation;

              let caller = this;
              let target = action.object;

              this.heardStrings = [];
              caller.heardStrings = [];
              if(target.scripts.onDialog instanceof NWScriptInstance){
                target.onDialog(caller, -1);
              }else{
                Game.InGameDialog.StartConversation(action.conversation, target, caller);
              }
              this.actionQueue.shift();
            }
          }else{
            console.log('Already in dialog', action);
            this.actionQueue.shift();
          }
        break;
        case ModuleCreature.ACTION.MOVETOPOINT:
          if(action.instant){
            //console.log('INSTANT MOVE', this.getName(), '--->', action.object.getName(), this.position.clone(), action.object.position.clone());
            this.setPosition(action.object.position);
            this.setFacing(action.object.rotation.z, false);
            this.groundFace = undefined;
            this.lastGroundFace = undefined;
            //this.getCurrentRoom();
            this.findWalkableFace();
            this.actionQueue.shift();
          }else{
            distance = Utility.Distance2D(this.position, action.object.position);
            if(distance > (action.distance || 0.1)){
              try{
                this.actionPathfinder((action.distance || 0.1), action.run, delta);
              }catch(e){}
            }else{
              this.animState = ModuleCreature.AnimState.IDLE;
              this.force = 0;
              this.actionQueue.shift()
            }
          }
        break;
        case ModuleCreature.ACTION.ATTACKOBJECT:
          this.resetExcitedDuration();
          if(!action.combatAction.isCutsceneAttack){
            if(action.object.isDead()){
              this.actionQueue.shift();
            }else{
              distance = Utility.Distance2D(this.position, action.object.position);
              if(distance > ( this.getEquippedWeaponType() == 4 ? 15.0 : 2.0 ) ){
                try{
                  this.actionPathfinder(( this.getEquippedWeaponType() == 4 ? 15.0 : 2.0 ), undefined, delta);
                }catch(e){}
              }else{
                this.animState = ModuleCreature.AnimState.IDLE;
                this.force = 0;
                this.actionQueue.shift();
              }
            }
          }
        break;
        case ModuleCreature.ACTION.CASTSPELL:
          //console.log('ACTION.CASTSPELL', action);
          if(action.spell.inRange(action.object, this)){
            action.spell.useTalentOnObject(action.object, this);
            this.actionQueue.shift();
          }else{
            this.actionPathfinder(action.spell.getCastRange(), undefined, delta);
          }
        break;
        default:
          console.log('Unknown', action);
          distance = Utility.Distance2D(this.position, action.object.position);
          if(distance > 1.5){
            try{
              this.actionPathfinder(1.5, undefined, delta);
            }catch(e){}
          }else{
            this.animState = ModuleCreature.AnimState.IDLE;
            this.force = 0;

            this.actionQueue.shift();
          }
        break;
      }
    }
  }

  updateListeningPatterns(){

    if(this.isDead())
      return;

    if(this.heardStrings.length){

      //if(this.scripts.onDialog instanceof NWScriptInstance && this.scripts.onDialog.running)
      //  return;

      let str = this.heardStrings[0];
      //console.log('HeardString', this.id, str, this.isListening, this);
      if(this.isListening && str){
        let pattern = this.listeningPatterns[str.string];

        if(this == Game.player){
          //console.log('heardString', str, pattern);
        }

        if(typeof pattern != 'undefined'){
          if(this == Game.player){
            //console.log('updateListeningPatterns', pattern, str);
          }

          this.heardStrings.shift();
          this.onDialog(str.speaker, pattern);
        }
      }
    }
  }

  updatePerceptionList(delta = 0){

    if(this.isDead())
      return true;

    if(this.room instanceof ModuleRoom){
      if(!this.room.model.visible){
        return;
      }
    }

    if(!this.spawned || !Game.module.readyToProcessEvents){
      return;
    }

    if(this.perceptionTimer < 3){
      this.perceptionTimer += 1 * delta;
      return;
    }

    this.perceptionTimer = 0;

    //if(!Engine.Flags.CombatEnabled)
    //  return;

    //Check modules creatures
    let creatureLen = Game.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++ ){
      let creature = Game.module.area.creatures[i];
      if(this != creature){
        if(!creature.isDead()){
          let distance = this.position.distanceTo(creature.position);
          if(distance < this.getPerceptionRangePrimary() && this.hasLineOfSight(creature)){
            if(PartyManager.party.indexOf(this) == -1){
              if(this.isHostile(creature)){
                this.resetExcitedDuration();
              }
            }
            
            this.notifyPerceptionSeenObject(creature, true);
          }else if(distance < this.getPerceptionRangeSecondary() && this.hasLineOfSight(creature)){
            this.notifyPerceptionHeardObject(creature, true);
          }
        }else{
          this.notifyPerceptionSeenObject(creature, false);
        }
      }
    }

    //Check party creatures
    let partyLen = PartyManager.party.length;
    for(let i = 0; i < partyLen; i++ ){
      let creature = PartyManager.party[i];
      if(this != creature){
        if(!creature.isDead()){
          let distance = this.position.distanceTo(creature.position);
          if(distance < this.getPerceptionRangePrimary() && this.hasLineOfSight(creature)){
            if(PartyManager.party.indexOf(this) == -1){

              if(this.isHostile(creature)){
                this.resetExcitedDuration();
              }

              this.notifyPerceptionSeenObject(creature, true);
            }
          }else if(distance < this.getPerceptionRangeSecondary() && this.hasLineOfSight(creature)){
            this.notifyPerceptionHeardObject(creature, true);
          }
        }else{
          this.notifyPerceptionSeenObject(creature, false);
        }
      }
    }
    
  }

  actionPathfinder(distance, run = !this.walk, delta = 1){
    let distanceToTarget = Utility.Distance2D(this.position, this.action.object.position);
    if(this.action.path == undefined){
      if(this.action.goal == ModuleCreature.ACTION.FOLLOWLEADER){
        this.action.path = Game.module.area.path.traverseToPoint(this.position, PartyManager.GetFollowPosition(this));
        //this.action.path.push(PartyManager.GetFollowPosition(this));
        distanceToTarget = Utility.Distance2D(this.position, this.action.object.position);
      }else if(this.action.goal == ModuleCreature.ACTION.ATTACKOBJECT){
        if(this.getEquippedWeaponType() == 4){ //RANGED
          this.action.path = Game.module.area.path.traverseToPoint(this.position, this.action.object.position);
        }else{ //MELEE
          this.action.path_realtime = true;
          let openSpot = this.action.object.getClosesetOpenSpot(this);
          if(typeof openSpot != 'undefined'){
            //console.log('openSpot', this.getName(), openSpot);
            this.action.path = Game.module.area.path.traverseToPoint(this.position, openSpot.targetVector);
            this.action.path.unshift(this.action.object.position.clone());
            this.action.openSpot = openSpot;
            distanceToTarget = Utility.Distance2D(this.position, openSpot.targetVector);
          }else{
            distanceToTarget = Utility.Distance2D(this.position, this.action.object.position);
            console.error('openSpot', 'Not found');
          }
        }
      }else if(this.action.goal == ModuleCreature.ACTION.CASTSPELL){
        //if(PartyManager.party.indexOf(this) >= 0){
          this.action.path_realtime = true;
          let openSpot = this.action.object.getClosesetOpenSpot(this);
          if(typeof openSpot != 'undefined'){
            //console.log('openSpot', this.getName(), openSpot);
            this.action.path = Game.module.area.path.traverseToPoint(this.position, openSpot.targetVector);
            this.action.path.unshift(this.action.object.position.clone());
            this.action.openSpot = openSpot;
            distanceToTarget = Utility.Distance2D(this.position, openSpot.targetVector);
          }else{
            distanceToTarget = Utility.Distance2D(this.position, this.action.object.position);
            console.error('openSpot', 'Not found');
          }
        //}
      }else{
        this.action.path = Game.module.area.path.traverseToPoint(this.position, this.action.object.position);
        distanceToTarget = Utility.Distance2D(this.position, this.action.object.position);
      }
      this.action.path_timer = 20;
    }

    if(this.action.openSpot){
      distanceToTarget = Utility.Distance2D(this.position, this.action.openSpot.targetVector);
    }

    this.invalidateCollision = true;
    let point = this.action.path[0];

    if(this.blockingTimer >= 5 || this.collisionTimer >= 1){
      /*point = this.action.path[this.action.path.length - 1];
      this.action.path = [point];
      
      if(!(point instanceof THREE.Vector3))
        point = point.vector;

      this.setPosition(point);*/

      this.blockingTimer = 0;
      this.collisionTimer = 0;
    }

    if(point == undefined)
      point = this.action.object.position;

    if(!(point instanceof THREE.Vector3))
      point = point.vector;

    let pointDistance = Utility.Distance2D(this.position, point);
    if(pointDistance > distance){
      let tangent = point.clone().sub(this.position.clone());
      let atan = Math.atan2(-tangent.y, -tangent.x);
      this.setFacing(atan + Math.PI/2, false);
      this.AxisFront.x = Math.cos(atan);
      this.AxisFront.y = Math.sin(atan);

      if(PartyManager.party.indexOf(this) >= 0){

        //Check Creature Avoidance
        let threatening = undefined;
        let threateningDistance = Infinity;
        let ahead = this.position.clone().sub(this.AxisFront.clone().normalize()).multiplyScalar(1);
        let ahead2 = this.position.clone().sub(this.AxisFront.clone().normalize()).multiplyScalar(1).multiplyScalar(0.5);
        for(let i = 0; i < Game.module.area.creatures.length; i++){
          let creature = Game.module.area.creatures[i];
          if(creature === this || creature.isDead())
            continue;

          let hitDistance = parseInt(creature.getAppearance().hitdist);
          let creaturePos = creature.position.clone();
          let distance = this.position.distanceTo(creature.position);

          if(ahead.distanceTo(creaturePos) <= hitDistance){
            if(ahead.distanceTo(creaturePos) < threateningDistance){
              threatening = creature;
              threateningDistance = ahead.distanceTo(creaturePos);
            }
          }else if(ahead2.distanceTo(creaturePos) <= hitDistance){
            //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
            if(ahead2.distanceTo(creaturePos) < threateningDistance){
              threatening = creature;
              threateningDistance = ahead2.distanceTo(creaturePos);
            }
          }   
        }

        for(let i = 0; i < PartyManager.party.length; i++){
          let creature = PartyManager.party[i];
          if(creature === this || creature.isDead())
            continue;

          let hitDistance = parseInt(creature.getAppearance().hitdist);
          let creaturePos = creature.position.clone();
          let distance = this.position.distanceTo(creature.position);

          if(ahead.distanceTo(creaturePos) <= hitDistance){
            if(ahead.distanceTo(creaturePos) < threateningDistance){
              threatening = creature;
              threateningDistance = ahead.distanceTo(creaturePos);
            }
          }else if(ahead2.distanceTo(creaturePos) <= hitDistance){
            //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
            if(ahead2.distanceTo(creaturePos) < threateningDistance){
              threatening = creature;
              threateningDistance = ahead2.distanceTo(creaturePos);
            }
          }
        }

        if(threatening instanceof ModuleCreature){
          //console.log(threatening.getName(), 'is threatening', this.getName());

          let dVector = threatening.position.clone().sub(this.position).normalize();

          
          let creaturePos = threatening.position.clone();        
          let avoidance_force = ahead.clone().sub(dVector);
          avoidance_force.z = 0;
          let newTarget = this.position.clone().add(avoidance_force);

          let tangent = newTarget.sub(this.position.clone());
          let atan = Math.atan2(-avoidance_force.y, -avoidance_force.x);
          this.rotation.z = (atan + Math.PI/2); //(1 - delta) * this.rotation.z + delta * (atan + Math.PI/2)
          this.AxisFront.x = Math.cos(atan);
          this.AxisFront.y = Math.sin(atan);

          this.blockingTimer += 1;
        }else{
          if(this.blockingTimer > 0){
            this.blockingTimer -= 0.5;
          }
          if(this.blockingTimer > 0)
            this.blockingTimer = 0;
        }

      }

      let arrivalDistance = distance;
      if(this.action.openSpot){
        arrivalDistance = 1.5;
      }

      this.AxisFront.negate();
      this.force = Math.min( 1, Math.max( 0, ( ( distanceToTarget - arrivalDistance ) / 1 ) ) );
      this.walk = !run;
      this.animState = run ? ModuleCreature.AnimState.RUNNING : ModuleCreature.AnimState.WALKING;
    }else{
      this.action.path.shift();
    }

    if(this.action.path_timer < 0){
      if(this.action.path_realtime){
        this.action.path = undefined;
        this.action.path_timer = 20;
        //console.log('Path invalidated');
      }
    }else{
      this.action.path_timer -= 10*delta;
    }

    if(pointDistance > distance){
      return false;
    }else{
      return true;
    }

  }

  updateCombat(delta = 0){

    if(this.lastAttackTarget instanceof ModuleObject && this.lastAttackTarget.isDead()){
      this.lastAttackTarget = undefined;
      this.clearTarget();
    }

    if(this.lastAttacker instanceof ModuleObject && this.lastAttacker.isDead())
      this.lastAttacker = undefined;

    if(this.lastAttemptedAttackTarget instanceof ModuleObject && this.lastAttemptedAttackTarget.isDead())
      this.lastAttemptedAttackTarget = undefined;

    if(this.lastAttemptedSpellTarget instanceof ModuleObject && this.lastAttemptedSpellTarget.isDead())
      this.lastAttemptedSpellTarget = undefined;

    if(this.lastDamager instanceof ModuleObject && this.lastDamager.isDead())
      this.lastDamager = undefined;

    if(this.lastSpellAttacker instanceof ModuleObject && this.lastSpellAttacker.isDead())
      this.lastSpellAttacker = undefined;

    if(this.isDead()){
      this.clearTarget();
      if(CombatEngine.combatants.indexOf(this) >= 0){
        CombatEngine.RemoveCombatant(this);
      }
    }

    if(this.combatState){
    
      //If creature is being controller by the player, keep at least one basic action in the attack queue while attack target is still alive 
      if((Game.getCurrentPlayer() == this) && this.lastAttackTarget && !this.lastAttackTarget.isDead() && !this.combatAction && !this.combatQueue.length){
        this.attackCreature(this.lastAttackTarget, undefined);
      }

      /*if(this.action && (this.action.goal == ModuleCreature.ACTION.ATTACKOBJECT || this.action.goal == ModuleCreature.ACTION.CASTSPELL)){
        if(this.action.object.getHP() <= 0){
          this.clearTarget();
          this.actionQueue.shift();
          return;
        }
      }else{
        return;
      }*/

      CombatEngine.AddCombatant(this);

      return;

      if(this.combatQueue.length){
        if(this.combatAction == undefined && this.combatQueue.length){
          this.combatAction = this.combatQueue.shift();
          this.combatAction.ready = false;
          //this.combatActionTimer = 0;
        }
      }else{
        //this.combatActionTimer = 3;
      }

      if(this.combatAction != undefined){
        if(this.combatAction != undefined && this.combatAction.target != this){
          if(!this.actionQueue.length || this.actionQueue[0].goal != ModuleCreature.ACTION.ATTACKOBJECT){
            /*this.actionQueue.unshift(
              {object: this.combatAction.target, goal: ModuleCreature.ACTION.ATTACKOBJECT, isCutsceneAttack: this.combatAction.isCutsceneAttack}
            )*/
          }
          
        }

        this.lastAttackTarget = this.combatAction.target;

        if(this.combatAction.isCutsceneAttack){
          this.combatAction.ready = true;
        }/*else if(this.combatRoundTimer >= 1.5){
          if(this.actionInRange(this.combatAction)){
            this.combatAction.ready = true;
          }else{
            //console.log('Player target not in range!');
          }
        }else{
          this.combatRoundTimer += delta;
        }*/
        /*else if(PartyManager.party.indexOf(this) >= 0 && CombatEngine.roundType == CombatEngine.ROUNDTYPES.PLAYER && !this.combatAction.ready){
          if(this.actionInRange(this.combatAction)){
            this.combatAction.ready = true;
          }else{
            //console.log('Player target not in range!');
          }
        }else if(PartyManager.party.indexOf(this) == -1 && CombatEngine.roundType == CombatEngine.ROUNDTYPES.CREATURE && !this.combatAction.ready){
          if(this.actionInRange(this.combatAction)){
            this.combatAction.ready = true;
          }
        }else{
          //this.combatActionTimer += delta;
        }*/
      }

    }
  }

  updateCasting(delta = 0){
    //Update active spells
    for(let i = 0, len = this.casting.length; i < len; i++){
      this.casting[i].spell.update(this.casting[i].target, this, this.casting[i], delta);
    }

    //Remove completed spells
    let i = this.casting.length;
    while (i--) {
      if(this.casting[i].completed){
        this.casting.splice(i, 1);
      }
    }

  }

  clearTarget(){
    //console.log('clearTarget');
    this.combatQueue = [];
    this.combatAction = undefined;
    this.lastAttackTarget = undefined;
    this.lastDamager = undefined;
    //this.combatActionTimer = 0;
    //CombatEngine.RemoveCombatant(this);
  }

  actionInRange(action = undefined){
    if(action){
      if(action.type == ModuleCreature.ACTION.CASTSPELL){
        return action.spell.inRange(action.target, this);
      }else{
        let distance = this.position.distanceTo(action.target.position);
        //console.log('actionInRange', distance, action.target.position);
        return distance < ( (this.getEquippedWeaponType() == 1 || this.getEquippedWeaponType() == 3) ? 2.0 : 15.0 );
      }
    }
    return false;
  }

  //Return the best point surrounding this object for the attacker to move towards
  getBestAttackPoint(targeter = undefined){
    if(targeter instanceof ModuleCreature){
      
    }
    return {x: 0, y: 0, z: 0};
  }

  updateAnimationState(){

    if(!(this.model instanceof THREE.AuroraModel))
      return;

    let currentAnimation = this.model.getAnimationName();

    if(this.overlayAnimation && !this.isDead()){
      let overlayAnimationData = AuroraModelAnimation.GetAnimation2DA(this.overlayAnimation);
      if(overlayAnimationData){
        if( (this.animState != ModuleCreature.AnimState.WALKING && this.animState != ModuleCreature.AnimState.RUNNING) || overlayAnimationData.overlay == 1){
          if(currentAnimation != this.overlayAnimation){
            this.dialogAnimation = undefined;
            this.model.playAnimation(this.overlayAnimation, false, () => {
              //console.log('Overlay animation completed');
              this.overlayAnimation = undefined;
            });
          }
          return;
        }else{
          this.overlayAnimation = undefined;
        }
      }else{
        this.overlayAnimation = undefined;
      }
    }else{
      this.overlayAnimation = undefined;
    }

    //if(this.action && this.action.goal == ModuleCreature.ACTION.ANIMATE)
    //  return;

    if(Game.inDialog && this.dialogAnimation && !this.speed && !this.isDead())
      return;

    let animation = this.animationConstantToAnimation(this.animState);
    if(animation){
      if(currentAnimation != animation.name.toLowerCase()){
        let aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
        this.getModel().playAnimation(animation.name.toLowerCase(), aLooping, () => {
          this.animState = ModuleCreature.AnimState.PAUSE;
        });
      }
    }else{
      console.error('Animation Missing', this.getTag(), this.getName(), this.animState);
      this.animState = ModuleCreature.AnimState.PAUSE;
    }
    return;

    
    let modeltype = this.getAppearance().modeltype;
    
    let hasHands = this.model.rhand instanceof THREE.Object3D && this.model.lhand instanceof THREE.Object3D;

    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);
    let randomPauseIdx = 0;
    let isSimple = this.isSimpleCreature();
    let weaponType = this.getCombatAnimationWeaponType();

    let idleAnimations = ['pause1', 'pause1', 'pause1', 'pause2'];//, 'pause3', 'hturnl', 'hturnr'];
    let idleAnimationsS = ['cpause1', 'cpause1','cpause1','cpause2', 'cpause3'];

    /*if(this.anim && currentAnimation && Game.inDialog){
      return;
    }*/

    if(this.model instanceof THREE.AuroraModel && !this.model.bonesInitialized){
      return;
    }

    if(this.casting.length  && this.casting[0].spell){
      if(this.casting[0].conjuring){
        if(currentAnimation != this.casting[0].spell.getConjureAnimation()){
          this.getModel().playAnimation(this.casting[0].spell.getConjureAnimation(), false);
        }
      }else if(this.casting[0].casting){
        if(currentAnimation != this.casting[0].spell.getCastingAnimation()){
          this.getModel().playAnimation(this.casting[0].spell.getCastingAnimation(), false);
        }
      }
    }else if( this.combatAction == undefined || !this.combatAction.ready || !this.hasWeapons() || !currentAnimation ){

      switch(this.animState){
        case ModuleCreature.AnimState.IDLE:
            if(this.isParalyzed()){
              if(currentAnimation != 'paralyzed'){
                this.getModel().playAnimation('paralyzed', false);
              }
            }else if(this.isStunned()){
              if(currentAnimation != 'sleep'){
                this.getModel().playAnimation('sleep', false);
              }
            }else if(this.isDroidStunned()){
              if(currentAnimation != 'disabled'){
                this.getModel().playAnimation('disabled', false);
              }
            }else if(this.isFrightened() || this.isHorrified()){
              if(currentAnimation != 'horror'){
                this.getModel().playAnimation('horror', false);
              }
            }else if(this.isChoking()){
              if(currentAnimation != 'choke'){
                this.getModel().playAnimation('choke', false);
              }
            }else if(this.combatState){
              if(!isSimple){
                //weaponType
                if(currentAnimation != 'g'+weaponType+'r1'){
                  this.getModel().playAnimation('g'+weaponType+'r1', false);
                }
              }else{
                if(currentAnimation != 'creadyr'){
                  this.getModel().playAnimation('creadyr', false);
                }
              }
            }else{
              switch(modeltype){
                case 'S':
                case 'L':if(idleAnimationsS.indexOf(currentAnimation) == -1){
                    this.getModel().playAnimation(idleAnimationsS[Math.round(Math.random()*(idleAnimationsS.length-1))], false);
                  }
                break;
                default:
                  
                  if(this.turning){
                    if(this.turning == 1 && currentAnimation != 'turnleft'){
                      this.getModel().playAnimation('turnleft', false);
                    }else if(this.turning == -1 && currentAnimation != 'turnright'){
                      this.getModel().playAnimation('turnright', false);
                    }
                  }else{
                    if(this.getHP()/this.getMaxHP() > .15){
                      if(idleAnimations.indexOf(currentAnimation) == -1){
                        this.getModel().playAnimation(idleAnimations[Math.round(Math.random()*(idleAnimations.length-1))], false);
                      }
                    }else{
                      if(currentAnimation != 'pauseinj'){
                        this.getModel().playAnimation('pauseinj', false);
                      }
                    }
                  }
                break;
              }
            }
        break;
        case ModuleCreature.AnimState.WALKING:
          if(this.combatState){
            switch(modeltype){
              case 'S':
              case 'L':
                if(currentAnimation != 'cwalk'){
                  this.getModel().playAnimation('cwalk', false);
                }
              break;
              default:
                if(this.getHP()/this.getMaxHP() > .15){
                  if(currentAnimation != 'walk'){
                    this.getModel().playAnimation('walk', false);
                  }
                }else{
                  if(currentAnimation != 'walkinj'){
                    this.getModel().playAnimation('walkinj', false);
                  }
                }
              break;
            }
          }else{
            switch(modeltype){
              case 'S':
              case 'L':
                if(currentAnimation != 'cwalk'){
                  this.getModel().playAnimation('cwalk', false);
                }
              break;
              default:
                if(this.getHP()/this.getMaxHP() > .15){
                  if(currentAnimation != 'walk'){
                    this.getModel().playAnimation('walk', false);
                  }
                }else{
                  if(currentAnimation != 'walkinj'){
                    this.getModel().playAnimation('walkinj', false);
                  }
                }
              break;
            }
          }
        break;
        case ModuleCreature.AnimState.RUNNING:
          switch(modeltype){
            case 'S':
            case 'L':
              if(currentAnimation != 'crun'){
                this.getModel().playAnimation('crun', false);
              }
            break;
            default:
              if(this.combatState){
                if(hasHands && bothHands){
                  switch(parseInt(rWeapon.getWeaponWield())){
                    case 2:
                      if(currentAnimation != 'runds')
                        this.getModel().playAnimation('runds', false);
                    break;
                    case 4:
                      if(currentAnimation != 'runst')
                        this.getModel().playAnimation('runst', false);
                    break;
                    case 5:
                      if(currentAnimation != 'runrf')
                        this.getModel().playAnimation('runrf', false);
                    break;
                    default:
                      if(currentAnimation != 'run')
                        this.getModel().playAnimation('run', false);
                    break;
                  }
                }else{
                  if(hasHands && rWeapon){
                    switch(parseInt(rWeapon.getWeaponWield())){
                      case 2:
                      case 3:
                        if(currentAnimation != 'runss')
                          this.getModel().playAnimation('runss', false);
                      break;
                      case 4:
                        if(currentAnimation != 'runst')
                          this.getModel().playAnimation('runst', false);
                      break;
                      case 5:
                        if(currentAnimation != 'runrf')
                          this.getModel().playAnimation('runrf', false);
                      break;
                      default:
                        if(currentAnimation != 'run')
                          this.getModel().playAnimation('run', false);
                      break;
                    }
                  }else{
                    if(currentAnimation != 'run')
                      this.getModel().playAnimation('run', false);
                  }
                }
              }else{
                if(currentAnimation != 'run'){
                  if(hasHands && bothHands){
                    if(this.getHP() / this.getMaxHP() > .15){
                      switch(parseInt(rWeapon.getWeaponWield())){
                        case 2:
                          if(currentAnimation != 'runds')
                            this.getModel().playAnimation('runds', false);
                        break;
                        case 4:
                          if(currentAnimation != 'runst')
                            this.getModel().playAnimation('runst', false);
                        break;
                        case 5:
                          if(currentAnimation != 'runrf')
                            this.getModel().playAnimation('runrf', false);
                        break;
                        default:
                          if(currentAnimation != 'run')
                            this.getModel().playAnimation('run', false);
                        break;
                      }
                    }else{
                      if(this.model.getAnimationByName('runinj') && currentAnimation != 'runinj'){
                        this.getModel().playAnimation('runinj', false);
                      }
                    }
                  }else{
                    if(hasHands && rWeapon){
                      if(this.getHP() / this.getMaxHP() > .15){
                        switch(parseInt(rWeapon.getWeaponWield())){
                          case 2:
                          case 3:
                            if(currentAnimation != 'runss')
                              this.getModel().playAnimation('runss', false);
                          break;
                          case 4:
                            if(currentAnimation != 'runst')
                              this.getModel().playAnimation('runst', false);
                          break;
                          case 5:
                            if(currentAnimation != 'runrf')
                              this.getModel().playAnimation('runrf', false);
                          break;
                          default:
                            if(currentAnimation != 'run')
                              this.getModel().playAnimation('run', false);
                          break;
                        }
                      }else{
                        if(this.model.getAnimationByName('runinj') && currentAnimation != 'runinj'){
                          this.getModel().playAnimation('runinj', false);
                        }
                      }
                    }else{
                      if(this.getHP() / this.getMaxHP() > .15){
                        if(!this.walk && this.model.getAnimationByName('run') && currentAnimation != 'run'){
                          this.getModel().playAnimation('run', false);
                        }else if(this.walk && this.model.getAnimationByName('walk') && currentAnimation != 'walk'){
                          this.getModel().playAnimation('walk', false);
                        }
                      }else{
                        if(!this.walk && this.model.getAnimationByName('runinj') && currentAnimation != 'runinj'){
                          this.getModel().playAnimation('runinj', false);
                        }else if(this.walk && this.model.getAnimationByName('walkinj') && currentAnimation != 'walkinj'){
                          this.getModel().playAnimation('walkinj', false);
                        }
                      }
                    }
                  }
                }
              }
            break;
          }
        break;
        case ModuleCreature.AnimState.DEAD:
          switch(modeltype){
            case 'S':
            case 'L':
            if(!this.deathAnimationPlayed){
              this.deathAnimationPlayed = true;
              this.getModel().playAnimation('cdie', false, () => {
                this.getModel().playAnimation('cdead', true);
              });
            }
            break;
            default:
              if(!this.deathAnimationPlayed){
                this.deathAnimationPlayed = true;
                this.getModel().playAnimation('die', false, () => {
                  this.getModel().playAnimation('dead', true);
                });
              }
            break;
          }
        break;
        case ModuleCreature.AnimState.DIE:
          switch(modeltype){
            case 'S':
            case 'L':
              if(currentAnimation != 'cdie'){
                this.getModel().playAnimation('cdie', false);
              }
            break;
            default:
              if(currentAnimation != 'die'){
                this.getModel().playAnimation('die', false);
              }
            break;
          }
        break;
      }

    }else{
      if(this.combatAction.type == ModuleCreature.ACTION.CASTSPELL){
        if(this.combatAction.conjuring){
          if(currentAnimation != 'castout1'){
            this.getModel().playAnimation('castout1', false);
          }
        }else if(this.combatAction.impact){
          if(currentAnimation != 'castoutlp1'){
            this.getModel().playAnimation('castoutlp1', false);
          }
        }
      }else{
        if(currentAnimation != this.combatAction.animation && this.combatAction.ready && !this.combatAction.animPlayed){
          this.combatAction.animPlayed = true;
          //Moved old combat logic to CombatEngine.CalculateAttackDamage()
        }
      }
    }

  }

  damage(amount = 0, oAttacker = undefined, delayTime = 0){
    if(delayTime){
      this.damageList.push({amount: amount, delay: delayTime});
    }else{
      this.subtractHP(amount);
    }
    this.lastDamager = oAttacker;
    this.lastAttacker = oAttacker;

    if(this.lastAttackTarget == undefined || (this.lastAttackTarget instanceof ModuleObject && this.lastAttackTarget.isDead()))
      this.lastAttackTarget = oAttacker;

    if(typeof oAttacker != 'undefined')
      this.onDamaged();
  }

  canMove(){
    return !this.isParalyzed() && !this.isStunned() && (this.animState != ModuleCreature.AnimState.DEAD || this.animState != ModuleCreature.AnimState.DIE) && !this.casting.length;
  }

  getCurrentAction(){
    if(this.actionQueue.length){
      return this.actionQueue[0].goal;
    }
    return 65535;
  }

  moveToObject(target = undefined, bRun = true, distance = 1.0){

    if(target instanceof ModuleObject){
      this.actionQueue.push({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: bRun,
        distance: Math.max(1.5, distance),
        instant: false
      });
    }

  }

  moveToLocation(target = undefined, bRun = true){

    if(target instanceof Game.Location || target instanceof ModuleObject){

      let distance = 0.1;
      let creatures = Game.module.area.creatures;

      //Check if creatures are to close to location
      for(let i = 0; i < creatures.length; i++){
        let creature = creatures[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

      //Check if party are to close to location
      for(let i = 0; i < PartyManager.party.length; i++){
        let creature = PartyManager.party[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

      this.actionQueue.push({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: bRun,
        distance: distance,
        instant: false
      });
    }

  }

  jumpToObject(target = undefined){
    console.log('jumpToObject', target, this);
    if(target instanceof ModuleObject){
      this.actionQueue.unshift({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: false,
        distance: 1.0,
        instant: true
      });
    }

  }

  jumpToLocation(target = undefined){
    console.log('jumpToLocation', target, this);
    if(target instanceof Game.Location || target instanceof ModuleObject){
      this.actionQueue.unshift({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: false,
        distance: 1.0,
        instant: true
      });
    }

  }

  resetExcitedDuration(){
    this.excitedDuration = 10000;
  }

  cancelExcitedDuration(){
    this.excitedDuration = 0;
  }

  updateExcitedDuration(delta = 0){
    if(this.isDead()){
      this.excitedDuration = 0;
      this.cancelCombat();
      this.weaponPowered(false);
    }

    if(this.excitedDuration > 0){
      this.excitedDuration -= (1000 * delta);
      this.combatState = true;
    }

    if(this.excitedDuration <= 0){
      this.combatState = false;
      this.excitedDuration = 0;
      this.weaponPowered(false);
    }
  }

  isDueling(){
    return (this.lastAttackTarget?.lastAttackTarget == this && this.lastAttackTarget?.getEquippedWeaponType() == 1 && this.getEquippedWeaponType() == 1);
  }

  isDuelingObject( oObject = undefined ){
    return (oObject instanceof ModuleObject && this.lastAttackTarget == oObject && oObject.lastAttackTarget == this && oObject.getEquippedWeaponType() == 1 && this.getEquippedWeaponType() == 1);
  }

  attackCreature(target = undefined, feat = undefined, isCutsceneAttack = false, attackDamage = 0, attackAnimation = null, attackResult = undefined){

    //console.log('attackCreature', this, target, feat);

    if(target == undefined)
      return;

    if(target == this)
      target = Game.player;

    if(target.isDead())
      return;

    this.resetExcitedDuration();

    CombatEngine.AddCombatant(this);

    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    let attackType = 1;
    let icon = 'i_attack';
    let isMelee = true;
    let isRanged = false;

    if(attackKey == 'b'){
      isMelee = false;
      isRanged = true;
    }

    if(typeof feat != 'undefined'){
      icon = feat.icon;
      //console.log('Attacking with feat', feat);
      if(attackKey == 'm'){
        attackKey = 'f';
        switch(feat.id){
          case 81:
          case 19:
          case 8:
            attackType = 1;
          break;
          case 83:
          case 17:
          case 28:
            attackType = 3;
          break;
          case 53:
          case 91:
          case 11:
            attackType = 2;
          break;
        }
      }else if(attackKey == 'b'){
        switch(feat.id){
          case 77:
          case 20:
          case 31:
            attackType = 3;
          break;
          case 82:
          case 18:
          case 29:
            attackType = 4;
          break;
          case 26:
          case 92:
          case 30:
            attackType = 2;
          break;
        }
      }
    }

    this.weaponPowered(true);

    this.lastAttackAction = ModuleCreature.ACTION.ATTACKOBJECT;
    this.lastAttackTarget = target;
    this.lastAttemptedAttackTarget = target;

    //Get random basic melee attack in combat with another melee creature that is targeting you
    if(attackKey == 'm'){
      if(this.lastAttackTarget?.lastAttackTarget == this && this.lastAttackTarget?.getEquippedWeaponType() == 1 && this.getEquippedWeaponType() == 1){
        attackKey = 'c';
        attackType = Math.round(Math.random()*4)+1;
      }
    }
    
    let animation = attackKey+weaponWield+'a'+attackType;
    if(isCutsceneAttack){
      animation = attackAnimation;
    }

    //console.log('Combat Animation', animation);

    let combatAction = {
      target: target,
      type: ModuleCreature.ACTION.ATTACKOBJECT,
      icon: icon,
      animation: animation,
      feat: feat,
      isMelee: isMelee,
      isRanged: isRanged,
      ready: false,
      isCutsceneAttack: isCutsceneAttack,
      attackResult: attackResult,
      damage: attackDamage
    };

    //if(!isCutsceneAttack){
      if(this.combatAction == undefined){
        this.combatAction = combatAction;
      }else{
        this.combatQueue.push(combatAction);
      }
      this.actionQueue = [];
    //}
    
    this.actionQueue.push({
      object: target,
      goal: ModuleCreature.ACTION.ATTACKOBJECT,
      combatAction: combatAction
    });

  }

  useTalentOnObject(talent, oTarget){
    if(typeof talent != 'undefined'){

      this.actionQueue.unshift({
        object: oTarget,
        spell: talent,
        goal: ModuleCreature.ACTION.CASTSPELL
      });

      //talent.useTalentOnObject(oTarget, this);
    }
  }

  castSpellAtCreature(target = undefined, spellId = 0){

    if(target == undefined)
      return;

    this.resetExcitedDuration();

    CombatEngine.AddCombatant(this);

    this.combatQueue.push({
      target: target,
      type: ModuleCreature.ACTION.CASTSPELL,
      icon: 'ip_heal',
      animation: animation,
      ready: false
    });

  }

  playOverlayAnimation(NWScriptAnimId = -1){

    switch(NWScriptAnimId){
      case 123:
        this.overlayAnimation = 'diveroll';
      break;
    }

  }

  dialogPlayAnimation(anim = '', loop = false, speed = 1){
    this.dialogAnimation = { 
      //goal: ModuleCreature.ACTION.ANIMATE,
      animation: anim,
      speed: speed || 1,
      time: loop ? -1 : 0
    };
    /*let currentAction = this.actionQueue[0];
    if(currentAction && currentAction.goal == ModuleCreature.ACTION.ANIMATE){
      this.actionQueue[0] = { 
        goal: ModuleCreature.ACTION.ANIMATE,
        animation: anim,
        speed: 1,
        time: loop ? -1 : 0
      };
    }else{
      this.actionQueue.unshift({ 
        goal: ModuleCreature.ACTION.ANIMATE,
        animation: anim,
        speed: 1,
        time: loop ? -1 : 0
      });
    }*/
  }

  clearAllActions(skipUnclearable = false){
    this.combatQueue = [];
    //Reset the anim state
    this.animState = 0;
    //this.actionQueue = [];
    if(skipUnclearable){
      let i = this.actionQueue.length;
      while(i--){
        let action = this.actionQueue[i];
        if(typeof action.clearable !== 'undefined'){
          if(action.clearable){
            this.actionQueue.splice(i , 1);
          }
        }else{
          this.actionQueue.splice(i , 1);
        }
      }
    }else{
      this.actionQueue = [];
    }

    this.combatAction = undefined;
    //this.clearTarget();
  }

  cancelCombat(){
    this.clearTarget();
    this.combatState = false;
    this.cancelExcitedDuration();
    this.overlayAnimation = undefined;
  }

  getDamageAnimation( attackAnim = undefined ){
    
    let attackAnimIndex = -1;

    let modeltype = this.getAppearance().modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = Global.kotor2DA.animations;
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    let combatAnimation = Global.kotor2DA.combatanimations.getByID(attackAnimIndex);
    //console.log('getDamageAnimation', this.getName(), attackAnim, attackAnimIndex, combatAnimation, 'damage'+weaponWield);
    if(combatAnimation){
      let damageAnimIndex = combatAnimation['damage'+weaponWield];
      let damageAnim = anims.getByID(damageAnimIndex);
      if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
        //console.log('damage anim', this.getName(), damageAnim.name)
        return damageAnim.name;
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cdamages';
    }
    //console.log(attackAnim);
    
    switch(attackAnim){
      case 'c2a1':
        return 'c2d1'
      case 'c2a2':
        return 'c2d2'
      case 'c2a3':
        return 'c2d3'
      case 'c2a4':
        return 'c2d4'
      case 'c2a5':
        return 'c2d5'
    }

    return 'g'+weaponWield+'d1';

  }

  getDodgeAnimation( attackAnim = undefined ){

    let attackAnimIndex = -1;

    let modeltype = this.getAppearance().modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = Global.kotor2DA.animations;
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    //console.log('getDodgeAnimation', this.getName(), attackAnim, attackAnimIndex);

    let combatAnimation = Global.kotor2DA.combatanimations.getByID(attackAnimIndex);
    if(combatAnimation){
      if(combatAnimation.hits == 1 && [4, 2, 3].indexOf(weaponWield) >= 0){
        let damageAnimIndex = combatAnimation['parry'+weaponWield];
        let damageAnim = anims.getByID(damageAnimIndex);
        if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
          //console.log('dodge/parry anim', this.getName(), damageAnim.name)
          return damageAnim.name;
        }
      }
      
      let damageAnimIndex = combatAnimation['dodge'+weaponWield];
      let damageAnim = anims.getByID(damageAnimIndex);
      if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
        //console.log('dodge anim', this.getName(), damageAnim.name)
        return damageAnim.name;
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cdodgeg';
    }
    //console.log(attackAnim);
    
    switch(attackAnim){
      case 'c2a1':
        return 'c2d1'
      case 'c2a2':
        return 'c2d2'
      case 'c2a3':
        return 'c2d3'
      case 'c2a4':
        return 'c2d4'
      case 'c2a5':
        return 'c2d5'
    }

    return 'g'+weaponWield+'g1';

  }

  getParryAnimation( attackAnim = undefined ){

    let attackAnimIndex = -1;

    let modeltype = this.getAppearance().modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = Global.kotor2DA.animations;
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    //console.log('getParryAnimation', this.getName(), attackAnim, attackAnimIndex);

    let combatAnimation = Global.kotor2DA.combatanimations.getByID(attackAnimIndex);
    if(combatAnimation){
      let damageAnimIndex = combatAnimation['parry'+weaponWield];
      let damageAnim = anims.getByID(damageAnimIndex);
      if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
        //console.log('parry anim', this.getName(), damageAnim.name)
        return damageAnim.name;
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cdodgeg';
    }
    //console.log(attackAnim);
    switch(attackAnim){
      case 'c2a1':
        return 'c2p1'
      case 'c2a2':
        return 'c2p2'
      case 'c2a3':
        return 'c2p3'
      case 'c2a4':
        return 'c2p4'
      case 'c2a5':
        return 'c2p5'
    }

    return 'g'+weaponWield+'g1';
    
  }

  getDeflectAnimation(){
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    //console.log('getDamageAnimation', 'g'+weaponWield+'d1');
    return 'g'+weaponWield+'n1';
  }

  getCombatAnimationAttackType(){
    let weapon = this.equipment.RIGHTHAND;
    let weaponType = 0;
    //let weaponWield = this.getCombatAnimationWeaponType();

    if(this.equipment.RIGHTHAND){
      weaponType = parseInt(this.equipment.RIGHTHAND.getWeaponType());

      switch(weaponType){
        case 4:
          return 'b';
        case 1:
          return 'm';
        break;
      }

    }else if(this.equipment.CLAW1){
      weaponType = parseInt(this.equipment.CLAW1.getWeaponType());

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else if(this.equipment.CLAW2){
      weaponType = parseInt(this.equipment.CLAW2.getWeaponType());

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else if(this.equipment.CLAW3){
      weaponType = parseInt(this.equipment.CLAW3.getWeaponType());

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else{
      return 'g';
    }

    /*if(weaponWield == 0)//this.isSimpleCreature())
      return 'm';

    if(weaponWield == 5 || weaponWield == 6 || weaponWield == 7 || weaponWield == 8 || weaponWield == 9){
      return 'b';
    }
    return 'c';*/
  }

  //Return the WeaponType ID for the current equipped items
  // g*r1 in this case * is the value we are trying to determine

  getCombatAnimationWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let cWeapon1 = this.equipment.CLAW1;
    let cWeapon2 = this.equipment.CLAW2;
    let cWeapon3 = this.equipment.CLAW3;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);

    if(cWeapon1 || cWeapon2 || cWeapon3 || this.isSimpleCreature()){
      return 0;
    }

    let weapon = rWeapon || lWeapon;

    if(weapon){

      if(bothHands){
        switch(parseInt(weapon.getWeaponWield())){
          case 1: //Stun Baton
          case 2: //Single Blade Melee
            return 4;
          case 4: //Blaster
            return 6;
        }
      }else{
        switch(parseInt(weapon.getWeaponWield())){
          case 1: //Stun Baton
            return 1;
          case 2: //Single Blade Melee
            return 2;
          case 3: //Double Blade Melee
            return 3;
          case 4: //Blaster
            return 5;
          case 5: //Blaster Rifle
            return 7;
          case 6: //Heavy Carbine
            return 9;
        }
      }
    }

    //If no weapons are equipped then use unarmed animations
    return 8;

  }

  getEquippedWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let claw1 = this.equipment.CLAW1;
    let claw2 = this.equipment.CLAW2;
    let claw3 = this.equipment.CLAW3;

    if(rWeapon){
      return parseInt(rWeapon.getWeaponType());
    }

    if(lWeapon){
      return parseInt(lWeapon.getWeaponType());
    }

    if(claw1){
      return parseInt(claw1.getWeaponType());
    }

    if(claw2){
      return parseInt(claw2.getWeaponType());
    }

    if(claw3){
      return parseInt(claw3.getWeaponType());
    }

    return 0;
  }

  isRangedEquipped(){
    if(this.equipment.RIGHTHAND){
      return this.equipment.RIGHTHAND.isRangedWeapon();
    }

    if(this.equipment.LEFTHAND){
      return this.equipment.LEFTHAND.isRangedWeapon();
    }

    if(this.equipment.CLAW1){
      return this.equipment.CLAW1.isRangedWeapon();
    }

    if(this.equipment.CLAW2){
      return this.equipment.CLAW2.isRangedWeapon();
    }

    if(this.equipment.CLAW3){
      return this.equipment.CLAW3.isRangedWeapon();
    }

    return false;
  }

  updateItems(delta = 0){

    if(this.equipment.RIGHTHAND instanceof ModuleItem){
      if(this.equipment.RIGHTHAND.model instanceof THREE.AuroraModel){
        this.equipment.RIGHTHAND.model.update(delta)
      }
    }

    if(this.equipment.LEFTHAND instanceof ModuleItem){
      if(this.equipment.LEFTHAND.model instanceof THREE.AuroraModel){
        this.equipment.LEFTHAND.model.update(delta)
      }
    }

  }

  updateCollision(delta = 0){

    if(!this.model)
      return;

    let _axisFront = this.AxisFront.clone();

    //this.getCurrentRoom();
    
    let box = new THREE.Box3()
    
    if(this.model && this.model.box){
      this.model.box.setFromObject(this.model);
      this.model.sphere = this.model.box.getBoundingSphere(this.model.sphere);
      box = this.model.box.clone();
      box.translate(_axisFront);
    }

    //START Gravity

    Game.raycaster.far = 10;
    let falling = true;
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.position.clone().add( ( scratchVec3 ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    Game.raycaster.ray.direction.set(0, 0,-1);

    let aabbFaces = [];
    let intersects = [];
    let obj = undefined;

    /*if(Config.options.Game.debug.world_collision && !this.groundFace){
      for(let j = 0, jl = Game.module.area.rooms.length; j < jl; j++){
        obj = Game.module.area.rooms[j];
        if(obj && obj.walkmesh && obj.walkmesh.aabbNodes.length){
          aabbFaces.push({
            object: obj, 
            faces: obj.walkmesh.walkableFaces
          });
        }
      }
    }*/

    /*if(Config.options.Game.debug.placeable_collision){
      for(let j = 0, jl = Game.module.area.placeables.length; j < jl; j++){
        obj = Game.module.area.placeables[j];
        if(obj && obj.walkmesh && obj.model && obj.model.visible){
          if(obj.box.intersectsBox(box) || obj.box.containsBox(box)){
            aabbFaces.push({
              object: obj, 
              faces: obj.walkmesh.faces
            });
          }
        }
      }
    }*/

    if(Config.options.Game.debug.door_collision){
      for(let j = 0, jl = Game.module.area.doors.length; j < jl; j++){
        obj = Game.module.area.doors[j];
        if(obj && obj.walkmesh && !obj.isOpen()){
          //Doing distance checking instead of BB checking for now. BB checking is preferred.
          //if(obj.position.distanceTo(this.position) <= 10){
            aabbFaces.push({
              object: obj,
              faces: obj.walkmesh.faces
            });
          //}
        }
      }
    }

    //START: CREATURE COLLISION
    
    //Check creature collision
    if(Config.options.Game.debug.creature_collision){
      for(let i = 0; i < Game.module.area.creatures.length; i++){
        let creature = Game.module.area.creatures[i];
        let position = this.position.clone().add(this.AxisFront);
        
        if(creature === this || creature.isDead())
          continue;

        if(!creature.getAppearance())
          continue;

        let hitDistance = +creature.getAppearance().hitdist;
        let distance = position.distanceTo(creature.position);
        if( distance < hitDistance ){
          let pDistance = hitDistance - distance;
          scratchVec3.set(
            pDistance * Math.cos(this.rotation.z + Math.PI/2),
            pDistance * Math.sin(this.rotation.z + Math.PI/2),
            0 
          );
          position.sub(scratchVec3);
          if(this.AxisFront.clone().normalize().length() > 0){
            let ahead = position.clone().add(this.AxisFront.clone().normalize());
            let avoidance_force = ahead.clone().sub(creature.position).normalize().multiplyScalar(0.5*delta);
            avoidance_force.z = 0;
            this.AxisFront.copy(avoidance_force);
          }
          break;
        }
      }
    }

    //Check party collision
    if(Config.options.Game.debug.creature_collision){
      for(let i = 0; i < PartyManager.party.length; i++){
        let creature = PartyManager.party[i];
        let position = this.position.clone().add(this.AxisFront);

        if(creature === this || creature.isDead())
          continue;

        try{
          let hitDistance = +creature.getAppearance().hitdist;
          let distance = position.distanceTo(creature.position);
          if(distance < hitDistance){
            let pDistance = hitDistance - distance;
            scratchVec3.set(
              pDistance * Math.cos(this.rotation.z + Math.PI/2), 
              pDistance * Math.sin(this.rotation.z + Math.PI/2), 
              0 
            );
            this.position.sub(scratchVec3);
            if(this.AxisFront.clone().normalize().length() > 0){
              let ahead = position.clone().add(this.AxisFront.clone().normalize());
              let avoidance_force = ahead.clone().sub(creature.position).normalize().multiplyScalar(0.5*delta);
              avoidance_force.z = 0;
              this.AxisFront.copy(avoidance_force);
            }
            break;
          }
        }catch(e){}
      }
    }

    //END: CREATURE COLLISION

    //START: DOOR COLLISION

    let worldCollide = false;
    let collider = undefined;
    let world_collisions = [];
    for(let i = 0; i < 360; i += 30) {
      let dx = Math.cos(i), dy = Math.sin(i);
      Game.raycaster.ray.direction.set(dx, dy, 0);
      for(let k = 0, kl = aabbFaces.length; k < kl; k++){
        playerFeetRay.copy(this.position).add(this.AxisFront);
        Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);

        let castableFaces = aabbFaces[k];
        castableFaces.object.walkmesh.mesh.visible = true;
        intersects = castableFaces.object.walkmesh.raycast(Game.raycaster, castableFaces.faces) || [];
        if (intersects && intersects.length > 0 ) {
          for(let j = 0; j < intersects.length; j++){
            if(intersects[j].distance < this.getAppearance().hitdist / 2){
              if(intersects[j].face.walkIndex == 7 || intersects[j].face.walkIndex == 2){

                if(intersects[j].object.moduleObject instanceof ModuleDoor){
                  this.blocking = intersects[j].object.moduleObject;
                }

                if(!collider || collider.distance < intersects[j].distance)
                  collider = intersects[j];

                world_collisions.push(collider);
                let dot = _axisFront.clone().dot(intersects[j].face.normal);
                
                if(dot){
                  this.AxisFront.add(
                    intersects[j].face.normal.clone().multiplyScalar(-dot)
                  );
                }
                worldCollide = true;
              }
            }
          }
        }
      }
    }

    //END: DOOR COLLISION

    this.tmpPos = this.position.clone().add(this.AxisFront);
    let plcEdgeLines = [];
    for(let j = 0, jl = Game.module.area.placeables.length; j < jl; j++){
      obj = Game.module.area.placeables[j];
      if(obj && obj.walkmesh && obj.model && obj.model.visible){
        obj.box.setFromObject(obj.model);
        if(obj.box.intersectsBox(box) || obj.box.containsBox(box)){
          for(let k = 0; k < obj.walkmesh.faces.length; k++){
              //this._triangle.set(
              //  obj.walkmesh.vertices[obj.walkmesh.faces[k].a].clone(),
              //  obj.walkmesh.vertices[obj.walkmesh.faces[k].b].clone(),
              //  obj.walkmesh.vertices[obj.walkmesh.faces[k].c].clone()
              //);
              //this._triangle.a;//.applyMatrix4(obj.walkmesh.mat4);
              //this._triangle.b;//.applyMatrix4(obj.walkmesh.mat4);
              //this._triangle.c;//.applyMatrix4(obj.walkmesh.mat4);
              //if(this == Game.player)
                //console.log(this.tmpPos, this._triangle.containsPoint(this.tmpPos), this._triangle)
              
              //if(this._triangle.containsPoint(this.tmpPos)){
                //if(this == Game.player)
                //  console.log(this._triangle.containsPoint(this.tmpPos))
                  
                let perimiters = obj.walkmesh.faces[k].perimiterLines;
                for(let l = 0; l < perimiters.length; l++){
                    let perimiter = perimiters[l];
                    let v1 = perimiter.start.clone().applyMatrix4(obj.walkmesh.mat4);
                    let v2 = perimiter.end.clone().applyMatrix4(obj.walkmesh.mat4);
                    let line = new THREE.Line3(v1, v2);
                    let closestPoint = new THREE.Vector3(0, 0, 0);
                    line.closestPointToPoint(this.tmpPos, true, closestPoint);
                    let distance = closestPoint.distanceTo(this.tmpPos);
                    if(distance < 1){
                      //console.log(distance, line);
                      plcEdgeLines.push({
                        line: line,
                        closestPoint: closestPoint,
                        distance: distance,
                        maxDistance: 1,
                        position: this.tmpPos
                      });
                    }

                    /*if( Utility.LineLineIntersection(this.position.x, this.position.y, this.position.x + this.AxisFront.x, this.position.y + this.AxisFront.y, v1.x, v1.y, v2.x, v2.y) ){
                        //console.log('hi');
                        let target = new THREE.Vector3();
                        (new THREE.Line3(v1, v2)).closestPointToPoint(this.tmpPos, true, target);
                        //console.log(this.position, target);
                        this.AxisFront.copy(
                          this.tmpPos.clone().sub(target)
                        ).negate();
                        this.tmpPos = this.position.clone().add(this.AxisFront);
                        //break;
                    }*/

                    /*this._triangle.closestPointToPoint(this.position, this.wm_c_point);
                    this.AxisFront.copy(
                      this.position.clone().sub(this.wm_c_point)
                    ).negate();
                    this.AxisFront.z = 0;
                    this.tmpPos = this.position.clone().add(this.AxisFront);*/
                }
                
              //}
          }
        }
      }
    }

    if(plcEdgeLines.length){
      plcEdgeLines.sort((a, b) => (a.distance > b.distance) ? -1 : 1)
      let average = new THREE.Vector3();
      for(let i = 0; i < plcEdgeLines.length; i++){
        let edgeLine = plcEdgeLines[i];
        let distanceOffset = edgeLine.maxDistance - edgeLine.distance;
        let force = edgeLine.closestPoint.clone().sub(edgeLine.position);
        force.multiplyScalar(distanceOffset);
        average.add( force.negate() );
      }
      this.position.copy(this.tmpPos);
      this.AxisFront.copy(average.divideScalar(plcEdgeLines.length));
    }
    
    falling = true;

    let negateAxis = false;
    let testFaces = 0;
    
    if(!this.lastGroundFace){
      this.findWalkableFace();
    }

    if(!(typeof this.groundFace === 'undefined')){
      this.lastGroundFace = this.groundFace;
    }

    this.groundFace = undefined;

    if(this.lastGroundFace){

      this.tmpPos = this.position.clone().add(this.AxisFront);
      
      // if(this.lastGroundFace instanceof THREE.Face3){
      //   this._triangle.set(
      //     this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.a],
      //     this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.b],
      //     this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.c]
      //   );
      //   if(this._triangle.containsPoint(this.tmpPos)){
      //     this.groundFace = this.lastGroundFace;
      //   }
      // }else{

      // }
      let isTransition = false;
      let transitionNode = undefined;

      if(this.lastGroundFace.adjacentWalkableFaces.a instanceof THREE.Face3){
        this._triangle.set(
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.a.a],
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.a.b],
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.a.c]
        );
        if(this._triangle.containsPoint(this.tmpPos)){
          this.groundFace = this.lastGroundFace.adjacentWalkableFaces.a;
        }
      }else if(this.lastGroundFace.adjacentWalkableFaces.a.transition >= 0){
        let v1 = this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.a];
        let v2 = this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.b]
        if(Utility.LineLineIntersection(this.position.x, this.position.y, this.position.x + this.AxisFront.x*2, this.position.y + this.AxisFront.y*2, v1.x, v1.y, v2.x, v2.y)){
          isTransition = true;
          transitionNode = this.lastGroundFace.adjacentWalkableFaces.a;
          //console.log('transition', transitionNode);
        }
      }
      
      if(this.lastGroundFace.adjacentWalkableFaces.b instanceof THREE.Face3){
        this._triangle.set(
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.b.a],
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.b.b],
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.b.c]
        );
        if(this._triangle.containsPoint(this.tmpPos)){
          this.groundFace = this.lastGroundFace.adjacentWalkableFaces.b;
        }
      }else if(this.lastGroundFace.adjacentWalkableFaces.b.transition >= 0){
        let v1 = this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.b];
        let v2 = this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.c]
        if(Utility.LineLineIntersection(this.position.x, this.position.y, this.position.x + this.AxisFront.x*2, this.position.y + this.AxisFront.y*2, v1.x, v1.y, v2.x, v2.y)){
          isTransition = true;
          transitionNode = this.lastGroundFace.adjacentWalkableFaces.b;
          //console.log('transition', transitionNode);
        }
      }
      
      if(this.lastGroundFace.adjacentWalkableFaces.c instanceof THREE.Face3){
        this._triangle.set(
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.c.a],
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.c.b],
          this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.c.c]
        );
        if(this._triangle.containsPoint(this.tmpPos)){
          this.groundFace = this.lastGroundFace.adjacentWalkableFaces.c;
        }
      }else if(this.lastGroundFace.adjacentWalkableFaces.c.transition >= 0){
        let v1 = this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.c];
        let v2 = this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.a]
        if(Utility.LineLineIntersection(this.position.x, this.position.y, this.position.x + this.AxisFront.x*2, this.position.y + this.AxisFront.y*2, v1.x, v1.y, v2.x, v2.y)){
          isTransition = true;
          transitionNode = this.lastGroundFace.adjacentWalkableFaces.c;
          //console.log('transition', transitionNode);
        }
      }

      //Fan The Search Out Further 
      if(!this.groundFace){
        let faceKeys = ['a', 'b', 'c'];
        for(let i = 0; i < 3; i++){
          let faceKey = faceKeys[i];
          let face = this.lastGroundFace.adjacentWalkableFaces[faceKey];
          if(face instanceof THREE.Face3){  
            if(face.adjacentWalkableFaces.a instanceof THREE.Face3){
              this._triangle.set(
                face.walkmesh.vertices[face.adjacentWalkableFaces.a.a],
                face.walkmesh.vertices[face.adjacentWalkableFaces.a.b],
                face.walkmesh.vertices[face.adjacentWalkableFaces.a.c]
              );
              if(this._triangle.containsPoint(this.tmpPos)){
                this.groundFace = face.adjacentWalkableFaces.a;
              }
            }else if(face.adjacentWalkableFaces.a.transition >= 0){
              let v1 = face.walkmesh.vertices[face.a];
              let v2 = face.walkmesh.vertices[face.b]
              if(Utility.LineLineIntersection(this.position.x, this.position.y, this.position.x + this.AxisFront.x*2, this.position.y + this.AxisFront.y*2, v1.x, v1.y, v2.x, v2.y)){
                isTransition = true;
                transitionNode = face.adjacentWalkableFaces.a;
              }
            }

            if(face.adjacentWalkableFaces.b instanceof THREE.Face3){
              this._triangle.set(
                face.walkmesh.vertices[face.adjacentWalkableFaces.b.a],
                face.walkmesh.vertices[face.adjacentWalkableFaces.b.b],
                face.walkmesh.vertices[face.adjacentWalkableFaces.b.c]
              );
              if(this._triangle.containsPoint(this.tmpPos)){
                this.groundFace = face.adjacentWalkableFaces.b;
              }
            }else if(face.adjacentWalkableFaces.b.transition >= 0){
              let v1 = face.walkmesh.vertices[face.b];
              let v2 = face.walkmesh.vertices[face.c]
              if(Utility.LineLineIntersection(this.position.x, this.position.y, this.position.x + this.AxisFront.x*2, this.position.y + this.AxisFront.y*2, v1.x, v1.y, v2.x, v2.y)){
                isTransition = true;
                transitionNode = face.adjacentWalkableFaces.b;
              }
            }

            if(face.adjacentWalkableFaces.c instanceof THREE.Face3){
              this._triangle.set(
                face.walkmesh.vertices[face.adjacentWalkableFaces.c.a],
                face.walkmesh.vertices[face.adjacentWalkableFaces.c.b],
                face.walkmesh.vertices[face.adjacentWalkableFaces.c.c]
              );
              if(this._triangle.containsPoint(this.tmpPos)){
                this.groundFace = face.adjacentWalkableFaces.c;
              }
            }else if(face.adjacentWalkableFaces.c.transition >= 0){
              let v1 = face.walkmesh.vertices[face.c];
              let v2 = face.walkmesh.vertices[face.a]
              if(Utility.LineLineIntersection(this.position.x, this.position.y, this.position.x + this.AxisFront.x*2, this.position.y + this.AxisFront.y*2, v1.x, v1.y, v2.x, v2.y)){
                isTransition = true;
                transitionNode = face.adjacentWalkableFaces.c;
              }
            }
          }
        }
      }

      if(!isTransition){
      
        //If we are not on a triangle then clamp the position
        //to the nearest point on the last triangles
        if(typeof this.groundFace === 'undefined'){
          this._triangle.set(
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.a],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.b],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.c]
          );
          //Detect Triangle Clamp Point
          this._triangle.closestPointToPoint(this.tmpPos, this.wm_c_point);
          //Update the player's position
          this.AxisFront.copy(
            this.position.clone().sub(this.wm_c_point)
          ).negate();
          this.AxisFront.z = 0;
          this.position.z = this.wm_c_point.z + .005;
          //if(this == Game.player)
            //console.log(this.AxisFront)
          //this.position.x = this.wm_c_point.x;
          //this.position.y = this.wm_c_point.y;
        }else{
          this._triangle.closestPointToPoint(this.tmpPos, this.wm_c_point);
        }
      
        if(this.lastGroundFace.adjacentWalkableFaces.a instanceof THREE.Face3){
          this._triangle.set(
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.a.a],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.a.b],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.a.c]
          );
          if(this._triangle.containsPoint(this.tmpPos)){
            this.groundFace = this.lastGroundFace.adjacentWalkableFaces.a;
          }
        }else{

        }
        
        if(this.lastGroundFace.adjacentWalkableFaces.b instanceof THREE.Face3){
          this._triangle.set(
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.b.a],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.b.b],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.b.c]
          );
          if(this._triangle.containsPoint(this.tmpPos)){
            this.groundFace = this.lastGroundFace.adjacentWalkableFaces.b;
          }
        }else{

        }
        
        if(this.lastGroundFace.adjacentWalkableFaces.c instanceof THREE.Face3){
          this._triangle.set(
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.c.a],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.c.b],
            this.lastGroundFace.walkmesh.vertices[this.lastGroundFace.adjacentWalkableFaces.c.c]
          );
          if(this._triangle.containsPoint(this.tmpPos)){
            this.groundFace = this.lastGroundFace.adjacentWalkableFaces.c;
          }
        }else{

        }

        if(this.groundFace){
          if(this.groundFace.walkIndex != 7 && this.groundFace.walkIndex != 2){
            this.position.z = this.wm_c_point.z + .005;
            this.lastGroundFace = this.groundFace;
            if(this.groundFace && this.getAppearance().groundtilt == '1'){
              this.groundTilt.set(0, 0, 0);
              this.groundTilt.crossVectors(this.up, this.groundFace.normal);
              this.rotation.x = this.groundTilt.x;
              this.rotation.y = this.groundTilt.y;
            }
            this.surfaceId = this.groundFace.walkIndex;
          }else{
            this.AxisFront.z = 0;
            worldCollide = true;
          }
        }

      }else{
        /*let lastRoomIndex = Game.module.area.rooms.indexOf(this.room);
        this.room = Game.module.area.rooms[transitionNode.transition];
        this.lastGroundFace = undefined;
        this.groundFace = undefined;
        this.tmpPos = this.position.clone().add(this.AxisFront.clone().multiplyScalar(2));

        if(this == Game.player){
          console.log(lastRoomIndex+' - '+transitionNode.transition);
        }

        if(this.room.walkmesh){
          let walkableFaces = this.room.walkmesh.walkableFaces;
          let landingFaces = [];
          let closestPoint = Infinity;
          for(let i = 0; i < walkableFaces.length; i++){
            let walkableFace = walkableFaces[i];
            if(typeof walkableFace.adjacentWalkableFaces.a.transition != undefined && walkableFace.adjacentWalkableFaces.a.transition > -1){
              landingFaces.push(walkableFace)
            }else if(typeof walkableFace.adjacentWalkableFaces.b.transition != undefined && walkableFace.adjacentWalkableFaces.b.transition > -1){
              landingFaces.push(walkableFace)
            }else if(typeof walkableFace.adjacentWalkableFaces.c.transition != undefined && walkableFace.adjacentWalkableFaces.c.transition > -1){
              landingFaces.push(walkableFace)
            }
          }

          if(this == Game.player){
            console.log(landingFaces);
          }

          for(let i = 0; i < landingFaces.length; i++){
            let walkableFace = landingFaces[i];
            this._triangle.set(
              this.room.walkmesh.vertices[walkableFace.a],
              this.room.walkmesh.vertices[walkableFace.b],
              this.room.walkmesh.vertices[walkableFace.c]
            );

            let distance = this._triangle.getMidpoint().distanceTo(this.tmpPos);
            if(this == Game.player){
              console.log(distance);
            }
            if(distance < closestPoint){
              this.groundFace = walkableFace;
              this.lastGroundFace = walkableFace;

              closestPoint = distance;
            }
          }
          if(this == Game.player){
            console.log(closestPoint, this.groundFace, this.lastGroundFace);
          }
        }*/
        this.room = Game.module.area.rooms[transitionNode.transition];
        this.lastGroundFace = undefined;
        this.groundFace = undefined;
        this.tmpPos = this.position.clone().add(this.AxisFront);
        if(this.room.walkmesh){
          let walkableFaces = this.room.walkmesh.walkableFaces;
          for(let i = 0; i < walkableFaces.length; i++){
            let walkableFace = walkableFaces[i];
            this._triangle.set(
              this.room.walkmesh.vertices[walkableFace.a],
              this.room.walkmesh.vertices[walkableFace.b],
              this.room.walkmesh.vertices[walkableFace.c]
            );
            if(this._triangle.containsPoint(this.tmpPos)){
              this.groundFace = walkableFace;
              this.lastGroundFace = walkableFace;

              if(this == Game.player){
                console.log(walkableFace);
              }

              break;
            }
          }
        }
      }

      if(this.groundFace){
        this.tmpPos = this.position.clone().add(this.AxisFront);
        this._triangle.set(
          this.groundFace.walkmesh.vertices[this.groundFace.a],
          this.groundFace.walkmesh.vertices[this.groundFace.b],
          this.groundFace.walkmesh.vertices[this.groundFace.c]
        );

        
        let edgeLines = [];
        let faceKeys = ['a', 'b', 'c'];
        for(let j = 0, jl = this.groundFace.walkmesh.walkableFaces.length; j < jl; j++){
            let face = this.groundFace.walkmesh.walkableFaces[j];
            for(let i = 0; i < 3; i++){
              let adjacentFace = face.adjacentWalkableFaces[faceKeys[i]];
              if(adjacentFace && (typeof adjacentFace.transition === 'number' && adjacentFace.transition == -1) ){
                let line;
                switch(i){
                  case 0:
                    line = new THREE.Line3( face.walkmesh.vertices[face.a], face.walkmesh.vertices[face.b] );
                  break;
                  case 1:
                    line = new THREE.Line3( face.walkmesh.vertices[face.b], face.walkmesh.vertices[face.c] );
                  break;
                  case 2:
                    line = new THREE.Line3( face.walkmesh.vertices[face.c], face.walkmesh.vertices[face.a] );
                  break;
                }

                if(line){

                  let closestPoint = new THREE.Vector3(0, 0, 0);
                  line.closestPointToPoint(this.tmpPos, true, closestPoint);
                  let distance = closestPoint.distanceTo(this.tmpPos);
                  if(distance < 0.5){
                    //console.log(distance, line);
                    edgeLines.push({
                      line: line,
                      closestPoint: closestPoint,
                      distance: distance,
                      maxDistance: 0.5,
                      position: this.tmpPos
                    });
                  }
                }
              }
            }
        }

        if(edgeLines.length){
          //edgeLines.sort((a, b) => (a.distance > b.distance) ? -1 : 1)
          let average = new THREE.Vector3();
          for(let i = 0; i < edgeLines.length; i++){
            let edgeLine = edgeLines[i];
            let distanceOffset =  1 - (edgeLine.distance/edgeLine.maxDistance);
            let force = edgeLine.closestPoint.clone().sub(edgeLine.position);
            force.multiplyScalar(distanceOffset + 0.15);
            average.add( force.negate() );
          }
          this.position.copy(this.tmpPos);
          this.AxisFront.copy(average.divideScalar(edgeLines.length));
        }


        this._triangle.closestPointToPoint(this.tmpPos, this.wm_c_point);
        this.position.z = this.wm_c_point.z + .005;
      }

    }

    if(worldCollide){
      this.collisionTimer += delta*2;
    }

    //Hack
    if(!testFaces){
      falling = false;
    }

    //if(negateAxis)
      //this.AxisFront.negate();

    if(falling){
      //console.log('Falling');
      this.position.z -= 1*delta;
    }


    //END Gravity
    this.invalidateCollision = false;
    Game.raycaster.far = Infinity;

  }

  playEvent(event){
    this.audioEmitter.SetPosition(this.position.x, this.position.y, this.position.z);
    this.footstepEmitter.SetPosition(this.position.x, this.position.y, this.position.z);
    let appearance = this.getAppearance();

    let rhSounds, lhSounds;

    if(this.equipment.RIGHTHAND)
      rhSounds = Global.kotor2DA['weaponsounds'].rows[this.equipment.RIGHTHAND.getBaseItem().powereditem];

    if(this.equipment.LEFTHAND)
      lhSounds = Global.kotor2DA['weaponsounds'].rows[this.equipment.LEFTHAND.getBaseItem().powereditem];


    let sndIdx = Math.round(Math.random()*2);
    let sndIdx2 = Math.round(Math.random()*1);
    switch(event){
      case 'snd_footstep':
        let sndTable = Global.kotor2DA["footstepsounds"].rows[appearance.footsteptype];
        let sound = '****';
        switch(this.surfaceId){
          case 1:
            sound = (sndTable['dirt'+sndIdx]);
          break;
          case 3:
            sound = (sndTable['grass'+sndIdx]);
          break;
          case 4:
            sound = (sndTable['stone'+sndIdx]);
          break;
          case 5:
            sound = (sndTable['wood'+sndIdx]);
          break;
          case 6:
            sound = (sndTable['water'+sndIdx]);
          break;
          case 9:
            sound = (sndTable['carpet'+sndIdx]);
          break;
          case 10:
            sound = (sndTable['metal'+sndIdx]);
          break;
          case 11:
          case 13:
            sound = (sndTable['puddles'+sndIdx]);
          break;
          case 14:
            sound = (sndTable['leaves'+sndIdx]);
          break;
          default:
            sound = (sndTable['dirt'+sndIdx]);
          break;
        }

        if(sound != '****'){
          this.footstepEmitter.Stop();
          this.footstepEmitter.PlaySound(sound);
        }else if(sndTable['rolling'] != '****'){
          if(!this.footstepEmitter.currentSound){
            this.footstepEmitter.Stop();
            this.footstepEmitter.PlaySound(sndTable['rolling'], (buffer) => {
              buffer.loop = true;
            });
          }else if(this.footstepEmitter.currentSound && this.footstepEmitter.currentSound.name != sndTable['rolling']){
            this.footstepEmitter.Stop();
            this.footstepEmitter.PlaySound(sndTable['rolling'], (buffer) => {
              buffer.loop = true;
            });
          }
        }

      break;
      case 'Swingshort':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['swingshort'+sndIdx]);
        }
      break;
      case 'Swinglong':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['swinglong'+sndIdx]);
        }
      break;
      case 'HitParry':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['parry'+sndIdx2]);
        }
      break;
      case 'Contact':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['clash'+sndIdx2]);
        }
      break;
      case 'Clash':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['clash'+sndIdx2]);
        }
      break;
      case 'Hit':
        //console.log('Attack Hit Event');

        if(this.combatAction && this.combatAction.hits && this.combatAction.damage){
          this.combatAction.target.damage(this.combatAction.damage, this);
        }else{
          //console.error('playEvent Hit:', {hit: this.combatAction.hits, damage: this.combatAction.damage});
        }

        if(this.equipment.RIGHTHAND){
          if(this.equipment.RIGHTHAND){
            this.audioEmitter.PlaySound(rhSounds['leather'+Math.round(Math.random()*1)]);
          }
        }
      break;
    }
  }

  getIdleAnimation(){
    let modeltype = this.getAppearance().modeltype;

    switch(modeltype.toLowerCase()){
      case 's':
        if(this.combatState){

        }else{
          return 'walk';
        }
      break;
      case 'l':

      break;
      default:

      break;
    }

  }

  hasWeapons(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let cWeapon1 = this.equipment.CLAW1;
    let cWeapon2 = this.equipment.CLAW2;
    let cWeapon3 = this.equipment.CLAW3;
    return (lWeapon instanceof ModuleItem) || (rWeapon instanceof ModuleItem) || (cWeapon1 instanceof ModuleItem) || (cWeapon2 instanceof ModuleItem) || (cWeapon3 instanceof ModuleItem);
  }

  flourish(){
    this.resetExcitedDuration();
    let isSimple = this.isSimpleCreature();
    let weaponType = this.getCombatAnimationWeaponType();
    
    if(!isSimple){
      if(weaponType){
        this.clearAllActions();
        this.animState = ModuleCreature.AnimState.FLOURISH;
        this.weaponPowered(true);
      }
    }
  }

  weaponPowered(on = false){

    let weaponType = this.getCombatAnimationWeaponType();
    let isSimple = this.isSimpleCreature();
    if(isSimple || !weaponType)
      return;

    //let modeltype = this.getAppearance().modeltype;
    //let hasHands = this.model.rhand instanceof THREE.Object3D && this.model.lhand instanceof THREE.Object3D;

    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    //let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);
    
    if(!isSimple){

      if(weaponType){
        
        if(lWeapon && lWeapon.model){
          let currentAnimL = this.equipment.LEFTHAND.model.animationManager.currentAnimation || this.equipment.LEFTHAND.model.getAnimationByName('off');
          if(currentAnimL){
            if(on){
              switch(currentAnimL.name){
                case 'off':
                  this.equipment.LEFTHAND.model.playAnimation('powerup');
                break;
                case 'powerup':
                break;
                default:
                  this.equipment.LEFTHAND.model.playAnimation('powered', true);
                break;
              }
            }else{
              switch(currentAnimL.name){
                case 'powered':
                  this.equipment.LEFTHAND.model.playAnimation('powerdown');
                break;
                case 'powerdown':
                break;
                default:
                  this.equipment.LEFTHAND.model.playAnimation('off', true);
                break;
              }
            }
          }
        }

        if(rWeapon && rWeapon.model){
          let currentAnimR = this.equipment.RIGHTHAND.model.animationManager.currentAnimation || this.equipment.RIGHTHAND.model.getAnimationByName('off');
          if(currentAnimR){
            if(on){
              switch(currentAnimR.name){
                case 'off':
                  this.equipment.RIGHTHAND.model.playAnimation('powerup', false);
                break;
                case 'powerup':
                break;
                default:
                  this.equipment.RIGHTHAND.model.playAnimation('powered', true);
                break;
              }
            }else{
              switch(currentAnimR.name){
                case 'powered':
                  this.equipment.RIGHTHAND.model.playAnimation('powerdown', false);
                break;
                case 'powerdown':
                break;
                default:
                  this.equipment.RIGHTHAND.model.playAnimation('off', true);
                break;
              }
            }
          }
        }

      }

    }

  }

  getWalkAnimation(){
    let modeltype = this.getAppearance().modeltype;

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cwalk';
      default:
        if(this.getHP()/this.getMaxHP() > .1){
          return 'walk';
        }else{
          return 'walkinj';
        }
    }

  }

  getRunAnimation(){
    let modeltype = this.getAppearance().modeltype;

    switch(modeltype){
      case 'S':
      case 'L':
        return 'crun';
      default:
        if(this.getHP()/this.getMaxHP() > .1){
          return 'run';
        }else{
          return 'runinj';
        }
    }

  }



  setLIP(lip){
    //console.log(lip);
    this.lipObject = lip;
  }
  
}
module.exports = ModuleCreatureController;