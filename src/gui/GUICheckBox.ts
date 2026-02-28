import * as THREE from "three";

import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { TextureType } from "@/enums/loaders/TextureType";
import { GameState } from "@/GameState";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import type { IGUIControlBorder } from "@/interface/gui/IGUIControlBorder";
import { TextureLoader } from "@/loaders";
import { GFFStruct } from "@/resource/GFFStruct";
import type { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createScopedLogger, LogScope } from "@/utility/Logger";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

const log = createScopedLogger(LogScope.Game);

type GUIShaderMaterial = THREE.ShaderMaterial & {
  defines: Record<string, string>;
  uniforms: {
    diffuse: { value: THREE.Color };
    opacity: { value: number };
  };
};

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
  onValueChanged?: (value: number) => void;

  borderSelected: IGUIControlBorder;
  highlightSelected: IGUIControlBorder;
  hasSelected: boolean;
  hashighlightSelected: boolean;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUICheckBox;

    this.value = 0;

    const selectedGroup = new THREE.Group();
    const highlightSelectedGroup = new THREE.Group();
    this.widget.userData.selected = selectedGroup;
    this.widget.userData.highlightSelected = highlightSelectedGroup;
    this.widget.add(selectedGroup);
    this.widget.add(highlightSelectedGroup);

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

    const borderEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    }) as GUIShaderMaterial;
    this.borderSelected.edge_material = borderEdgeMaterial;
    borderEdgeMaterial.defines.USE_MAP = '';
    borderEdgeMaterial.uniforms.diffuse.value = this.borderSelected.color;

    const borderCornerMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    }) as GUIShaderMaterial;
    this.borderSelected.corner_material = borderCornerMaterial;
    //this.borderSelected.corner_material.defines.USE_MAP = '';
    borderCornerMaterial.uniforms.diffuse.value = this.borderSelected.color;

    this.borderSelected.mesh = new THREE.Mesh( this.borderSelected.geometry, [this.borderSelected.edge_material, this.borderSelected.corner_material] );
    selectedGroup.add(this.borderSelected.mesh);

    //---------------//
    // Selected Fill
    //---------------//

    const borderFillMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    }) as GUIShaderMaterial;
    this.borderSelected.fill.material = borderFillMaterial;
    //this.borderSelected.fill.material.defines.USE_MAP = '';
    borderFillMaterial.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.borderSelected.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.borderSelected.fill.mesh = new THREE.Mesh( this.borderSelected.fill.geometry, this.borderSelected.fill.material );

    selectedGroup.add( this.borderSelected.fill.mesh );

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

    const highlightEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    }) as GUIShaderMaterial;
    this.highlightSelected.edge_material = highlightEdgeMaterial;
    highlightEdgeMaterial.defines.USE_MAP = '';
    highlightEdgeMaterial.uniforms.diffuse.value = this.highlightSelected.color;

    const highlightCornerMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    }) as GUIShaderMaterial;
    this.highlightSelected.corner_material = highlightCornerMaterial;
    //this.highlightSelected.corner_material.defines.USE_MAP = '';
    highlightCornerMaterial.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.mesh = new THREE.Mesh( this.highlightSelected.geometry, [this.highlightSelected.edge_material, this.highlightSelected.corner_material] );
    highlightSelectedGroup.add(this.highlightSelected.mesh);

    //-------------------------//
    // Highlight Selected Fill
    //-------------------------//

    const highlightFillMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    }) as GUIShaderMaterial;
    this.highlightSelected.fill.material = highlightFillMaterial;
    //this.highlightSelected.fill.material.defines.USE_MAP = '';
    highlightFillMaterial.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.highlightSelected.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.highlightSelected.fill.mesh = new THREE.Mesh( this.highlightSelected.fill.geometry, this.highlightSelected.fill.material );

    highlightSelectedGroup.add( this.highlightSelected.fill.mesh );

    if(this.control instanceof GFFStruct){

      //Selected
      this.hasSelected = control.hasField('SELECTED');
      if(this.hasSelected){
        const selected = control.getFieldByLabel('SELECTED').getChildStructs()[0];

        if(selected.hasField('COLOR')){
          const color = selected.getFieldByLabel('COLOR').getVector() as { x: number; y: number; z: number };
          this.borderSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.borderSelected.color === 'undefined'){
          this.borderSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.borderSelected.dimension = selected.getNumberByLabel('DIMENSION') || 0;
        this.borderSelected.corner = selected.getStringByLabel('CORNER');
        this.borderSelected.edge = selected.getStringByLabel('EDGE');
        this.borderSelected.fill.texture = selected.getStringByLabel('FILL');
        this.borderSelected.fillstyle = selected.getNumberByLabel('FILLSTYLE') || 0;
        this.borderSelected.inneroffset = this.borderSelected.inneroffsety = selected.getNumberByLabel('INNEROFFSET') || 0;

        if(selected.hasField('INNEROFFSETY'))
          this.borderSelected.inneroffsety = selected.getNumberByLabel('INNEROFFSETY');

        this.borderSelected.pulsing = selected.getNumberByLabel('PULSING') || 0;
      }

      //Highlight Selected
      this.hashighlightSelected = control.hasField('HILIGHTSELECTED');
      if(this.hashighlightSelected){
        const highlightSelected = control.getFieldByLabel('HILIGHTSELECTED').getChildStructs()[0];

        if(highlightSelected.hasField('COLOR')){
          const color = highlightSelected.getFieldByLabel('COLOR').getVector() as { x: number; y: number; z: number };
          this.highlightSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.highlightSelected.color === 'undefined'){
          this.highlightSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.highlightSelected.dimension = highlightSelected.getNumberByLabel('DIMENSION') || 0;
        this.highlightSelected.corner = highlightSelected.getStringByLabel('CORNER');
        this.highlightSelected.edge = highlightSelected.getStringByLabel('EDGE');
        this.highlightSelected.fill.texture = highlightSelected.getStringByLabel('FILL');
        this.highlightSelected.fillstyle = highlightSelected.getNumberByLabel('FILLSTYLE') || 0;
        this.highlightSelected.inneroffset = this.highlightSelected.inneroffsety = highlightSelected.getNumberByLabel('INNEROFFSET') || 0;

        if(highlightSelected.hasField('INNEROFFSETY'))
          this.highlightSelected.inneroffsety = highlightSelected.getNumberByLabel('INNEROFFSETY');

        this.highlightSelected.pulsing = highlightSelected.getNumberByLabel('PULSING') || 0;
      }

    }

    //Control Textures

    //----------//
    // Selected
    //----------//

    if(this.borderSelected.edge != ''){
      TextureLoader.enQueue(this.borderSelected.edge, this.borderSelected.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          log.debug('initTextures', this.borderSelected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        const cbSize = this.getCBScale();
        this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
        this.borderSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
      });
    }

    if(this.borderSelected.corner != ''){
      TextureLoader.enQueue(this.borderSelected.corner, this.borderSelected.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          log.debug('initTextures', this.borderSelected.corner, texture);
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
          log.debug('initTextures', this.highlightSelected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlightSelected.corner != ''){
      TextureLoader.enQueue(this.highlightSelected.corner, this.highlightSelected.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          log.debug('initTextures', this.highlightSelected.corner, texture);
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
        const cbSize = this.getCBScale();
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

    this.addEventListener( 'mouseMove', (_e) => { });

    this.addEventListener( 'click', () =>{
      log.debug('click', this);
      this.setValue(!this.value);
    });

    this.addEventListener( 'mouseDown', (e) => {
      e.stopPropagation();
    });

    this.addEventListener( 'mouseUp', () => { });

    const cbSize = this.getCBScale();
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
    const cbSize = this.getCBScale();
    this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.border.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.border.fill.material.uniforms.diffuse.value.set(this.defaultColor);
  }

  buildHighlightFill(){
    super.buildHighlightFill();
    const cbSize = this.getCBScale();
    this.highlight.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlight.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.highlight.fill.material.uniforms.diffuse.value.set(this.defaultHighlightColor);
  }

  hideHighlight(){}
  hideBorder(){}
  hideFill(){}
  hideHighlightFill(){}

  updateCBVisualState(){
    const borderFillMesh = this.border.fill.mesh as THREE.Mesh;
    const borderSelectedFillMesh = this.borderSelected.fill.mesh as THREE.Mesh;
    const highlightFillMesh = this.highlight.fill.mesh as THREE.Mesh;
    const highlightSelectedFillMesh = this.highlightSelected.fill.mesh as THREE.Mesh;

    borderFillMesh.visible = false;
    borderSelectedFillMesh.visible = false;
    highlightFillMesh.visible = false;
    highlightSelectedFillMesh.visible = false;

    const cbSize = this.getCBScale();
    borderFillMesh.scale.set(cbSize, cbSize, 1);
    borderSelectedFillMesh.scale.set(cbSize, cbSize, 1);
    highlightFillMesh.scale.set(cbSize, cbSize, 1);
    highlightSelectedFillMesh.scale.set(cbSize, cbSize, 1);

    if(this.hover){
      if(this.value){
        highlightSelectedFillMesh.visible = true;
      }else{
        highlightFillMesh.visible = true;
      }
    }else{
      if(this.value){
        borderSelectedFillMesh.visible = true;
      }else{
        borderFillMesh.visible = true;
      }
    }

  }

  onHoverOut(){
    this.hover = false;
    this.pulsing = false;

    const textMaterial = this.text.material as THREE.ShaderMaterial & { uniforms: { diffuse: { value: THREE.Color } } };
    textMaterial.uniforms.diffuse.value.set(this.defaultColor);

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

    const textMaterial = this.text.material as THREE.ShaderMaterial & { uniforms: { diffuse: { value: THREE.Color } } };
    textMaterial.uniforms.diffuse.value.set(this.defaultHighlightColor);

    if(typeof this.onMouseIn === 'function')
      this.onMouseIn();

    this.updateCBVisualState();

    if(this.isClickable()){
      GameState.guiAudioEmitter.playSoundFireAndForget('gui_scroll');
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
