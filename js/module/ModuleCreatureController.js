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

        if(this.dialogAnimation && Game.inDialog && (!this.action || this.action.type != Action.TYPE.ActionPlayAnimation)){
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

      if(this.isDead()){
        this.force = 0;
        this.speed = 0;
        this.animSpeed = 1;
        this.AxisFront.set(0, 0, 0);
      }

      this.AxisFront.z = 0;

      this.speed += (this.getMovementSpeed() * 2.5) * this.force * delta;

      if(this.speed > this.getMovementSpeed()){
        this.speed = this.getMovementSpeed();
      }
      
      let forceDelta = Math.max(this.force * delta, this.speed * delta);
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
        }
        //this.AxisFront.z = gravityDelta;
      }else{
        this.AxisFront.multiplyScalar(forceDelta);
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

      if(this.AxisFront.length())
        this.updateCollision(delta);

      this.updatePerceptionList(delta);
      this.updateListeningPatterns();


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

    if(!Game.module.readyToProcessEvents)
      return;

      
    this.actionQueue.process( delta );
    this.action = this.actionQueue[0];
    if(!(this.action instanceof Action)){
      //this.force = 0;
      //this.animState = ModuleCreature.AnimState.IDLE;
      /*if(typeof this.model.animationManager.currentAnimation == 'undefined'){
        let randomPauseIdx = Math.round(Math.random()*2) + 1;
        this.model.playAnimation('pause'+randomPauseIdx, false);
      }*/

      if(!this.combatState && this.isPartyMember() && this != Game.getCurrentPlayer()){
        this.setFacing(
          Math.atan2(
            this.position.y - Game.getCurrentPlayer().position.y,
            this.position.x - Game.getCurrentPlayer().position.x
          ) + Math.PI/2,
          false
        );
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

      /*if(this.action && (this.action.type == Action.TYPE.ActionPhysicalAttacks || this.action.type == Action.TYPE.ActionCastSpell)){
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
          if(!this.actionQueue.length || this.actionQueue[0].type != Action.TYPE.ActionPhysicalAttacks){
            /*this.actionQueue.addFront(
              {object: this.combatAction.target, type: Action.TYPE.ActionPhysicalAttacks, isCutsceneAttack: this.combatAction.isCutsceneAttack}
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
      if(action.type == Action.TYPE.ActionCastSpell){
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

    //if(this.action && this.action.type == Action.TYPE.ActionPlayAnimation)
    //  return;

    if(Game.inDialog && this.dialogAnimation && !this.speed && !this.isDead())
      return;

    let animation = this.animationConstantToAnimation(this.animState);
    if(animation){
      if(currentAnimation != animation.name.toLowerCase()){
        let aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
        this.getModel().playAnimation(animation.name.toLowerCase(), aLooping, () => {
          if(!aLooping)
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
      if(this.combatAction.type == Action.TYPE.ActionCastSpell){
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
      return this.actionQueue[0].type;
    }
    return 65535;
  }

  moveToObject(target = undefined, bRun = true, distance = 1.0){

    if(target instanceof ModuleObject){
        
      this.openSpot = undefined;
      let action = new ActionMoveToPoint();
      let target_position = target.position.clone();
      action.setParameter(0, Action.Parameter.TYPE.FLOAT, target_position.x);
      action.setParameter(1, Action.Parameter.TYPE.FLOAT, target_position.y);
      action.setParameter(2, Action.Parameter.TYPE.FLOAT, target_position.z);
      action.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
      action.setParameter(4, Action.Parameter.TYPE.DWORD, target.id);
      action.setParameter(5, Action.Parameter.TYPE.INT, bRun ? 1 : 0);
      action.setParameter(6, Action.Parameter.TYPE.FLOAT, Math.max(1.5, distance));
      action.setParameter(7, Action.Parameter.TYPE.INT, 0);
      action.setParameter(8, Action.Parameter.TYPE.FLOAT, 30.0);
      this.actionQueue.add(action);
    }

  }

  moveToLocation(target = undefined, bRun = true){

    if(target instanceof Game.Location || target instanceof ModuleObject){

      let distance = 0.1;
      let creatures = Game.module.area.creatures;

      //Check if creatures are too close to location
      for(let i = 0; i < creatures.length; i++){
        let creature = creatures[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

      //Check if party are too close to location
      for(let i = 0; i < PartyManager.party.length; i++){
        let creature = PartyManager.party[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

        
      this.openSpot = undefined;
      let action = new ActionMoveToPoint();
      let target_position = target.position.clone();
      action.setParameter(0, Action.Parameter.TYPE.FLOAT, target_position.x);
      action.setParameter(1, Action.Parameter.TYPE.FLOAT, target_position.y);
      action.setParameter(2, Action.Parameter.TYPE.FLOAT, target_position.z);
      action.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
      action.setParameter(4, Action.Parameter.TYPE.DWORD, target instanceof Game.Location ? ModuleObject.OBJECT_INVALID : target.id );
      action.setParameter(5, Action.Parameter.TYPE.INT, bRun ? 1 : 0);
      action.setParameter(6, Action.Parameter.TYPE.FLOAT, Math.max(1.5, distance));
      action.setParameter(7, Action.Parameter.TYPE.INT, 0);
      action.setParameter(8, Action.Parameter.TYPE.FLOAT, 30.0);
      this.actionQueue.add(action);

    }

  }

  jumpToObject(target = undefined){
    console.log('jumpToObject', target, this);
    if(target instanceof ModuleObject){

      let action = new ActionJumpToObject();
      action.setParameter(0, Action.Parameter.TYPE.DWORD, target.id );
      action.setParameter(1, Action.Parameter.TYPE.INT, 0);
      this.actionQueue.add(action);

    }

  }

  jumpToLocation(target = undefined){
    console.log('jumpToLocation', target, this);
    if(target instanceof Game.Location){
      let action = new ActionJumpToPoint();
      action.setParameter(0, Action.Parameter.TYPE.FLOAT, target.position.x);
      action.setParameter(1, Action.Parameter.TYPE.FLOAT, target.position.y);
      action.setParameter(2, Action.Parameter.TYPE.FLOAT, target.position.z);
      action.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
      action.setParameter(4, Action.Parameter.TYPE.INT, 0);
      action.setParameter(5, Action.Parameter.TYPE.FLOAT, 20.0);
      action.setParameter(6, Action.Parameter.TYPE.FLOAT, target.rotation.x);
      action.setParameter(7, Action.Parameter.TYPE.FLOAT, target.rotation.y);
      this.actionQueue.add(action);
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

    this.lastAttackAction = Action.TYPE.ActionPhysicalAttacks;
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
      type: Action.TYPE.ActionPhysicalAttacks,
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

    if(this.combatAction == undefined){
      this.combatAction = combatAction;
    }else{
      this.combatQueue.push(combatAction);
    }

    if(!isCutsceneAttack){
      this.actionQueue.clear();
      let action = new ActionPhysicalAttacks();
      action.setParameter(0, Action.Parameter.TYPE.INT, 0);
      action.setParameter(1, Action.Parameter.TYPE.DWORD, target.id);
      action.setParameter(2, Action.Parameter.TYPE.INT, 1);
      action.setParameter(3, Action.Parameter.TYPE.INT, 25);
      action.setParameter(4, Action.Parameter.TYPE.INT, -36);
      action.setParameter(5, Action.Parameter.TYPE.INT, 1);
      action.setParameter(6, Action.Parameter.TYPE.INT, feat instanceof TalentFeat ? feat.id : 0);
      action.setParameter(7, Action.Parameter.TYPE.INT, 0);
      action.setParameter(8, Action.Parameter.TYPE.INT, 4);
      action.setParameter(9, Action.Parameter.TYPE.INT, 0);
      this.actionQueue.add(action);
    }

  }

  useTalentOnObject(talent, oTarget){
    if(talent instanceof TalentObject){

      /*this.actionQueue.addFront({
        object: oTarget,
        spell: talent,
        type: Action.TYPE.ActionCastSpell
      });*/
    let action;
    switch(talent.type){
      case 1: //FEAT
        action = new ActionPhysicalAttacks();
        action.setParameter(0, Action.Parameter.TYPE.INT, 0);
        action.setParameter(1, Action.Parameter.TYPE.DWORD, oTarget.position.y);
        action.setParameter(2, Action.Parameter.TYPE.INT, 1);
        action.setParameter(3, Action.Parameter.TYPE.INT, 25);
        action.setParameter(4, Action.Parameter.TYPE.INT, -36);
        action.setParameter(5, Action.Parameter.TYPE.INT, 1);
        action.setParameter(6, Action.Parameter.TYPE.INT, talent.id);
        action.setParameter(7, Action.Parameter.TYPE.INT, 0);
        action.setParameter(8, Action.Parameter.TYPE.INT, 4);
        action.setParameter(9, Action.Parameter.TYPE.INT, 0);
        this.actionQueue.add(action);
      break;
      case 2: //SKILL

      break;
      case 0: //SPELL
        action = new ActionCastSpell();
        action.setParameter(0, Action.Parameter.TYPE.INT, talent.id); //Spell Id
        action.setParameter(1, Action.Parameter.TYPE.INT, -1); //
        action.setParameter(2, Action.Parameter.TYPE.INT, 0); //DomainLevel
        action.setParameter(3, Action.Parameter.TYPE.INT, 0);
        action.setParameter(4, Action.Parameter.TYPE.INT, 0);
        action.setParameter(5, Action.Parameter.TYPE.DWORD, oTarget.id || ModuleObject.OBJECT_INVALID); //Target Object
        action.setParameter(6, Action.Parameter.TYPE.FLOAT, oTarget.position.x); //Target X
        action.setParameter(7, Action.Parameter.TYPE.FLOAT, oTarget.position.y); //Target Y
        action.setParameter(8, Action.Parameter.TYPE.FLOAT, oTarget.position.z); //Target Z
        action.setParameter(9, Action.Parameter.TYPE.INT, 0); //ProjectilePath
        action.setParameter(10, Action.Parameter.TYPE.INT, -1);
        action.setParameter(11, Action.Parameter.TYPE.INT, -1);
        this.actionQueue.add(action);
      break;
    }

      //talent.useTalentOnObject(oTarget, this);
    }
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
      //type: Action.TYPE.ActionPlayAnimation,
      animation: anim,
      speed: speed || 1,
      time: loop ? -1 : 0
    };
    /*let currentAction = this.actionQueue[0];
    if(currentAction && currentAction.type == Action.TYPE.ActionPlayAnimation){
      this.actionQueue[0] = { 
        type: Action.TYPE.ActionPlayAnimation,
        animation: anim,
        speed: 1,
        time: loop ? -1 : 0
      };
    }else{
      this.actionQueue.addFront({ 
        type: Action.TYPE.ActionPlayAnimation,
        animation: anim,
        speed: 1,
        time: loop ? -1 : 0
      });
    }*/
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
    let _oPosition = this.position.clone();

    //this.getCurrentRoom();
    let hitdist = this.getAppearance().hitdist;
    let hitdist_half = hitdist/2;
    
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

    //START: CREATURE COLLISION
    
    //Check creature collision
    let creature = undefined;
    if(Config.options.Game.debug.creature_collision){
      for(let i = 0, len = Game.module.area.creatures.length; i < len; i++){
        creature = Game.module.area.creatures[i];
        if(creature){
          let position = this.position.clone().add(this.AxisFront);
          
          if(creature == this || creature.isDead())
            continue;

          if(!creature.getAppearance())
            continue;

          let distance = position.distanceTo(creature.position);
          if( distance < hitdist ){
            let pDistance = hitdist - distance;
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
    }

    //Check party collision
    if(Config.options.Game.debug.creature_collision){
      for(let i = 0, len = PartyManager.party.length; i < len; i++){
        creature = PartyManager.party[i];
        if(creature){
          let position = this.position.clone().add(this.AxisFront);

          if(creature == this || creature.isDead())
            continue;

          let distance = position.distanceTo(creature.position);
          if(distance < hitdist){
            let pDistance = hitdist - distance;
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
        }
      }
    }

    //END: CREATURE COLLISION

    if(this.room){

      //START: DOOR COLLISION

      if(Config.options.Game.debug.door_collision){
        for(let j = 0, jl = this.room.doors.length; j < jl; j++){
          obj = this.room.doors[j];
          if(obj && obj.walkmesh && !obj.isOpen()){
            aabbFaces.push({
              object: obj,
              faces: obj.walkmesh.faces
            });
          }
        }
      }

      let worldCollide = false;
      let collider = undefined;
      let world_collisions = [];
      let castableFaces = [];
      let dot = 0;
      for(let i = 0; i < 12; i++){
        Game.raycaster.ray.direction.set(ModuleObject.DX_LIST[i], ModuleObject.DY_LIST[i], 0);
        for(let k = 0, kl = aabbFaces.length; k < kl; k++){
          playerFeetRay.copy(this.position).add(this.AxisFront);
          Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);

          castableFaces = aabbFaces[k];
          castableFaces.object.walkmesh.mesh.visible = true;
          intersects = castableFaces.object.walkmesh.raycast(Game.raycaster, castableFaces.faces) || [];
          if (intersects && intersects.length > 0 ) {
            for(let j = 0, jLen = intersects.length; j < jLen; j++){
              if(intersects[j].distance < hitdist_half){
                if(intersects[j].face.walkIndex == 7 || intersects[j].face.walkIndex == 2){

                  if(intersects[j].object.moduleObject instanceof ModuleDoor){
                    this.blocking = intersects[j].object.moduleObject;
                  }

                  if(!collider || collider.distance < intersects[j].distance)
                    collider = intersects[j];

                  world_collisions.push(collider);
                  dot = _axisFront.clone().dot(intersects[j].face.normal);
                  
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

      //START: PLACEABLE COLLISION
      this.tmpPos = this.position.clone().add(this.AxisFront);
      let plcEdgeLines = [];
      let face;
      let edge;
      let line;
      let closestPoint = new THREE.Vector3(0, 0, 0);
      let distance;
      let plcCollision = false;
      for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
        obj = this.room.placeables[j];
        if(obj && obj.walkmesh && obj.model && obj.model.visible){
          obj.box.setFromObject(obj.model);
          if(obj.box.intersectsBox(box) || obj.box.containsBox(box)){
            for(let l = 0, ll = obj.walkmesh.edgeKeys.length; l < ll; l++){
              edge = obj.walkmesh.edges[obj.walkmesh.edgeKeys[l]];
              edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
              distance = closestPoint.distanceTo(this.tmpPos);
              if(distance < hitdist_half){
                plcEdgeLines.push({
                  object: obj,
                  line: line,
                  closestPoint: closestPoint.clone(),
                  distance: distance,
                  maxDistance: hitdist_half,
                  position: this.position
                });
                plcCollision = true;
              }
            }
          }
        }
      }

      //END: PLACEABLE COLLISION
      
      //START: ROOM COLLISION
      if(!this.groundFace){
        this.findWalkableFace();
      }

      //room walkable edge check
      let roomCollision = false;
      for(let i = 0, len = this.room.walkmesh.edgeKeys.length; i < len; i++){
        edge = this.room.walkmesh.edges[this.room.walkmesh.edgeKeys[i]];
        if(edge && edge.transition == -1){
          edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
          distance = closestPoint.distanceTo(this.tmpPos);
          if(distance < hitdist_half){
            plcEdgeLines.push({
              object: this.room,
              line: edge.line,
              closestPoint: closestPoint.clone(),
              distance: distance,
              maxDistance: hitdist_half,
              position: this.position
            });
            roomCollision = true;
          }
        }
      }

      
        
      if(!(plcCollision && roomCollision)){
        if(plcEdgeLines.length){
          plcEdgeLines.sort((a, b) => (a.distance > b.distance) ? -1 : 1)
          let average = new THREE.Vector3();
          let edgeLine = undefined;
          let distanceOffset = 0;
          let force = 0;
          for(let i = 0, len = plcEdgeLines.length; i < len; i++){
            edgeLine = plcEdgeLines[i];
            distanceOffset = edgeLine.maxDistance - edgeLine.distance;
            force = edgeLine.closestPoint.clone().sub(edgeLine.position);
            force.multiplyScalar(distanceOffset * 2.5);
            force.z = 0;
            average.add( force.negate() );
          }
          this.position.copy(this.tmpPos);
          this.AxisFront.copy(average.divideScalar(plcEdgeLines.length));
        }
      }else{
        this.AxisFront.set(0, 0, 0);
      }
      //END: ROOM COLLISION

      //Check to see if we tp'd inside of a placeable
      if(this.AxisFront.length()){
        this.tmpPos.copy(this.position).add(this.AxisFront);
        for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
          obj = this.room.placeables[j];
          if(obj && obj.walkmesh && obj.model && obj.model.visible){
            for(let i = 0, iLen = obj.walkmesh.faces.length; i < iLen; i++){
              face = obj.walkmesh.faces[i];
              if(face.triangle.containsPoint(this.tmpPos) && face.surfacemat.walk == 0){
                //bail we should not be here
                this.AxisFront.set(0, 0, 0);
                this.position.copy(_oPosition);
              }
            }
          }
        }
      
        //DETECT: ROOM TRANSITION
        for(let i = 0, len = this.room.walkmesh.edgeKeys.length; i < len; i++){
          edge = this.room.walkmesh.edges[this.room.walkmesh.edgeKeys[i]];
          if(edge && edge.transition >= 0){
            if(
              Utility.LineLineIntersection(
                this.position.x,
                this.position.y,
                this.position.x + this.AxisFront.x,
                this.position.y + this.AxisFront.y,
                edge.line.start.x,
                edge.line.start.y,
                edge.line.end.x,
                edge.line.end.y
              )
            ){
              this.attachToRoom(Game.module.area.rooms[edge.transition]);
              break;
            }
          }
        }

        //update creature position
        this.position.add(this.AxisFront);
        //DETECT: GROUND FACE
        this.lastRoom = this.room;
        this.lastGroundFace = this.groundFace;
        this.groundFace = undefined;
        if(this.room){
          let face = this.room.findWalkableFace(this);
          if(!face){
            this.findWalkableFace();
          }
        }

        if(!this.groundFace){
          this.AxisFront.set(0, 0, 0);
          this.position.copy(_oPosition);
          this.groundFace = this.lastGroundFace;
          this.attachToRoom(this.lastRoom);
          this.AxisFront.set(0, 0, 0);
        }
      }
    }

    //END Gravity
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
        if(sndTable){
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