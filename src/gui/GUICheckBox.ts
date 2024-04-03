import type { GameMenu } from "./GameMenu";
import { GUIControl } from "./GUIControl";
import { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "../loaders";
import { TextureType } from "../enums/loaders/TextureType";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { GameState } from "../GameState";
import { IGUIControlBorder } from "../interface/gui/IGUIControlBorder";
// import { ShaderManager } from "../managers";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";

/**
 * GUICheckBox class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUICheckBox.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUICheckBox extends GUIControl{
  value: number;
  onValueChanged: Function;

  borderSelected: IGUIControlBorder;
  highlightSelected: IGUIControlBorder;
  hasSelected: boolean;
  hashighlightSelected: boolean;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUICheckBox;

    this.value = 0;

    this.widget.userData.selected = new THREE.Group();
    this.widget.userData.highlightSelected = new THREE.Group();
    this.widget.add(this.widget.userData.selected);
    this.widget.add(this.widget.userData.highlightSelected);

    //----------//
    // Selected
    //----------//

    this.borderSelected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      corner_material: {} as THREE.ShaderMaterial,
      edge: '',
      edge_material: {} as THREE.ShaderMaterial,
      fill: {
        texture: '',
        material: {} as THREE.ShaderMaterial,
        mesh: {} as THREE.Mesh,
        geometry: {} as THREE.BufferGeometry,
      },
      mesh: {} as THREE.Mesh,
      geometry: {} as THREE.BufferGeometry,
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.borderSelected.geometry = new THREE.BufferGeometry();
    
    this.borderSelected.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.borderSelected.edge_material.defines.USE_MAP = '';
    this.borderSelected.edge_material.uniforms.diffuse.value = this.borderSelected.color;

    this.borderSelected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.borderSelected.corner_material.defines.USE_MAP = '';
    this.borderSelected.corner_material.uniforms.diffuse.value = this.borderSelected.color;

    this.borderSelected.mesh = new THREE.Mesh( this.borderSelected.geometry, [this.borderSelected.edge_material, this.borderSelected.corner_material] );
    this.widget.userData.selected.add(this.borderSelected.mesh);

    //---------------//
    // Selected Fill
    //---------------//
    
    this.borderSelected.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.borderSelected.fill.material.defines.USE_MAP = '';
    this.borderSelected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.borderSelected.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.borderSelected.fill.mesh = new THREE.Mesh( this.borderSelected.fill.geometry, this.borderSelected.fill.material );

    this.widget.userData.selected.add( this.borderSelected.fill.mesh );

    //--------------------//
    // Highlight Selected
    //--------------------//

    this.highlightSelected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      corner_material: {} as THREE.ShaderMaterial,
      edge: '',
      edge_material: {} as THREE.ShaderMaterial,
      fill: {
        texture: '',
        material: {} as THREE.ShaderMaterial,
        mesh: {} as THREE.Mesh,
        geometry: {} as THREE.BufferGeometry,
      },
      mesh: {} as THREE.Mesh,
      geometry: {} as THREE.BufferGeometry,
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.highlightSelected.geometry = new THREE.BufferGeometry();
    
    this.highlightSelected.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.highlightSelected.edge_material.defines.USE_MAP = '';
    this.highlightSelected.edge_material.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlightSelected.corner_material.defines.USE_MAP = '';
    this.highlightSelected.corner_material.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.mesh = new THREE.Mesh( this.highlightSelected.geometry, [this.highlightSelected.edge_material, this.highlightSelected.corner_material] );
    this.widget.userData.highlightSelected.add(this.highlightSelected.mesh);

    //-------------------------//
    // Highlight Selected Fill
    //-------------------------//
    
    this.highlightSelected.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlightSelected.fill.material.defines.USE_MAP = '';
    this.highlightSelected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.highlightSelected.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.highlightSelected.fill.mesh = new THREE.Mesh( this.highlightSelected.fill.geometry, this.highlightSelected.fill.material );

    this.widget.userData.highlightSelected.add( this.highlightSelected.fill.mesh );

    if(this.control instanceof GFFStruct){
      
      //Selected
      this.hasSelected = control.hasField('SELECTED');
      if(this.hasSelected){
        let selected = control.getFieldByLabel('SELECTED').getChildStructs()[0];

        if(selected.hasField('COLOR')){
          let color = selected.getFieldByLabel('COLOR').getVector();
          this.borderSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.borderSelected.color === 'undefined'){
          this.borderSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.borderSelected.dimension = selected.getFieldByLabel('DIMENSION').getValue() || 0;
        this.borderSelected.corner = selected.getFieldByLabel('CORNER').getValue();
        this.borderSelected.edge = selected.getFieldByLabel('EDGE').getValue();
        this.borderSelected.fill.texture = selected.getFieldByLabel('FILL').getValue();
        this.borderSelected.fillstyle = selected.getFieldByLabel('FILLSTYLE').getValue() || 0;
        this.borderSelected.inneroffset = this.borderSelected.inneroffsety = selected.getFieldByLabel('INNEROFFSET').getValue() || 0;

        if(selected.hasField('INNEROFFSETY'))
          this.borderSelected.inneroffsety = selected.getFieldByLabel('INNEROFFSETY').getValue();

        this.borderSelected.pulsing = selected.getFieldByLabel('PULSING').getValue() || 0;
      }
      
      //Highlight Selected
      this.hashighlightSelected = control.hasField('HILIGHTSELECTED');
      if(this.hashighlightSelected){
        let highlightSelected = control.getFieldByLabel('HILIGHTSELECTED').getChildStructs()[0];

        if(highlightSelected.hasField('COLOR')){
          let color = highlightSelected.getFieldByLabel('COLOR').getVector();
          this.highlightSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.highlightSelected.color === 'undefined'){
          this.highlightSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.highlightSelected.dimension = highlightSelected.getFieldByLabel('DIMENSION').getValue() || 0;
        this.highlightSelected.corner = highlightSelected.getFieldByLabel('CORNER').getValue();
        this.highlightSelected.edge = highlightSelected.getFieldByLabel('EDGE').getValue();
        this.highlightSelected.fill.texture = highlightSelected.getFieldByLabel('FILL').getValue();
        this.highlightSelected.fillstyle = highlightSelected.getFieldByLabel('FILLSTYLE').getValue() || 0;
        this.highlightSelected.inneroffset = this.highlightSelected.inneroffsety = highlightSelected.getFieldByLabel('INNEROFFSET').getValue() || 0;

        if(highlightSelected.hasField('INNEROFFSETY'))
          this.highlightSelected.inneroffsety = highlightSelected.getFieldByLabel('INNEROFFSETY').getValue();

        this.highlightSelected.pulsing = highlightSelected.getFieldByLabel('PULSING').getValue() || 0;
      }

    }

    //Control Textures

    //----------//
    // Selected
    //----------//

    if(this.borderSelected.edge != ''){
      TextureLoader.enQueue(this.borderSelected.edge, this.borderSelected.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.borderSelected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        let cbSize = this.getCBScale();
        this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
        this.borderSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
      });
    }

    if(this.borderSelected.corner != ''){
      TextureLoader.enQueue(this.borderSelected.corner, this.borderSelected.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.borderSelected.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.borderSelected.fill.texture != ''){
      this.borderSelected.fill.material.transparent = true;
      TextureLoader.enQueue(this.borderSelected.fill.texture, this.borderSelected.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(texture == null){
          this.borderSelected.fill.material.uniforms.opacity.value = 0.01;
        }
      });
    }else{
      this.borderSelected.fill.material.visible = false;
    }

    //--------------------//
    // Highlight Selected
    //--------------------//

    if(this.highlightSelected.edge != ''){
      TextureLoader.enQueue(this.highlightSelected.edge, this.highlightSelected.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.highlightSelected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlightSelected.corner != ''){
      TextureLoader.enQueue(this.highlightSelected.corner, this.highlightSelected.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.highlightSelected.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlightSelected.fill.texture != ''){
      this.highlightSelected.fill.material.transparent = true;
      TextureLoader.enQueue(this.highlightSelected.fill.texture, this.highlightSelected.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(texture == null){
          this.highlightSelected.fill.material.uniforms.opacity.value = 0.01;
        }
        let cbSize = this.getCBScale();
        this.highlight.fill.mesh.scale.set(cbSize, cbSize, 1);
        this.highlightSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
      });
    }else{
      this.highlightSelected.fill.material.visible = false;
    }

    //Control Input Events

    //Selected
    this.attachEventListenters( this.borderSelected.mesh );

    //Highlight Selected
    this.attachEventListenters( this.highlightSelected.mesh );

    this.addEventListener( 'mouseMove', (e: any) => { });

    this.addEventListener( 'click', () =>{
      console.log('click', this);
      this.setValue(!this.value);
    });

    this.addEventListener( 'mouseDown', (e: any) => {
      e.stopPropagation();
    });

    this.addEventListener( 'mouseUp', () => { });

    let cbSize = this.getCBScale();
    this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.borderSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlight.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlightSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
    
    this.borderSelected.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.highlightSelected.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);

    this.borderSelected.fill.material.uniforms.diffuse.value.set(this.defaultColor);
    this.highlightSelected.fill.material.uniforms.diffuse.value.set(this.defaultHighlightColor);

    this.updateCBVisualState();
  }

  getCBScale(){
    // return this.guiFont?.bsline || this.extent.height/2;
    return 24;
  }

  buildFill(){
    super.buildFill();
    let cbSize = this.getCBScale();
    this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.border.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.border.fill.material.uniforms.diffuse.value.set(this.defaultColor);
  }

  buildHighlightFill(){
    super.buildHighlightFill();
    let cbSize = this.getCBScale();
    this.highlight.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlight.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.highlight.fill.material.uniforms.diffuse.value.set(this.defaultHighlightColor);
  }

  hideHighlight(){}
  hideBorder(){}
  hideFill(){}
  hideHighlightFill(){}

  updateCBVisualState(){
    this.border.fill.mesh.visible = false;
    this.borderSelected.fill.mesh.visible = false;
    this.highlight.fill.mesh.visible = false;
    this.highlightSelected.fill.mesh.visible = false;

    let cbSize = this.getCBScale();
    this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.borderSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlight.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlightSelected.fill.mesh.scale.set(cbSize, cbSize, 1);

    if(this.hover){
      if(this.value){
        this.highlightSelected.fill.mesh.visible = true;
      }else{
        this.highlight.fill.mesh.visible = true;
      }
    }else{
      if(this.value){
        this.borderSelected.fill.mesh.visible = true;
      }else{
        this.border.fill.mesh.visible = true;
      }
    }

  }

  onHoverOut(){
    this.hover = false;
    this.pulsing = false;

    this.text.material.uniforms.diffuse.value.set(this.defaultColor);

    if(typeof this.onMouseOut === 'function')
      this.onMouseOut();

    this.updateCBVisualState();
    this.processEventListener('mouseOut');
  }

  onHoverIn(){
    if(!this.hover && typeof this.onHover === 'function')
      this.onHover();

    this.hover = true;
    this.pulsing = true;

    this.text.material.uniforms.diffuse.value.set(this.defaultHighlightColor);

    if(typeof this.onMouseIn === 'function')
      this.onMouseIn();

    this.updateCBVisualState();

    if(this.isClickable()){
      GameState.guiAudioEmitter.playSound('gui_scroll');
    }
    
    this.processEventListener('hover');
    this.processEventListener('mouseIn');
  }

  onINIPropertyAttached(){
    if(this.iniProperty)
      this.setValue(GameState.iniConfig.getProperty(this.iniProperty));
  }

  setValue(value: boolean){
    this.value = value ? 1 : 0;

    if(this.iniProperty){
      GameState.iniConfig.setProperty(this.iniProperty, this.value);
    }
    
    if(typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

    this.processEventListener('valueChanged', [this.value]);

    this.updateCBVisualState();
  }

}
