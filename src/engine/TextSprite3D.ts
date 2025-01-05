import * as THREE from "three";
import type { ModuleArea, ModuleObject } from "../module";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { IGUIControlText } from "../interface/gui/IGUIControlText";
import { ShaderManager } from "../managers/ShaderManager";
import { createQuadElements as createIndicies } from "../utility/QuadIndices";
import { TLKManager } from "../managers/TLKManager";
import { TextureLoader } from "../loaders/TextureLoader";
import { TextureType } from "../enums/loaders/TextureType";
import { TextSprite3DType } from "../enums/engine/TextSprite3DType";
import GUIFont from "../gui/GUIFont";
import { GUIControlAlignment } from "../enums";

const itemSize = 2
const box = { min: [0, 0], max: [0, 0] }

/**
 * TextSprite3D class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TextSprite3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TextSprite3D {

  static HEIGHT: number = 0.1;

  container: THREE.Object3D = new THREE.Object3D();
  area: ModuleArea;
  owner: ModuleObject;
  target: ModuleObject;

  guiFont: GUIFont;

  text: IGUIControlText;
  color: THREE.Color = new THREE.Color(1, 1, 1);

  force: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  speed: number = 1;
  scale: number = 0.001;
  textScale: number = 1;
  wordWrap: boolean = false;
  maxLineWidth: number = Infinity;

  timer: number = 3000;
  currentTimer: number = 3000;
  ready: boolean = false;
  expired: boolean = false;
  disposed: boolean = false;
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor( text: string = '', type: TextSprite3DType = TextSprite3DType.NEUTRAL ){

    switch(type){
      case TextSprite3DType.FRIENDLY:
        this.color.setRGB(0, 1, 0);
      break;
      case TextSprite3DType.HOSTILE:
        this.color.setRGB(1, 0, 0);
      break;
      case TextSprite3DType.INFORMATION:
        this.color.setRGB(0.5, 0, 0.5);
      break;
      default:
        this.color.setRGB(1, 1, 1);
      break;
    }

    this.text = {
      color: this.color,
      font: '', //fnt_d16x16b
      strref: -1,
      text: text,
      alignment: GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter, //9 //18 //17
      pulsing: 0,
      geometry: {} as THREE.BufferGeometry,
      mesh: {} as THREE.Mesh,
      material: {} as THREE.ShaderMaterial,
      texture: {} as OdysseyTexture,
    };

    this.text.geometry = new THREE.BufferGeometry();
    this.text.geometry.index = new THREE.BufferAttribute( new Uint16Array(), 1 ).setUsage( THREE.StaticDrawUsage );

    let posAttribute = new THREE.BufferAttribute( new Float32Array(), 2 ).setUsage( THREE.StaticDrawUsage );
    let uvAttribute = new THREE.BufferAttribute( new Float32Array(), 2 ).setUsage( THREE.StaticDrawUsage );
    this.text.geometry.setAttribute( 'position', posAttribute );
    this.text.geometry.setAttribute( 'uv', uvAttribute );

    this.text.geometry.index.needsUpdate = true;
    this.text.geometry.attributes.position.needsUpdate = true;
    this.text.geometry.attributes.uv.needsUpdate = true;

    this.text.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        ShaderManager.Shaders.get('odyssey-gui')?.getUniforms()
      ]),
      vertexShader: ShaderManager.Shaders.get('odyssey-gui')?.getVertex(),
      fragmentShader: ShaderManager.Shaders.get('odyssey-gui')?.getFragment(),
      side: THREE.DoubleSide,
      transparent: true,
      fog: false,
      visible: true
    });
    
    this.text.material.defines.BILLBOARD = '';
    // this.text.material.defines.USE_SIZEATTENUATION = '';
    this.text.material.uniforms.diffuse.value = this.text.color;
    this.text.material.depthTest = false;
    this.text.material.transparent = true;
    this.text.mesh = new THREE.Mesh( this.text.geometry, this.text.material );
    this.text.mesh.frustumCulled = false;

    this.text.mesh.scale.setScalar(this.scale);

    TextureLoader.enQueue('fnt_console', this.text.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      this.guiFont = new GUIFont(texture);
      this.text.texture = texture;
      this.text.material.transparent = true;
      this.text.material.uniforms.alphaTest.value = 0;
      this.text.material.uniformsNeedUpdate = true;
      this.buildText();
      this.ready = true;
    });
    
    this.container.add(this.text.mesh);
  }

  setColor(color: THREE.Color){
    this.color.copy(color);
  }

  setTimer(timer: number = 3000){
    this.currentTimer = this.timer = timer;
  }

  update(delta: number = 0){
    if(this.expired){
      if(!this.disposed) this.dispose();
      return;
    }

    if(!this.ready) return;
    
    if(this.currentTimer <= 0){
      this.currentTimer = 0;
      this.expired = true;
      this.text.material.uniforms.opacity.value = 0;
    }else{
      // const speed = this.speed * delta;
      // this.container.position.x += this.force.x * speed;
      // this.container.position.y += this.force.y * speed;
      // this.container.position.z += this.force.z * speed;
      this.text.material.uniforms.opacity.value = (this.currentTimer/this.timer);
      this.currentTimer -= (delta * 1000);
    }
  }

  addToArea(area: ModuleArea){
    if(!area)
      return;
    area.attachTextSprite3D(this);
  }

  buildText(){
    let self = this;

    if(!this.text.texture)
      return;

    if(this.text.mesh.parent)
      this.text.mesh.parent.remove(this.text.mesh);

    this.container.add(this.text.mesh);
    
    let texture = this.text.texture;

    texture.flipY = false;
    texture.anisotropy = 1;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    if(this.text.text != '' || (this.text.strref != 0 && typeof TLKManager.TLKStrings[this.text.strref] != 'undefined'))
      this.updateTextGeometry(this.text.text != '' ? this.text.text : TLKManager.TLKStrings[this.text.strref].Value);
    
    this.text.geometry.computeBoundingSphere = function () {
      if (this.boundingSphere === null) {
        this.boundingSphere = new THREE.Sphere()
      }
    
      let positions = this.attributes.position.array
      let itemSize = this.attributes.position.itemSize
      if (!positions || !itemSize || positions.length < 2) {
        this.boundingSphere.radius = 0
        this.boundingSphere.center.set(0, 0, 0)
        return
      }
      // this.computeSphere(positions, this.boundingSphere)
      if (isNaN(this.boundingSphere.radius)) {
        console.error('THREE.BufferGeometry.computeBoundingSphere(): ' +
          'Computed radius is NaN. The ' +
          '"position" attribute is likely to have NaN values.')
      }
    }
    
    this.text.geometry.computeBoundingBox = function () {
      if (this.boundingBox === null) {
        this.boundingBox = new THREE.Box3()
      }
    
      let bbox = this.boundingBox
      let positions = this.attributes.position.array
      let itemSize = this.attributes.position.itemSize
      if (!positions || !itemSize || positions.length < 2) {
        bbox.makeEmpty()
        return
      }
      self.computeBox(positions, bbox)
    }

    // this.text.geometry.computeBoundingBox();
    // this.text.geometry.computeBoundingSphere();
    // const tSize = new THREE.Vector3();
    // this.text.geometry.boundingBox.getSize(tSize);
    // this.text.mesh.position.x = -tSize.x/2;
  }

  updateTextGeometry(text: string){
    if(!(this.text.texture instanceof THREE.Texture))
      return;

    if(!this.guiFont)
      return;
    
    this.guiFont.buildGeometry(this.text.geometry, text, this.text.alignment);
  }

  bounds(positions: number[] = []) {
    let count = positions.length / itemSize
    box.min[0] = positions[0]
    box.min[1] = positions[1]
    box.max[0] = positions[0]
    box.max[1] = positions[1]

    for (let i = 0; i < count; i++) {
      let x = positions[i * itemSize + 0]
      let y = positions[i * itemSize + 1]
      box.min[0] = Math.min(x, box.min[0])
      box.min[1] = Math.min(y, box.min[1])
      box.max[0] = Math.max(x, box.max[0])
      box.max[1] = Math.max(y, box.max[1])
    }
  }

  computeBox(positions: number[] = [], output: THREE.Box3) {
    this.bounds(positions)
    output.min.set(box.min[0], box.min[1], 0)
    output.max.set(box.max[0], box.max[1], 0)
  }
  

  dispose(){
    if(this.disposed) return;
    this.disposed = true;

    this.text.geometry.dispose();
    this.text.material.dispose();
    if(this.text.mesh) this.text.mesh.removeFromParent();
    this.container.removeFromParent();
  }

  static CreateOnObject(object: ModuleObject, text: string = '', type: TextSprite3DType = TextSprite3DType.NEUTRAL, timer: number = 3000){
    if(!object) return;

    if(object.area){
      const textSprite = new TextSprite3D(text, type);
      textSprite.setTimer(timer);
      textSprite.owner = object;
      const reticleNode = object.getReticleNode();
      if(reticleNode){
        reticleNode.getWorldPosition(textSprite.container.position);
      }
      textSprite.container.position.z += 0.25;
      textSprite.setInitialPosition(textSprite.container.position);
      textSprite.addToArea(object.area);
      return textSprite;
    }

  }

  setInitialPosition(position: THREE.Vector3) {
    this.position.copy(position);
  }

}