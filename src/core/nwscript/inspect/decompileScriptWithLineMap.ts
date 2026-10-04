/**
 * Shared decompile + line-map helper for debugger / Forge.
 * Cached by a simple bytecode hash so same-name scripts with different bodies do not collide.
 */

import type { NCSProgram } from "@core/nwscript/NCSProgram";
import { NWScriptDecompiler, type NWScriptDecompileResult } from "@core/nwscript/decompiler/NWScriptDecompiler";
import { createEmptyNssCodeLineMap } from "@core/nwscript/inspect/nssCodeLineMap";

const cache = new Map<string, NWScriptDecompileResult>();

function hashBytes(bytes: Uint8Array | undefined | null): string {
  if(!bytes || !bytes.length) return 'empty';
  // FNV-1a 32-bit over a stride for speed on large scripts
  let hash = 0x811c9dc5;
  const stride = Math.max(1, Math.floor(bytes.length / 4096));
  for(let i = 0; i < bytes.length; i += stride){
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= bytes.length;
  return (hash >>> 0).toString(16) + ':' + bytes.length;
}

export function decompileScriptWithLineMap(script: NCSProgram): NWScriptDecompileResult {
  const key = `${script.name || 'anonymous'}|${hashBytes(script.code)}`;
  const cached = cache.get(key);
  if(cached) return cached;

  try {
    const result = new NWScriptDecompiler(script).decompileWithLineMap();
    cache.set(key, result);
    return result;
  } catch (error) {
    const failed: NWScriptDecompileResult = {
      nss: `// Decompilation failed: ${error instanceof Error ? error.message : String(error)}`,
      lineMap: createEmptyNssCodeLineMap(),
      functions: [],
    };
    cache.set(key, failed);
    return failed;
  }
}

export function clearDecompileScriptCache() {
  cache.clear();
}
