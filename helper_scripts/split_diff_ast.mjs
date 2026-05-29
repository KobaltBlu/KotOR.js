#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const REPO_ROOT = process.cwd();
const BASE = process.argv[2] ?? 'upstream/master';
const HEAD = process.argv[3] ?? 'kotorjs_vscode_ext';
const COSMETIC_OUT = process.argv[4] ?? 'kotorjs_vs_upstream_cosmetic_only.diff';
const LOGIC_OUT = process.argv[5] ?? 'kotorjs_vs_upstream_logic_only.diff';

const FORCED_LOGIC_FILES = new Set([
  '.eslintrc.yml',
  'tsconfig.json',
  'tsconfig.electron.json',
  'tsconfig.forge.json',
  'tsconfig.game.json',
  'tsconfig.launcher.json',
  'tsconfig.debugger.json',
  'tsconfig.eslint.json',
  'tsconfig.webview.json',
  'tsconfig.kotorjs.json',
  'jest.config.js',
  '.eslintrc.json',
  '.eslintrc.js',
  'eslint.config.js',
  'eslint.config.mjs',
  'README.md',
  'package.json',
  'package-lock.json',
]);

const EXCLUDED_ARTIFACT_FILES = new Set([
  'eslint-errors.json',
  'eslint-errs.txt',
  'eslint-full.txt',
  'eslint-src.txt',
  'lint-output.txt',
]);

const FORCED_COSMETIC_FILES = new Set([
  'webpack.config.js',
]);

const COSMETIC_FILE_PATTERNS = [
  /^wiki\//,
  /^coverage\//,
];

function shouldExcludePath(filePath) {
  return EXCLUDED_ARTIFACT_FILES.has(filePath);
}

function run(cmd, allowError = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256, stdio: ['pipe', 'pipe', allowError ? 'ignore' : 'pipe'] });
  } catch (e) {
    if (allowError) return '';
    throw e;
  }
}

function gitShow(ref, filePath) {
  const escaped = filePath.replace(/"/g, '\\"');
  return run(`git show "${ref}:${escaped}"`, true);
}

function isTsLike(filePath) {
  return /\.(ts|tsx|js|jsx)$/.test(filePath) && !/\.d\.ts$/.test(filePath);
}

function isCosmeticByPath(filePath) {
  if (FORCED_COSMETIC_FILES.has(filePath)) return true;
  return COSMETIC_FILE_PATTERNS.some((re) => re.test(filePath));
}

function isForcedLogicPath(filePath) {
  return FORCED_LOGIC_FILES.has(filePath);
}

function normalizeModuleSpecifier(spec, filePath) {
  if (!spec) return spec;
  const fp = filePath.replace(/\\/g, '/');
  const dir = fp.includes('/') ? fp.slice(0, fp.lastIndexOf('/')) : '';

  if (spec.startsWith('@/')) {
    return `src/${spec.slice(2)}`;
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    return path.posix.normalize(path.posix.join(dir, spec));
  }
  return spec;
}

function normalizeJsOutput(js, filePath) {
  let out = js;

  out = out
    .split('\n')
    .filter((line) => {
      const s = line.trim();
      if (!s) return false;
      if (/^\/\//.test(s)) return false;
      if (/eslint-disable|eslint-enable/.test(s)) return false;
      return true;
    })
    .join('\n');

  out = out.replace(/\b(let|const)\b/g, 'var');

  out = out.replace(/from\s+['"]([^'"]+)['"]/g, (_, spec) => `from "${normalizeModuleSpecifier(spec, filePath)}"`);
  out = out.replace(/require\(\s*['"]([^'"]+)['"]\s*\)/g, (_, spec) => `require("${normalizeModuleSpecifier(spec, filePath)}")`);

  // Strip parameter defaults: word = {} | [] | null | undefined | ... before , or )
  out = out.replace(/(\w)\s*=\s*\{[^}]*\}\s*(?=[,)])/g, '$1');
  out = out.replace(/(\w)\s*=\s*\[[^\]]*\]\s*(?=[,)])/g, '$1');
  out = out.replace(/(\w)\s*=\s*(?:null|undefined|false|true|void 0|0|""|\'\')\s*(?=[,)])/g, '$1');

  out = out.replace(/\b_([A-Za-z][A-Za-z0-9_]*)\b/g, '$1');
  out = out.replace(/;+\s*$/gm, '');
  out = out.replace(/\s+/g, ' ').trim();

  return out;
}

function transpileComparable(code, filePath) {
  const transpiled = ts.transpileModule(code, {
    fileName: filePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      removeComments: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Preserve,
      preserveValueImports: true,
    },
  });
  return normalizeJsOutput(transpiled.outputText || '', filePath);
}

const transpileCache = new Map();
function transpileComparableCached(code, filePath, tag) {
  const key = `${tag}:${filePath}`;
  if (transpileCache.has(key)) return transpileCache.get(key);
  const out = transpileComparable(code, filePath);
  transpileCache.set(key, out);
  return out;
}

function parseDiffBlocks(diffText) {
  const parts = diffText.split(/^diff --git /m);
  const preamble = parts[0] || '';
  const blocks = parts.slice(1).map((p) => `diff --git ${p}`);
  return { preamble, blocks };
}

function parseBlock(block) {
  const lines = block.split('\n');
  const first = lines[0];
  const m = /^diff --git a\/(.+) b\/(.+)$/.exec(first);
  const aPath = m ? m[1] : '';
  const bPath = m ? m[2] : '';

  let idx = 1;
  while (idx < lines.length && !lines[idx].startsWith('@@ ')) idx++;
  const headerLines = lines.slice(0, idx);
  const hunkLines = lines.slice(idx);

  const hunks = [];
  let i = 0;
  while (i < hunkLines.length) {
    if (!hunkLines[i].startsWith('@@ ')) {
      i++;
      continue;
    }
    const header = hunkLines[i];
    i++;
    const content = [];
    while (i < hunkLines.length && !hunkLines[i].startsWith('@@ ')) {
      content.push(hunkLines[i]);
      i++;
    }
    hunks.push({ header, content });
  }

  return { aPath, bPath, headerLines, hunks, raw: block };
}

function parseHunkHeader(header) {
  const m = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/.exec(header);
  if (!m) return null;
  return {
    oldStart: Number(m[1]),
    oldCount: Number(m[2] ?? '1'),
    newStart: Number(m[3]),
    newCount: Number(m[4] ?? '1'),
  };
}

function makeHunkHeader(oldStart, oldCount, newStart, newCount) {
  return `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`;
}

function stripLinePrefix(line) {
  return line.length > 0 ? line.slice(1) : '';
}

function normalizeWhitespaceOnly(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function isCommentOnly(s) {
  const t = s.trim();
  return t === '' || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t === '*/';
}

function isImportOrExportLine(s) {
  const t = s.trim();
  return /^import\s/.test(t) || /^export\s+\*\s+from\s/.test(t) || /^export\s+\{/.test(t);
}

function extractModuleSpecifier(line) {
  const m = line.match(/from\s+['"]([^'"]+)['"]/);
  if (m) return m[1];
  const m2 = line.match(/import\s+['"]([^'"]+)['"]/);
  if (m2) return m2[1];
  return '';
}

function normalizeImportSignature(line, filePath) {
  const trimmed = line.trim();
  const moduleSpec = extractModuleSpecifier(trimmed);
  const normalizedModule = normalizeModuleSpecifier(moduleSpec, filePath);

  if (trimmed.startsWith('export * from ')) {
    return `export*|${normalizedModule}`;
  }

  if (/^import\s+['"]/.test(trimmed)) {
    return `import-side-effect|${normalizedModule}`;
  }

  let left = trimmed;
  if (trimmed.startsWith('import ')) {
    left = trimmed.slice('import '.length);
    left = left.replace(/\s+from\s+['"][^'"]+['"]\s*;?$/, '');
  } else if (trimmed.startsWith('export {')) {
    left = trimmed.replace(/\s+from\s+['"][^'"]+['"]\s*;?$/, '');
  }

  const compactLeft = left.replace(/\s+/g, ' ').trim();
  return `${compactLeft}|${normalizedModule}`;
}

function isEquivalentImportExportChange(r, a, filePath) {
  if (!isImportOrExportLine(r) || !isImportOrExportLine(a)) return false;
  return normalizeImportSignature(r, filePath) === normalizeImportSignature(a, filePath);
}

function isLoggingLine(s) {
  const t = s.trim();
  return /createScopedLogger\(|\bLogScope\b|\blog\.(trace|debug|info|warn|error)\(/.test(t);
}

function isEslintDirectiveLine(s) {
  return /eslint-disable|eslint-enable/.test(s);
}

/**
 * Match import blocks by normalised signature instead of sequential pairing.
 * Returns true when every removed import either matches an added import (path
 * rewrite / reorder) or is a logging import, and every surplus added import is
 * acceptable (type-supporting new import or logging).
 */
function isImportBlockCosmetic(removed, added, filePath) {
  const usedAdded = new Set();
  let unmatchedRemovedCount = 0;

  for (const r of removed) {
    const rSig = normalizeImportSignature(r.text, filePath);
    let matched = false;
    for (let ai = 0; ai < added.length; ai++) {
      if (usedAdded.has(ai)) continue;
      if (normalizeImportSignature(added[ai].text, filePath) === rSig) {
        usedAdded.add(ai);
        matched = true;
        break;
      }
    }
    if (!matched) unmatchedRemovedCount++;
  }

  // If any non-logging removed import couldn't be matched → logic
  if (unmatchedRemovedCount > 0) return false;

  // Every removed import found its match. Remaining added imports are only
  // cosmetic when they are explicit type-only imports/exports.
  for (let ai = 0; ai < added.length; ai++) {
    if (usedAdded.has(ai)) continue;
    const t = added[ai].text.trim();
    if (!/^import\s+type\b/.test(t) && !/^export\s+type\b/.test(t)) {
      return false;
    }
  }

  return true;
}

/**
 * Strip type annotations and default parameter values using balanced-bracket
 * tracking.  Used for line-pair cosmetic comparisons where the only diff is
 * adding/changing type annotations or removing defensive defaults.
 */
function stripTypesAndDefaults(line) {
  let s = line;
  // First strip 'as X' casts
  s = s.replace(/\s+as\s+unknown/g, '');
  // Iteratively strip remaining 'as X' with balanced brackets
  let castResult = '';
  let ci = 0;
  while (ci < s.length) {
    if (s.slice(ci, ci + 4) === ' as ' && ci > 0 && /[\w)\]>]/.test(s[ci - 1])) {
      let j = ci + 4;
      while (j < s.length && s[j] === ' ') j++;
      if (j < s.length && /[A-Za-z{(\[]/.test(s[j])) {
        let depth = 0;
        const start = j;
        while (j < s.length) {
          if ('<({['.includes(s[j])) depth++;
          else if ('>)}]'.includes(s[j])) { if (depth > 0) depth--; else break; }
          else if (depth === 0 && /[,;)]/.test(s[j])) break;
          j++;
        }
        if (j > start) { ci = j; continue; }
      }
    }
    castResult += s[ci];
    ci++;
  }
  s = castResult;

  let result = '';
  let i = 0;
  while (i < s.length) {
    // Type annotation: ': TYPE'
    if (s[i] === ':' && i > 0 && /[\w)\]>?]/.test(s[i - 1])) {
      let j = i + 1;
      while (j < s.length && s[j] === ' ') j++;
      if (j < s.length && /[A-Za-z{(\["'|]/.test(s[j])) {
        let depth = 0;
        const start = j;
        while (j < s.length) {
          if ('<({['.includes(s[j])) depth++;
          else if ('>)}]'.includes(s[j])) { if (depth > 0) depth--; else break; }
          else if (depth === 0) {
            // Handle => arrow in type annotations (e.g., new (x: number) => T)
            if (s[j] === '=' && j + 1 < s.length && s[j + 1] === '>') { j += 2; continue; }
            if (/[,=;)]/.test(s[j])) break;
          }
          j++;
        }
        if (j > start) { i = j; continue; }
      }
    }
    // Default value: '= VALUE' before , or )  (but not == or !=)
    if (s[i] === '=' && i > 0 && !/[=!<>]/.test(s[i - 1]) && (i + 1 >= s.length || s[i + 1] !== '=')) {
      let j = i + 1;
      while (j < s.length && s[j] === ' ') j++;
      if (j < s.length) {
        let depth = 0;
        const start = j;
        while (j < s.length) {
          if ('{(['.includes(s[j])) depth++;
          else if ('})]'.includes(s[j])) { if (depth > 0) depth--; else break; }
          else if (depth === 0 && /[,)]/.test(s[j])) break;
          j++;
        }
        if (j > start && j < s.length && /[,)]/.test(s[j])) {
          i = j;
          continue;
        }
      }
    }
    result += s[i];
    i++;
  }
  return result;
}

function linePairIsCosmetic(rLine, aLine, filePath = '') {
  const r = rLine ?? '';
  const a = aLine ?? '';

  if (normalizeWhitespaceOnly(r) === normalizeWhitespaceOnly(a)) return true;
  if ((r.trim() === '' && a.trim() === '') || (isCommentOnly(r) && isCommentOnly(a))) return true;

  if (isImportOrExportLine(r) && isImportOrExportLine(a)) {
    if (isEquivalentImportExportChange(r, a, filePath)) return true;
    return false;
  }
  if (isImportOrExportLine(r) !== isImportOrExportLine(a)) {
    return false;
  }
  if ((isEslintDirectiveLine(r) || r.trim() === '') && (isEslintDirectiveLine(a) || a.trim() === '')) return true;

  if (r.replace(/\blet\b/g, 'const') === a || r.replace(/\bconst\b/g, 'let') === a) return true;

  if (r.replace(/;+\s*$/, '') === a.replace(/;+\s*$/, '')) return true;

  const rNoAny = r.replace(/:\s*any\b/g, ': TYPE');
  const aNoType = a.replace(/:\s*[A-Za-z0-9_<>{}\[\]|&.,\s'"?]+(?=[,)\]=;{]|$)/g, ': TYPE');
  if (normalizeWhitespaceOnly(rNoAny) === normalizeWhitespaceOnly(aNoType)) return true;

  const rNoCast = r.replace(/\s+as\s+[A-Za-z0-9_<>{}\[\]|&.,\s'"?]+/g, '');
  const aNoCast = a.replace(/\s+as\s+[A-Za-z0-9_<>{}\[\]|&.,\s'"?]+/g, '');
  if (normalizeWhitespaceOnly(rNoCast) === normalizeWhitespaceOnly(aNoCast)) return true;

  if (normalizeWhitespaceOnly(r).replace(/\b_([A-Za-z][A-Za-z0-9_]*)\b/g, '$1') === normalizeWhitespaceOnly(a).replace(/\b_([A-Za-z][A-Za-z0-9_]*)\b/g, '$1')) {
    return true;
  }

  // Robust type-annotation + default-value stripping with balanced brackets
  // Use aggressive whitespace removal (strip ALL spaces) since types/defaults
  // may cause different spacing (e.g. (e){  vs  (e) { )
  const rStripped = stripTypesAndDefaults(r).replace(/\s+/g, '');
  const aStripped = stripTypesAndDefaults(a).replace(/\s+/g, '');
  if (rStripped === aStripped) return true;

  // Also try let/const + type + default combined
  const rCombined = stripTypesAndDefaults(r.replace(/\blet\b/g, 'const')).replace(/\s+/g, '');
  const aCombined = stripTypesAndDefaults(a).replace(/\s+/g, '');
  if (rCombined === aCombined) return true;

  return false;
}

function splitHunkLineLevel(hunk, filePath = '') {
  const meta = parseHunkHeader(hunk.header);
  if (!meta) return null;

  const cosmetic = [];
  const logic = [];

  let oldLine = meta.oldStart;
  let newLine = meta.newStart;

  let i = 0;
  while (i < hunk.content.length) {
    const line = hunk.content[i];

    if (line.startsWith(' ')) {
      oldLine += 1;
      newLine += 1;
      i += 1;
      continue;
    }

    if (line.startsWith('\\')) {
      i += 1;
      continue;
    }

    if (!line.startsWith('-') && !line.startsWith('+')) {
      i += 1;
      continue;
    }

    const removed = [];
    const added = [];
    const runOldStart = oldLine;
    const runNewStart = newLine;

    while (i < hunk.content.length && hunk.content[i].startsWith('-')) {
      removed.push({ text: stripLinePrefix(hunk.content[i]), oldPos: oldLine });
      oldLine += 1;
      i += 1;
    }
    while (i < hunk.content.length && hunk.content[i].startsWith('+')) {
      added.push({ text: stripLinePrefix(hunk.content[i]), newPos: newLine });
      newLine += 1;
      i += 1;
    }

    // ---- Smart import-block matching ----
    const allImportsR = removed.length > 0 && removed.every((r) => isImportOrExportLine(r.text));
    const allImportsA = added.length > 0 && added.every((a) => isImportOrExportLine(a.text));

    if ((allImportsR || removed.length === 0) && (allImportsA || added.length === 0) && (removed.length + added.length > 0)) {
      const blockCosmetic = isImportBlockCosmetic(removed, added, filePath);
      const target = blockCosmetic ? cosmetic : logic;
      const maxLen = Math.max(removed.length, added.length);
      for (let k = 0; k < maxLen; k++) {
        const r = removed[k] ?? null;
        const a = added[k] ?? null;
        if (r && a) {
          target.push({ header: makeHunkHeader(r.oldPos, 1, a.newPos, 1), content: [`-${r.text}`, `+${a.text}`] });
        } else if (r) {
          target.push({ header: makeHunkHeader(r.oldPos, 1, runNewStart + Math.min(k, added.length), 0), content: [`-${r.text}`] });
        } else if (a) {
          target.push({ header: makeHunkHeader(runOldStart + Math.min(k, removed.length), 0, a.newPos, 1), content: [`+${a.text}`] });
        }
      }
      continue;
    }

    // ---- Normal sequential pairing ----
    const maxLen = Math.max(removed.length, added.length);
    for (let k = 0; k < maxLen; k++) {
      const r = removed[k] ?? null;
      const a = added[k] ?? null;
      const isCosmetic = linePairIsCosmetic(r?.text, a?.text, filePath);

      const target = isCosmetic ? cosmetic : logic;
      if (r && a) {
        target.push({
          header: makeHunkHeader(r.oldPos, 1, a.newPos, 1),
          content: [`-${r.text}`, `+${a.text}`],
        });
      } else if (r) {
        target.push({
          header: makeHunkHeader(r.oldPos, 1, runNewStart + Math.min(k, added.length), 0),
          content: [`-${r.text}`],
        });
      } else if (a) {
        target.push({
          header: makeHunkHeader(runOldStart + Math.min(k, removed.length), 0, a.newPos, 1),
          content: [`+${a.text}`],
        });
      }
    }
  }

  if (!cosmetic.length && !logic.length) return null;
  return { cosmeticHunks: cosmetic, logicHunks: logic };
}

function hunkIsFullyCosmeticByLines(hunk, filePath = '') {
  const split = splitHunkLineLevel(hunk, filePath);
  if (!split) return hunkLooksCosmeticByText(hunk.content);
  return split.logicHunks.length === 0;
}

function hunkLooksCosmeticByText(hunkContentLines) {
  const changed = hunkContentLines.filter((l) => l.startsWith('+') || l.startsWith('-'));
  if (!changed.length) return true;

  const raws = changed.map((l) => l.slice(1).trim());

  if (raws.every((s) => !s || /^\/\//.test(s) || /^\*/.test(s) || /^\//.test(s) || /eslint-disable|eslint-enable/.test(s))) return true;
  if (raws.every((s) => /^import\s|^export\s+\*\s+from\s/.test(s) || !s)) return true;

  return false;
}

function classifyBlockByHunks(blockObj) {
  const { aPath, bPath, headerLines, hunks } = blockObj;

  if (shouldExcludePath(bPath) || shouldExcludePath(aPath)) {
    return { cosmeticHunks: [], logicHunks: [] };
  }

  if (isForcedLogicPath(bPath) || isForcedLogicPath(aPath)) {
    return { cosmeticHunks: [], logicHunks: hunks };
  }

  if (isCosmeticByPath(bPath)) {
    return { cosmeticHunks: hunks, logicHunks: [] };
  }

  const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(bPath);
  if (isTestFile) {
    return { cosmeticHunks: [], logicHunks: hunks };
  }

  const isTs = isTsLike(bPath);
  const isNew = headerLines.some((l) => l.startsWith('new file mode'));
  const isDeleted = headerLines.some((l) => l.startsWith('deleted file mode'));

  if (isDeleted) {
    return { cosmeticHunks: [], logicHunks: hunks };
  }

  if (isNew) {
    return { cosmeticHunks: [], logicHunks: hunks };
  }

  if (!isTs) {
    const cosmeticHunks = [];
    const logicHunks = [];
    for (const h of hunks) {
      if (hunkLooksCosmeticByText(h.content)) cosmeticHunks.push(h);
      else logicHunks.push(h);
    }
    return { cosmeticHunks, logicHunks };
  }

  // Fast path: classify entire original hunks via line-level heuristic (no micro-hunk emission).
  const fastCosmetic = [];
  const fastLogic = [];
  for (const hunk of hunks) {
    if (hunkIsFullyCosmeticByLines(hunk, bPath)) fastCosmetic.push(hunk);
    else fastLogic.push(hunk);
  }
  if (fastCosmetic.length === hunks.length || fastLogic.length === hunks.length) {
    return { cosmeticHunks: fastCosmetic, logicHunks: fastLogic };
  }

  const oldCode = gitShow(BASE, aPath || bPath);
  const newCode = gitShow(HEAD, bPath);
  if (!oldCode || !newCode) {
    return { cosmeticHunks: [], logicHunks: hunks };
  }

  let oldCanon;
  let newCanon;
  try {
    oldCanon = transpileComparableCached(oldCode, bPath, BASE);
    newCanon = transpileComparableCached(newCode, bPath, HEAD);
  } catch {
    return { cosmeticHunks: [], logicHunks: hunks };
  }

  if (oldCanon === newCanon) {
    return { cosmeticHunks: hunks, logicHunks: [] };
  }

  // Mixed file semantically changed: keep original hunk boundaries for apply reliability.
  return { cosmeticHunks: fastCosmetic, logicHunks: fastLogic };
}

function buildBlock(headerLines, hunks) {
  if (!hunks.length) return '';
  const out = [...headerLines];
  for (const h of hunks) {
    out.push(h.header, ...h.content);
  }
  return out.join('\n').replace(/\n+$/, '') + '\n';
}

function main() {
  const fullDiff = run(`git diff ${BASE}..${HEAD}`);
  const { preamble, blocks } = parseDiffBlocks(fullDiff);

  const cosmeticBlocks = [];
  const logicBlocks = [];

  for (const raw of blocks) {
    const block = parseBlock(raw);

    if (shouldExcludePath(block.bPath) || shouldExcludePath(block.aPath)) {
      continue;
    }

    if (!block.hunks.length) {
      if (isForcedLogicPath(block.bPath) || isForcedLogicPath(block.aPath)) logicBlocks.push(raw);
      else if (isCosmeticByPath(block.bPath)) cosmeticBlocks.push(raw);
      else logicBlocks.push(raw);
      continue;
    }

    const { cosmeticHunks, logicHunks } = classifyBlockByHunks(block);

    const c = buildBlock(block.headerLines, cosmeticHunks);
    const l = buildBlock(block.headerLines, logicHunks);

    if (c) cosmeticBlocks.push(c);
    if (l) logicBlocks.push(l);
  }

  const cosmeticDiff = `${preamble}${cosmeticBlocks.join('')}`.replace(/\n+$/, '') + '\n';
  const logicDiff = `${preamble}${logicBlocks.join('')}`.replace(/\n+$/, '') + '\n';

  fs.writeFileSync(path.join(REPO_ROOT, COSMETIC_OUT), cosmeticDiff, 'utf8');
  fs.writeFileSync(path.join(REPO_ROOT, LOGIC_OUT), logicDiff, 'utf8');

  const metrics = {
    cosmeticFiles: (cosmeticDiff.match(/^diff --git /gm) || []).length,
    logicFiles: (logicDiff.match(/^diff --git /gm) || []).length,
    cosmeticBytes: cosmeticDiff.length,
    logicBytes: logicDiff.length,
  };
  console.log(JSON.stringify(metrics, null, 2));
}

main();
