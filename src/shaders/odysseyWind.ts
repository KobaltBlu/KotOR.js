/**
 * Shared Odyssey wind sampling GLSL (ES 1.00 / WebGL1, or std140 UBO on WebGL2).
 * 16×16 noise grid, quaternion deviation, Chebyshev point gusts.
 */
export const ODYSSEY_WIND_VERTEX_LIBRARY = `
#ifndef ODYSSEY_WIND_LIBRARY_INCLUDED
#define ODYSSEY_WIND_LIBRARY_INCLUDED

const int ODYSSEY_WIND_MAX_POINT_SOURCES = 16;

uniform sampler2D windNoiseMap;

#ifdef USE_ODYSSEY_WIND_UBO
layout(std140) uniform OdysseyWind {
  vec3 windGlobal;
  vec3 windDelta;
  vec2 windMaxDeviation;
  float windNoiseAlpha;
  int windPointSourceCount;
  vec4 windPointSources[ODYSSEY_WIND_MAX_POINT_SOURCES];
  vec4 windPointStrengths4[ODYSSEY_WIND_MAX_POINT_SOURCES];
};
#define windPointStrengths_xy(i) (windPointStrengths4[i].xy)
#else
uniform float windNoiseAlpha;
uniform vec3 windGlobal;
uniform vec3 windDelta;
uniform vec2 windMaxDeviation;
uniform int windPointSourceCount;
uniform vec4 windPointSources[ODYSSEY_WIND_MAX_POINT_SOURCES];
uniform vec2 windPointStrengths[ODYSSEY_WIND_MAX_POINT_SOURCES];
#define windPointStrengths_xy(i) windPointStrengths[i]
#endif

float odyssey_wind_noise_index(float coord) {
  float i = floor(coord);
  i = mod(abs(i * 4.0), 16.0);
  return i;
}

float odyssey_sample_noise_field(vec2 worldXZ, float fieldSelect) {
  float ix = odyssey_wind_noise_index(worldXZ.x);
  float iy = odyssey_wind_noise_index(worldXZ.y);
  vec2 uv = (vec2(ix, iy) + 0.5) / 16.0;
  vec4 texel = texture2D(windNoiseMap, uv);
  return mix(texel.r, texel.g, fieldSelect);
}

float odyssey_sample_blended_noise(vec2 worldXZ) {
  return mix(
    odyssey_sample_noise_field(worldXZ, 0.0),
    odyssey_sample_noise_field(worldXZ, 1.0),
    windNoiseAlpha
  );
}

float odyssey_wind_lut_cos(float angle) {
  float idx = mod(floor(angle / 0.196349540849362) + 0.5, 32.0);
  float t = idx / 32.0;
  return cos(t * 6.28318530718);
}

float odyssey_wind_lut_sin(float angle) {
  float idx = mod(floor(angle / 0.196349540849362) + 0.5, 32.0);
  float t = idx / 32.0;
  return sin(t * 6.28318530718);
}

vec3 odyssey_rotate_vector_by_wind_quat(vec3 v, float horizontalDev, float verticalDev) {
  float hc = odyssey_wind_lut_cos(horizontalDev);
  float hs = odyssey_wind_lut_sin(horizontalDev);
  float vc = odyssey_wind_lut_cos(verticalDev);
  float vs = odyssey_wind_lut_sin(verticalDev);

  float qw = vc * hc;
  float qx = vc * hs;
  float qy = vs * hc;
  float qz = -vs * hs;

  vec3 u = vec3(qx, qy, qz);
  float s = qw;
  return 2.0 * dot(u, v) * u + (s * s - dot(u, u)) * v + 2.0 * s * cross(u, v);
}

vec3 odyssey_wind_apply_deviation(vec3 base, vec2 worldXZ, float noise) {
  float horizontalDev = 0.0;
  if (abs(windMaxDeviation.x) > 1e-6) {
    horizontalDev = ((noise * 2.0) * windMaxDeviation.x - windMaxDeviation.x) * 0.5;
  }

  float verticalDev = 0.0;
  if (abs(windMaxDeviation.y) > 1e-6) {
    float noiseV = odyssey_sample_blended_noise(vec2(worldXZ.y, worldXZ.x));
    verticalDev = ((noiseV * 2.0) * windMaxDeviation.y - windMaxDeviation.y) * 0.5;
  }

  return odyssey_rotate_vector_by_wind_quat(base, horizontalDev, verticalDev);
}

vec3 odyssey_point_source_wind(vec3 worldPos) {
  vec3 result = vec3(0.0);
  for (int i = 0; i < ODYSSEY_WIND_MAX_POINT_SOURCES; i++) {
    if (i >= windPointSourceCount) break;

    vec4 src = windPointSources[i];
    vec2 strengthData = windPointStrengths_xy(i);
    vec3 delta = worldPos - src.xyz;
    float d = max(max(abs(delta.x), abs(delta.y)), abs(delta.z));

    if (d < src.w) {
      float invLen = inversesqrt(dot(delta, delta) + 1e-8);
      vec3 direction = delta * invLen;
      float falloff = ((src.w - d) / src.w) * strengthData.x;
      result += direction * falloff;
    }
  }
  return result;
}

vec3 odyssey_get_global_wind_no_point(vec3 worldPos, float scale) {
  if (length(windGlobal) < 1e-6) {
    return vec3(0.0);
  }

  vec2 worldXZ = worldPos.xz;
  float noise = odyssey_sample_blended_noise(worldXZ);
  vec3 base = windGlobal * (scale * noise);
  return odyssey_wind_apply_deviation(base, worldXZ, noise);
}

vec3 odyssey_get_global_wind(vec3 worldPos, float scale) {
  vec2 worldXZ = worldPos.xz;
  float noise = odyssey_sample_blended_noise(worldXZ);
  vec3 base = windGlobal * (scale * noise) + odyssey_point_source_wind(worldPos);

  if (length(base) < 1e-6 && length(windGlobal) < 1e-6) {
    return vec3(0.0);
  }

  return odyssey_wind_apply_deviation(base, worldXZ, noise);
}
#endif
`;
