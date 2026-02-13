//source: https://github.com/shama/dtype/blob/master/index.js
const dtype = function(dtype: string) {
  switch (dtype) {
    case 'int8':
      return Int8Array
    case 'int16':
      return Int16Array
    case 'int32':
      return Int32Array
    case 'uint8':
      return Uint8Array
    case 'uint16':
      return Uint16Array
    case 'uint32':
      return Uint32Array
    case 'float32':
      return Float32Array
    case 'float64':
      return Float64Array
    case 'array':
      return Array
    case 'uint8_clamped':
      return Uint8ClampedArray
  }
};


//source: https://github.com/hughsk/an-array/blob/master/index.js
const str = Object.prototype.toString;
const anArray = function (arr: unknown): arr is number[] | Uint8Array | ArrayBufferView {
  if (!arr || typeof arr !== 'object') return false;
  const a = arr as ArrayBufferView & { BYTES_PER_ELEMENT?: number; buffer?: ArrayBuffer };
  return (a.BYTES_PER_ELEMENT !== undefined && str.call(a.buffer) === '[object ArrayBuffer]') || Array.isArray(arr);
};

const isBuffer = function (obj: unknown): boolean {
  const o = obj as { constructor?: { isBuffer?(x: unknown): boolean } } | null;
  return o != null && o.constructor != null
    && typeof o.constructor.isBuffer === 'function'
    && Boolean(o.constructor.isBuffer(obj));
};

const CW = [0, 2, 3];
const CCW = [2, 1, 3];

export interface IQuadIndicesOptions {
  count?: number;
  type?: string;
  start?: number;
  clockwise?: boolean;
}

export function createQuadElements(
  array: number[] | Uint8Array | ArrayBufferView | null,
  opt?: number | IQuadIndicesOptions
): Uint8Array | Uint16Array | Uint32Array | null {
  let arr: number[] | Uint8Array | ArrayBufferView | null = array;
  let options: IQuadIndicesOptions = typeof opt === 'number' ? { count: opt } : (opt || {});

  if (!arr || !(anArray(arr) || isBuffer(arr))) {
    options = (arr as IQuadIndicesOptions) || {};
    arr = null;
  }

  if (typeof opt === 'number') {
    options = { count: opt };
  } else {
    options = opt || {};
  }

  const type = typeof options.type === 'string' ? options.type : 'uint16';
  const count = typeof options.count === 'number' ? options.count : 1;
  const start = options.start ?? 0;

  const dir = options.clockwise !== false ? CW : CCW;
  const a = dir[0];
  const b = dir[1];
  const c = dir[2];

  const numIndices = count * 6;
  const ArrayCtor = dtype(type) as new (len: number) => Uint8Array | Uint16Array | Uint32Array;
  const indices = arr ?? new ArrayCtor(numIndices);
  for (let i = 0, j = 0; i < numIndices; i += 6, j += 4) {
    const x = i + start;
    indices[x + 0] = j + 0;
    indices[x + 1] = j + 1;
    indices[x + 2] = j + 2;
    indices[x + 3] = j + a;
    indices[x + 4] = j + b;
    indices[x + 5] = j + c;
  }
  return indices as Uint8Array | Uint16Array | Uint32Array;
}