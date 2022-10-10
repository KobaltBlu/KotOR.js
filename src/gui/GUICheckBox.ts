/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GameMenu, GUIControl } from ".";
import { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "../loaders/TextureLoader";
import { TextureType } from "../enums/loaders/TextureType";
import { OdysseyTexture } from "../resource/OdysseyTexture";
import { GameState } from "../GameState";
import { GUIControlBorder } from "../interface/gui/GUIControlBorder";

/* @file
 * The GUICheckbox class.
 */

export class GUICheckBox extends GUIControl{
  value: number;
  onValueChanged: Function;

  borderSelected: GUIControlBorder;
  highlightSelected: GUIControlBorder;
  hasSelected: boolean;
  hashighlightSelected: boolean;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);

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
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.borderSelected.edge_material.defines.USE_MAP = '';
    this.borderSelected.edge_material.uniforms.diffuse.value = this.borderSelected.color;

    this.borderSelected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
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
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.borderSelected.fill.material.defines.USE_MAP = '';
    this.borderSelected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    // @ts-expect-error
    this.borderSelected.fill.geometry = new THREE.PlaneBufferGeometry( 1, 1, 1 );
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
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.highlightSelected.edge_material.defines.USE_MAP = '';
    this.highlightSelected.edge_material.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
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
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlightSelected.fill.material.defines.USE_MAP = '';
    this.highlightSelected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    // @ts-expect-error
    this.highlightSelected.fill.geometry = new THREE.PlaneBufferGeometry( 1, 1, 1 );
    this.highlightSelected.fill.mesh = new THREE.Mesh( this.highlightSelected.fill.geometry, this.highlightSelected.fill.material );

    this.widget.userData.highlightSelected.add( this.highlightSelected.fill.mesh );

    if(this.control instanceof GFFStruct){
      
      //Selected
      this.hasSelected = control.HasField('SELECTED');
      if(this.hasSelected){
        let selected = control.GetFieldByLabel('SELECTED').GetChildStructs()[0];

        if(selected.HasField('COLOR')){
          let color = selected.GetFieldByLabel('COLOR').GetVector();
          this.borderSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.borderSelected.color === 'undefined'){
          this.borderSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.borderSelected.dimension = selected.GetFieldByLabel('DIMENSION').GetValue() || 0;
        this.borderSelected.corner = selected.GetFieldByLabel('CORNER').GetValue();
        this.borderSelected.edge = selected.GetFieldByLabel('EDGE').GetValue();
        this.borderSelected.fill.texture = selected.GetFieldByLabel('FILL').GetValue();
        this.borderSelected.fillstyle = selected.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
        this.borderSelected.inneroffset = this.borderSelected.inneroffsety = selected.GetFieldByLabel('INNEROFFSET').GetValue() || 0;

        if(selected.HasField('INNEROFFSETY'))
          this.borderSelected.inneroffsety = selected.GetFieldByLabel('INNEROFFSETY').GetValue();

        this.borderSelected.pulsing = selected.GetFieldByLabel('PULSING').GetValue() || 0;
      }
      
      //Highlight Selected
      this.hashighlightSelected = control.HasField('HILIGHTSELECTED');
      if(this.hashighlightSelected){
        let highlightSelected = control.GetFieldByLabel('HILIGHTSELECTED').GetChildStructs()[0];

        if(highlightSelected.HasField('COLOR')){
          let color = highlightSelected.GetFieldByLabel('COLOR').GetVector();
          this.highlightSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.highlightSelected.color === 'undefined'){
          this.highlightSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.highlightSelected.dimension = highlightSelected.GetFieldByLabel('DIMENSION').GetValue() || 0;
        this.highlightSelected.corner = highlightSelected.GetFieldByLabel('CORNER').GetValue();
        this.highlightSelected.edge = highlightSelected.GetFieldByLabel('EDGE').GetValue();
        this.highlightSelected.fill.texture = highlightSelected.GetFieldByLabel('FILL').GetValue();
        this.highlightSelected.fillstyle = highlightSelected.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
        this.highlightSelected.inneroffset = this.highlightSelected.inneroffsety = highlightSelected.GetFieldByLabel('INNEROFFSET').GetValue() || 0;

        if(highlightSelected.HasField('INNEROFFSETY'))
          this.highlightSelected.inneroffsety = highlightSelected.GetFieldByLabel('INNEROFFSETY').GetValue();

        this.highlightSelected.pulsing = highlightSelected.GetFieldByLabel('PULSING').GetValue() || 0;
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
      });
    }else{
      this.highlightSelected.fill.material.visible = false;
    }

    //Control Input Events

    //Selected
    this.attachEventListenters( this.borderSelected.mesh );

    //Highlight Selected
    this.attachEventListenters( this.highlightSelected.mesh );

    this.addEventListener( 'mouseMove', () => { });

    this.addEventListener( 'click', () =>{
      console.log('click', this);
      this.setValue(!this.value);
    });

    this.addEventListener( 'mouseDown', (e: any) => {
      e.stopPropagation();
    });

    this.addEventListener( 'mouseUp', () => { });

    let cbSize = this.extent.height;
    this.borderSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlightSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
    
    this.borderSelected.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.highlightSelected.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);

    this.borderSelected.fill.material.uniforms.diffuse.value.set(this.defaultColor);
    this.highlightSelected.fill.material.uniforms.diffuse.value.set(this.defaultHighlightColor);

    this.updateCBVisualState();
  }

  buildFill(){
    super.buildFill();
    let cbSize = this.extent.height;
    this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.border.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.border.fill.material.uniforms.diffuse.value.set(this.defaultColor);
  }

  buildHighlightFill(){
    super.buildHighlightFill();
    let cbSize = this.extent.height;
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
      GameState.guiAudioEmitter.PlaySound('gui_scroll');
    }
    
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

    this.updateCBVisualState();
    
  }

}