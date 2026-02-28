import * as THREE from "three";

import { OdysseyLight3D } from "@/three/odyssey";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Manager);
import type { ModuleObject } from "@/module";

interface IOdysseyAnimatedLightUniformStruct {
  position: THREE.Vector3;
  color: THREE.Color;
  distance: number;
  decay: number;
}

/**
 * LightManager class.
 * 
 * The LightManager class is currently used for dynamic lighting on objects like doors, placeables, creatures, and more. 
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LightManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LightManager {
  static MAXLIGHTS = 8; //NumDynamicLights row in videoquality.2da
  static MAXSHADOWLIGHTS = 3; //NumShadowCastingLights row in videoquality.2da
  static DECAY = 1;
  spawned = 0;
  spawned_shadow = 0;
  light_pool: THREE.PointLight[] = [];
  shadow_pool: THREE.PointLight[] = [];
  modelLightCounter: any = {};
  shadowLightCounter: any = {};
  lights: OdysseyLight3D[] = [];
  tmpLights: OdysseyLight3D[];
  lightsShown: Set<string>;
  new_lights: OdysseyLight3D[];
  new_lights_uuids: string[];
  new_lights_spawned: number;

  animatedLights: IOdysseyAnimatedLightUniformStruct[] = [];
  animatedLightsCacheID: number = 0;

  context: any;

  init(context: any){
    this.context = context;
    LightManager.MAXLIGHTS = 8; //NumDynamicLights row in videoquality.2da
    LightManager.MAXSHADOWLIGHTS = 3; //NumShadowCastingLights row in videoquality.2da
    this.spawned = 0;
    this.light_pool = [];
    this.clearLights();
  }

  clearLights(){
    //Each loop this will hold a counter per model that is trying to display lights. 
    //When that model has shown a max of 3 lights the rest will be ignored for that loop
    this.modelLightCounter = {};
    this.shadowLightCounter = {};
    this.lights = [];
    this.spawned = 0;
    this.spawned_shadow = 0;
    this.light_pool = [];
    this.shadow_pool = [];

    //Clear lights
    while (this.context.group.lights.children.length){
      this.context.group.lights.remove(this.context.group.lights.children[0]);
    }

    //Clear light helpers
    while (this.context.group.light_helpers.children.length){
      this.context.group.light_helpers.remove(this.context.group.light_helpers.children[0]);
    }

    //Clear shadow lights
    while (this.context.group.shadow_lights.children.length){
      this.context.group.shadow_lights.remove(this.context.group.shadow_lights.children[0]);
    }


    //Point Lights
    for(let i = 0; i < LightManager.MAXLIGHTS; i++){
      
      const light = new THREE.PointLight( 0xFFFFFF, 0, 0, 1 );
      light.userData.animated = 0;
      light.userData.reclaimed = true;
      this.context.group.lights.add(light);
      const helper = new THREE.PointLightHelper( light, 1 );
      light.visible = light.userData.helper = true;
      helper.color = light.color;
      light.userData.helper = helper;

      this.light_pool.push( light );
      this.context.group.light_helpers.add( helper );

    }

    //Shadow Lights
    for(let i = 0; i < LightManager.MAXSHADOWLIGHTS; i++){
      
      const light = new THREE.PointLight( 0xFFFFFF, 0, 0, 1 );
      light.castShadow = true;
      light.userData.animated = 0;
      light.userData.reclaimed = true;
      this.context.group.shadow_lights.add(light);
      const helper = new THREE.PointLightHelper( light, 1 );
      light.visible = light.userData.helper = true;
      helper.color = light.color;
      light.userData.helper = helper;

      this.shadow_pool.push( light );
      this.context.group.light_helpers.add( helper );

    }

    //Ambient Lights
    /*for(let i = 0; i < LightManager.MAXLIGHTS; i++){
      let amb_light = new THREE.AmbientLight( 0xFFFFFF );
      amb_light.reclaimed = true;
      this.context.group.lights.add(amb_light);
      let helper = new THREE.PointLightHelper( amb_light, 1 );
      amb_light.visible = amb_light.helper = true;

      amb_light.helper = helper;

      this.ambient_light_pool.push( amb_light );
      this.context.group.light_helpers.add( helper );
    }*/
    
  }

  //Add a OdysseyLight3D to the LightManager
  addLight(light: OdysseyLight3D){
    //return;
    if(light){
      //this.lights[light.priority].push(light);
      this.lights.push(light);
      light.getWorldPosition(light.worldPosition);
      //this.lights[0].push(light);
    }
  }

  //Remove a OdysseyLight3D from the LightManager
  removeLight(light: OdysseyLight3D){
    if(light){
      const idx = this.lights.indexOf(light);
      if(idx >= 0){
        this.lights.splice(idx, 1);
        //If the light is currently attached to an active light, remove the reference so it will be reassigned
        for(let i = 0; i < this.light_pool.length; i++){
          if(this.light_pool[i].userData.odysseyLight == light)
            this.light_pool[i].userData.odysseyLight = undefined;
        }
        //If the light is currently attached to an active shadow light, remove the reference so it will be reassigned
        for(let i = 0; i < this.shadow_pool.length; i++){
          if(this.shadow_pool[i].userData.odysseyLight == light)
            this.shadow_pool[i].userData.odysseyLight = undefined;
        }
      }
    }
  }

  getFrameLights(){



  }

  update(delta = 0, target: THREE.Camera|ModuleObject){
    if(!target) return;
    
    for(let i = 0, il = this.lights.length; i < il; i++){
      const light = this.lights[i];
      light.getWorldPosition(light.worldPosition);
      light.cameraDistance = target.position.distanceTo(light.worldPosition);
    }

    //This object is to store the amount of lights that have tried to spawn per parent object
    //Since only 3 lights can be on at any given time per object only the first 3 that try to spawn will do so
    //This is reset every tick like so 
    this.modelLightCounter = {};
    this.updateDynamicLights(delta);

    //This object is to store the amount of lights that have tried to spawn per parent object
    //Since only 3 lights can be on at any given time per object only the first 3 that try to spawn will do so
    //This is reset every tick like so 
    //this.modelLightCounter = {};
    //this.updateShadowLights(delta);

  }

  updateDynamicLights(delta = 0){
    this.animatedLights = [];
    this.tmpLights = [];//this.lights.slice();
    //let ambientLights = this.lights.filter(light => light.odysseyModel.visible && (light.isAmbient || (light.odysseyModelNode.radius*light.odysseyModelNode.multiplier) > 50));
    //let shadowLights = this.lights.filter(light => light.odysseyModel.visible && light.castShadow);
    const fadingLights = this.lights.filter(light => light.odysseyModel.visible);
    
    //ambientLights.sort(this.sortLights).reverse();
    //shadowLights.sort(this.sortLights);
    fadingLights.sort(this.sortLights);

    //this.tmpLights = this.tmpLights.concat(ambientLights, fadingLights);
    //this.tmpLights = this.tmpLights.concat(fadingLights);
    
    //Attempt to reclaim lights that are no longer used
    this.lightsShown = new Set<string>();
    this.reclaimLights(delta);
    //log.info(this.lightsShown);
    this.new_lights = [];
    this.new_lights_uuids = [];
    this.new_lights_spawned = 0;

    //Get the lights that are trying to spawn this frame
    for( let i = 0, il = fadingLights.length; i < il; i++ ){

      const light = fadingLights[i];

      if(!this.canShowLight(light))
        continue;

      if(this.new_lights_spawned >= LightManager.MAXLIGHTS)
        break;
      

      if(this.new_lights_uuids.indexOf(light.uuid) == -1){
        this.new_lights.push(light);
        this.new_lights_uuids.push(light.uuid);
        this.new_lights_spawned++;
      }
      
    }

    //Last ditch effort to make sure lights don't get duplicated
    for(let i = 0, il = LightManager.MAXLIGHTS; i < il; i++){
      const lightNode = this.light_pool[i];
      if(!lightNode.userData.reclaimed && lightNode.userData.odysseyLight && !this.lightsShown.has(lightNode.userData.odysseyLight.uuid)){
        this.lightsShown.add(lightNode.userData.odysseyLight.uuid);
      }
    }
    
    //log.info(this.new_lights_uuids, this.new_lights.length);
    
    //Try to update lights with the pool of reclaimed lights
    for( let i = 0, il = this.new_lights.length; i < il; i++ ){

      //Break the loop if we have already meet our maximum light count
      if(this.spawned >= LightManager.MAXLIGHTS)
        break;

      const odysseyLight = this.new_lights[i];
      let lightNode = undefined;//this.light_pool[this.spawned];
      for(let i2 = 0, il2 = LightManager.MAXLIGHTS; i2 < il2; i2++){
        if(this.light_pool[i2].userData.reclaimed == true){
          lightNode = this.light_pool[i2];
          break;
        }
      }


      //The only way this wouldn't be true is if we have a different number of lights in our light_pool than the
      //engine maximum light number which should be 8 most of the time.
      //The number of allocated lights should always match MAXLIGHTS.
      if(lightNode){
        
        //If the light isn't already being shown
        if(!this.lightsShown.has(odysseyLight.uuid)){

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
          // if(odysseyLight.isAmbient && odysseyLight.getRadius() > 150){
          //   //Ambient light flags don't seem to reliably point to a usage of THREE.AmbientLight per se as some game modules seem to produce PointLight effects in the original game
          //   //Like the red hangar lights in the Tatooine Docking Bay. The turret MiniGame uses this flag for one of the lights and seems to produce
          //   //an AmbientLight effect in the original game. There must be another flag or property that differentiates the two cases that I am missing
          //   lightNode.userData.isPointLight = false;
          //   lightNode.userData.isAmbientLight = true;
          //   lightNode.type = 'AmbientLight';
          //   lightNode.intensity = 0.5;
          //   lightNode.userData.helper.material.opacity = 1;
          //   //lightNode.distance = Infinity;
          // }else{
            lightNode.userData.isPointLight = true;
            lightNode.userData.isAmbientLight = false;
            lightNode.type = 'PointLight';

            if(odysseyLight.isFading){
              lightNode.intensity = 0;
            }else{
              lightNode.intensity = 1;
            }
            
            lightNode.distance = odysseyLight.getRadius();
          // }

          //Set Common Light Properties
          odysseyLight.position.set(0, 0, 0)
          odysseyLight.getWorldPosition(lightNode.position)
          lightNode.color.r = odysseyLight.color.r;
          lightNode.color.g = odysseyLight.color.g;
          lightNode.color.b = odysseyLight.color.b;
          lightNode.decay = LightManager.DECAY;
          
          lightNode.updateMatrix();
          lightNode.userData.odysseyLight = odysseyLight;
          lightNode.userData.animated = odysseyLight.isAnimated ? 1 : 0;
          lightNode.userData.lightUUID = odysseyLight.uuid;
          this.lightsShown.add(odysseyLight.uuid);

          if(lightNode.userData.lensFlare != odysseyLight.userData.lensFlare){
            while(lightNode.children.length){
              lightNode.remove(lightNode.children[0]);
            }
          }
          
          lightNode.userData.lensFlare = odysseyLight.userData.lensFlare;
          if(lightNode.userData.lensFlare){
            lightNode.add(lightNode.userData.lensFlare);
          }

          //Increment the spawn count
          this.spawned++;
          lightNode.userData.reclaimed = false;
        }

      }
      
    }
		// artist-friendly light intensity scaling factor
		const scaleFactor = ( this.context?.renderer?.physicallyCorrectLights !== true ) ? Math.PI : 1;

    let animatedLightsNeedUpdate = false;
    let animatedLightIndex = 0;
    for( let i = 0, il = this.light_pool.length; i < il; i++ ){
      const lightNode = this.light_pool[i];
      const light = this.light_pool[i].userData.odysseyLight;
      if(!light || !light.isAnimated){ continue; }

      lightNode.decay = LightManager.DECAY;
      lightNode.distance = Math.abs(light.getRadius());
      //lightNode.intensity = 1;//light.getIntensity();// * ((lightNode.color.r + lightNode.color.g + lightNode.color.b) / 3);
      //log.info(lightNode.distance);
      
      const animatedLight: IOdysseyAnimatedLightUniformStruct = {
        position: lightNode.position,
        color: lightNode.color.clone().copy(lightNode.color).multiplyScalar( lightNode.intensity * scaleFactor ),
        distance: lightNode.distance,
        decay: lightNode.decay
      };

      const currentAnimatedLight = this.animatedLights[animatedLightIndex];
      if(currentAnimatedLight && currentAnimatedLight.position.equals(animatedLight.position) && currentAnimatedLight.color.equals(animatedLight.color) && currentAnimatedLight.distance === animatedLight.distance && currentAnimatedLight.decay === animatedLight.decay){
        continue;
      }
      this.animatedLights[animatedLightIndex] = animatedLight;
      animatedLightsNeedUpdate = true;
      animatedLightIndex++;
    }
    const diffLightCount = !!(this.animatedLights.length - animatedLightIndex);
    this.animatedLights.length = animatedLightIndex;
    if(animatedLightsNeedUpdate || diffLightCount){
      this.animatedLightsCacheID++;
    }
  }
  
  /**
   * Try to reclaim unused lights and update spawned fading lights
   * @param delta 
   */
  reclaimLights(delta = 0){

    this.spawned = 0;

    const lightsUsed: Set<string> = new Set<string>();

    const maxLights = LightManager.MAXLIGHTS;
    for(let i = 0; i < maxLights; i++){
      
      //Get the THREE Light Object from the light_pool
      const lightNode = this.light_pool[i];
      if(!lightNode){ continue; }
      
      //Get the assigned OdysseyLight3D
      const odysseyLight = lightNode.userData.odysseyLight as OdysseyLight3D;
      if(!odysseyLight){
        if(!lightNode.userData.reclaimed){ 
          this.reclaimLight(lightNode); 
        }
        continue;
      }

      if(odysseyLight.isFading){
        //FADINGLIGHT
        if(!lightsUsed.has(odysseyLight.uuid) && odysseyLight.isOnScreen(this.context.viewportFrustum)){
          lightsUsed.add(odysseyLight.uuid);
          //odysseyLight.getWorldPosition(lightNode.position);
          //lightNode.distance = odysseyLight.getRadius();
          //lightNode.color.r = odysseyLight.color.r;
          //lightNode.color.g = odysseyLight.color.g;
          //lightNode.color.b = odysseyLight.color.b;
          //The light is still active so update as needed
          if(lightNode.intensity < odysseyLight.maxIntensity){
            lightNode.intensity += 2*delta;
          }

          if(lightNode.intensity > odysseyLight.maxIntensity){
            lightNode.intensity = odysseyLight.maxIntensity;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.userData.helper.material.opacity = lightNode.intensity/odysseyLight.maxIntensity;
          lightNode.userData.helper.material.transparent = true;

          lightNode.userData.reclaimed = false;
          this.lightsShown.add(lightNode.userData.lightUUID);
          //Move the light to the beginning of the array so it is skipped until it is reclaimed
          //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
          //this.light_pool.unshift(this.light_pool.splice(i, 1)[0]);
          this.spawned++;
          
        }else{
          lightNode.userData.reclaimed = false;
          //The light is no longer active so fade out and reclaim so this light can be reused
          lightNode.intensity -= 2*delta;

          if(lightNode.intensity < 0 || !odysseyLight.isOnScreen(this.context.viewportFrustum)){
            lightNode.intensity = 0;
            lightNode.userData.reclaimed = true;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.userData.helper.material.opacity = lightNode.intensity/odysseyLight.maxIntensity;
          lightNode.userData.helper.material.transparent = true;

          if(!lightsUsed.has(odysseyLight.uuid) && lightNode.intensity > 0){
            lightsUsed.add(odysseyLight.uuid);
            //The light hasn't completed it's fadeout yet

            this.lightsShown.add(odysseyLight.uuid);
            //Move the light to the beginning of the array so it is skipped until it is reclaimed
            //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
            //this.light_pool.unshift(this.light_pool.splice(i, 1)[0]);
            this.spawned++;
          }else{
            this.reclaimLight(lightNode);
          }

        }
        
        lightNode.color.r = odysseyLight.color.r;
        lightNode.color.g = odysseyLight.color.g;
        lightNode.color.b = odysseyLight.color.b;
        // odysseyLight.maxIntensity = 0.5;//odysseyLight.getIntensity();
        
      }else{
        if(!lightsUsed.has(odysseyLight.uuid) && odysseyLight.isOnScreen(this.context.viewportFrustum)){
          lightsUsed.add(odysseyLight.uuid);
          //This light is not a fading light so it can be instantly turned off and reclaimed
          // odysseyLight.getWorldPosition(lightNode.position)
          // lightNode.color.r = odysseyLight.color.r;
          // lightNode.color.g = odysseyLight.color.g;
          // lightNode.color.b = odysseyLight.color.b;
          // lightNode.decay = 1;
          
          // lightNode.updateMatrix();
          // lightNode.userData.animated = odysseyLight.isAnimated ? 1 : 0;
          lightNode.intensity = 1;
          lightNode.distance = odysseyLight.getRadius();
          //Reset the light helper properties
          lightNode.userData.helper.material.opacity = 1;
          lightNode.userData.helper.material.transparent = false;
          this.light_pool.unshift(this.light_pool.splice(i, 1)[0]);
          lightNode.userData.reclaimed = false;
        }else{
          this.reclaimLight(lightNode);
        }
      }

    }

  }

  /**
   * A helper method to reset a lights properties when it needs to be reclaimed
   * @param lightNode
   * @returns void
   */
  reclaimLight(lightNode: THREE.Light){
    if(!lightNode){ return; }

    //This light is not a fading light so it can be instantly turned off and reclaimed
    lightNode.position.set(0,0,0);
    lightNode.intensity = 0;
    //Reset the light helper properties
    lightNode.userData.lightUUID = undefined;
    lightNode.userData.helper.material.opacity = 0;
    lightNode.userData.helper.material.transparent = true;
    lightNode.userData.reclaimed = true;
    lightNode.userData.odysseyLight = undefined;
    lightNode.userData.animated = 0;
  }

  updateShadowLights(delta = 0){
    this.tmpLights = [];//this.lights.slice();
    const shadowLights = this.lights.filter(light => light.odysseyModel.visible && light.castShadow);
    shadowLights.sort(this.sortLights);

    this.new_lights = [];
    this.new_lights_uuids = [];
    this.new_lights_spawned = 0;

    //Get the lights that are trying to spawn this frame
    for( let i = 0, il = shadowLights.length; i < il; i++ ){

      const odysseyLight = shadowLights[i];

      if(!this.canShowLight(odysseyLight))
        continue;

      if(this.new_lights_spawned >= LightManager.MAXSHADOWLIGHTS)
        break;

      if(this.new_lights_uuids.indexOf(odysseyLight.uuid) == -1){
        this.new_lights.push(odysseyLight);
        this.new_lights_uuids.push(odysseyLight.uuid);
        this.new_lights_spawned++;
      }
      
    }
    
    //Attempt to reclaim lights that are no longer used
    this.lightsShown = new Set<string>();
    this.reclaimShadowLights(delta);
    
    //Try to update lights with the pool of reclaimed lights
    for( let i = 0, il = this.new_lights.length; i < il; i++ ){

      //Break the loop if we have already meet our maximum light count
      if(this.spawned_shadow >= LightManager.MAXSHADOWLIGHTS)
        break;

      const odysseyLight = this.new_lights[i];
      const lightNode = this.shadow_pool[this.spawned_shadow];

      //The only way this wouldn't be true is if we have a different number of lights in our shadow_pool than the
      //engine maximum light number which should be 8 most of the time.
      //The number of allocated lights should always match MAXLIGHTS.
      if(lightNode){
        
        //If the light isn't already being shown
        if(!this.lightsShown.has(odysseyLight.uuid)){

          //Set Light Properties By Type
          // if(odysseyLight.isAmbient && odysseyLight.getRadius() > 150){
          //   //Ambient light flags don't seem to reliably point to a usage of THREE.AmbientLight per se as some game modules seem to produce PointLight effects in the original game
          //   //Like the red hangar lights in the Tatooine Docking Bay. The turret MiniGame uses this flag for one of the lights and seems to produce
          //   //an AmbientLight effect in the original game. There must be another flag or property that differentiates the two cases that I am missing
          //   lightNode.userData.isPointLight = false;
          //   lightNode.userData.isAmbientLight = true;
          //   lightNode.type = 'AmbientLight';
          //   lightNode.intensity = 0.5;
          //   lightNode.userData.helper.material.opacity = 1;
          //   //lightNode.distance = Infinity;
          // }else{
            lightNode.userData.isPointLight = true;
            lightNode.userData.isAmbientLight = false;
            lightNode.type = 'PointLight';

            if(odysseyLight.isFading){
              lightNode.intensity = 0;
            }else{
              lightNode.intensity = 1;//light.getIntensity();
            }
            
            lightNode.distance = odysseyLight.getRadius();
          // }

          //Set Common Light Properties
          odysseyLight.getWorldPosition(lightNode.position)
          lightNode.color.r = odysseyLight.color.r;
          lightNode.color.g = odysseyLight.color.g;
          lightNode.color.b = odysseyLight.color.b;
          lightNode.decay = LightManager.DECAY;
          
          lightNode.updateMatrix();
          lightNode.userData.odysseyLight = odysseyLight;
          lightNode.userData.animated = odysseyLight.isAnimated ? 1 : 0;
          lightNode.userData.lightUUID = odysseyLight.uuid;
          this.lightsShown.add(odysseyLight.uuid);

          //Increment the spawn count
          this.spawned_shadow++;
        }

      }
      
    }

    for( let i = 0, il = this.shadow_pool.length; i < il; i++ ){
      const lightNode = this.shadow_pool[i];
      const light = this.shadow_pool[i].userData.odysseyLight as OdysseyLight3D;
      if(light && light.isAnimated){
        lightNode.decay = LightManager.DECAY;
        lightNode.distance = Math.abs(light.getRadius() );
        lightNode.intensity = 1;//light.getIntensity();// * ((lightNode.color.r + lightNode.color.g + lightNode.color.b) / 3);
        //log.info(lightNode.distance);
      }
    }
  }
  
  //Try to reclaim unused shadow lights and update spawned fading lights
  reclaimShadowLights(delta = 0){

    this.spawned_shadow = 0;

    for(let i = 0, il = LightManager.MAXSHADOWLIGHTS; i < il; i++){
      
      //Get the THREE Light Object from the shadow_pool
      const lightNode = this.shadow_pool[i];
      const odysseyLight = lightNode.userData.odysseyLight as OdysseyLight3D;

      if(odysseyLight && odysseyLight.isFading){
        //FADINGLIGHT
        if(this.new_lights_uuids.indexOf(odysseyLight.uuid) >= 0 && odysseyLight.isOnScreen(this.context.viewportFrustum)){
          //The light is still active so update as needed
          if(lightNode.intensity < odysseyLight.maxIntensity){
            lightNode.intensity += 2*delta;
          }

          if(lightNode.intensity > odysseyLight.maxIntensity){
            lightNode.intensity = odysseyLight.maxIntensity;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.userData.helper.material.opacity = lightNode.intensity/odysseyLight.maxIntensity;
          lightNode.userData.helper.material.transparent = true;

          lightNode.userData.reclaimed = false;
          this.lightsShown.add(lightNode.userData.lightUUID);
          //Move the light to the beginning of the array so it is skipped until it is reclaimed
          //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
          this.shadow_pool.unshift(this.shadow_pool.splice(i, 1)[0]);
          this.spawned_shadow++;
          
        }else{
          //The light is no longer active so fade out and reclaim so this light can be reused
          lightNode.intensity -= 2*delta;

          if(lightNode.intensity < 0 || !odysseyLight.isOnScreen(this.context.viewportFrustum)){
            lightNode.intensity = 0;
          }

          //Animate the light helper properties (This gives a visual aid when debugging lights)
          lightNode.userData.helper.material.opacity = lightNode.intensity/odysseyLight.maxIntensity;
          lightNode.userData.helper.material.transparent = true;

          if(lightNode.intensity > 0){
            //The light hasn't completed it's fadeout yet

            this.lightsShown.add(odysseyLight.uuid);
            //Move the light to the beginning of the array so it is skipped until it is reclaimed
            //This may not be a very efficient way of managing the array. I belive the combo of unshift and splice[0] can be pretty slow
            this.shadow_pool.unshift(this.shadow_pool.splice(i, 1)[0]);
            this.spawned_shadow++;
          }else{
            //Reclaim the light
            lightNode.position.set(0,0,0);
            lightNode.intensity = 0;
            //Reset the light helper properties
            lightNode.userData.helper.material.opacity = 0;
            lightNode.userData.helper.material.transparent = true;
          }

        }

        lightNode.color.r = odysseyLight.color.r;
        lightNode.color.g = odysseyLight.color.g;
        lightNode.color.b = odysseyLight.color.b;
        // odysseyLight.maxIntensity = 0.5;//lightNode.light.getIntensity();
        
      }else{
        //This light is not a fading light so it can be instantly turned off and reclaimed
        lightNode.position.set(0,0,0);
        lightNode.intensity = 0;
        //Reset the light helper properties
        lightNode.userData.helper.material.opacity = 0;
        lightNode.userData.helper.material.transparent = true;
      }

    }

  }

  //Sort lights by distance and priority
  sortLights (a: OdysseyLight3D, b: OdysseyLight3D){
    if (b.isAnimated < a.isAnimated) return -1;
    if (b.isAnimated > a.isAnimated) return 1;

    if (b.getRadius() < a.getRadius()) return -1;
    if (b.getRadius() > a.getRadius()) return 1;

    if (b.priority < a.priority) return -1;
    if (b.priority > a.priority) return 1;

    if (a.cameraDistance < b.cameraDistance) return -1;
    if (a.cameraDistance > b.cameraDistance) return 1;
    
    return 0;
  }

  //Check to see if the model that owns the light has already met it's limit of three active lights
  canShowLight(light: OdysseyLight3D){

    if(this.lightsShown.has(light.uuid))
      return false;

    if(!light || !light.isOnScreen(this.context.viewportFrustum) || !light.odysseyModel.visible)
      return false;

    //if(light.isDynamic == 1)
    //  return false;

    if(typeof this.modelLightCounter[light.parentUUID] === 'undefined'){
      this.modelLightCounter[light.parentUUID] = 1;
      return true;
    }else{
      this.modelLightCounter[light.parentUUID]++;
      if(this.modelLightCounter[light.parentUUID] < 3){
        return true;
      }else{
        return false;
      }
    }

  }

  //Toggle the visbility of the light helpers ingame
  toggleLightHelpers(){
    this.context.group.light_helpers.visible = !this.context.group.light_helpers.visible;
  }

  setLightHelpersVisible(on = false){
    this.context.group.light_helpers.visible = on ? true : false;
  }

}
