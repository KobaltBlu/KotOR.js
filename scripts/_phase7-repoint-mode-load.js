const fs = require('fs');

function ensureImport(src, importLine) {
  if (src.includes(importLine)) return src;
  const marker = importLine.match(/from ['"]([^'"]+)['"]/)?.[1];
  if (marker && (src.includes(`from '${marker}'`) || src.includes(`from "${marker}"`))) return src;

  const lines = src.split('\n');
  let lastImport = -1;
  let i = 0;
  while (i < lines.length) {
    if (/^import\b/.test(lines[i])) {
      let j = i;
      while (j < lines.length && !/;/.test(lines[j])) j++;
      lastImport = j;
      i = j + 1;
    } else if (lastImport >= 0 && lines[i].trim() !== '' && !/^\/\//.test(lines[i].trim()) && !/^\/\*/.test(lines[i].trim()) && !/^\*/.test(lines[i].trim())) {
      break;
    } else {
      i++;
    }
  }
  lines.splice(lastImport + 1, 0, importLine);
  return lines.join('\n');
}

const modeFiles = [
  'src/GameState.ts',
  'src/managers/VideoManager.ts',
  'src/controls/IngameControls.ts',
  'src/engine/GameLoop.ts',
  'src/game/kotor/menu/InGameDialog.ts',
  'src/gui/GameMenu.ts',
  'src/managers/MenuManager.ts',
  'src/managers/CutsceneManager.ts',
  'src/nwscript/NWScriptDefK2.ts',
  'src/nwscript/NWScriptDefK1.ts',
  'src/game/kotor/menu/InGameComputer.ts',
  'src/game/tsl/menu/InGameOverlay.ts',
  'src/managers/LegalScreenManager.ts',
];

for (const f of modeFiles) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s.replace(/GameState\.SetEngineMode\(/g, 'EngineModeController.SetEngineMode(');
  s = s.replace(/GameState\.RestoreEnginePlayMode\(/g, 'EngineModeController.RestoreEnginePlayMode(');
  if (s !== before) {
    s = ensureImport(s, "import { EngineModeController } from '@/engine/EngineModeController';");
    fs.writeFileSync(f, s);
    console.log('mode:', f);
  }
}

{
  const f = 'src/apps/forge/module-editor/ModulePreviewSession.ts';
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/KotOR\.GameState\.SetEngineMode\(/g, 'KotOR.EngineModeController.SetEngineMode(');
  s = s.replace(/KotOR\.GameState\.UnloadModule\(/g, 'KotOR.ModuleLoadCoordinator.UnloadModule(');
  s = s.replace(/await KotOR\.GameState\.InitForForgePreview\(/g, 'await KotOR.ForgePreviewHost.InitForForgePreview(');
  s = s.replace(/await KotOR\.GameState\.LoadModuleFromArchives\(/g, 'await KotOR.ForgePreviewHost.LoadModuleFromArchives(');
  s = s.replace(/KotOR\.GameState\.clearForgePreviewViewport\(/g, 'KotOR.ForgePreviewHost.clearForgePreviewViewport(');
  fs.writeFileSync(f, s);
  console.log('forge session:', f);
}

const loadFiles = [
  'src/module/ModuleDoor.ts',
  'src/module/ModuleTrigger.ts',
  'src/nwscript/NWScriptDefK1.ts',
  'src/game/kotor/menu/MenuGraphicsAdvanced.ts',
  'src/actions/ActionJumpToPoint.ts',
  'src/actions/ActionJumpToObject.ts',
  'src/game/tsl/menu/MenuOptions.ts',
  'src/game/kotor/menu/MenuOptions.ts',
  'src/engine/SaveGame.ts',
  'src/managers/GameOverManager.ts',
  'src/engine/pathfinding/inter-area-path.ts',
  'src/managers/CharGenManager.ts',
  'src/managers/CheatConsoleManager.ts',
];

for (const f of loadFiles) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s.replace(/GameState\.LoadModuleWithAreaTransitionFade\(/g, 'ModuleLoadCoordinator.LoadModuleWithAreaTransitionFade(');
  s = s.replace(/GameState\.LoadModuleWithJumpSpawn\(/g, 'ModuleLoadCoordinator.LoadModuleWithJumpSpawn(');
  s = s.replace(/GameState\.LoadModule\(/g, 'ModuleLoadCoordinator.LoadModule(');
  s = s.replace(/GameState\.UnloadModule\(/g, 'ModuleLoadCoordinator.UnloadModule(');
  s = s.replace(/GameState\.ReloadTextureCache\(/g, 'ModuleLoadCoordinator.ReloadTextureCache(');
  if (s !== before) {
    s = ensureImport(s, "import { ModuleLoadCoordinator } from '@/engine/ModuleLoadCoordinator';");
    fs.writeFileSync(f, s);
    console.log('load:', f);
  }
}
