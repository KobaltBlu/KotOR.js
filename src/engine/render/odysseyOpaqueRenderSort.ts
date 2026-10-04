/**
 * Opaque sort: group by program/defines then material.id, then depth.
 * Cuts useProgram thrash between similar room chunks. Transparent order unchanged.
 */
export function odysseyOpaqueRenderSort(a: any, b: any): number {
  if(a.groupOrder !== b.groupOrder){
    return a.groupOrder - b.groupOrder;
  }
  if(a.renderOrder !== b.renderOrder){
    return a.renderOrder - b.renderOrder;
  }

  const ka = odysseyProgramSortKey(a.material);
  const kb = odysseyProgramSortKey(b.material);
  if(ka !== kb){
    return ka < kb ? -1 : 1;
  }

  if(a.material.id !== b.material.id){
    return a.material.id - b.material.id;
  }
  if(a.z !== b.z){
    return a.z - b.z;
  }
  return a.id - b.id;
}

function odysseyProgramSortKey(material: any): string {
  if(!material){ return ''; }
  if(typeof material.userData?.odysseyProgramSortKey === 'string'){
    return material.userData.odysseyProgramSortKey;
  }
  const defines = material.defines;
  let key = String(material.type || '');
  if(defines && typeof defines === 'object'){
    const names = Object.keys(defines).sort();
    for(let i = 0; i < names.length; i++){
      key += `|${names[i]}`;
    }
  }
  if(material.userData){
    material.userData.odysseyProgramSortKey = key;
  }
  return key;
}
