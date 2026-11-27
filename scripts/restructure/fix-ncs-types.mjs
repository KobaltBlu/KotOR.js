import fs from 'node:fs';

const files = [
  'src/core/nwscript/decompiler/NWScriptArgumentStackLayout.ts',
  'src/core/nwscript/decompiler/NWScriptCallGraphReachability.ts',
  'src/core/nwscript/decompiler/NWScriptControlFlowGraph.ts',
  'src/core/nwscript/decompiler/NWScriptDecompiler.ts',
  'src/core/nwscript/decompiler/NWScriptGlobalVariableAnalyzer.ts',
  'src/core/nwscript/decompiler/NWScriptLocalVariableAnalyzer.ts',
  'src/core/nwscript/decompiler/NWScriptStoreStateThunkSkip.ts',
  'src/core/nwscript/inspect/decompileScriptWithLineMap.ts',
  'src/core/nwscript/inspect/ncsInspection.ts',
];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(
    /import type \{ NWScript \} from ["']@engine\/nwscript\/NWScript["'];/g,
    'import type { NCSProgram } from "@core/nwscript/NCSProgram";'
  );
  // Type positions only — avoid renaming NWScriptDecompiler, etc.
  s = s.replace(/: NWScript(\W)/g, ': NCSProgram$1');
  s = s.replace(/<NWScript>/g, '<NCSProgram>');
  fs.writeFileSync(f, s);
  console.log('updated', f);
}
