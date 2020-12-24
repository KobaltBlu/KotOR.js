/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UI3DRenderer class.
 * This class is used to create and manage 3d rendering instances in the KotOR Forge application.
 * The main use is for the model previews in the template editors for UTC, UTD, and UTP files
 */

class UI3DRenderer {

  constructor( args = {} ){

    this.args = $.extend({
      width: 100,
      height: 100,
      camera: {
        position: new THREE.Vector3( .1, 5, 1 ),
        minView: 0.1,
        maxView: 1500
      }
    }, args);

    this.clock = new THREE.Clock();

    this._camera = new THREE.PerspectiveCamera( 50, this.args.width / this.args.height, this.args.camera.minView, this.args.camera.maxView );
    this._camera.up = new THREE.Vector3( 0, 0, 1 );
    this._camera.position.set( this.args.camera.position.x, this.args.camera.position.y, this.args.camera.position.z );              // offset the camera a bit
    this._camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    this._camera.aspect = this.args.width / this.args.height;
    this._camera.updateProjectionMatrix();

    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      autoClear: false,
      depth: true,
      alpha: true,
      logarithmicDepthBuffer: false
    });

    this._renderer.autoClear = false;
    this._renderer.setSize( this.args.width, this.args.height );

    this.canvas = this._renderer.domElement;
    this.$canvas = $(this.canvas);

    this._scene = new THREE.Scene();

    this._light = new THREE.AmbientLight();

    this._scene.add(this._light);

    this.onBeforeRender = null;

  }

  SetSize( width = 100, height = 100){

    this.args.width = width;
    this.args.height = height;

    this._renderer.setSize(width, height);  

    this._camera.up = new THREE.Vector3( 0, 0, 1 );
    //this._camera.position.set( this.args.camera.position.x, this.args.camera.position.y, this.args.camera.position.z );              // offset the camera a bit
    //this._camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    this._camera.aspect = this.args.width / this.args.height;
    this._camera.updateProjectionMatrix();

  }

  ResetScene(){
    this._scene = new THREE.Scene();
    this._scene.add(this._light);

    return this._scene;
  }

  GetScene(){
    return this._scene;
  }

  GetCamera(){
    return this._camera;
  }

  GetRenderedImage(){
    return this.canvas.toDataURL();
  }

  Render(){
    this._renderer.clear();

    let delta = this.clock.getDelta();

    //Custom render logic can run here
    if(typeof this.onBeforeRender === 'function')
      this.onBeforeRender(this, delta);

    this._renderer.render( this._scene, this._camera );
  }

  Destroy(){
    this._renderer = null;
    this._camera = null;
    this._scene = null;
    this.canvas = null;
    this.$canvas = null;
    this.args = null;
  }

}

module.exports = UI3DRenderer;
