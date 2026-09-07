/**
 * Helpers for comparing KotOR.js NCS output against nwnnsscomp (secondary oracle).
 * Bytecode conventions (#loader, #globals, STORE_STATE 0x2C/0x10, NCS V1.0)
 * still apply; treat EE and nwnnsscomp as oracles that can disagree.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { NWScriptParser } from '@/nwscript/compiler/NWScriptParser';
import { NWScriptCompiler } from '@/nwscript/compiler/NWScriptCompiler';

import { REPO_ROOT } from '@/tests/helpers/paths';

export type MismatchClass = 'A' | 'B' | 'C';

export type CompileCompareResult = {
  name: string;
  kotor: Uint8Array;
  oracle: Uint8Array;
  equal: boolean;
  /** Short note; class B = smell-test keep KotOR / reject oracle */
  classification?: MismatchClass;
  note?: string;
};

export const NWNNSSCOMP = path.join(REPO_ROOT, 'exports/k1/scripts/nwnnsscomp.exe');
export const NWSCRIPT_NSS = path.join(REPO_ROOT, 'exports/k1/scripts/nwscript.nss');

let cachedParser: NWScriptParser | null = null;

export function getNwscriptSource(): string {
  return fs.readFileSync(NWSCRIPT_NSS, 'utf8');
}

export function getSharedParser(): NWScriptParser {
  if (!cachedParser) {
    cachedParser = new NWScriptParser(getNwscriptSource());
  }
  return cachedParser.clone();
}

export function compileKotOR(source: string): { ncs: Uint8Array; errors: any[] } {
  const parser = getSharedParser();
  parser.parseScript(source);
  if (parser.errors.length) {
    return { ncs: new Uint8Array(0), errors: [...parser.errors] };
  }
  const compiler = new NWScriptCompiler(parser.program as any);
  const ncs = compiler.compile() ?? new Uint8Array(0);
  return { ncs: ncs instanceof Uint8Array ? ncs : new Uint8Array(ncs as any), errors: [...compiler.errors] };
}

export function compileNwnnsscomp(source: string, game = 1): Uint8Array {
  if (!fs.existsSync(NWNNSSCOMP)) {
    throw new Error(`nwnnsscomp not found: ${NWNNSSCOMP}`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kjs-ncs-'));
  try {
    const nssPath = path.join(dir, 'fixture.nss');
    const ncsPath = path.join(dir, 'fixture.ncs');
    fs.writeFileSync(nssPath, source, 'utf8');
    // nwnnsscomp looks up nwscript.nss beside the input / via game path; copy next to fixture.
    fs.copyFileSync(NWSCRIPT_NSS, path.join(dir, 'nwscript.nss'));
    execFileSync(
      NWNNSSCOMP,
      ['-c', '-g', String(game), '-o', ncsPath, nssPath],
      { cwd: dir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    if (!fs.existsSync(ncsPath)) {
      throw new Error(`nwnnsscomp produced no .ncs for ${nssPath}`);
    }
    return new Uint8Array(fs.readFileSync(ncsPath));
  } catch (e: any) {
    const msg = e?.stderr || e?.message || String(e);
    throw new Error(`nwnnsscomp failed: ${msg}`);
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function hexDump(buf: Uint8Array, max = 96): string {
  const slice = buf.slice(0, max);
  const hex = [...slice].map((b) => b.toString(16).padStart(2, '0')).join(' ');
  return buf.length > max ? `${hex} … (${buf.length} bytes)` : `${hex} (${buf.length} bytes)`;
}

/** Compare KotOR.js vs nwnnsscomp; optional classification for known divergences. */
export function compareFixture(
  name: string,
  source: string,
  opts?: { classification?: MismatchClass; note?: string; skipOracle?: boolean },
): CompileCompareResult {
  const { ncs: kotor, errors } = compileKotOR(source);
  if (errors.length) {
    throw new Error(`${name}: KotOR parse/compile errors: ${JSON.stringify(errors)}`);
  }
  if (opts?.skipOracle) {
    return { name, kotor, oracle: new Uint8Array(0), equal: true, classification: opts.classification, note: opts.note };
  }
  const oracle = compileNwnnsscomp(source);
  const equal = buffersEqual(kotor, oracle);
  return {
    name,
    kotor,
    oracle,
    equal,
    classification: equal ? undefined : opts?.classification,
    note: equal ? undefined : opts?.note,
  };
}
