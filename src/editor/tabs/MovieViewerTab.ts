import * as THREE from "three";
import { BIKObject } from "../../resource/BIKObject";
import { EditorFile } from "../EditorFile";
import { EditorTab } from "../EditorTab";

export class MovieViewerTab extends EditorTab {
  animLoop: boolean;
  renderer: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
  clock: THREE.Clock;
  canvas: any;
  $canvas: JQuery<any>;
  data: Uint8Array;
  binkVideo: BIKObject;
  width: number;
  height: number;

  constructor(file: EditorFile, isLocal = false){
    super();
    this.animLoop = false;
    console.log('Movie Viewer');
    $('a', this.$tab).text('Movie Viewer');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      // autoClear: false
    });
    this.renderer.autoClear = false;
    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );

    this.camera = new THREE.OrthographicCamera(
      this.$tabContent.innerWidth() / -2,
      this.$tabContent.innerWidth() / 2,
      this.$tabContent.innerHeight() / 2,
      this.$tabContent.innerHeight() / -2,
      1, 1000
    );
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.position.z = 500;
    this.camera.updateProjectionMatrix();

    this.clock = new THREE.Clock();

    this.canvas = this.renderer.domElement;
    this.$canvas = $(this.canvas);
    this.$canvas.addClass('noselect').attr('tabindex', 1);
    this.$tabContent.append(this.$canvas);

    this.data = new Uint8Array(0);
    this.file = file;

    this.binkVideo = new BIKObject({
      abs_path: true
    });

    window.addEventListener('resize', () => {
      try{
        this.TabSizeUpdate();
      }catch(e){

      }
    });

    $('#container').layout({ applyDefaultStyles: false,
      onresize: () => {
        try{
          this.TabSizeUpdate();
        }catch(e){

        }
      }
    });

    this.OpenFile(file);

  }

  UpdateUI(){

    

  }

  OpenFile(file: EditorFile){

    console.log('Movie Loading', file);

    if(file instanceof EditorFile){

      this.binkVideo.play(file.path);

      this.TabSizeUpdate();
      this.UpdateUI();
      this.Render();

    }    

  }

  onResize() {
    super.onResize();

    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  onDestroy() {
    super.onDestroy();

    this.binkVideo.stop();
    this.binkVideo.dispose();

    this.renderer.dispose();
    this.renderer = undefined;

    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  TabSizeUpdate(){

    let width = this.$tabContent.innerWidth(), height = this.$tabContent.innerHeight();

    if(this.width != width || this.height != height){
      this.camera.left = width / -2;
      this.camera.right = width / 2;
      this.camera.top = height / 2;
      this.camera.bottom = height / -2;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize( width, width );

      this.width = width;
      this.height = height;
    }
  }

  Render(){

    if(!this.binkVideo.disposed)
      requestAnimationFrame( () => { this.Render(); } );

    if(!this.visible)
      return;

    this.TabSizeUpdate();

    let delta = this.clock.getDelta();

    if(this.binkVideo.isPlaying){
      this.binkVideo.resize(this.width, this.height);
      this.binkVideo.update(delta);
    }
    
    this.renderer.clear();
    this.renderer.render( this.binkVideo.scene, this.camera );

  }

}
