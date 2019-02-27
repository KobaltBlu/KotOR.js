/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LBL_3DView class.
 */

class LBL_3DView {

  constructor(width = 800, height = 600){

    this.width = width;//window.innerWidth;
    this.height = height;//window.innerHeight;
    this.visible = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 22.5, this.width/this.height, 0.1, 15000 );
    this.texture = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
    this.clearColor = new THREE.Color(0x000000);

    this.globalLight = new THREE.AmbientLight(0x7F7F7F);
    this.globalLight.position.x = 0;
    this.globalLight.position.y = 0;
    this.globalLight.position.z = 0;
    this.globalLight.intensity  = 1;

    //this.scene.add(this.globalLight);
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.updateProjectionMatrix();

    this.emitters = {};
    this._emitters = {};
    this.group = {
      emitters: new THREE.Group(),
      lights: new THREE.Group(),
      light_helpers: new THREE.Group(),
      creatures: new THREE.Group()
    }

    this.scene.add(this.group.emitters);
    this.scene.add(this.group.lights);
    this.scene.add(this.group.creatures);

  }

  setControl(control){
    this.control = control;
    this.control.getFill().material.map = this.texture.texture;
    this.control.getFill().material.color.setHex(0xFFFFFF);
  }

  getCamera(){
    return this.camera;
  }

  getTexture(){
    return this.texture.texture;
  }

  addModel(model){
    if(model instanceof THREE.Object3D){
      this.scene.add(model);
      model.turnLightsOn({
        sortByPcPosition: false
      });
    }
  }

  setVisible(bVisible){
    this.visible = bVisible;
  }

  setSize(width = 0, height = 0){
    this.width = width;
    this.height = height;
    this.updateRatio();
  }

  updateRatio(){
    this.texture.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  render(delta = 0){

    if(!this.visible)
      return;

    for(let emitter in this.emitters){
      this.emitters[emitter].tick(delta);
    }

    for(let i = 0; i < this.scene.children.length; i++){
      let element = this.scene.children[i];
      if(element instanceof THREE.AuroraModel){
        element.update(delta);
      }
    }

    let oldClearColor = Game.renderer.getClearColor();
    Game.renderer.setClearColor(this.clearColor, 1);
    Game.renderer.setRenderTarget(this.texture);
    Game.renderer.clear(this.texture);
    Game.renderer.render(this.scene, this.camera, this.texture);
    Game.renderer.setRenderTarget(null);
    Game.renderer.setClearColor(oldClearColor, 1);

    if(this.control instanceof GUIControl){
      let material = this.control.getFill().material;
      material.map = this.texture.texture;
      material.transparent = true;
      material.needsUpdate = true;
    }

  }


}

module.exports = LBL_3DView;