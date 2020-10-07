/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LightManager class is currently used for dynamic lighting on objects like doors, placeables, creatures, and more. 
 */

class LightManager {

  static init(){
    LightManager.MAXLIGHTS = 8; //NumDynamicLights row in videoquality.2da
    LightManager.MAXSHADOWLIGHTS = 3; //NumShadowCastingLights row in videoquality.2da
    LightManager.spawned = 0;
    LightManager.light_pool = [];
    LightManager.clearLights();
  }

  static clearLights(){
    //Each loop this will hold a counter per model that is trying to display lights. 
    //When that model has shown a max of 3 lights the rest will be ignored for that loop
    LightManager.modelLightCounter = {};
    LightManager.shadowLightCounter = {};
    LightManager.lights = [];
    LightManager.spawned = 0;
    LightManager.spawned_shadow = 0;
    LightManager.light_pool = [];
    LightManager.shadow_pool = [];

    //Clear lights
    while (Game.group.lights.children.length){
      Game.group.lights.remove(Game.group.lights.children[0]);
    }

    //Clear light helpers
    while (Game.group.light_helpers.children.length){
      Game.group.light_helpers.remove(Game.group.light_helpers.children[0]);
    }

    //Clear shadow lights
    while (Game.group.shadow_lights.children.length){
      Game.group.shadow_lights.remove(Game.group.shadow_lights.children[0]);
    }


    //Point Lights
    for(let i = 0; i < LightManager.MAXLIGHTS; i++){
      
      let light = new THREE.PointLight( 0xFFFFFF, 0, 0, 1 );
      light.animated = 0;
      light.reclaimed = true;
      Game.group.lights.add(light);
      let helper = new THREE.PointLightHelper( light, 1 );
      light.visible = light.helper = true;
      helper.material.color = light.color;
      light.helper = helper;

      LightManager.light_pool.push( light );
      Game.group.light_helpers.add( helper );

    }

    //Shadow Lights
    for(let i = 0; i < LightManager.MAXSHADOWLIGHTS; i++){
      
      let light = new THREE.PointLight( 0xFFFFFF, 0, 0, 1 );
      light.castShadow = true;
      light.animated = 0;
      light.reclaimed = true;
      Game.group.shadow_lights.add(light);
      let helper = new THREE.PointLightHelper( light, 1 );
      light.visible = light.helper = true;
      helper.material.color = light.color;
      light.helper = helper;

      LightManager.shadow_pool.push( light );
      Game.group.light_helpers.add( helper );

    }

    //Ambient Lights
    /*for(let i = 0; i < LightManager.MAXLIGHTS; i++){
      let amb_light = new THREE.AmbientLight( 0xFFFFFF );
      amb_light.reclaimed = true;
      Game.group.lights.add(amb_light);
      let helper = new THREE.PointLightHelper( amb_light, 1 );
      amb_light.visible = amb_light.helper = true;

      amb_light.helper = helper;

      LightManager.ambient_light_pool.push( amb_light );
      Game.group.light_helpers.add( helper );
    }*/
    
  }

  //Add a THREE.AuroraLight to the LightManager
  static addLight(light = null){
    //return;
    if(light){
      //LightManager.lights[light.priority].push(light);
      LightManager.lights.push(light);
      light.getWorldPosition(light.worldPosition);
      //LightManager.lights[0].push(light);
    }
  }

  //Remove a THREE.AuroraLight from the LightManager
  static removeLight(light = null){
    if(light){
      let idx = LightManager.lights.indexOf(light);
      if(idx >= 0){
        LightManager.lights.splice(idx, 1);
        //If the light is currently attached to an active light, remove the reference so it will be reassigned
        for(let i = 0; i < LightManager.light_pool.length; i++){
          if(LightManager.light_pool[i].light == light)
            LightManager.light_pool[i].light = undefined;
        }
        //If the light is currently attached to an active shadow light, remove the reference so it will be reassigned
        for(let i = 0; i < LightManager.shadow_pool.length; i++){
          if(LightManager.shadow_pool[i].light == light)
            LightManager.shadow_pool[i].light = undefined;
        }
      }
    }
  }

  static getFrameLights(){



  }

  static update(delta = 0, target = null){

    if(APP_MODE == "FORGE"){
      if(tabManager.currentTab.currentCamera instanceof THREE.Camera){
        target = tabManager.currentTab.currentCamera;
      }else{
        return;
      }
    }else{
    
      if(Game.Mode != Game.MODES.INGAME && Game.Mode != Game.MODES.MINIGAME && target == null)
        return;

      if(Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME){
        if(Game.inDialog){
          target = Game.currentCamera;
        }else{
          target = Game.getCurrentPlayer();
        }
      }

    }
    
    for(let i = 0, il = LightManager.lights.length; i < il; i++){
      let light = this.lights[i];
      if(Game.inDialog){
        light.getWorldPosition(light.worldPosition);
        light._distance = target.position.distanceTo(light.worldPosition);
      }else{
        light.getWorldPosition(light.worldPosition);
        light._distance = target.position.distanceTo(light.worldPosition);
      }
    }

    //This object is to store the amount of lights that have tried to spawn per parent object
    //Since only 3 lights can be on at any given time per object only the first 3 that try to spawn will do so
    //This is reset every tick like so 
    LightManager.modelLightCounter = {};
    LightManager.updateDynamicLights(delta);

    //This object is to store the amount of lights that have tried to spawn per parent object
    //Since only 3 lights can be on at any given time per object only the first 3 that try to spawn will do so
    //This is reset every tick like so 
    //LightManager.modelLightCounter = {};
    //LightManager.updateShadowLights(delta);

  }

  static updateDynamicLights(delta = 0){
    LightManager.tmpLights = [];//LightManager.lights.slice();
    //let ambientLights = LightManager.lights.filter(light => light.auroraModel.visible && (light.isAmbient || (light._node.radius*light._node.multiplier) > 50));
    //let shadowLights = LightManager.lights.filter(light => light.auroraModel.visible && light.castShadow);
    let fadingLights = LightManager.lights.filter(light => light.auroraModel.visible);
    
    //ambientLights.sort(LightManager.sortLights).reverse();
    //shadowLights.sort(LightManager.sortLights);
    fadingLights.sort(LightManager.sortLights);

    //LightManager.tmpLights = LightManager.tmpLights.concat(ambientLights, fadingLights);
    //LightManager.tmpLights = LightManager.tmpLights.concat(fadingLights);
    
    //Attempt to reclaim lights that are no longer used
    LightManager.lightsShown = [];
    LightManager.reclaimLights(delta);
    //console.log(LightManager.lightsShown);
    LightManager.new_lights = [];
    LightManager.new_lights_uuids = [];
    LightManager.new_lights_spawned = 0;

    //Get the lights that are trying to spawn this frame
    for( let i = 0, il = fadingLights.length; i < il; i++ ){

      let light = fadingLights[i];

      if(!LightManager.canShowLight(light))
        continue;

      if(LightManager.new_lights_spawned >= LightManager.MAXLIGHTS)
        break;
      

      if(LightManager.new_lights_uuids.indexOf(light.uuid) == -1){
        LightManager.new_lights.push(light);
        LightManager.new_lights_uuids.push(light.uuid);
        LightManager.new_lights_spawned++;
      }
      
    }

    //Last ditch effort to make sure lights don't get duplicated
    for(let i = 0, il = LightManager.MAXLIGHTS; i < il; i++){
      let lightNode = LightManager.light_pool[i];
      if(!lightNode.reclaimed && lightNode.light && LightManager.lightsShown.indexOf(lightNode.light.uuid) == -1){
        LightManager.lightsShown.push(lightNode.light.uuid);
      }
    }
    
    //console.log(LightManager.new_lights_uuids, LightManager.new_lights.length);
    
    //Try to update lights with the pool of reclaimed lights
    for( let i = 0, il = LightManager.new_lights.length; i < il; i++ ){

      //Break the loop if we have already meet our maximum light count
      if(LightManager.spawned >= LightManager.MAXLIGHTS)
        break;

      let light = LightManager.new_lights[i];
      let lightNode = undefined;//LightManager.light_pool[LightManager.spawned];
      for(let i2 = 0, il2 = LightManager.MAXLIGHTS; i2 < il2; i2++){
        if(LightManager.light_pool[i2].reclaimed == true){
          lightNode = LightManager.light_pool[i2];
          break;
        }
      }


      //The only way this wouldn't be true is if we have a different number of lights in our light_pool than the
      //engine maximum light number which should be 8 most of the time.
      //The number of allocated lights should always match MAXLIGHTS.
      if(lightNode){
        
        //If the light isn't already being shown
        if(LightManager.lightsShown.indexOf(light.uuid) == -1){

          /////////////////////////////////////
          // LIGHT SHADOWS NEED OPTIMIZATION
          // SEE COMMENT BELOW
          /////////////////////////////////////

          //Setting the castShadow property causes major frame drops in some cases.
          //This will need to be investigated and optimized at some point in the future.
          //For now I am disabling it.
          //lightNode.castShadow = light.castShadow;
          lightNode.castShadow = false;

          //Set Light Properties By Type
          if(light.isAmbient && light.getRadius() > 150){
            //Ambient light flags don't seem to reliably point to a usage of THREE.AmbientLight per se as some game modules seem to produce PointLight effects in the original game
            //Like the red hangar lights in the Tatooine Docking Bay. The turret MiniGame uses this flag for one of the lights and seems to produce
            //an AmbientLight effect in the original game. There must be another flag or property that differentiates the two cases that I am missing
            lightNode.isPointLight = false;
            lightNode.isAmbientLight = true;
            lightNode.type = 'AmbientLight';
            lightNode.intensity = 0.5;
            lightNode.helper.material.opacity = 1;
            //lightNode.distance = Infinity;
          }else{
            lightNode.isPointLight = true;
            lightNode.isAmbientLight = false;
            lightNode.type = 'PointLight';

            if(light.isFading){
              lightNode.intensity = 0;
            }else{
              lightNode.intensity = 1;//light.getIntensity();
            }
            
            lightNode.distance = light.getRadius();
          }

          //Set Common Light Properties
          light.getWorldPosition(lightNode.position)
          lightNode.color.r = light.color.r;
          lightNode.color.g = light.color.g;
          lightNode.color.b = light.color.b;
          lightNode.decay = 1;
          
          lightNode.updateMatrix();
          lightNode.light = light;
          lightNode.animated = light.isAnimated ? 1 : 0;
          lightNode.lightUUID = light.uuid;
          LightManager.lightsShown.push(light.uuid);

          //Increment the spawn count
          LightManager.spawned++;
          lightNode.reclaimed = false;
        }

      }
      
    }

    for( let i = 0, il = LightManager.light_pool.length; i < il; i++ ){
      let lightNode = LightManager.light_pool[i];
      let light = LightManager.light_pool[i].light;
      if(light && light.isAnimated){
        lightNode.decay = 1;
        lightNode.distance = Math.abs(light.getRadius() );
        //lightNode.intensity = 1;//light.getIntensity();// * ((lightNode.color.r + lightNode.color.g + lightNode.color.b) / 3);
        //console.log(lightNode.distance);
      }
    }
  }

  //Try to reclaim unused lights and update spawned fading lights
  static reclaimLights(delta = 0){

    LightManager.spawned = 0;

    let lightsUsed = [];

    for(let i = 0, il = LightManager.MAXLIGHTS; i < il; i++){
      
      //Get the THREE Light Object from the light_pool
      let lightNode = LightManager.light_pool[i];

      if(lightNode.light && lightNode.light.isFading){
        //FADINGLIGHT
        if(lightsUsed.indexOf(lightNode.light.uuid) == -1 && lightNode.light.isOnScreen(Game.viewportFrustum)){
          lightsUsed.push(lightNode.light.uuid);
          //lightNode.light.getWorldPosition(lightNode.position);
          //lightNode.distance = lightNode.light.getRadius();
          //lightNode.color.r = lightNode.light.color.r;
          //lightNode.color.g = lightNode.light.color.g;
          //lightNode.color.b = lightNode.light.color.b;
          //The light is still active so update as needed
          if(lightNode.intensity < lightNode.maxIntensity){
            lightNode.intensity += 2*delta;
          }

          if(lightNode.intensity > lightNode.maxIntensity){
            lightNode.intensity = lightNode.maxIntensity;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.helper.material.opacity = lightNode.intensity/lightNode.maxIntensity;
          lightNode.helper.material.transparent = true;

          lightNode.reclaimed = false;
          LightManager.lightsShown.push(lightNode.lightUUID);
          //Move the light to the beginning of the array so it is skipped until it is reclaimed
          //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
          //LightManager.light_pool.unshift(LightManager.light_pool.splice(i, 1)[0]);
          LightManager.spawned++;
          
        }else{
          lightNode.reclaimed = false;
          //The light is no longer active so fade out and reclaim so this light can be reused
          lightNode.intensity -= 2*delta;

          if(lightNode.intensity < 0 || !lightNode.light.isOnScreen(Game.viewportFrustum)){
            lightNode.intensity = 0;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.helper.material.opacity = lightNode.intensity/lightNode.maxIntensity;
          lightNode.helper.material.transparent = true;

          if(lightsUsed.indexOf(lightNode.light.uuid) == -1 && lightNode.intensity > 0){
            lightsUsed.push(lightNode.light.uuid);
            //The light hasn't completed it's fadeout yet

            LightManager.lightsShown.push(lightNode.light.uuid);
            //Move the light to the beginning of the array so it is skipped until it is reclaimed
            //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
            //LightManager.light_pool.unshift(LightManager.light_pool.splice(i, 1)[0]);
            LightManager.spawned++;
          }else{
            //Reclaim the light
            lightNode.position.set(0,0,0);
            lightNode.intensity = 0;
            //Reset the light helper properties
            lightNode.helper.material.opacity = 0;
            lightNode.helper.material.transparent = true;
            lightNode.reclaimed = true;
            lightNode.light = undefined;
          }

        }
        if(lightNode.light){
          lightNode.color.r = lightNode.light.color.r;
          lightNode.color.g = lightNode.light.color.g;
          lightNode.color.b = lightNode.light.color.b;
        }
        lightNode.maxIntensity = 1;//lightNode.light.getIntensity();
        
      }else{
        if(lightNode.light && lightsUsed.indexOf(lightNode.light.uuid) == -1 && lightNode.light.isOnScreen(Game.viewportFrustum)){
          lightsUsed.push(lightNode.light.uuid);
          //This light is not a fading light so it can be instantly turned off and reclaimed
//           lightNode.light.getWorldPosition(lightNode.position)
//           lightNode.color.r = lightNode.light.color.r;
//           lightNode.color.g = lightNode.light.color.g;
//           lightNode.color.b = lightNode.light.color.b;
//           lightNode.decay = 1;
          
//           lightNode.updateMatrix();
//           lightNode.animated = lightNode.light.isAnimated ? 1 : 0;
          lightNode.intensity = 1;
          lightNode.distance = lightNode.light.getRadius();
          //Reset the light helper properties
          lightNode.helper.material.opacity = 1;
          lightNode.helper.material.transparent = false;
          LightManager.light_pool.unshift(LightManager.light_pool.splice(i, 1)[0]);
          lightNode.reclaimed = false;
        }else{
          //This light is not a fading light so it can be instantly turned off and reclaimed
          lightNode.position.set(0,0,0);
          lightNode.intensity = 0;
          //Reset the light helper properties
          lightNode.helper.material.opacity = 0;
          lightNode.helper.material.transparent = true;
          lightNode.reclaimed = true;
          lightNode.light = undefined;
        }
      }

    }

  }

  static updateShadowLights(delta = 0){
    LightManager.tmpLights = [];//LightManager.lights.slice();
    let shadowLights = LightManager.lights.filter(light => light.auroraModel.visible && light.castShadow);
    shadowLights.sort(LightManager.sortLights);

    LightManager.new_lights = [];
    LightManager.new_lights_uuids = [];
    LightManager.new_lights_spawned = 0;

    //Get the lights that are trying to spawn this frame
    for( let i = 0, il = shadowLights.length; i < il; i++ ){

      let light = shadowLights[i];

      if(!LightManager.canShowLight(light))
        continue;

      if(LightManager.new_lights_spawned >= LightManager.MAXSHADOWLIGHTS)
        break;

      if(LightManager.new_lights_uuids.indexOf(light.uuid) == -1){
        LightManager.new_lights.push(light);
        LightManager.new_lights_uuids.push(light.uuid);
        LightManager.new_lights_spawned++;
      }
      
    }
    
    //Attempt to reclaim lights that are no longer used
    LightManager.lightsShown = [];
    LightManager.reclaimShadowLights(delta);
    
    //Try to update lights with the pool of reclaimed lights
    for( let i = 0, il = LightManager.new_lights.length; i < il; i++ ){

      //Break the loop if we have already meet our maximum light count
      if(LightManager.spawned_shadow >= LightManager.MAXSHADOWLIGHTS)
        break;

      let light = LightManager.new_lights[i];
      let lightNode = LightManager.shadow_pool[LightManager.spawned_shadow];

      //The only way this wouldn't be true is if we have a different number of lights in our shadow_pool than the
      //engine maximum light number which should be 8 most of the time.
      //The number of allocated lights should always match MAXLIGHTS.
      if(lightNode){
        
        //If the light isn't already being shown
        if(LightManager.lightsShown.indexOf(light.uuid) == -1){

          //Set Light Properties By Type
          if(light.isAmbient && light.getRadius() > 150){
            //Ambient light flags don't seem to reliably point to a usage of THREE.AmbientLight per se as some game modules seem to produce PointLight effects in the original game
            //Like the red hangar lights in the Tatooine Docking Bay. The turret MiniGame uses this flag for one of the lights and seems to produce
            //an AmbientLight effect in the original game. There must be another flag or property that differentiates the two cases that I am missing
            lightNode.isPointLight = false;
            lightNode.isAmbientLight = true;
            lightNode.type = 'AmbientLight';
            lightNode.intensity = 0.5;
            lightNode.helper.material.opacity = 1;
            //lightNode.distance = Infinity;
          }else{
            lightNode.isPointLight = true;
            lightNode.isAmbientLight = false;
            lightNode.type = 'PointLight';

            if(light.isFading){
              lightNode.intensity = 0;
            }else{
              lightNode.intensity = 1;//light.getIntensity();
            }
            
            lightNode.distance = light.getRadius();
          }

          //Set Common Light Properties
          light.getWorldPosition(lightNode.position)
          lightNode.color.r = light.color.r;
          lightNode.color.g = light.color.g;
          lightNode.color.b = light.color.b;
          lightNode.decay = 1;
          
          lightNode.updateMatrix();
          lightNode.light = light;
          lightNode.animated = light.isAnimated ? 1 : 0;
          lightNode.lightUUID = light.uuid;
          LightManager.lightsShown.push(light.uuid);

          //Increment the spawn count
          LightManager.spawned_shadow++;
        }

      }
      
    }

    for( let i = 0, il = LightManager.shadow_pool.length; i < il; i++ ){
      let lightNode = LightManager.shadow_pool[i];
      let light = LightManager.shadow_pool[i].light;
      if(light && light.isAnimated){
        lightNode.decay = 1;
        lightNode.distance = Math.abs(light.getRadius() );
        lightNode.intensity = 1;//light.getIntensity();// * ((lightNode.color.r + lightNode.color.g + lightNode.color.b) / 3);
        //console.log(lightNode.distance);
      }
    }
  }
  
  //Try to reclaim unused shadow lights and update spawned fading lights
  static reclaimShadowLights(delta = 0){

    LightManager.spawned_shadow = 0;

    for(let i = 0, il = LightManager.MAXSHADOWLIGHTS; i < il; i++){
      
      //Get the THREE Light Object from the shadow_pool
      let lightNode = LightManager.shadow_pool[i];

      if(lightNode.light && lightNode.light.isFading){
        //FADINGLIGHT
        if(LightManager.new_lights_uuids.indexOf(lightNode.light.uuid) >= 0 && lightNode.light.isOnScreen(Game.viewportFrustum)){
          //The light is still active so update as needed
          if(lightNode.intensity < lightNode.maxIntensity){
            lightNode.intensity += 2*delta;
          }

          if(lightNode.intensity > lightNode.maxIntensity){
            lightNode.intensity = lightNode.maxIntensity;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.helper.material.opacity = lightNode.intensity/lightNode.maxIntensity;
          lightNode.helper.material.transparent = true;

          lightNode.reclaimed = false;
          LightManager.lightsShown.push(lightNode.lightUUID);
          //Move the light to the beginning of the array so it is skipped until it is reclaimed
          //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
          LightManager.shadow_pool.unshift(LightManager.shadow_pool.splice(i, 1)[0]);
          LightManager.spawned_shadow++;
          
        }else{
          //The light is no longer active so fade out and reclaim so this light can be reused
          lightNode.intensity -= 2*delta;

          if(lightNode.intensity < 0 || !lightNode.light.isOnScreen(Game.viewportFrustum)){
            lightNode.intensity = 0;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.helper.material.opacity = lightNode.intensity/lightNode.maxIntensity;
          lightNode.helper.material.transparent = true;

          if(lightNode.intensity > 0){
            //The light hasn't completed it's fadeout yet

            LightManager.lightsShown.push(lightNode.light.uuid);
            //Move the light to the beginning of the array so it is skipped until it is reclaimed
            //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
            LightManager.shadow_pool.unshift(LightManager.shadow_pool.splice(i, 1)[0]);
            LightManager.spawned_shadow++;
          }else{
            //Reclaim the light
            lightNode.position.set(0,0,0);
            lightNode.intensity = 0;
            //Reset the light helper properties
            lightNode.helper.material.opacity = 0;
            lightNode.helper.material.transparent = true;
          }

        }

        lightNode.color.r = lightNode.light.color.r;
        lightNode.color.g = lightNode.light.color.g;
        lightNode.color.b = lightNode.light.color.b;
        lightNode.maxIntensity = 1;//lightNode.light.getIntensity();
        
      }else{
        //This light is not a fading light so it can be instantly turned off and reclaimed
        lightNode.position.set(0,0,0);
        lightNode.intensity = 0;
        //Reset the light helper properties
        lightNode.helper.material.opacity = 0;
        lightNode.helper.material.transparent = true;
      }

    }

  }

  //Sort lights by distance and priority
  static sortLights (a, b){
    if (b.priority < a.priority) return -1;
    if (b.priority > a.priority) return 1;
    if (a._distance < b._distance) return -1;
    if (a._distance > b._distance) return 1;
    return 0;

    return a._distance - b._distance || b.priority - a.priority;

  }

  //Check to see if the model that owns the light has already met it's limit of three active lights
  static canShowLight(light){

    if(LightManager.lightsShown.indexOf(light.uuid) >= 0)
      return false;

    if(!light || !light.isOnScreen(Game.viewportFrustum) || !light.auroraModel.visible)
      return false;

    //if(light.isDynamic == 1)
    //  return false;

    if(typeof LightManager.modelLightCounter[light.parentUUID] === 'undefined'){
      LightManager.modelLightCounter[light.parentUUID] = 1;
      return true;
    }else{
      LightManager.modelLightCounter[light.parentUUID]++;
      if(LightManager.modelLightCounter[light.parentUUID] < 3){
        return true;
      }else{
        return false;
      }
    }

  }

  //Toggle the visbility of the light helpers ingame
  static toggleLightHelpers(){
    Game.group.light_helpers.visible = !Game.group.light_helpers.visible;
  }

}

LightManager.PRIORITY = {
  HIGHEST: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  LOWEST: 1
};

module.exports = LightManager;