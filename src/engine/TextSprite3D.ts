import * as THREE from "three";

import { GUIControlAlignment } from "@/enums";
import { TextSprite3DType } from "@/enums/engine/TextSprite3DType";
import { TextureType } from "@/enums/loaders/TextureType";
import { GUIFont } from "@/gui/GUIFont";
import { IGUIControlText } from "@/interface/gui/IGUIControlText";
import { TextureLoader } from "@/loaders/TextureLoader";
import { ShaderManager } from "@/managers/ShaderManager";
import { TLKManager } from "@/managers/TLKManager";
import type { ModuleArea, ModuleObject } from "@/module";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

const itemSize = 2;
const box: { min: number[]; max: number[] } = { min: [0, 0], max: [0, 0] };

/**
 * TextSprite3D class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file TextSprite3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/** Used by custom computeBoundingBox to call back into TextSprite3D.computeBox without aliasing this. */
const geometryOwnerMap = new WeakMap<THREE.BufferGeometry, TextSprite3D>();

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

    const geometry = new THREE.BufferGeometry();
    geometry.index = new THREE.BufferAttribute(new Uint16Array(), 1).setUsage(THREE.StaticDrawUsage);
    const posAttribute = new THREE.BufferAttribute(new Float32Array(), 2).setUsage(THREE.StaticDrawUsage);
    const uvAttribute = new THREE.BufferAttribute(new Float32Array(), 2).setUsage(THREE.StaticDrawUsage);
    geometry.setAttribute('position', posAttribute);
    geometry.setAttribute('uv', uvAttribute);
    geometry.index.needsUpdate = true;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.uv.needsUpdate = true;

    const odysseyGuiU = ShaderManager.Shaders.get('odyssey-gui')?.getUniforms();
    const odysseyGuiUniforms: Record<string, THREE.IUniform> = Array.isArray(odysseyGuiU)
      ? (THREE.UniformsUtils.merge(odysseyGuiU) as Record<string, THREE.IUniform>)
      : (THREE.UniformsUtils.merge(odysseyGuiU ? [odysseyGuiU] : []) as Record<string, THREE.IUniform>);
    const material = new THREE.ShaderMaterial({
      uniforms: odysseyGuiUniforms,
      vertexShader: ShaderManager.Shaders.get('odyssey-gui')?.getVertex(),
      fragmentShader: ShaderManager.Shaders.get('odyssey-gui')?.getFragment(),
      side: THREE.DoubleSide,
      transparent: true,
      fog: false,
      visible: true,
    });
    material.defines.BILLBOARD = '';
    material.uniforms.diffuse.value = this.color;
    material.depthTest = false;
    material.transparent = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.scale.setScalar(this.scale);

    const texturePlaceholder: OdysseyTexture = {} as OdysseyTexture;
    this.text = {
      color: this.color,
      font: '',
      strref: -1,
      text,
      alignment: GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter,
      pulsing: 0,
      geometry,
      material,
      mesh,
      texture: texturePlaceholder,
    };

    TextureLoader.enQueue('fnt_console', material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      this.guiFont = new GUIFont(texture);
      this.text.texture = texture;
      const mat: THREE.ShaderMaterial = this.text.material as THREE.ShaderMaterial;
      mat.transparent = true;
      mat.uniforms.alphaTest.value = 0;
      mat.uniformsNeedUpdate = true;
      this.buildText();
      this.ready = true;
    });

    this.container.add(this.text.mesh as THREE.Object3D);
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

    const mat: THREE.ShaderMaterial = this.text.material as THREE.ShaderMaterial;
    if (this.currentTimer <= 0) {
      this.currentTimer = 0;
      this.expired = true;
      mat.uniforms.opacity.value = 0;
    } else {
      mat.uniforms.opacity.value = this.currentTimer / this.timer;
      this.currentTimer -= delta * 1000;
    }
  }

  addToArea(area: ModuleArea){
    if(!area)
      return;
    area.attachTextSprite3D(this);
  }

  buildText(): void {
    if (!this.text.texture)
      return;

    const mesh: THREE.Mesh = this.text.mesh as THREE.Mesh;
    if (mesh.parent)
      mesh.parent.remove(mesh);
    this.container.add(mesh as THREE.Object3D);

    const texture = this.text.texture;

    texture.flipY = false;
    texture.anisotropy = 1;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    if (this.text.text !== '' || (this.text.strref !== 0 && typeof TLKManager.TLKStrings[this.text.strref] !== 'undefined'))
      this.updateTextGeometry(this.text.text !== '' ? this.text.text : TLKManager.TLKStrings[this.text.strref].Value);

    const geometry: THREE.BufferGeometry = this.text.geometry as THREE.BufferGeometry;
    geometryOwnerMap.set(geometry, this);

    geometry.computeBoundingSphere = function computeBoundingSphere(this: THREE.BufferGeometry): void {
      if (this.boundingSphere === null) {
        this.boundingSphere = new THREE.Sphere();
      }
      const positions = this.attributes.position?.array;
      const attrItemSize = this.attributes.position?.itemSize;
      if (!positions || attrItemSize === undefined || positions.length < 2) {
        this.boundingSphere.radius = 0;
        this.boundingSphere.center.set(0, 0, 0);
        return;
      }
      if (isNaN(this.boundingSphere.radius)) {
        log.error('THREE.BufferGeometry.computeBoundingSphere(): ' +
          'Computed radius is NaN. The ' +
          '"position" attribute is likely to have NaN values.');
      }
    };

    geometry.computeBoundingBox = function computeBoundingBox(this: THREE.BufferGeometry): void {
      if (this.boundingBox === null) {
        this.boundingBox = new THREE.Box3();
      }
      const bbox = this.boundingBox;
      const positions = this.attributes.position?.array as Float32Array | undefined;
      const attrItemSize = this.attributes.position?.itemSize;
      if (!positions || attrItemSize === undefined || positions.length < 2) {
        bbox.makeEmpty();
        return;
      }
      const owner = geometryOwnerMap.get(this);
      if (owner)
        owner.computeBox(Array.from(positions), bbox);
    };

    // this.text.geometry.computeBoundingBox();
    // this.text.geometry.computeBoundingSphere();
    // const tSize = new THREE.Vector3();
    // this.text.geometry.boundingBox.getSize(tSize);
    // this.text.mesh.position.x = -tSize.x/2;
  }

  updateTextGeometry(text: string): void {
    if (!(this.text.texture instanceof THREE.Texture))
      return;
    if (!this.guiFont)
      return;
    const geom: THREE.BufferGeometry = this.text.geometry as THREE.BufferGeometry;
    this.guiFont.buildGeometry(geom, text, this.text.alignment);
  }

  bounds(positions: number[] = []) {
    const count = positions.length / itemSize
    box.min[0] = positions[0]
    box.min[1] = positions[1]
    box.max[0] = positions[0]
    box.max[1] = positions[1]

    for (let i = 0; i < count; i++) {
      const x = positions[i * itemSize + 0]
      const y = positions[i * itemSize + 1]
      box.min[0] = Math.min(x, box.min[0])
      box.min[1] = Math.min(y, box.min[1])
      box.max[0] = Math.max(x, box.max[0])
      box.max[1] = Math.max(y, box.max[1])
    }
  }

  computeBox(positions: number[] = [], output: THREE.Box3): void {
    this.bounds(positions);
    output.min.set(box.min[0], box.min[1], 0);
    output.max.set(box.max[0], box.max[1], 0);
  }


  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const geom: THREE.BufferGeometry = this.text.geometry as THREE.BufferGeometry;
    const mesh: THREE.Mesh = this.text.mesh as THREE.Mesh;
    geometryOwnerMap.delete(geom);
    geom.dispose();
    (this.text.material as THREE.ShaderMaterial).dispose();
    if (mesh)
      mesh.removeFromParent();
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
