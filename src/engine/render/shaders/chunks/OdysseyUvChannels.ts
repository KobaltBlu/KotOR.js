/**
 * r151+ `#include <uv_vertex>` references MAP_UV / LIGHTMAP_UV / … which
 * WebGLPrograms only injects when material.map / material.lightMap exist.
 * Odyssey ShaderMaterials bind samplers via uniforms — pin the same attribute
 * names here so those chunks compile without mirroring textures onto the material.
 *
 * Include this string before `#include <uv_vertex>` (and after any USE_* defines
 * that may already be set on the material).
 */
export const ODYSSEY_UV_CHANNEL_DEFINES = /* glsl */`
#ifdef USE_MAP
  #ifndef MAP_UV
    #define MAP_UV uv
  #endif
#endif
#ifdef USE_ALPHAMAP
  #ifndef ALPHAMAP_UV
    #define ALPHAMAP_UV uv
  #endif
#endif
#ifdef USE_LIGHTMAP
  #ifndef LIGHTMAP_UV
    #define LIGHTMAP_UV uv1
  #endif
#endif
#ifdef USE_BUMPMAP
  #ifndef BUMPMAP_UV
    #define BUMPMAP_UV uv
  #endif
#endif
#ifdef USE_NORMALMAP
  #ifndef NORMALMAP_UV
    #define NORMALMAP_UV uv
  #endif
#endif
#ifdef USE_DISPLACEMENTMAP
  #ifndef DISPLACEMENTMAP_UV
    #define DISPLACEMENTMAP_UV uv
  #endif
#endif
#ifdef USE_AOMAP
  #ifndef AOMAP_UV
    #define AOMAP_UV uv1
  #endif
#endif
#ifdef USE_EMISSIVEMAP
  #ifndef EMISSIVEMAP_UV
    #define EMISSIVEMAP_UV uv
  #endif
#endif
#ifdef USE_SPECULARMAP
  #ifndef SPECULARMAP_UV
    #define SPECULARMAP_UV uv
  #endif
#endif
`;
