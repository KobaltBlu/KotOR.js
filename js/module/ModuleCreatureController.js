/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleCreatureController class.
 */

class ModuleCreatureController extends ModuleObject {

  constructor(){
    super();
  }

  update( delta = 0 ){
    
    super.update(delta);

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
                let targetPos = PartyManager.GetFollowPosition(this);
                distance = this.position.distanceTo(PartyManager.party[0].position.clone());
                if(distance > 3){
                  this.invalidateCollision = true;
                  
                  let tangent2 = targetPos.clone().sub(this.position);
                  this.rotation.z = Math.atan2(tangent2.y, tangent2.x) - Math.PI/2;

                  this.AxisFront.x = (tangent2.x / distance);
                  this.AxisFront.y = (tangent2.y / distance);
                  
                  this.force = 5.40;
                  this.animState = ModuleCreature.AnimState.RUNNING;
                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                  this.actionQueue.shift();
                }
              break;
              case ModuleCreature.ACTION.USEOBJECT:
                distance = this.position.distanceTo(this.action.object.position);
                if(distance > 1.5){

                  this.invalidateCollision = true;

                  let tangent = this.action.object.position.clone().sub(this.position.clone());
                  let atan = Math.atan2(-tangent.y, -tangent.x);
                  this.rotation.z = atan + Math.PI/2;
                  this.AxisFront.x = Math.cos(atan);
                  this.AxisFront.y = Math.sin(atan);
                  this.force = -5.2;
                  this.animState = ModuleCreature.AnimState.RUNNING;

                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                  //console.log(this.action.object);

                  this.rotation.z = Math.atan2(
                    this.position.y - this.action.object.position.y,
                    this.position.x - this.action.object.position.x
                  ) + Math.PI/2;

                  if(this.action.object != Game.player){
                    this.action.object.use(this);
                  }

                  this.actionQueue.shift()
                  
                }
              break;
              case ModuleCreature.ACTION.OPENDOOR:
                distance = this.position.distanceTo(this.action.object.position);
                if(distance > 1.5){

                  this.invalidateCollision = true;

                  let tangent = this.action.object.position.clone().sub(this.position.clone());
                  let atan = Math.atan2(-tangent.y, -tangent.x);
                  this.rotation.z = atan + Math.PI/2;
                  this.AxisFront.x = Math.cos(atan);
                  this.AxisFront.y = Math.sin(atan);
                  this.force = -5.2;
                  this.animState = ModuleCreature.AnimState.RUNNING;

                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                  //console.log(this.action.object);

                  this.rotation.z = Math.atan2(
                    this.position.y - this.action.object.position.y,
                    this.position.x - this.action.object.position.x
                  ) + Math.PI/2;

                  if(this.action.object == Game.player){
                    this.actionQueue.shift()
                  }else{
                    this.action.object.use(Game.player);
                    this.actionQueue.shift()
                  }
                  
                }
              break;
              case ModuleCreature.ACTION.OPENLOCK:
                distance = this.position.distanceTo(this.action.object.position);
                if(distance > 1.5){

                  this.invalidateCollision = true;

                  let tangent = this.action.object.position.clone().sub(this.position.clone());
                  let atan = Math.atan2(-tangent.y, -tangent.x);
                  this.rotation.z = atan + Math.PI/2;
                  this.AxisFront.x = Math.cos(atan);
                  this.AxisFront.y = Math.sin(atan);
                  this.force = -5.2;
                  this.animState = ModuleCreature.AnimState.RUNNING;

                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                  //console.log(this.action.object);

                  this.rotation.z = Math.atan2(
                    this.position.y - this.action.object.position.y,
                    this.position.x - this.action.object.position.x
                  ) + Math.PI/2;

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
                distance = this.position.distanceTo(this.action.object.position);
                if(distance > 4.5 && !this.action.ignoreStartRange){

                  this.invalidateCollision = true;

                  let tangent = this.action.object.position.clone().sub(this.position.clone());
                  let atan = Math.atan2(-tangent.y, -tangent.x);
                  this.rotation.z = atan + Math.PI/2;
                  this.AxisFront.x = Math.cos(atan);
                  this.AxisFront.y = Math.sin(atan);
                  this.force = -5.2;
                  this.animState = ModuleCreature.AnimState.RUNNING;

                }else{
                  this.animState = ModuleCreature.AnimState.IDLE;
                  this.force = 0;
                  //console.log(this.action.object);

                  /*this.action.object.rotation.z = Math.atan2(
                    this.action.object.position.y - this.position.y,
                    this.action.object.position.x - this.position.x
                  ) + Math.PI/2;

                  this.rotation.z = Math.atan2(
                    this.position.y - this.action.object.position.y,
                    this.position.x - this.action.object.position.x
                  ) + Math.PI/2;*/

                  /*if(this.action.object == Game.player){
                    this.actionQueue.shift()
                  }else{*/
                    Game.InGameDialog.StartConversation(this.action.conversation, this.action.object, this);
                    this.actionQueue.shift()
                  //}
                  
                }
              break;
              case ModuleCreature.ACTION.MOVETOPOINT:
                if(this.action.instant){
                  this.position.copy(
                    this.action.object.position.clone()
                  );
                  this.actionQueue.shift()
                }else{
                  distance = this.position.distanceTo(this.action.object.position);
                  if(distance > 1.5){

                    this.invalidateCollision = true;

                    let tangent = this.action.object.position.clone().sub(this.position.clone());
                    let atan = Math.atan2(-tangent.y, -tangent.x);
                    this.rotation.z = atan + Math.PI/2;
                    this.AxisFront.x = Math.cos(atan);
                    this.AxisFront.y = Math.sin(atan);
                    if(this.action.run){
                      this.force = -5.20;
                      this.animState = ModuleCreature.AnimState.RUNNING;
                    }else{
                      this.force = -1.70;
                      this.animState = ModuleCreature.AnimState.WALKING;
                    }

                  }else{
                    this.animState = ModuleCreature.AnimState.IDLE;
                    this.force = 0;
                    this.actionQueue.shift()
                  }
                }
              break;
              default:
                distance = this.position.distanceTo(this.action.object.position);
                if(distance > 1.5){

                  this.invalidateCollision = true;

                  let tangent = this.action.object.position.clone().sub(this.position.clone());
                  let atan = Math.atan2(-tangent.y, -tangent.x);
                  this.rotation.z = atan + Math.PI/2;
                  this.AxisFront.x = Math.cos(atan);
                  this.AxisFront.y = Math.sin(atan);
                  this.force = -5.2;
                  this.animState = ModuleCreature.AnimState.RUNNING;

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
      }else{
        if(this.animState != ModuleCreature.AnimState.DEAD || this.animState != ModuleCreature.AnimState.DIEING){
          if(this.action){
            this.actionQueue.shift();
          }
          
          this.animState = ModuleCreature.AnimState.DEAD;
        }
      }

      if(this != Game.getCurrentPlayer()){

        if(
          this.animState != ModuleCreature.AnimState.DEAD && 
          this.isHostile(Game.getCurrentPlayer()) && 
          !this.combatQueue.length
        ){

          let pos = this.position.clone();
          let tarPos = Game.getCurrentPlayer().position.clone();

          if(pos.distanceTo(tarPos) < 5){
            //this.attackCreature(Game.getCurrentPlayer());
          }

        }

      }

      //this.updateCombat(delta);
      this.updateAnimationState();
      this.updateItems(delta);

      if(this == Game.getCurrentPlayer() || true){
        // this.AxisFront.x = Math.cos(this.rotation.z);// * Math.cos(0);
        // this.AxisFront.y = Math.sin(this.rotation.z);// * Math.cos(0);
      }else{
        //this.AxisFront.x = Math.cos(this.rotation.z + Math.PI/2);// * Math.cos(0);
        //this.AxisFront.y = Math.sin(this.rotation.z + Math.PI/2);// * Math.cos(0);
      }
      this.AxisFront.z = 0;
      
      let forceDelta = this.force * (delta > 1 ? 1 : delta);
      let gravityDelta = -1 * delta;
        
      this.AxisFront.multiply(new THREE.Vector3(forceDelta, forceDelta, gravityDelta));
      this.position.add(this.AxisFront);

      if(this.invalidateCollision)
        this.updateCollision(delta);




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

  updateCombat(delta = 0){
    if(this.combatState){

      if(this.action){
        if(this.action.object.getHP() <= 0){
          this.clearTarget();
          return;
        }
      }

      if(this.combatQueue.length){
        if(this.combatAction == undefined && this.combatQueue.length){
          this.combatAction = this.combatQueue.shift();
          this.combatAction.ready = false;
          this.combatActionTimer = 0;
        }

      }else{
        //this.combatActionTimer = 6;
      }

      if(this.combatAction != undefined){
         if(this.combatAction != undefined && this.combatAction.target != this){
          this.actionQueue.push(
            {object: this.combatAction.target, goal: ModuleCreature.ACTION.ATTACKOBJECT}
          )
        }

        //this.combatAction.ready = this.actionInRange(this.combatAction) && (this.combatActionTimer >= 6);

        if(this.combatActionTimer >= 6){
          if(this.actionInRange(this.combatAction)){
            this.combatAction.ready = true;
            this.combatActionTimer = 0;
          }
        }else{
          this.combatActionTimer += delta;
        }
      }

    }
  }

  clearTarget(){
    this.combatQueue = [];
    this.combatAction = undefined;
    this.combatActionTimer = 0;
    this.combatState = false;
  }

  actionInRange(action = undefined){
    if(action){
      let distance = this.position.distanceTo(action.target.position);
      return distance < 1.5;
    }
  }

  updateAnimationState(){

    if(!(this.model instanceof THREE.AuroraModel))
      return;

    if(this.action && this.action.goal == ModuleCreature.ACTION.ANIMATE)
      return;


    let currentAnimation = this.model.getAnimationName();
    let modeltype = this.getAppearance().modeltype;
    
    let hasHands = this.model.rhand instanceof THREE.Object3D && this.model.lhand instanceof THREE.Object3D;

    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);
    let randomPauseIdx = 0;
    let isSimple = this.isSimpleCreature();

    let idleAnimations = ['pause1', 'pause2'];//, 'pause3', 'hturnl', 'hturnr'];
    let idleAnimationsS = ['cpause1', 'cpause2', 'cpause3'];

    if(this.anim && currentAnimation && Game.inDialog){
      return;
    }

    if(this.model instanceof THREE.AuroraModel && !this.model.bonesInitialized){
      return;
    }

    if(this.combatAction == undefined || !this.combatAction.ready){

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
                if(currentAnimation != 'g0a1'){
                  //this.getModel().playAnimation('g0a1', false);
                }
              }
            }else{
              switch(modeltype){
                case 'S':
                case 'L':
                  if(idleAnimationsS.indexOf(currentAnimation) == -1){
                    this.getModel().playAnimation(idleAnimationsS[Math.round(Math.random()*(idleAnimationsS.length-1)) + 1], false);
                  }
                break;
                default:
                  if(this.getHP()/this.getMaxHP() > .1){
                    if(idleAnimations.indexOf(currentAnimation) == -1){
                      this.getModel().playAnimation(idleAnimations[Math.round(Math.random()*(idleAnimations.length-1)) + 1], false);
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
                      if(this.getHP()/this.getMaxHP() > .1){
                        if(this.model.getAnimationByName('run') && currentAnimation != 'run'){
                          this.getModel().playAnimation('run', false);
                        }else{
                          if(this.model.getAnimationByName('walk') && currentAnimation != 'walk'){
                            this.getModel().playAnimation('walk', false);
                          }
                        }
                      }else{
                        if(this.model.getAnimationByName('runinj') && currentAnimation != 'runinj'){
                          this.getModel().playAnimation('runinj', false);
                        }else{
                          if(this.model.getAnimationByName('walkinj') && currentAnimation != 'walkinj'){
                            this.getModel().playAnimation('walkinj', false);
                          }
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
              if(currentAnimation != 'cdead'){
                this.getModel().playAnimation('cdead', false);
              }
            break;
            default:
              if(currentAnimation != 'dead'){
                this.getModel().playAnimation('dead', false);
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
      if(currentAnimation != this.combatAction.animation && this.combatAction.ready){

        var atkMod = CombatEngine.GetMod(this.getSTR());

        //Roll to hit
        if(CombatEngine.DiceRoll(1, 'd20', atkMod) > CombatEngine.GetArmorClass(this.combatAction.target)){

          let attackDice = CombatEngine.GetCreatureAttackDice(this);
          
          //Roll damage
          let dmg = CombatEngine.DiceRoll(attackDice.num, attackDice.type, 0);
          //console.log(this, 'Hit: '+ dmg);
          this.getModel().playAnimation(this.combatAction.animation, false, () => {
            this.combatAction.target.subtractHP(dmg);
            this.combatAction = undefined;
            this.combatActionTimer = 0;
          });
          
        }else{
          this.getModel().playAnimation(this.combatAction.animation, false, () => {
            //console.log(this, 'Miss: 0');
            this.combatAction = undefined;
            this.combatActionTimer = 0;
          });
        }
      }
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
        run: bRun,
        distance: distance,
        instant: true
      });
    }

  }

  jumpToLocation(target = undefined){

    if(typeof target === 'object'){
      this.actionQueue.push({
        goal: ModuleCreature.ACTION.MOVETOPOINT,
        object: target,
        run: bRun,
        distance: 1.0,
        instant: true
      });
    }

  }

  attackCreature(target = undefined, attackType = 0){

    if(target == undefined)
      return;

    if(!this.combatState)
      this.combatState = true;

    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let animation = attackKey+weaponWield+'a1';

    this.combatQueue.push({
      target: target,
      type: ModuleCreature.ACTION.ATTACKOBJECT,
      icon: 'i_attack',
      animation: animation,
      ready: false
    });

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

  clearAllActions(){
    this.combatQueue = [];
    this.actionQueue = [];
    this.combatAction = undefined;
    this.clearTarget();
  }

  getCombatAnimationAttackType(){
    let weaponWield = this.getCombatAnimationWeaponType();

    if(this.isSimpleCreature())
      return 'm';

    if(weaponWield == 5 || weaponWield == 6 || weaponWield == 7 || weaponWield == 8 || weaponWield == 9){
      return 'b';
    }
    return 'c';
  }

  //Return the WeaponType ID for the current equipped items
  // g*r1 in this case * is the value we are trying to determine

  getCombatAnimationWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);

    if(this.isSimpleCreature())
      return 0;

    if(lWeapon || rWeapon){

      if(bothHands){
        switch(parseInt(rWeapon.getBaseItem().weaponwield)){
          case 2:
            return 4;
          break;
          case 5:
            return 6;
          break;
        }
      }else{
        switch(parseInt(rWeapon.getBaseItem().weaponwield)){
          case 1:
            return 1;
          break;
          case 2:
            return 2
          break;
          case 3:
            return 3
          break;
          case 4:
            return 5
          break;
          case 5:
            return 7
          break;
          case 6:
            return 6;
          break;
          case 7:
            return 7;
          break;
          case 8:
            return 8;
          break;
          case 9:
            return 9;
          break;
        }
      }

    }

    return 1;

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

    this.getCurrentRoom();

    //START Gravity

    Game.raycaster.far = 10;
    let falling = true;

    let scratchVec3 = new THREE.Vector3(0, 0, 0.25);

    let playerFeetRay = new THREE.Vector3().copy( this.position.clone().add( ( scratchVec3 ) ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);

    //this.position.z += (-10 * delta);
    playerFeetRay.z += 10;

    Game.raycaster.ray.direction.set(0, 0,-1);

    let meshesSearch = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
    let intersects = Game.raycaster.intersectOctreeObjects( meshesSearch );
    
    //var intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
    if ( intersects.length > 0 ) {
      for(let i = 0; i < intersects.length; i++){
        if(intersects[i].distance < 0.5) {
          //let faceIdx = intersects[i].faceIndex;
          //let walkableType = intersects[i].object.wok.walkTypes[faceIdx];
          //let pDistance = 0.5 - intersects[i].distance;
          this.position.z = intersects[i].point.z;
          this.surfaceId = intersects[i].face.walkIndex;
          falling = false;
        }
      }
    }

    if(falling){
      //console.log('Falling');
      this.position.z -= 1*delta;
    }

    //START: PLAYER CREATURE COLLISION
    
    //Check creature collision
    for(let i = 0; i < Game.module.area.creatures.length; i++){
      let creature = Game.module.area.creatures[i];
      
      if(creature === this)
        continue;

      let hitDistance = creature.getAppearance().hitdist;
      let distance = this.position.distanceTo(creature.position);
      if(distance < hitDistance){
        let pDistance = hitDistance - distance;
        scratchVec3.set(
           pDistance * Math.cos(this.rotation.z + Math.PI/2), 
           pDistance * Math.sin(this.rotation.z + Math.PI/2), 
           0 
        );
        this.position.sub(scratchVec3);
        break;
      }
    }
    

    //Check party collision
    for(let i = 0; i < PartyManager.party.length; i++){

      if(this === PartyManager.party[i])
        continue;

      let creature = PartyManager.party[i];
      let hitDistance = creature.getAppearance().hitdist;
      let distance = this.position.distanceTo(creature.position);
      if(distance < hitDistance){
        let pDistance = hitDistance - distance;
        scratchVec3.set(
           pDistance * Math.cos(this.rotation.z + Math.PI/2), 
           pDistance * Math.sin(this.rotation.z + Math.PI/2), 
           0 
        );
        this.position.sub(scratchVec3);
        break;
      }
    }

    //END: PLAYER CREATURE COLLISION

    //START: PLAYER WORLD COLLISION
    scratchVec3.set(0, 0, 0.25);
    playerFeetRay = new THREE.Vector3().copy( this.position.clone().add( ( scratchVec3 ) ) );

    for(let i = 0; i < 360; i += 30) {
      Game.raycaster.ray.direction.set(Math.cos(i), Math.sin(i),-1);
      Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);

      meshesSearch = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
      intersects = Game.raycaster.intersectOctreeObjects( meshesSearch );

      if ( intersects.length > 0 ) {
        for(let j = 0; j < intersects.length; j++){
          if(intersects[j].distance < 0.5){
            if(intersects[j].face.walkIndex == 7 || intersects[j].face.walkIndex == 2){
              //let pDistance = 0.5 - intersects[ 0 ].distance;
              let pDistance = (1 - intersects[j].distance) * 0.1;
              scratchVec3.set(pDistance * Math.cos(i), pDistance * Math.sin(i), 0)
              this.position.sub( scratchVec3 );
            }
          }
        }
      }
    }

    //END: PLAYER WORLD COLLISION

    //END Gravity
    this.invalidateCollision = false;
    Game.raycaster.far = Infinity;
    this.model.updateMatrixWorld();

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

  getWalkAnimation(){
    let modeltype = this.getAppearance().modeltype;

    

  }

  getRunAnimation(){
    let modeltype = this.getAppearance().modeltype;

    

  }

  getAnimationNameById(id=-1){
    if(typeof id === 'string'){
      return id;
    }else{
      switch(id){
        //case 0: //PAUSE
        //case 1: //PAUSE2
        //case 2: //LISTEN
        //case 3: //MEDITATE
        //case 4: //WORSHIP
        //case 5: /TALK_NORMAL
        //case 6: //TALK_PLEADING
        //case 7: //TALK_FORCEFUL
        //case 8: //TALK_LAUGHING
        //case 9: //TALK_SAD
        //case 10: //GET_LOW
        //case 11: //GET_MID
        //case 12: //PAUSE_TIRED
        //case 13: //PAUSE_DRUNK
        //case 14: //FLIRT
        //case 15: //USE_COMPUTER
        //case 16: //DANCE
        //case 17: //DANCE1
        //case 18: //HORROR
        //case 19: //READY
        //case 20: //DEACTIVATE
        //case 21: //SPASM
        //case 22: //SLEEP
        //case 23: //PRONE
        //case 24: //PAUSE3
        case 25: //WELD
          return 'weld';
        break;
        //case 26: //DEAD
        //case 27: //TALK_INJURED
        //case 28: //LISTEN_INJURED
        //case 29: //TREAT_INJURED
        case 30: //DEAD_PRONE
          return 'dead';
        //case 31: //KNEEL_TALK_ANGRY
        //case 32: //KNEEL_TALK_SAD
        case 35: //MEDITATE LOOP
          return 'meditate';
      }
      //console.error('Animation case missing', id);
      return 'pause1';
    }
  }







}
module.exports = ModuleCreatureController;