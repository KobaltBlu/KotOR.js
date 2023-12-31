import { OdysseyTexture } from "../../three/odyssey/OdysseyTexture";

export interface GUIControlText {
  color: THREE.Color,
  font: string, //fnt_d16x16b
  strref: number,
  text: string,
  alignment: number, //9 //18 //17
  pulsing: number

  geometry: THREE.BufferGeometry,
  material: THREE.ShaderMaterial,
  mesh: THREE.Mesh,
  texture: OdysseyTexture,
}