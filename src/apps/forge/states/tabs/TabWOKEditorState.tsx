import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { UI3DRenderer } from "../../UI3DRenderer";
import { TabWOKEditor } from "../../components/tabs/TabWOKEditor";

export class TabWOKEditorState extends TabState {
  tabName: string = `WOK`;

  ui3DRenderer: UI3DRenderer;
  wok: KotOR.OdysseyWalkMesh;
  groundColor: KotOR.THREE.Color;
  groundGeometry: KotOR.THREE.WireframeGeometry<KotOR.THREE.PlaneGeometry>;
  groundMaterial: KotOR.THREE.LineBasicMaterial;
  groundMesh: KotOR.THREE.LineSegments<KotOR.THREE.WireframeGeometry<KotOR.THREE.PlaneGeometry>, KotOR.THREE.LineBasicMaterial>;
  faceHelperMesh: KotOR.THREE.Mesh<KotOR.THREE.BufferGeometry, KotOR.THREE.Material | KotOR.THREE.Material[]>;
  faceHelperGeometry: KotOR.THREE.BufferGeometry;
  faceHelperMaterial: KotOR.THREE.MeshBasicMaterial;
  wireMaterial: KotOR.THREE.MeshBasicMaterial;
  wireframe: KotOR.THREE.Mesh<KotOR.THREE.BufferGeometry, KotOR.THREE.MeshBasicMaterial>;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    
    this.groundColor = new KotOR.THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new KotOR.THREE.WireframeGeometry(new KotOR.THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new KotOR.THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new KotOR.THREE.LineSegments( this.groundGeometry, this.groundMaterial );

    this.faceHelperGeometry = new KotOR.THREE.BufferGeometry();
    this.faceHelperGeometry.setAttribute('position', new KotOR.THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));

    this.faceHelperMaterial = new KotOR.THREE.MeshBasicMaterial();
    this.faceHelperMaterial.wireframe = true;
    this.faceHelperMaterial.visible = false;
    this.faceHelperMesh = new KotOR.THREE.Mesh(this.faceHelperGeometry, this.faceHelperMaterial)

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.controlsEnabled = true;
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.scene.add(this.groundMesh);
    this.ui3DRenderer.scene.add(this.faceHelperMesh);

    
    this.ui3DRenderer.controls.attachEventListener('onSelect', (intersect: KotOR.THREE.Intersection) => {
      this.ui3DRenderer.selectionBox.visible = false;

      for(let i = 0; i < this.wok.faces.length; i++){
        const face = this.wok.faces[i];
        const index = i * 3;
        this.wok.geometry.attributes.color.setX(index, face.color.r);
        this.wok.geometry.attributes.color.setY(index, face.color.g);
        this.wok.geometry.attributes.color.setZ(index, face.color.b);
        
        this.wok.geometry.attributes.color.setX(index + 1, face.color.r);
        this.wok.geometry.attributes.color.setY(index + 1, face.color.g);
        this.wok.geometry.attributes.color.setZ(index + 1, face.color.b);
        
        this.wok.geometry.attributes.color.setX(index + 2, face.color.r);
        this.wok.geometry.attributes.color.setY(index + 2, face.color.g);
        this.wok.geometry.attributes.color.setZ(index + 2, face.color.b);
      }

      if(intersect && intersect.face){
        const selectColor = new KotOR.THREE.Color(0x607D8B);

        const f_idx = Math.floor(intersect.face.a / 3);
        const face: KotOR.OdysseyFace3 = this.wok.faces.find( (f: KotOR.OdysseyFace3, index: number) => index == f_idx ) as KotOR.OdysseyFace3;

        this.wok.geometry.attributes.color.setX(intersect.face.a, selectColor.r);
        this.wok.geometry.attributes.color.setY(intersect.face.a, selectColor.g);
        this.wok.geometry.attributes.color.setZ(intersect.face.a, selectColor.b);
        
        this.wok.geometry.attributes.color.setX(intersect.face.b, selectColor.r);
        this.wok.geometry.attributes.color.setY(intersect.face.b, selectColor.g);
        this.wok.geometry.attributes.color.setZ(intersect.face.b, selectColor.b);
        
        this.wok.geometry.attributes.color.setX(intersect.face.c, selectColor.r);
        this.wok.geometry.attributes.color.setY(intersect.face.c, selectColor.g);
        this.wok.geometry.attributes.color.setZ(intersect.face.c, selectColor.b);

        this.faceHelperGeometry.attributes.position.setX(0, this.wok.geometry.attributes.position.getX(intersect.face.a) );
        this.faceHelperGeometry.attributes.position.setY(0, this.wok.geometry.attributes.position.getY(intersect.face.a) );
        this.faceHelperGeometry.attributes.position.setZ(0, this.wok.geometry.attributes.position.getZ(intersect.face.a) );

        this.faceHelperGeometry.attributes.position.setX(1, this.wok.geometry.attributes.position.getX(intersect.face.b) );
        this.faceHelperGeometry.attributes.position.setY(1, this.wok.geometry.attributes.position.getY(intersect.face.b) );
        this.faceHelperGeometry.attributes.position.setZ(1, this.wok.geometry.attributes.position.getZ(intersect.face.b) );

        this.faceHelperGeometry.attributes.position.setX(2, this.wok.geometry.attributes.position.getX(intersect.face.c) );
        this.faceHelperGeometry.attributes.position.setY(2, this.wok.geometry.attributes.position.getY(intersect.face.c) );
        this.faceHelperGeometry.attributes.position.setZ(2, this.wok.geometry.attributes.position.getZ(intersect.face.c) );

        this.faceHelperGeometry.attributes.position.needsUpdate = true;
        this.faceHelperGeometry.computeBoundingSphere();
        this.faceHelperMaterial.visible = true;

        this.processEventListener('onFaceSelected', [face]);
      }else{
        this.processEventListener('onFaceSelected');
        this.faceHelperMaterial.visible = false;
      }

      this.wok.geometry.attributes.color.needsUpdate = true;
    })

    this.setContentView(<TabWOKEditor tab={this}></TabWOKEditor>);
    this.openFile();
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.OdysseyWalkMesh>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          console.log(response.buffer);
          this.wok = new KotOR.OdysseyWalkMesh(new KotOR.BinaryReader(response.buffer));
          this.wok.material.visible = true;
          this.wok.material.side = KotOR.THREE.DoubleSide;
          this.ui3DRenderer.selectable.add(this.wok.mesh);

          this.wireMaterial = new KotOR.THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } );
          this.wireframe = new KotOR.THREE.Mesh(this.wok.geometry, this.wireMaterial);
          this.ui3DRenderer.unselectable.add(this.wireframe);

          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.wok);
        });
      }
    });
  }

  updateCameraFocus(){
    // if(!this.modulePlaceable || !this.modulePlaceable?.model) return;

    // this.modulePlaceable.container.position.set(0, 0, 0);

    // let center = new KotOR.THREE.Vector3();
    // this.modulePlaceable.box.getCenter(center);

    // let size = new KotOR.THREE.Vector3();
    // this.modulePlaceable.box.getSize(size);

    // //Center the object to 0
    // let origin = new KotOR.THREE.Vector3();
    // this.modulePlaceable.container.position.set(-center.x, -center.y, -center.z);
    // this.ui3DRenderer.camera.position.z = 0;
    // this.ui3DRenderer.camera.position.y = size.x + size.y;
    // this.ui3DRenderer.camera.lookAt(origin)
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;

    this.updateCameraFocus();

    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  animate(delta: number = 0){

    
    
  }

}
