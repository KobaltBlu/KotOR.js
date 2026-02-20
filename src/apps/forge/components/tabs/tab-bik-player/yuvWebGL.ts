/**
 * WebGL YUV (4:2:0) renderer — same approach as VideoManager: upload Y/U/V textures,
 * convert to RGB in fragment shader. No CPU-side pixel loop.
 */

import type { YUVFrame } from "../../../../../video/binkvideo";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
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

const QUAD_POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const QUAD_TEXCOORDS = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

export interface YUVWebGLState {
  gl: WebGLRenderingContext;
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

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  gl.shaderSource(vs, VERTEX_SHADER);
  gl.shaderSource(fs, FRAGMENT_SHADER);
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
  gl: WebGLRenderingContext,
  width: number,
  height: number
): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, null);
  return tex;
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

  const gl = canvas.getContext("webgl", { alpha: false, premultipliedAlpha: false });
  if (!gl) return null;

  if (prev && prev.width === width && prev.height === height && prev.linesizeY === linesizeY) {
    return prev;
  }

  if (prev) {
    gl.deleteTexture(prev.yTex);
    gl.deleteTexture(prev.uTex);
    gl.deleteTexture(prev.vTex);
    gl.deleteBuffer(prev.posBuf);
    gl.deleteBuffer(prev.uvBuf);
  }

  const program = prev?.program ?? createProgram(gl);
  if (!program) return null;

  const yTex = createTexture(gl, linesizeY, height);
  const uTex = createTexture(gl, linesizeU, chromaH);
  const vTex = createTexture(gl, linesizeV, chromaH);
  if (!yTex || !uTex || !vTex) return null;

  const posBuf = gl.createBuffer();
  const uvBuf = gl.createBuffer();
  if (!posBuf || !uvBuf) return null;

  return {
    gl,
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
  const { gl, program, yTex, uTex, vTex, posBuf, uvBuf, width, height, linesizeY, linesizeU, chromaH } = state;
  const { y, u, v, linesizeV } = frame;

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, yTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, linesizeY, height, gl.LUMINANCE, gl.UNSIGNED_BYTE, y);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, uTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, linesizeU, chromaH, gl.LUMINANCE, gl.UNSIGNED_BYTE, u);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, vTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, linesizeV, chromaH, gl.LUMINANCE, gl.UNSIGNED_BYTE, v);

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
