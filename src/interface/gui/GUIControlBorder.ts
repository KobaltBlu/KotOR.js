export interface GUIControlBorderFill {
  texture: string,
  material: THREE.ShaderMaterial,
  mesh: THREE.Mesh,
  geometry: THREE.BufferGeometry
}

export interface GUIControlBorder {
  color: THREE.Color,
  corner: string,
  corner_material: THREE.ShaderMaterial,
  edge: string,
  edge_material: THREE.ShaderMaterial,
  fill: GUIControlBorderFill,
  fillstyle: number,
  geometry: THREE.BufferGeometry,
  mesh: THREE.Mesh,
  dimension: number,
  inneroffset: number,
  inneroffsety: number,
  pulsing: number
}