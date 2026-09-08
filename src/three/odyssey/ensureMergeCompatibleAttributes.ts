import * as THREE from "three";

/**
 * Three's mergeBufferGeometries requires identical attribute sets. If the first
 * geometry has an attribute later ones lack, the merge may fail or produce
 * incomplete vertex data. Pad missing attrs so every input matches the union.
 */
export function ensureMergeCompatibleAttributes(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry[] {
  if(geometries.length < 2){ return geometries; }

  const names = new Set<string>();
  for(let i = 0; i < geometries.length; i++){
    const attrs = geometries[i].attributes;
    for(const name in attrs){
      names.add(name);
    }
  }

  for(let i = 0; i < geometries.length; i++){
    const geo = geometries[i];
    const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
    if(!pos){ continue; }
    const vCount = pos.count;

    for(const name of names){
      const existing = geo.getAttribute(name) as THREE.BufferAttribute | undefined;
      if(existing && existing.count === vCount){ continue; }

      if(existing && existing.count !== vCount){
        geo.deleteAttribute(name);
      }

      const itemSize = inferItemSize(name, geometries);
      const fill = defaultFill(name, itemSize);
      const data = new Float32Array(vCount * itemSize);

      if(name === "uv2"){
        const uv = geo.getAttribute("uv") as THREE.BufferAttribute | undefined;
        if(uv && uv.count === vCount){
          data.set(uv.array as ArrayLike<number>);
        }else{
          data.fill(fill);
        }
      }else if(name === "normal"){
        // Unit +Z — computeVertexNormals after merge is heavier; +Z is safe default
        for(let v = 0; v < vCount; v++){
          data[v * 3 + 2] = 1;
        }
      }else{
        data.fill(fill);
      }

      geo.setAttribute(name, new THREE.Float32BufferAttribute(data, itemSize));
    }
  }

  return geometries;
}

function inferItemSize(name: string, geometries: THREE.BufferGeometry[]): number {
  for(let i = 0; i < geometries.length; i++){
    const attr = geometries[i].getAttribute(name) as THREE.BufferAttribute | undefined;
    if(attr){ return attr.itemSize; }
  }
  if(name === "position" || name === "normal" || name === "color"){ return 3; }
  if(name === "skinIndex" || name === "skinWeight"){ return 4; }
  return 2;
}

function defaultFill(name: string, _itemSize: number): number {
  if(name === "color" || name === "skinWeight"){ return 1; }
  return 0;
}
