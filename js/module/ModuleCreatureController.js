/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleCreatureController class.
 */

class ModuleCreatureController extends ModuleObject {

  constructor(){
    super();

    //this.combat

  }

  update( delta = 0 ){
    
    super.update(delta);

    if(this.audioEmitter){
      this.audioEmitter.SetPosition(this.position.x, this.position.y, this.position.z);
    }

    this.AxisFront.set(0, 0, 0);

    if(Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME){

      if(Game.module){
        if(this === PartyManager.party[0])
          Game.controls.UpdatePlayerControls(delta);
      }

      if(this.animState == ModuleCreature.AnimState.IDLE){
        this.footstepEmitter.Stop();
      }

      if(this.GetEffect(62)){ //EFFECT_DISGUISE
        
      }

      if(this.GetEffect(42)){ //EFFECT_DAMAGE
        let effect = this.GetEffect(42);
        this.subtractHP(effect.amount);
        this.RemoveEffect(42);
      }


      if(!this.isReady){
        this.getModel().visible = false;
        return;
      }else{
        this.getModel().visible = true;
      }

      this.action = this.actionQueue[0];
      
      if(this.model instanceof THREE.AuroraModel && this.model.bonesInitialized && this.model.visible){
        this.model.update(delta);
        if(this.lipObject instanceof LIPObject){
          this.lipObject.update(delta, this.head ? this.head : this.model);
        }
      }

      this.areas = [];
      this.area = Game.module.area;

      if(this == Game.getCurrentPlayer() && this.room instanceof ModuleRoom){
        //this.room.show(true);
      }else if(this.room instanceof ModuleRoom){
        if(this.room.model instanceof THREE.AuroraModel){
          if(this.model){
            this.model.visible = this.room.model.visible;
          }
        }
      }

      if(!this.isDead() && this.animState == ModuleCreature.AnimState.DEAD){
        this.animState = ModuleCreature.AnimState.IDLE;
        this.deathAnimationPlayed = false;
        this.actionPlayAnimation('getupdead');
      }

      if(!this.isDead()){
        
        if(this.animState != ModuleCreature.AnimState.DEAD){

          if(this.action != null){
            
            let distance = 0;
            switch(this.action.goal){
              case ModuleCreature.ACTION.ANIMATE:

                if(this.model){

                  let _animShouldChange = false;

                  if(this.model.currentAnimation instanceof AuroraModelAnimation){
                    if(this.model.currentAnimation.name.toLowerCase() != this.getAnimationNameById(this.action.animation).toLowerCase()){
                      _animShouldChange = true;
                    }
                  }else{
                    _animShouldChange = true;
                  }

                  if(_animShouldChange){
                    let _newAnim = this.model.getAnimationByName(this.getAnimationNameById(this.action.animation));
                    if(_newAnim instanceof AuroraModelAnimation){
                      if(this.action.time == -1){
                        this.model.playAnimation(_newAnim, true, () => {
                          //this.actionQueue.shift()
                        });
                      }else{
                        this.model.playAnimation(_newAnim, false, () => {
                          //Kill the action after the animation ends
                          this.actionQueue.shift()
                        })
                      }
                    }else{
                      //Kill the action if the animation isn't found
                      this.actionQueue.shift()
                    }
                  }

                }else{
                  //Kill the action if there is no model to animate?
                  this.actionQueue.shift()
                }

              break;
              case ModuleCreature.ACTION.WAIT:
                this.action.elapsed += delta;
                if(this.action.elapsed > this.action.time){
                  this.actionQueue.shift()
                }
              break;
              case ModuleCreature.ACTION.SCRIPT: //run a block of code from an NWScript file
                //console.log('Action Script', this.action);
                if(this.action.script instanceof NWScript){
                  //this.action.action.script.caller = this;
                  this.action.action.script.beginLoop({
                    _instr: null, 
                    index: -1, 
                    seek: this.action.action.offset,
                    onComplete: () => {
                      //console.log('ACTION.SCRIPT', 'Complete');
                    }
                  });
                }
                this.actionQueue.shift();
              break;

              case ModuleCreature.ACTION.FOLLOWLEADER:
                //let targetPos = PartyManager.GetFollowPosition(this);

                if(Game.inDialog){
                  this.actionQueue.shift();
                  break;
                }

                this.action.object = {
                  position: PartyManager.GetFollowPosition(this)
                };
                distance = Utility.Distance2D(this.position, PartyManager.party[0].position.clone());
                if(distance > 3){
                  this.action.path_realtime = true;
                  this.actionPathfinder(1.5, true, delta);
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
                distance = Utility.Distance2D(this.position, this.action.object.position);
                if(distance > 1.5){
                  this.actionPathfinder(1.5, undefined, delta);
                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                  //console.log(this.action.object);

                  this.setFacing(
                    Math.atan2(
                      this.position.y - this.action.object.position.y,
                      this.position.x - this.action.object.position.x
                    ) + Math.PI/2,
                    true
                  );

                  if(this.action.object != Game.player){
                    this.action.object.use(this);
                  }

                  this.actionQueue.shift()
                  
                }
              break;
              case ModuleCreature.ACTION.OPENDOOR:
                distance = Utility.Distance2D(this.position, this.action.object.position);
                
                if(distance > 2 && !this.action.object.box.intersectsBox(this.box)){
                  this.actionPathfinder(2, undefined, delta);
                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                  //console.log(this.action.object);

                  this.setFacing(
                    Math.atan2(
                      this.position.y - this.action.object.position.y,
                      this.position.x - this.action.object.position.x
                    ) + Math.PI/2,
                    true
                  );

                  if(this.action.object == Game.player){
                    this.actionQueue.shift()
                  }else{
                    this.action.object.use(Game.player);
                    this.actionQueue.shift()
                  }
                  
                }
              break;
              case ModuleCreature.ACTION.OPENLOCK:

                if(!this.action.shouted){
                  this.action.shouted = true;
                  this.PlaySoundSet(SSFObject.TYPES.UNLOCK);
                }

                distance = Utility.Distance2D(this.position, this.action.object.position);
                if(distance > 1.5){
                  this.actionPathfinder(1.5, undefined, delta);
                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                                    
                  this.setFacing(
                    Math.atan2(
                      this.position.y - this.action.object.position.y,
                      this.position.x - this.action.object.position.x
                    ) + Math.PI/2, 
                    true
                  );

                  if(this.action.animComplete){
                    this.action.object.attemptUnlock(this);
                    this.actionQueue.shift();
                  }else{
                    this.action.animComplete = true;
                    this.actionQueue.unshift({ 
                      goal: ModuleCreature.ACTION.ANIMATE,
                      animation: 'unlockdr',
                      speed: 1,
                      time: 0
                    });
                    this.action.object.audioEmitter.PlaySound('gui_lockpick');
                  }
                  
                }
              break;
              case ModuleCreature.ACTION.DIALOGOBJECT:
                if(!Game.inDialog){
                  distance = Utility.Distance2D(this.position, this.action.object.position);
                  if(distance > 4.5 && !this.action.ignoreStartRange){
                    this.actionPathfinder(4.5, undefined, delta);
                  }else{
                    this.animState = ModuleCreature.AnimState.IDLE;
                    this.force = 0;

                    this.action.object._conversation = this.action.conversation;
                    
                    if(this.action.object.scripts.onDialog instanceof NWScript){
                      //Keep a copy of the current action because it will be gone by the time the script completes
                      //let dlgAction = this.action;
                      //dlgAction.self = this;
                      //console.log('dlgAction', this.action);
                      this.action.object.onDialog(this, -1);/*, () => {
                        //This should only run if a dialog isn't started inside the onDialog script
                        //Game.InGameDialog.StartConversation(dlgAction.conversation, dlgAction.object, dlgAction.self);
                      });*/
                      /*dlgAction.object.scripts.onDialog.listenPatternNumber = -1;
                      dlgAction.object.scripts.onDialog.run(dlgAction.object, 0, () => {
                        //This should only run if a dialog isn't started inside the onDialog script
                        Game.InGameDialog.StartConversation(dlgAction.conversation, dlgAction.object, dlgAction.self);
                      });*/
                    }else{
                      Game.InGameDialog.StartConversation(this.action.conversation, this.action.object, this);
                    }
                    this.actionQueue.shift();
                    
                  }
                }
              break;
              case ModuleCreature.ACTION.MOVETOPOINT:
                if(this.action.instant){
                  this.position.copy(
                    this.action.object.position.clone()
                  );
                  
                  this.setFacing(this.action.object.rotation.z, true);
                  this.getCurrentRoom();
                  this.actionQueue.shift()
                }else{
                  distance = Utility.Distance2D(this.position, this.action.object.position);
                  if(distance > 1.5){
                    this.actionPathfinder(1.5, this.action.run, delta);
                  }else{
                    this.animState = ModuleCreature.AnimState.IDLE;
                    this.force = 0;
                    this.actionQueue.shift()
                  }
                }
              break;
              case ModuleCreature.ACTION.ATTACKOBJECT:
                if(!this.action.combatAction.isCutsceneAttack){
                  distance = Utility.Distance2D(this.position, this.action.object.position);

                  if(distance > ( this.getEquippedWeaponType() == 1 ? 2.0 : 15.0 ) ){
                    this.actionPathfinder(2, undefined, delta);
                  }else{
                    this.animState = ModuleCreature.AnimState.IDLE;
                    this.force = 0;

                    //this.actionQueue.shift();
                  }
                }
              break;
              default:
                distance = Utility.Distance2D(this.position, this.action.object.position);
                if(distance > 1.5){
                  this.actionPathfinder(1.5, undefined, delta);
                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;

                  this.actionQueue.shift();

                }
              break;
            }

          } else {
            //this.force = 0;
            //this.animState = ModuleCreature.AnimState.IDLE;
            /*if(typeof this.model.currentAnimation == 'undefined'){
              let randomPauseIdx = Math.round(Math.random()*2) + 1;
              this.model.playAnimation('pause'+randomPauseIdx, false);
            }*/
          }

        }

        if(this.dialogAnimation && Game.inDialog && (!this.action || this.action.goal != ModuleCreature.ACTION.ANIMATE)){
          if(this.model){

            if(!this.force){
  
              let _animShouldChange = false;
    
              if(this.model.currentAnimation instanceof AuroraModelAnimation){
                if(this.model.currentAnimation.name.toLowerCase() != this.getAnimationNameById(this.dialogAnimation.animation).toLowerCase()){
                  _animShouldChange = true;
                }
              }else{
                _animShouldChange = true;
              }
    
              if(_animShouldChange){
                let _newAnim = this.model.getAnimationByName(this.getAnimationNameById(this.dialogAnimation.animation));
                if(_newAnim instanceof AuroraModelAnimation){
                  if(this.dialogAnimation.time == -1){
                    this.model.playAnimation(_newAnim, true, () => {
                      //this.actionQueue.shift()
                    });
                  }else{
                    this.model.playAnimation(_newAnim, false, () => {
                      //Kill the dialogAnimation after the animation ends
                      this.dialogAnimation = null;
                    })
                  }
                }else{
                  //Kill the dialogAnimation if the animation isn't found
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
        this.getUpAnimationPlayed = false;
        if(this.animState != ModuleCreature.AnimState.DEAD || this.animState != ModuleCreature.AnimState.DIEING){
          this.clearAllActions();
          this.animState = ModuleCreature.AnimState.DEAD;
          if(!this.deathAnimationPlayed){
            this.onDeath();
            this.PlaySoundSet(SSFObject.TYPES.DEAD);
          }
        }
      }

      this.updateCombat(delta);
      this.updateAnimationState();
      this.updateItems(delta);

      this.AxisFront.z = 0;
      
      let forceDelta = this.force * delta;//(delta > 1 ? 1 : delta);
      let gravityDelta = -1 * delta;
        
      this.AxisFront.multiply(new THREE.Vector3(forceDelta, forceDelta, gravityDelta));
      

      //if(this.model instanceof THREE.AuroraModel)
      //  this.model.box.setFromObject(this.model);

      if(this.invalidateCollision)
        this.updateCollision(delta);

      this.updatePerceptionList(delta);
      this.updateListeningPatterns();

      this.position.add(this.AxisFront);

      /*if(this.facing != this.rotation.z){
        this.facingTweenTime+=5*delta;
        if(this.facingTweenTime>1){
          this.rotation.z = this.facing;
        }else{
          this.rotation.z = THREE.Math.lerp(this.wasFacing, this.facing, this.facingTweenTime);
        }
      }*/


      //Update equipment
      if(this.equipment.RIGHTHAND instanceof ModuleItem){
        if(this.equipment.RIGHTHAND.model instanceof THREE.AuroraModel)
          this.equipment.RIGHTHAND.model.update(delta);
      }

      if(this.equipment.LEFTHAND instanceof ModuleItem){
        if(this.equipment.LEFTHAND.model instanceof THREE.AuroraModel)
          this.equipment.LEFTHAND.model.update(delta);
      }

    }else{
      this.updateAnimationState();
      this.updateItems(delta);
    }


  }

  updateListeningPatterns(){
    if(this.isListening){
      for(let i = 0; i < this.heardStrings.length; i++){
        let str = this.heardStrings[i];
        if(typeof this.listeningPatterns[str.string] != 'undefined'){
          //console.log('updateListeningPatterns', str);
          this.onDialog(str.speaker, str.index);
          break;
        }
      }
    }
    this.heardStrings = [];
  }

  updatePerceptionList(delta = 0){

    if(this.isDead())
      return true;

    if(this.perceptionTimer < 1){
      this.perceptionTimer += 1 * delta;
      return;
    }

    this.perceptionTimer = 0;

    //Check modules creatures
    let creatureLen = Game.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++ ){
      let creature = Game.module.area.creatures[i];
      if(this != creature && !creature.isDead() && creature.isVisible()){
        let index = this.perceptionList.indexOf(creature);
        let distance = this.position.distanceTo(creature.position);
        if(index == -1){
          if(distance < parseInt(Global.kotor2DA.ranges.rows[this.perceptionRange].primaryrange) && this.hasLineOfSight(creature)){
            this.perceptionList.push(creature);
            if(PartyManager.party.indexOf(this) == -1){
              if(this.scripts.onNotice instanceof NWScript){
                this.scripts.onNotice.lastPerceived = creature;
                this.scripts.onNotice.run(this);
              }
            }else if(this == PartyManager.party[0]){
              if(this.isHostile(creature)){
                this.combatState = true;
                //Game.State = Game.STATES.PAUSED;
              }
            }
          }
        }else{
          if(distance > parseInt(Global.kotor2DA.ranges.rows[this.perceptionRange].primaryrange) && this.hasLineOfSight(creature)){
            this.perceptionList.splice(index, 1);
          }
        }
      }
    }

    //Check party creatures
    let partyLen = PartyManager.party.length;
    for(let i = 0; i < partyLen; i++ ){
      let creature = PartyManager.party[i];
      if(this != creature && !creature.isDead()){
        let index = this.perceptionList.indexOf(creature);
        let distance = this.position.distanceTo(creature.position);
        if(index == -1){
          if(distance < 9){
            this.perceptionList.push(creature);
            if(PartyManager.party.indexOf(this) == -1){
              this.combatState = true;
              if(this.scripts.onNotice instanceof NWScript){
                this.scripts.onNotice.lastPerceived = creature;
                this.scripts.onNotice.run(this);
              }
            }
          }
        }else{
          if(distance > 9){
            this.perceptionList.splice(index, 1);
          }
        }
      }
    }
  }

  actionPathfinder(distance, run = !this.walk, delta = 1){
    if(this.action.path == undefined){
      this.action.path = Game.module.area.path.traverseToPoint(this.position, this.action.object.position);
      if(this.action.goal == ModuleCreature.ACTION.FOLLOWLEADER){
        this.action.path.push(PartyManager.GetFollowPosition(this));
      }
      this.action.path_timer = 20;
    }

    this.invalidateCollision = true;
    let point = this.action.path[0];

    if(point == undefined)
      point = this.action.object.position;

    if(!(point instanceof THREE.Vector3))
      point = point.vector;

    let pointDistance = Utility.Distance2D(this.position, point);
    if(pointDistance > distance){
      let tangent = point.clone().sub(this.position.clone());
      let atan = Math.atan2(-tangent.y, -tangent.x);
      this.setFacing(atan + Math.PI/2, true);
      this.AxisFront.x = Math.cos(atan);
      this.AxisFront.y = Math.sin(atan);

      //Check Creature Avoidance
      /*let threatening = undefined;
      let threateningDistance = Infinity;
      let ahead = this.position.clone().sub(this.AxisFront.clone().normalize()).multiplyScalar(1);
      let ahead2 = this.position.clone().sub(this.AxisFront.clone().normalize()).multiplyScalar(1).multiplyScalar(0.5);
      for(let i = 0; i < Game.module.area.creatures.length; i++){
        let creature = Game.module.area.creatures[i];
        if(creature === this)
          continue;

        let hitDistance = +creature.getAppearance().hitdist;
        let creaturePos = creature.position.clone();
        let distance = this.position.distanceTo(creature.position);

        if(ahead.distanceTo(creaturePos) <= hitDistance || ahead2.distanceTo(creaturePos) <= hitDistance){
          //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
          if(distance < threateningDistance){
            threatening = creature;
            threateningDistance = distance;
          }
        }     
      }

      for(let i = 0; i < PartyManager.party.length; i++){
        let creature = PartyManager.party[i];
        if(creature === this)
          continue;

        let hitDistance = +creature.getAppearance().hitdist;
        let creaturePos = creature.position.clone();
        let distance = this.position.distanceTo(creature.position);

        if(ahead.distanceTo(creaturePos) <= hitDistance || ahead2.distanceTo(creaturePos) <= hitDistance){
          //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
          if(distance < threateningDistance){
            threatening = creature;
            threateningDistance = distance;
          }
        }
      }

      if(threatening instanceof ModuleCreature){
        console.log('threatening', threatening.firstName)
        
        let creaturePos = threatening.position.clone();        
        let avoidance_force = ahead.clone().sub(threatening.position).normalize().multiplyScalar(1*delta);
        avoidance_force.z = 0;
        let newTarget = this.position.clone().add(avoidance_force);

        let tangent = newTarget.sub(this.position.clone());
        let atan = Math.atan2(-tangent.y, -tangent.x);
        this.rotation.z = (atan + Math.PI/2); //(1 - delta) * this.rotation.z + delta * (atan + Math.PI/2)
        this.AxisFront.x = Math.cos(atan);
        this.AxisFront.y = Math.sin(atan);
    
      }*/
      
      if(run){
        this.force = -this.getRunSpeed();
        this.animState = ModuleCreature.AnimState.RUNNING;
      }else{
        this.force = -this.getWalkSpeed();
        this.animState = ModuleCreature.AnimState.WALKING;
      }
    }else{
      this.action.path.shift();
    }

    if(this.action.path_timer < 0){
      if(this.action.path_realtime){
        this.action.path = undefined;
        this.action.path_timer = 20;
        console.log('Path invalidated');
      }
    }else{
      this.action.path_timer -= 10*delta;
    }

  }

  updateCombat(delta = 0){
    if(this.combatState){

      if(this.action && this.action.goal == ModuleCreature.ACTION.ATTACKOBJECT){
        if(this.action.object.getHP() <= 0){
          this.clearTarget();
          return;
        }
      }else{
        return;
      }

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
        }else if(PartyManager.party.indexOf(this) >= 0 && CombatEngine.roundType == CombatEngine.ROUNDTYPES.PLAYER && !this.combatAction.ready){
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
        }
      }

    }
  }

  clearTarget(){
    this.combatQueue = [];
    this.combatAction = undefined;
    this.lastAttackTarget = undefined;
    this.lastDamager = undefined;
    //this.combatActionTimer = 0;
    this.combatState = false;
  }

  actionInRange(action = undefined){
    if(action){
      let distance = this.position.distanceTo(action.target.position);
      return distance < ( this.getEquippedWeaponType() == 1 ? 2.0 : 15.0 );
    }
  }

  updateAnimationState(){

    if(!(this.model instanceof THREE.AuroraModel))
      return;

    if(this.action && this.action.goal == ModuleCreature.ACTION.ANIMATE)
      return;

    if(Game.inDialog && this.dialogAnimation && !this.force)
      return;

    let currentAnimation = this.model.getAnimationName();
    let modeltype = this.getAppearance().modeltype;
    
    let hasHands = this.model.rhand instanceof THREE.Object3D && this.model.lhand instanceof THREE.Object3D;

    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);
    let randomPauseIdx = 0;
    let isSimple = this.isSimpleCreature();

    let idleAnimations = ['pause1', 'pause1', 'pause1', 'pause2'];//, 'pause3', 'hturnl', 'hturnr'];
    let idleAnimationsS = ['cpause1', 'cpause1','cpause1','cpause2', 'cpause3'];

    /*if(this.anim && currentAnimation && Game.inDialog){
      return;
    }*/

    if(this.model instanceof THREE.AuroraModel && !this.model.bonesInitialized){
      return;
    }

    if( this.combatAction == undefined || !this.combatAction.ready || !this.hasWeapons() || !currentAnimation ){

      switch(this.animState){
        case ModuleCreature.AnimState.IDLE:
            if(this.combatState){
              if(!isSimple){
                if(hasHands && bothHands){
                  switch(parseInt(rWeapon.getBaseItem().weaponwield)){
                    case 2:
                      if(currentAnimation != 'g4r1'){
                        this.getModel().playAnimation('g4r1', false);
                      }
                    break;
                    case 4:
                      if(currentAnimation != 'g5r1'){
                        this.getModel().playAnimation('g5r1', false);
                      }
                    break;
                    case 5:
                      if(currentAnimation != 'g6r1'){
                        this.getModel().playAnimation('g6r1', false);
                      }
                    break;
                  }
                }else{
                  if(hasHands && rWeapon){
                    switch(parseInt(rWeapon.getBaseItem().weaponwield)){
                      case 1:
                        if(currentAnimation != 'g1r1'){
                          this.getModel().playAnimation('g1r1', false);
                        }
                      break;
                      case 2:
                        if(currentAnimation != 'g2r1'){
                          this.getModel().playAnimation('g2r1', false);
                        }
                      break;
                      case 3:
                        if(currentAnimation != 'g3r1'){
                          this.getModel().playAnimation('g3r1', false);
                        }
                      break;
                      case 4:
                        if(currentAnimation != 'g5r1'){
                          this.getModel().playAnimation('g5r1', false);
                        }
                      break;
                      case 5:
                        if(currentAnimation != 'g7r1'){
                          this.getModel().playAnimation('g7r1', false);
                        }
                      break;
                      case 6:
                        if(currentAnimation != 'g6r1'){
                          this.getModel().playAnimation('g6r1', false);
                        }
                      break;
                    }
                  }else{
                    
                  }
                }
              }else{
                if(currentAnimation != 'creadyr'){
                  this.getModel().playAnimation('creadyr', false);
                }
              }
            }else{
              switch(modeltype){
                case 'S':
                case 'L':
                  if(idleAnimationsS.indexOf(currentAnimation) == -1){
                    this.getModel().playAnimation(idleAnimationsS[Math.round(Math.random()*(idleAnimationsS.length-1))], false);
                  }
                break;
                default:
                  if(this.getHP()/this.getMaxHP() > .1){
                    if(idleAnimations.indexOf(currentAnimation) == -1){
                      this.getModel().playAnimation(idleAnimations[Math.round(Math.random()*(idleAnimations.length-1))], false);
                    }
                  }else{
                    if(currentAnimation != 'pauseinj' && currentAnimation != 'pauseinj'){
                      this.getModel().playAnimation('pauseinj', false);
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
              if(this.getHP()/this.getMaxHP() > .1){
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
                if(this.getHP()/this.getMaxHP() > .1){
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
                  switch(parseInt(rWeapon.getBaseItem().weaponwield)){
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
                    switch(parseInt(rWeapon.getBaseItem().weaponwield)){
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
                    switch(parseInt(rWeapon.getBaseItem().weaponwield)){
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
                      switch(parseInt(rWeapon.getBaseItem().weaponwield)){
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
                      if(this.getHP() / this.getMaxHP() > .1){
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
        case ModuleCreature.AnimState.DIEING:
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
      if(currentAnimation != this.combatAction.animation && this.combatAction.ready && !this.combatAction.animPlayed){

        var atkMod = CombatEngine.GetMod(this.getSTR());
        this.combatAction.animPlayed = true;

        if(!this.combatAction.isCutsceneAttack){
          //Roll to hit
          this.combatAction.hits = CombatEngine.DiceRoll(1, 'd20', atkMod) > CombatEngine.GetArmorClass(this.combatAction.target);
          //Roll damage
          this.combatAction.attackDice = CombatEngine.GetCreatureAttackDice(this);
          this.combatAction.damage = CombatEngine.DiceRoll(this.combatAction.attackDice.num, this.combatAction.attackDice.type, CombatEngine.GetMod(this.getSTR()));
        }

        let attackAnimation = this.model.getAnimationByName(this.combatAction.animation);

        this.setFacing(
          Math.atan2(
            this.position.y - this.combatAction.target.position.y,
            this.position.x - this.combatAction.target.position.x
          ) + Math.PI/2,
          true
        );

        let attack_sound = THREE.Math.randInt(0, 2);
        switch(attack_sound){
          case 1:
            this.PlaySoundSet(SSFObject.TYPES.ATTACK_2);
          break;
          case 2:
            this.PlaySoundSet(SSFObject.TYPES.ATTACK_3);
          break;
          default:
            this.PlaySoundSet(SSFObject.TYPES.ATTACK_1);
          break;
        }

        if(this.combatAction.isCutsceneAttack){

          this.getModel().playAnimation(this.combatAction.animation, false);
          this.combatAction.target.actionPlayAnimation(this.combatAction.target.getDamageAnimation(), false);

          let painsound = THREE.Math.randInt(0, 1);
          switch(painsound){
            case 1:
              this.combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_2);
            break;
            default:
              this.combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_1);
            break;
          }

          if(this.combatAction.damage)
              this.combatAction.target.subtractHP(this.combatAction.damage);

          setTimeout( () => {
            this.actionQueue.shift();
          }, attackAnimation.length * 500);
        }else{
          //Roll to hit
          if(this.combatAction.hits){
            
            this.getModel().playAnimation(this.combatAction.animation, false);
            //this.combatAction.target.actionPlayAnimation(this.combatAction.target.getDamageAnimation(), false);

            let painsound = THREE.Math.randInt(0, 1);
            switch(painsound){
              case 1:
                this.combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_2);
              break;
              default:
                this.combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_1);
              break;
            }

            /*setTimeout( () => {
              this.combatAction.target.damage(this.combatAction.damage, this);
            }, attackAnimation.length * 500)*/
            
          }else{
            
            this.combatAction.target.lastAttacker = this;
            this.getModel().playAnimation(this.combatAction.animation, false);
            //this.combatAction.target.actionPlayAnimation(this.combatAction.target.getDamageAnimation(), false);
          }
        }
      }
    }

  }

  damage(amount = 0, oAttacker = undefined){
    this.subtractHP(amount);
    this.lastDamager = oAttacker;
    this.lastAttacker = oAttacker;
    this.onDamage();
  }

  onCombatRoundEnd(){
    
    this.combatAction = undefined;

    if(this.isDead() || !this.combatState)
      return true;

    if(this.scripts.onEndRound instanceof NWScript){
      this.scripts.onEndRound.run(this);
    }

  }

  onDamage(){
    if(this.isDead())
      return true;

    if(this.scripts.onDamaged instanceof NWScript){
      this.scripts.onDamaged.run(this);
    }
  }

  onDeath(){
    if(this.scripts.onDeath instanceof NWScript){
      this.scripts.onDeath.run(this);
    }
  }

  onDialog(oSpeaker = undefined, listenPatternNumber = -1, callback = null){
    if(this.scripts.onDialog instanceof NWScript){
      this.scripts.onDialog.listenPatternNumber = listenPatternNumber;
      this.scripts.onDialog.listenPatternSpeaker = oSpeaker;
      this.scripts.onDialog.debug['action'] = false;
      this.scripts.onDialog.run(this, 0, () => {
        if(typeof callback === 'function')
          callback();
      });
    }else if(typeof callback === 'function'){
      callback();
    }
  }

  canMove(){
    return (this.animState != ModuleCreature.AnimState.DEAD || this.animState != ModuleCreature.AnimState.DIEING);
  }

  getCurrentAction(){
    if(this.actionQueue.length){
      return this.actionQueue[0].goal;
    }
    return -1;
  }

  moveToObject(target = undefined, bRun = true, distance = 1.0){

    if(target instanceof ModuleObject){
      this.actionQueue.push({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: bRun,
        distance: distance,
        instant: false
      });
    }

  }

  moveToLocation(target = undefined, bRun = true){

    if(typeof target === 'object'){
      this.actionQueue.push({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: bRun,
        distance: 1.0,
        instant: false
      });
    }

  }

  jumpToObject(target = undefined){

    if(target instanceof ModuleObject){
      this.actionQueue.push({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: false,
        distance: 1.0,
        instant: true
      });
    }

  }

  jumpToLocation(target = undefined){

    if(typeof target === 'object'){
      this.actionQueue.push({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: false,
        distance: 1.0,
        instant: true
      });
    }

  }

  attackCreature(target = undefined, feat_id = 0, isCutsceneAttack = false, attackDamage = 0, attackAnimation = null){

    if(target == undefined)
      return;

    if(target == this)
      target = Game.player;

    this.combatState = true;

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

    if(feat_id){
      let feat = Global.kotor2DA['feat'].rows[feat_id];
      icon = feat.icon;
      //console.log('Attacking with feat', feat);
      if(attackKey == 'm'){
        attackKey = 'f';
        switch(feat_id){
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
        switch(feat_id){
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
      feat_id: feat_id,
      isMelee: isMelee,
      isRanged: isRanged,
      ready: false,
      isCutsceneAttack: isCutsceneAttack,
      damage: attackDamage
    };

    if(!isCutsceneAttack){
      this.combatQueue.push(combatAction);
      this.actionQueue = [];
    }
    
    this.actionQueue.push(
      {object: target, goal: ModuleCreature.ACTION.ATTACKOBJECT, combatAction: combatAction}
    )

  }

  castSpellAtCreature(target = undefined, spellId = 0){

    if(target == undefined)
      return;

    if(!this.combatState)
      this.combatState = true;

    let weaponWield = this.getCombatAnimationWeaponType();

    let animation = 'c'+weaponWield+'a1';

    this.combatQueue.push({
      target: target,
      type: ModuleCreature.ACTION.CASTSPELL,
      icon: 'ip_heal',
      animation: animation,
      ready: false
    });

  }

  //Queue an animation to the actionQueue array
  actionPlayAnimation(anim = '', loop = false){
    this.actionQueue.push({ 
      goal: ModuleCreature.ACTION.ANIMATE,
      animation: anim,
      speed: 1,
      time: loop ? -1 : 0
    });
  }

  dialogPlayAnimation(anim = '', loop = false){
    this.dialogAnimation = { 
      //goal: ModuleCreature.ACTION.ANIMATE,
      animation: anim,
      speed: 1,
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
    this.clearTarget();

  }

  getDamageAnimation(){
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    //console.log('getDamageAnimation', 'g'+weaponWield+'d1');
    return 'g'+weaponWield+'d1';

  }

  getCombatAnimationAttackType(){
    let weapon = this.equipment.RIGHTHAND;
    let weaponType = 0;
    //let weaponWield = this.getCombatAnimationWeaponType();

    if(this.equipment.RIGHTHAND){
      weaponType = parseInt(this.equipment.RIGHTHAND.getBaseItem().weapontype);

      switch(weaponType){
        case 4:
          return 'b';
        case 1:
          return 'm';
      }

    }else if(this.equipment.CLAW1){
      weaponType = parseInt(this.equipment.CLAW1.getBaseItem().weapontype);

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else if(this.equipment.CLAW2){
      weaponType = parseInt(this.equipment.CLAW2.getBaseItem().weapontype);

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else if(this.equipment.CLAW3){
      weaponType = parseInt(this.equipment.CLAW3.getBaseItem().weapontype);

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

    if(cWeapon1 || cWeapon2 || cWeapon3){
      return 0;
    }

    //if(this.isSimpleCreature())
    //  return 0;

    if(lWeapon || rWeapon){

      if(bothHands){
        switch(parseInt(rWeapon.getBaseItem().weaponwield)){
          case 2:
            return 4;
          case 4:
            return 5;
          case 5:
            return 6;
        }
      }else{
        switch(parseInt(rWeapon.getBaseItem().weaponwield)){
          case 1:
            return 1;
          case 2:
            return 2;
          case 3:
            return 3;
          case 4:
            return 5;
          case 5:
            return 7;
          case 6:
            return 6;
          case 7:
            return 7;
          case 8:
            return 8;
          case 9:
            return 9;
        }
      }

    }

    return parseInt(rWeapon.getBaseItem().weaponwield);

  }

  getEquippedWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;

    if(rWeapon){
      return parseInt(rWeapon.getBaseItem().weapontype);
    }

    if(lWeapon){
      return parseInt(lWeapon.getBaseItem().weapontype);
    }

    return 0;

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

    this.getCurrentRoom();

    if(this.model && this.model.box)
      this.model.box.setFromObject(this.model)

    //I'm trying to clamp the delta incase of lag spikes that are sometimes warping the creature beyond a colliding object
    if(delta > 1){
      delta = 1;
    }

    //START Gravity

    Game.raycaster.far = 10;
    let falling = true;
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.position.clone().add( ( scratchVec3 ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    Game.raycaster.ray.direction.set(0, 0,-1);

    let aabbFaces = [];
    let meshesSearch;// = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
    let intersects;// = Game.raycaster.intersectOctreeObjects( meshesSearch );

    for(let j = 0, jl = this.rooms.length; j < jl; j++){
      let room = Game.module.rooms[this.rooms[j]];
      if(room && room.walkmesh && room.walkmesh.aabbNodes.length){
        aabbFaces.push({
          object: room, 
          faces: room.walkmesh.getAABBCollisionFaces(this.model.box)
        });
      }
    }

    for(let j = 0, jl = Game.module.area.placeables.length; j < jl; j++){
      let plc = Game.module.area.placeables[j];
      if(plc && plc.walkmesh){
        if(plc.box.intersectsBox(this.model.box) || plc.box.containsBox(this.model.box)){
          aabbFaces.push({
            object: plc, 
            faces: plc.walkmesh.getAABBCollisionFaces(this.model.box)
          });
        }
      }
    }

    for(let j = 0, jl = Game.module.area.doors.length; j < jl; j++){
      let door = Game.module.area.doors[j];
      if(door && door.walkmesh && !door.isOpen()){
        if(door.box.intersectsBox(this.model.box) || door.box.containsBox(this.model.box)){
          aabbFaces.push({
            object: door,
            faces: door.walkmesh.getAABBCollisionFaces(this.model.box)
          });
        }
      }
    }

    //START: PLAYER CREATURE COLLISION
    
    //Check creature collision
    for(let i = 0; i < Game.module.area.creatures.length; i++){
      let creature = Game.module.area.creatures[i];
      let position = this.position.clone().add(this.AxisFront);
      
      if(creature === this || creature.isDead())
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
    

    //Check party collision
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

    //END: PLAYER CREATURE COLLISION

    //START: PLAYER WORLD COLLISION
    

    let worldCollide = false;
    for(let i = 0; i < 360; i += 30) {
      //if(worldCollide)
      //  break;
      let dx = Math.cos(i), dy = Math.sin(i);
      Game.raycaster.ray.direction.set(dx, dy,-0.5);
      for(let k = 0, kl = aabbFaces.length; k < kl; k++){
        playerFeetRay.copy(this.position).add(this.AxisFront);
        playerFeetRay.z += 0.25;
        Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
        //if(worldCollide)
        //  break;
        let castableFaces = aabbFaces[k];
        intersects = castableFaces.object.walkmesh.raycast(Game.raycaster, castableFaces.faces);
        if (intersects && intersects.length > 0 ) {
          for(let j = 0; j < intersects.length; j++){
            //if(worldCollide)
              //break;
            if(intersects[j].distance < this.getAppearance().hitdist){
              if(intersects[j].face.walkIndex == 7 || intersects[j].face.walkIndex == 2){
                let oldPos = this.position.clone();

                //let newDir = this.position.clone().sub(oldPos);
                //this.position.add(newDir.negate());

                let normal = intersects[j].face.normal.clone();
                //console.log(intersects[j].face.normal);
 
                if(normal.z == 1){

                  let pDistance = (1 - intersects[j].distance) * 0.1;
                  this.AxisFront.set(pDistance * Math.cos(i), pDistance * Math.sin(i), 0).negate()
                  
                }else if(normal.length() == 0 ){
                  this.AxisFront.set(0, 0, 0);
                }else{
                  if(this == Game.player){
                      //console.log(normal);
                  }
                  let invNormal = normal.clone().negate();
                  invNormal = invNormal.multiplyScalar(this.AxisFront.clone().multiply(normal).length());
                  let wallDir = this.AxisFront.clone().sub(invNormal);
                  let newPos = oldPos.clone().add(wallDir);
                  let direction = newPos.sub(oldPos);
                  this.AxisFront.copy(direction);
                }

                playerFeetRay.copy(this.position);
                playerFeetRay.z += 0.25;
                //worldCollide = true;
              }else{
                //console.log(intersects[j].face.walkIndex);
              }
            }
          }
        }
      }
      //meshesSearch = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
      //intersects = Game.raycaster.intersectOctreeObjects( meshesSearch );
    }

    //END: PLAYER WORLD COLLISION


    falling = true;

    scratchVec3 = new THREE.Vector3(0, 0, 2);

    playerFeetRay = this.position.clone().add( ( scratchVec3 ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    Game.raycaster.ray.direction.set(0, 0,-1);
    
    for(let j = 0, jl = aabbFaces.length; j < jl; j++){
      let castableFaces = aabbFaces[j];
      
      //if(object && object.walkmesh && object.walkmesh.aabbNodes.length){
        //object.walkmesh.getAABBCollisionFaces(this.model.box, null, castableFaces);
        intersects = castableFaces.object.walkmesh.raycast(Game.raycaster, castableFaces.faces);
        //if(this == PartyManager.party[0])
          //console.log(intersects, aabbFaces);
        //return;//var intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
        if (intersects && intersects.length > 0 ) {
          for(let i = 0; i < intersects.length; i++){
            if(intersects[i].distance) {
              this.surfaceId = intersects[i].face.walkIndex;
              falling = false;
              if(intersects[i].face.walkIndex != 7 && intersects[i].face.walkIndex != 2){
                this.position.z = intersects[i].point.z + .005;
                this.groundFace = intersects[i];
                if(this.groundFace && this.getAppearance().groundtilt == '1'){
                  this.groundTilt.set(0, 0, 0);
                  this.groundTilt.crossVectors(this.up, this.groundFace.face.normal);
                  this.rotation.x = this.groundTilt.x;
                  this.rotation.y = this.groundTilt.y;
                }
              }else{
                this.AxisFront.negate();
                //this.position.sub( this.AxisFront ).clone();
              }
            }
          }
        }

      //}

    }

    if(falling){
      //console.log('Falling');
      this.position.z -= 1*delta;
    }


    //END Gravity
    this.invalidateCollision = false;
    Game.raycaster.far = Infinity;
    //this.model.updateMatrixWorld();

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

    let currentAnimation = this.model.getAnimationName();
    let modeltype = this.getAppearance().modeltype;
    
    let hasHands = this.model.rhand instanceof THREE.Object3D && this.model.lhand instanceof THREE.Object3D;

    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);
    let isSimple = this.isSimpleCreature();

    let weaponType = this.getCombatAnimationWeaponType();
    
    if(!isSimple){
      
      if(weaponType){
        this.clearAllActions();
        this.actionPlayAnimation('g'+weaponType+'w1');
        this.actionPlayAnimation('g'+weaponType+'r1', true);
        this.weaponPowered(true);
      }

    }

  }

  weaponPowered(on = false){

    let modeltype = this.getAppearance().modeltype;
    let hasHands = this.model.rhand instanceof THREE.Object3D && this.model.lhand instanceof THREE.Object3D;

    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);
    let isSimple = this.isSimpleCreature();

    let weaponType = this.getCombatAnimationWeaponType();
    
    if(!isSimple){

      if(weaponType){
        
        if(lWeapon){
          let currentAnimL = this.equipment.LEFTHAND.model.currentAnimation || this.equipment.LEFTHAND.model.getAnimationByName('off');
          if(currentAnimL){
            if(on){
              switch(currentAnimL.name){
                case 'off':
                  this.equipment.LEFTHAND.model.playAnimation('powerup', false, () => {
                      this.equipment.LEFTHAND.model.playAnimation('powered', true);
                  });
                break;
                default:
                  this.equipment.LEFTHAND.model.playAnimation('powered', true);
                break;
              }
            }else{
              switch(currentAnimL.name){
                case 'powered':
                  this.equipment.LEFTHAND.model.playAnimation('powerdown', false, () => {
                      this.equipment.LEFTHAND.model.playAnimation('off', true);
                  });
                break;
                default:
                  this.equipment.LEFTHAND.model.playAnimation('off', true);
                break;
              }
            }
          }
        }

        if(rWeapon){
          let currentAnimR = this.equipment.RIGHTHAND.model.currentAnimation || this.equipment.RIGHTHAND.model.getAnimationByName('off');
          if(currentAnimR){
            if(on){
              switch(currentAnimR.name){
                case 'off':
                  this.equipment.RIGHTHAND.model.playAnimation('powerup', false, () => {
                      this.equipment.RIGHTHAND.model.playAnimation('powered', true);
                  });
                break;
                default:
                  this.equipment.RIGHTHAND.model.playAnimation('powered', true);
                break;
              }
            }else{
              switch(currentAnimR.name){
                case 'powered':
                  this.equipment.RIGHTHAND.model.playAnimation('powerdown', false, () => {
                      this.equipment.RIGHTHAND.model.playAnimation('off', true);
                  });
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

  getAnimationNameById(id=-1){
    if(typeof id === 'string'){
      return id;
    }else{
      switch(id){
        case 0:  //PAUSE
          return 'pause';
        case 1:  //PAUSE2
          return 'pause2';
        case 2:  //LISTEN
          return 'listen';
        case 3:  //MEDITATE
          return 'meditate';
        //case 4:  //WORSHIP
        case 5:  //TALK_NORMAL
          return 'tlknorm';
        case 6:  //TALK_PLEADING
          return 'tlkplead';
        case 7:  //TALK_FORCEFUL
          return 'tlkforce';
        case 8:  //TALK_LAUGHING
          return 'tlklaugh';
        case 9:  //TALK_SAD
          return 'tlksad';
        case 10: //GET_LOW
          return 'getfromgnd';
        case 11: //GET_MID
          return 'getfromcntr';
        //case 12: //PAUSE_TIRED
        //case 13: //PAUSE_DRUNK
        case 14: //FLIRT
          return 'flirt';
        case 15: //USE_COMPUTER
          return 'usecomplp';
        case 16: //DANCE
          return 'dance';
        case 17: //DANCE1
          return 'dance1';
        case 18: //HORROR
          return 'horror';
        //case 19: //READY
        //case 20: //DEACTIVATE
        //case 21: //SPASM
        case 22: //SLEEP
          return 'sleep';
        case 23: //PRONE
          return 'prone';
        case 24: //PAUSE3
          return 'pause3';
        case 25: //WELD
          return 'weld';
        case 26: //DEAD
          return 'dead';
        case 27: //TALK_INJURED
          return 'talkinj';
        case 28: //LISTEN_INJURED
          return 'listeninj';
        case 29: //TREAT_INJURED
          return 'treatinj';
        case 30: //DEAD_PRONE
          return 'dead';
        //case 31: //KNEEL_TALK_ANGRY
        //case 32: //KNEEL_TALK_SAD
        case 35: //MEDITATE LOOP
          return 'meditate';
        case 100: //HEAD_TURN_LEFT
          return 'hturnl';
        case 101: //HEAD_TURN_RIGHT
          return 'hturnr';
        case 102: //PAUSE_SCRATCH_HEAD
          return 'pause3';
        case 103: //PAUSE_BORED
          return 'pause2';
        case 104: //SALUTE
          return 'salute';
        case 105: //BOW
          return 'bow';
        case 106: //GREETING
          return 'greeting';
        case 107: //TAUNT
          return 'taunt';
        case 108: //VICTORY1
          return 'victory';
        case 109: //VICTORY2
          return 'victory';
        case 110: //VICTORY3
          return 'victory';
        //case 111: //READ
        //  return 'salute';
        case 112: //INJECT
          return 'inject';
        case 113: //USE_COMPUTER
          return 'usecomp';
        case 114: //PERSUADE
          return 'persuade';
        case 115: //ACTIVATE
          return 'activate';
        case 116: //CHOKE
          return 'choke';
        case 117: //THROW_HIGH
          return 'throwgren';
        case 118: //THROW_LOW
          return 'throwsab';
        case 119: //CUSTOM01
          return 'dunno???';
        case 120: //TREAT_INJURED
          return 'treatinj';
      }
      //console.error('Animation case missing', id);
      return 'pause1';
    }
  }



  setLIP(lip){
    //console.log(lip);
    this.lipObject = lip;
  }



}
module.exports = ModuleCreatureController;