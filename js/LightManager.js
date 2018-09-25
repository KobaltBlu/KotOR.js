/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LightManager class is currently used for dynamic lighting on objects like doors, placeables, creatures, and more. 
 */

class LightManager {

  static init(){
    LightManager.MAXLIGHTS = 8; //NumDynamicLights row in videoquality.2da
    LightManager.light_pool = [];
    LightManager.clearLights();
  }

  static clearLights(){
    //Each loop this will hold a counter per model that is trying to display lights. 
    //When that model has shown a max of 3 lights the rest will be ignored for that loop
    LightManager.modelLightCounter = {};


    LightManager.lights = [];/* = {
      5: [],
      4: [],
      3: [],
      2: [],
      1: [],
      0: []
    };*/

    LightManager.light_pool = [];

    //Clear lights
    while (Game.group.lights.children.length){
      Game.group.lights.remove(Game.group.lights.children[0]);
    }

    //Clear light helpers
    while (Game.group.light_helpers.children.length){
      Game.group.light_helpers.remove(Game.group.light_helpers.children[0]);
    }

    for(let i = 0; i < LightManager.MAXLIGHTS; i++){
      
      let light = new THREE.PointLight( 0xFFFFFF, 0, 0, 1 );
      Game.group.lights.add(light);
      let helper = new THREE.PointLightHelper( light, 1 );
      light.visible = light.helper = true;

      light.helper = helper;

      LightManager.light_pool.push( light );
      Game.group.light_helpers.add( helper );

    }
    
  }

  static addLight(light = null){
    //console.log(light);
    if(light){
      //LightManager.lights[light.priority].push(light);
      LightManager.lights.push(light);
      light._worldPos = light.getWorldPosition(new THREE.Vector3());
      //LightManager.lights[0].push(light);
    }

  }

  static getFrameLights(){



  }

  static update(delta = 0){
    
    if(Game.Mode != Game.MODES.INGAME)
      return;

    LightManager.frustum = new THREE.Frustum();
    LightManager.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(Game.currentCamera.projectionMatrix, Game.currentCamera.matrixWorldInverse));

    LightManager.modelLightCounter = {};

    let priorityIdx = 5;
    //let numLights = LightManager.lights[priorityIdx].length;
    let numLights = LightManager.lights.length;

    for(let i = 0; i < numLights; i++){
      //let light = this.lights[priorityIdx][i];
      let light = this.lights[i];
      if(Game.inDialog){
        light._distance = Game.currentCamera.position.distanceTo(light.getWorldPosition(new THREE.Vector3()));
      }else{
        light._distance = Game.getCurrentPlayer().position.distanceTo(light.getWorldPosition(new THREE.Vector3()));
      }
      
    }

    LightManager.tmpLights = [];//LightManager.lights.slice();
    let ambientLights = LightManager.lights.filter(light => light.auroraModel.visible && (light.isAmbient || light._node.radius > 50));
    //let shadowLights = LightManager.lights.filter(light => light.auroraModel.visible && light.castShadow);
    let fadingLights = LightManager.lights.filter(light => light.auroraModel.visible && !light.isAmbient);
    //console.log(ambientLights);
    //LightManager.lights[priorityIdx].sort(LightManager.sortLights);
    
    /*fadingLights.sort((a,b) => {
      if (a.isFading < b.isFading)
        return 1;
      if (a.isFading > b.isFading)
        return -1;
      return 0;
    });*/
    /*fadingLights.sort((a,b) => {
      if (a.castShadow < b.castShadow)
        return 1;
      if (a.castShadow > b.castShadow)
        return -1;
      return 0;
    });*/
    /*shadowLights.sort( (a, b) => {
      return b.priority - a.priority;
    });*/
    fadingLights.sort(LightManager.sortLights);

    LightManager.tmpLights = LightManager.tmpLights.concat(ambientLights);
    //LightManager.tmpLights = LightManager.tmpLights.concat(shadowLights);
    LightManager.tmpLights = LightManager.tmpLights.concat(fadingLights);
    //console.log(LightManager.tmpLights);
    let limit = LightManager;
    let spawned = 0;
    numLights = LightManager.tmpLights.length;
    //console.log(ambientLights)
    let lightsShow = [];

    for( let i = 0; i < LightManager.MAXLIGHTS; i++ ){
      LightManager.light_pool[i].position.set(0,0,0)
    }
    
    for( let i = 0; i < numLights; i++ ){

      //let light = LightManager.lights[priorityIdx][i];
      let light = LightManager.tmpLights[i];

      if(!LightManager.canShowLight(light))
        continue;

      //if(light.isAmbient)
      //  continue;

      if(spawned >= LightManager.MAXLIGHTS)
        return;
      
      let lightNode = LightManager.light_pool[spawned];
      if(lightNode){
        //lightNode.position.x = light._worldPos.x;//lightNode.helper.position.x = light.position.x;
        //lightNode.position.y = light._worldPos.y;//lightNode.helper.position.y = light.position.y;
        //lightNode.position.z = light._worldPos.z;//lightNode.helper.position.z = light.position.z;
        if(lightsShow.indexOf(light.uuid) == -1){
          lightNode.position.copy(light.getWorldPosition(new THREE.Vector3()));

          lightNode.color.r = light.color.r;
          lightNode.color.g = light.color.g;
          lightNode.color.b = light.color.b;
          lightNode.decay = 1;//2;//light.isFading ? 1 : 1;
          lightNode.intensity = light._node.intensity;
          lightNode.distance = light._node.radius;

          lightNode.updateMatrix();

          lightNode.lightUUID = light.uuid;
          lightsShow.push(light.uuid);

          //lightNode.visible = lightNode.helper.visible = true;

          spawned++;
        }
      }
      
    }


    //console.log(lightsShow)

  }

  static sortLights (a, b){

    return b.priority - a.priority || a._distance - b._distance;

    //return a.priority < b.priority || a._distance - b._distance;
    //if(a.affectDynamic && LightManager.frustum.containsPoint(a.getWorldPosition(new THREE.Vector3()))){
      if (a._distance===b._distance){
          return (a.priority-b.priority);
      } else if(a._distance>b._distance){
          return 1;
      } else if(a._distance<b._distance){
          return -1;
      }
      return 0;
    //}else{
    //  return 0;
    //}
  }

  static canShowLight(light){
    //let counter = LightManager.modelLightCounter[light.parentUUID];
    //if(light.isFading && !LightManager.frustum.containsPoint(light.getWorldPosition(new THREE.Vector3()))){
    //  return false;
    //}
    if(!light)
      return false;

    if(typeof LightManager.modelLightCounter[light.parentUUID] === 'undefined'){
      LightManager.modelLightCounter[light.parentUUID] = 0;
      return true;
    }else{
      LightManager.modelLightCounter[light.parentUUID]++;
      if(LightManager.modelLightCounter[light.parentUUID] < 2){
        return true;
      }else{
        return false;
      }
    }

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