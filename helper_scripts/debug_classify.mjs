#!/usr/bin/env node
// Quick debug script to understand why worker-tex.ts is classified as logic
import { execSync } from 'node:child_process';
import ts from 'typescript';
import path from 'node:path';

const BASE = 'upstream/master';
const HEAD = 'kotorjs_vscode_ext';
const filePath = 'src/worker/worker-tex.ts';

function run(cmd, allowError = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256, stdio: ['pipe', 'pipe', allowError ? 'ignore' : 'pipe'] });
  } catch (e) {
    if (allowError) return '';
    throw e;
  }
}

// Get the diff for this specific file
const diff = run(`git diff ${BASE}..${HEAD} -- ${filePath}`);
console.log('=== DIFF ===');
console.log(diff.slice(0, 500));
console.log('...');

// Parse hunks
const lines = diff.split('\n');
let hunkIdx = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('@@ ')) {
    hunkIdx++;
    console.log(`\n=== HUNK ${hunkIdx} ===`);
    console.log(lines[i]);

    // Collect changed lines
    let j = i + 1;
    const removed = [];
    const added = [];
    const context = [];
    while (j < lines.length && !lines[j].startsWith('@@ ')) {
      if (lines[j].startsWith('-')) removed.push(lines[j]);
      else if (lines[j].startsWith('+')) added.push(lines[j]);
      else context.push(lines[j]);
      j++;
    }

    // Check: are all removed/added import lines?
    const isImport = s => /^\s*(import|export)\s/.test(s.trim());
    const removedImports = removed.filter(l => isImport(l.slice(1)));
    const addedImports = added.filter(l => isImport(l.slice(1)));

    console.log(`  Changed: ${removed.length} removed, ${added.length} added`);
    console.log(`  Import lines: ${removedImports.length} removed, ${addedImports.length} added`);

    // For the first run of removed/added in the hunk, show pairing
    let ri = i + 1;
    while (ri < lines.length && !lines[ri].startsWith('@@ ')) {
      if (lines[ri].startsWith('-') || lines[ri].startsWith('+')) {
        // Found start of a run
        const runRemoved = [];
        const runAdded = [];
        while (ri < lines.length && lines[ri].startsWith('-')) {
          runRemoved.push(lines[ri].slice(1));
          ri++;
        }
        while (ri < lines.length && lines[ri].startsWith('+')) {
          runAdded.push(lines[ri].slice(1));
          ri++;
        }

        const allR = runRemoved.every(l => isImport(l));
        const allA = runAdded.every(l => isImport(l));

        console.log(`  Run: ${runRemoved.length}R ${runAdded.length}A (allImportsR=${allR}, allImportsA=${allA})`);

        if (allR || runRemoved.length === 0) {
          if (allA || runAdded.length === 0) {
            console.log('  -> Would use smart import matching');
          }
        }

        // Show sequential pairing results
        const maxLen = Math.max(runRemoved.length, runAdded.length);
        for (let k = 0; k < maxLen; k++) {
          const r = runRemoved[k] ?? '<none>';
          const a = runAdded[k] ?? '<none>';
          console.log(`    pair[${k}]: "${r.trim()}" <-> "${a.trim()}"`);
        }
      } else {
        ri++;
      }
    }
  }
}
