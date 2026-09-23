/**
 * WebGL YUV (4:2:0) renderer — same approach as VideoManager: upload Y/U/V textures,
 * convert to RGB in fragment shader. No CPU-side pixel loop.
 *
 * Prefers WebGL2 (GLSL ES 3.00 + R8) with WebGL1 (GLSL ES 1.00 + LUMINANCE) fallback.
 */

import type { YUVFrame } from "@/video/binkvideo";

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const VERTEX_SHADER_GLSL1 = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_GLSL1 = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_yTex;
  uniform sampler2D u_uTex;
  uniform sampler2D u_vTex;
  uniform vec2 u_yScale;
  uniform vec2 u_uvScale;
  void main() {
    vec2 yCoord = vec2(v_texCoord.x * u_yScale.x, v_texCoord.y);
    float y = texture2D(u_yTex, yCoord).r;
    vec2 uvCoord = vec2(v_texCoord.x * u_uvScale.x, v_texCoord.y);
    float u = texture2D(u_uTex, uvCoord).r;
    float v = texture2D(u_vTex, uvCoord).r;
    vec3 R_cf = vec3(1.164383,  0.000000,  1.596027);
    vec3 G_cf = vec3(1.164383, -0.391762, -0.812968);
    vec3 B_cf = vec3(1.164383,  2.017232,  0.000000);
    vec3 offset = vec3(-0.0625, -0.5, -0.5);
    vec3 yuv = vec3(y, u, v) + offset;
    gl_FragColor = vec4(
      dot(yuv, R_cf),
      dot(yuv, G_cf),
      dot(yuv, B_cf),
      1.0
    );
    gl_FragColor = clamp(gl_FragColor, 0.0, 1.0);
  }
`;

const VERTEX_SHADER_GLSL3 = `#version 300 es
  in vec2 a_position;
  in vec2 a_texCoord;
  out vec2 v_texCoord;
  void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_GLSL3 = `#version 300 es
  precision mediump float;
  in vec2 v_texCoord;
  uniform sampler2D u_yTex;
  uniform sampler2D u_uTex;
  uniform sampler2D u_vTex;
  uniform vec2 u_yScale;
  uniform vec2 u_uvScale;
  out vec4 fragColor;
  void main() {
    vec2 yCoord = vec2(v_texCoord.x * u_yScale.x, v_texCoord.y);
    float y = texture(u_yTex, yCoord).r;
    vec2 uvCoord = vec2(v_texCoord.x * u_uvScale.x, v_texCoord.y);
    float u = texture(u_uTex, uvCoord).r;
    float v = texture(u_vTex, uvCoord).r;
    vec3 R_cf = vec3(1.164383,  0.000000,  1.596027);
    vec3 G_cf = vec3(1.164383, -0.391762, -0.812968);
    vec3 B_cf = vec3(1.164383,  2.017232,  0.000000);
    vec3 offset = vec3(-0.0625, -0.5, -0.5);
    vec3 yuv = vec3(y, u, v) + offset;
    fragColor = clamp(vec4(
      dot(yuv, R_cf),
      dot(yuv, G_cf),
      dot(yuv, B_cf),
      1.0
    ), 0.0, 1.0);
  }
`;

const QUAD_POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const QUAD_TEXCOORDS = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

export interface YUVWebGLState {
  gl: GL;
  isWebGL2: boolean;
  program: WebGLProgram;
  yTex: WebGLTexture;
  uTex: WebGLTexture;
  vTex: WebGLTexture;
  posBuf: WebGLBuffer;
  uvBuf: WebGLBuffer;
  width: number;
  height: number;
  linesizeY: number;
  linesizeU: number;
  chromaH: number;
}

function isWebGL2Context(gl: GL): gl is WebGL2RenderingContext {
  return typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
}

/** Internal format / format pair for single-channel YUV plane uploads. */
function planeFormats(gl: GL, webgl2: boolean): { internal: number; format: number } {
  if (webgl2) {
    const gl2 = gl as WebGL2RenderingContext;
    return { internal: gl2.R8, format: gl2.RED };
  }
  return { internal: gl.LUMINANCE, format: gl.LUMINANCE };
}

function createProgram(gl: GL, webgl2: boolean): WebGLProgram | null {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  gl.shaderSource(vs, webgl2 ? VERTEX_SHADER_GLSL3 : VERTEX_SHADER_GLSL1);
  gl.shaderSource(fs, webgl2 ? FRAGMENT_SHADER_GLSL3 : FRAGMENT_SHADER_GLSL1);
  gl.compileShader(vs);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS) || !gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    return null;
  }
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return program;
}

function createTexture(
  gl: GL,
  width: number,
  height: number,
  webgl2: boolean
): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  const { internal, format } = planeFormats(gl, webgl2);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, gl.UNSIGNED_BYTE, null);
  return tex;
}

function acquireGL(canvas: HTMLCanvasElement): GL | null {
  const attrs: WebGLContextAttributes = { alpha: false, premultipliedAlpha: false };
  return (
    (canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null) ??
    (canvas.getContext("webgl", attrs) as WebGLRenderingContext | null)
  );
}

/**
 * Initialize or resize WebGL state for the given frame dimensions.
 * Reuses existing textures if dimensions match.
 */
export function ensureYUVWebGL(
  canvas: HTMLCanvasElement,
  frame: YUVFrame,
  prev: YUVWebGLState | null
): YUVWebGLState | null {
  const { width, height, linesizeY, linesizeU, linesizeV } = frame;
  const chromaH = (height + 1) >> 1;

  const gl = prev?.gl ?? acquireGL(canvas);
  if (!gl) return null;
  const webgl2 = isWebGL2Context(gl);

  if (
    prev &&
    prev.width === width &&
    prev.height === height &&
    prev.linesizeY === linesizeY &&
    prev.linesizeU === linesizeU
  ) {
    return prev;
  }

  if (prev) {
    gl.deleteTexture(prev.yTex);
    gl.deleteTexture(prev.uTex);
    gl.deleteTexture(prev.vTex);
    gl.deleteBuffer(prev.posBuf);
    gl.deleteBuffer(prev.uvBuf);
  }

  const program = prev?.program ?? createProgram(gl, webgl2);
  if (!program) return null;

  const yTex = createTexture(gl, linesizeY, height, webgl2);
  const uTex = createTexture(gl, linesizeU, chromaH, webgl2);
  const vTex = createTexture(gl, linesizeV, chromaH, webgl2);
  if (!yTex || !uTex || !vTex) return null;

  const posBuf = gl.createBuffer();
  const uvBuf = gl.createBuffer();
  if (!posBuf || !uvBuf) return null;

  return {
    gl,
    isWebGL2: webgl2,
    program,
    yTex,
    uTex,
    vTex,
    posBuf,
    uvBuf,
    width,
    height,
    linesizeY,
    linesizeU,
    chromaH,
  };
}

/**
 * Upload YUV frame to textures and draw to the canvas. Canvas size must already be set.
 */
export function drawYUVFrame(state: YUVWebGLState, frame: YUVFrame): void {
  const { gl, isWebGL2, program, yTex, uTex, vTex, posBuf, uvBuf, width, height, linesizeY, linesizeU, chromaH } = state;
  const { y, u, v, linesizeV } = frame;
  const { format } = planeFormats(gl, isWebGL2);

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, yTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, linesizeY, height, format, gl.UNSIGNED_BYTE, y);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, uTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, linesizeU, chromaH, format, gl.UNSIGNED_BYTE, u);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, vTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, linesizeV, chromaH, format, gl.UNSIGNED_BYTE, v);

  const yScaleX = width / linesizeY;
  const uvScaleX = (width >> 1) / linesizeU;

  const locYTex = gl.getUniformLocation(program, "u_yTex");
  const locUTex = gl.getUniformLocation(program, "u_uTex");
  const locVTex = gl.getUniformLocation(program, "u_vTex");
  const locYScale = gl.getUniformLocation(program, "u_yScale");
  const locUVScale = gl.getUniformLocation(program, "u_uvScale");

  gl.uniform1i(locYTex, 0);
  gl.uniform1i(locUTex, 1);
  gl.uniform1i(locVTex, 2);
  gl.uniform2f(locYScale, yScaleX, 1);
  gl.uniform2f(locUVScale, uvScaleX, 1);

  const posLoc = gl.getAttribLocation(program, "a_position");
  const uvLoc = gl.getAttribLocation(program, "a_texCoord");

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_TEXCOORDS, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
