import React from "react";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./";
import * as KotOR from "../../KotOR";

export class TabModuleEditorState extends TabState {

  tabName: string = `Module Editor`;

  ui3DRenderer: UI3DRenderer;
  groundColor: KotOR.THREE.Color;
  groundGeometry: KotOR.THREE.WireframeGeometry<KotOR.THREE.PlaneGeometry>;
  groundMaterial: KotOR.THREE.LineBasicMaterial;
  groundMesh: KotOR.THREE.LineSegments<KotOR.THREE.WireframeGeometry<KotOR.THREE.PlaneGeometry>, KotOR.THREE.LineBasicMaterial>;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.singleInstance = true;
    this.isClosable = true;
    
    // Geometry
    this.groundColor = new KotOR.THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new KotOR.THREE.WireframeGeometry(new KotOR.THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new KotOR.THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new KotOR.THREE.LineSegments( this.groundGeometry, this.groundMaterial );

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.controlsEnabled = true;

    this.ui3DRenderer.scene.add(this.groundMesh);

  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;
    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  destroy(): void {
    this.ui3DRenderer.destroy();
    // this.disposeLayout();
    super.destroy();
  }

  animate(delta: number = 0){

  }

}