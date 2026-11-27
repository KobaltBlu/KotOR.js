/**
 * Old src-relative path prefix → new src-relative path prefix.
 * Longer / more-specific prefixes must be listed before shorter ones.
 * Applied as: if path === from OR path.startsWith(from + '/') → replace prefix.
 */
export const PATH_MOVES = [
  // --- Root files ---
  ['GameState.ts', 'engine/GameState.ts'],
  ['LoadingScreen.ts', 'engine/LoadingScreen.ts'],

  // --- Core: enums, types, resource formats ---
  ['enums', 'core/enums'],
  ['types', 'core/types'],
  ['resource', 'core/resource'],

  // --- Core: binary + filesystem + pure utility ---
  ['utility/binary', 'core/binary'],
  ['utility/GameFileSystem.ts', 'core/filesystem/GameFileSystem.ts'],
  ['utility/gameDirectoryAccess.ts', 'core/filesystem/gameDirectoryAccess.ts'],
  ['utility/ConfigClient.ts', 'core/filesystem/ConfigClient.ts'],
  ['utility/BitWise.ts', 'core/utility/BitWise.ts'],
  ['utility/Dice.ts', 'core/utility/Dice.ts'],
  ['utility/DeepObject.ts', 'core/utility/DeepObject.ts'],
  ['utility/AsyncLoop.ts', 'core/utility/AsyncLoop.ts'],
  ['utility/EventListener.ts', 'core/utility/EventListener.ts'],
  ['utility/Utility.ts', 'core/utility/Utility.ts'],
  ['utility/OSInfo.ts', 'core/utility/OSInfo.ts'],
  ['utility/polyfills.ts', 'core/utility/polyfills.ts'],
  ['utility/ApplicationProfile.ts', 'core/utility/ApplicationProfile.ts'],
  ['utility/PerformanceMonitor.ts', 'core/utility/PerformanceMonitor.ts'],
  ['utility/WindowDialog.ts', 'core/utility/WindowDialog.ts'],
  ['utility/listen-pattern.ts', 'core/utility/listen-pattern.ts'],
  ['utility/mergeConfigDefaults.ts', 'core/utility/mergeConfigDefaults.ts'],

  // --- Core: resource managers + ResourceLoader ---
  ['managers/KEYManager.ts', 'core/managers/KEYManager.ts'],
  ['managers/BIFManager.ts', 'core/managers/BIFManager.ts'],
  ['managers/ERFManager.ts', 'core/managers/ERFManager.ts'],
  ['managers/RIMManager.ts', 'core/managers/RIMManager.ts'],
  ['managers/TLKManager.ts', 'core/managers/TLKManager.ts'],
  ['managers/TwoDAManager.ts', 'core/managers/TwoDAManager.ts'],
  ['managers/ConfigManager.ts', 'core/managers/ConfigManager.ts'],
  ['loaders/ResourceLoader.ts', 'core/loaders/ResourceLoader.ts'],

  // --- Core: pure interfaces (listed before blanket interface move) ---
  // Engine-typed interfaces go to engine/interface; the rest to core/interface.
  ['interface/animation', 'engine/interface/animation'],
  ['interface/combat', 'engine/interface/combat'],
  ['interface/dialog', 'engine/interface/dialog'],
  ['interface/gui', 'engine/interface/gui'],
  ['interface/engine/IEngineGlobals.ts', 'engine/interface/engine/IEngineGlobals.ts'],
  ['interface/engine/IGameContext.ts', 'engine/interface/engine/IGameContext.ts'],
  ['interface/engine/IPerceptionInfo.ts', 'engine/interface/engine/IPerceptionInfo.ts'],
  ['interface/engine/pathfinding', 'engine/interface/engine/pathfinding'],
  ['interface/input/KeyboardKeyActions.ts', 'engine/interface/input/KeyboardKeyActions.ts'],
  ['interface/module/IEffectIconListItem.ts', 'engine/interface/module/IEffectIconListItem.ts'],
  ['interface/odyssey/IAdjacentWalkableFaces.ts', 'engine/interface/odyssey/IAdjacentWalkableFaces.ts'],
  ['interface', 'core/interface'],

  // --- Core: nwscript toolchain (compiler/decompiler/inspect + bytecode primitives) ---
  ['nwscript/compiler', 'core/nwscript/compiler'],
  ['nwscript/decompiler', 'core/nwscript/decompiler'],
  ['nwscript/inspect', 'core/nwscript/inspect'],
  ['nwscript/NWScriptOPCodes.ts', 'core/nwscript/NWScriptOPCodes.ts'],
  ['nwscript/NWScriptInstruction.ts', 'core/nwscript/NWScriptInstruction.ts'],
  ['nwscript/NWScriptInstructionInfo.ts', 'core/nwscript/NWScriptInstructionInfo.ts'],
  ['nwscript/parseNcsInstruction.ts', 'core/nwscript/parseNcsInstruction.ts'],
  ['nwscript/NWScriptConstants.ts', 'core/nwscript/NWScriptConstants.ts'],
  ['nwscript/format-nwscript-float.ts', 'core/nwscript/format-nwscript-float.ts'],
  ['nwscript/NWScriptDef.ts', 'core/nwscript/NWScriptDef.ts'],

  // --- Engine: nwscript VM (remaining nwscript files) ---
  ['nwscript', 'engine/nwscript'],

  // --- Engine: render utilities (from utility/) ---
  ['utility/aurora-camera-orientation.ts', 'engine/render/aurora-camera-orientation.ts'],
  ['utility/envMapRotation.ts', 'engine/render/envMapRotation.ts'],
  ['utility/framebufferCapture.ts', 'engine/render/framebufferCapture.ts'],
  ['utility/odyssey-lens-flare-math.ts', 'engine/render/odyssey-lens-flare-math.ts'],
  ['utility/odysseyDepthPrepass.ts', 'engine/render/odysseyDepthPrepass.ts'],
  ['utility/odysseyLighting.ts', 'engine/render/odysseyLighting.ts'],
  ['utility/odysseyLightingDebug.ts', 'engine/render/odysseyLightingDebug.ts'],
  ['utility/odysseyOpaqueRenderSort.ts', 'engine/render/odysseyOpaqueRenderSort.ts'],
  ['utility/odysseyShadowMap.ts', 'engine/render/odysseyShadowMap.ts'],
  ['utility/PixelManager.ts', 'engine/render/PixelManager.ts'],
  ['utility/QuadIndices.ts', 'engine/render/QuadIndices.ts'],
  ['utility/RenderPerfStats.ts', 'engine/render/RenderPerfStats.ts'],
  ['utility/tlk-tokens.ts', 'engine/tlk-tokens.ts'],

  // --- Engine: three / shaders under render/ ---
  ['three', 'engine/render/three'],
  ['shaders', 'engine/render/shaders'],

  // --- Engine: domain packages ---
  ['actions', 'engine/actions'],
  ['effects', 'engine/effects'],
  ['events', 'engine/events'],
  ['combat', 'engine/combat'],
  ['talents', 'engine/talents'],
  ['controls', 'engine/controls'],
  ['gui', 'engine/gui'],
  ['audio', 'engine/audio'],
  ['video', 'engine/video'],
  ['module', 'engine/module'],
  ['odyssey', 'engine/odyssey'],
  ['loaders', 'engine/loaders'],
  ['managers', 'engine/managers'],
  ['game', 'engine/games'],

  // --- Engine: debug / workers / preview ---
  ['server', 'engine/debug/server'],
  ['inspect', 'engine/debug/inspect'],
  ['engine/Debugger.ts', 'engine/debug/Debugger.ts'],
  ['engine/GameDebuggerBridge.ts', 'engine/debug/GameDebuggerBridge.ts'],
  ['worker', 'engine/workers'],
  ['apps/forge/ForgePreviewHost.ts', 'engine/preview/ForgePreviewHost.ts'],
  ['apps/forge/ForgePreviewHost.tsx', 'engine/preview/ForgePreviewHost.tsx'],

  // --- Apps: electron ---
  ['electron', 'apps/electron'],

  // --- Tests (mirror layers) ---
  ['tests/resource', 'tests/core/resource'],
  ['tests/utility', 'tests/core/utility'],
  ['tests/nwscript', 'tests/core/nwscript'],
  ['tests/actions', 'tests/engine/actions'],
  ['tests/audio', 'tests/engine/audio'],
  ['tests/combat', 'tests/engine/combat'],
  ['tests/controls', 'tests/engine/controls'],
  ['tests/effects', 'tests/engine/effects'],
  ['tests/engine', 'tests/engine/engine'],
  ['tests/game', 'tests/engine/games'],
  ['tests/gui', 'tests/engine/gui'],
  ['tests/managers', 'tests/engine/managers'],
  ['tests/module', 'tests/engine/module'],
  ['tests/odyssey', 'tests/engine/odyssey'],
  ['tests/server', 'tests/engine/debug/server'],
  ['tests/shaders', 'tests/engine/render/shaders'],
  ['tests/three', 'tests/engine/render/three'],
  ['tests/video', 'tests/engine/video'],
  ['tests/GameState.update-loop.test.ts', 'tests/engine/GameState.update-loop.test.ts'],
  // tests/apps stays; fixtures/helpers stay at tests/
];

/**
 * After physical moves, rewrite import specifiers.
 * Maps old @/ prefix (without @/) → new alias prefix including @core/@engine/@apps.
 * Order: longest match first.
 */
export const IMPORT_REWRITES = [
  // Specific files / splits first
  ['utility/binary/', '@core/binary/'],
  ['utility/GameFileSystem', '@core/filesystem/GameFileSystem'],
  ['utility/gameDirectoryAccess', '@core/filesystem/gameDirectoryAccess'],
  ['utility/ConfigClient', '@core/filesystem/ConfigClient'],
  ['utility/BitWise', '@core/utility/BitWise'],
  ['utility/Dice', '@core/utility/Dice'],
  ['utility/DeepObject', '@core/utility/DeepObject'],
  ['utility/AsyncLoop', '@core/utility/AsyncLoop'],
  ['utility/EventListener', '@core/utility/EventListener'],
  ['utility/Utility', '@core/utility/Utility'],
  ['utility/OSInfo', '@core/utility/OSInfo'],
  ['utility/polyfills', '@core/utility/polyfills'],
  ['utility/ApplicationProfile', '@core/utility/ApplicationProfile'],
  ['utility/PerformanceMonitor', '@core/utility/PerformanceMonitor'],
  ['utility/WindowDialog', '@core/utility/WindowDialog'],
  ['utility/listen-pattern', '@core/utility/listen-pattern'],
  ['utility/mergeConfigDefaults', '@core/utility/mergeConfigDefaults'],
  ['utility/aurora-camera-orientation', '@engine/render/aurora-camera-orientation'],
  ['utility/envMapRotation', '@engine/render/envMapRotation'],
  ['utility/framebufferCapture', '@engine/render/framebufferCapture'],
  ['utility/odyssey-lens-flare-math', '@engine/render/odyssey-lens-flare-math'],
  ['utility/odysseyDepthPrepass', '@engine/render/odysseyDepthPrepass'],
  ['utility/odysseyLighting', '@engine/render/odysseyLighting'],
  ['utility/odysseyLightingDebug', '@engine/render/odysseyLightingDebug'],
  ['utility/odysseyOpaqueRenderSort', '@engine/render/odysseyOpaqueRenderSort'],
  ['utility/odysseyShadowMap', '@engine/render/odysseyShadowMap'],
  ['utility/PixelManager', '@core/utility/PixelManager'],
  ['utility/QuadIndices', '@engine/render/QuadIndices'],
  ['utility/RenderPerfStats', '@engine/render/RenderPerfStats'],
  ['utility/tlk-tokens', '@engine/tlk-tokens'],

  ['managers/KEYManager', '@core/managers/KEYManager'],
  ['managers/BIFManager', '@core/managers/BIFManager'],
  ['managers/ERFManager', '@core/managers/ERFManager'],
  ['managers/RIMManager', '@core/managers/RIMManager'],
  ['managers/TLKManager', '@core/managers/TLKManager'],
  ['managers/TwoDAManager', '@core/managers/TwoDAManager'],
  ['managers/ConfigManager', '@core/managers/ConfigManager'],
  ['loaders/ResourceLoader', '@core/loaders/ResourceLoader'],

  ['interface/animation', '@engine/interface/animation'],
  ['interface/combat', '@engine/interface/combat'],
  ['interface/dialog', '@engine/interface/dialog'],
  ['interface/gui', '@engine/interface/gui'],
  ['interface/engine/IEngineGlobals', '@engine/interface/engine/IEngineGlobals'],
  ['interface/engine/IGameContext', '@engine/interface/engine/IGameContext'],
  ['interface/engine/IPerceptionInfo', '@engine/interface/engine/IPerceptionInfo'],
  ['interface/engine/pathfinding', '@engine/interface/engine/pathfinding'],
  ['interface/input/KeyboardKeyActions', '@engine/interface/input/KeyboardKeyActions'],
  ['interface/module/IEffectIconListItem', '@engine/interface/module/IEffectIconListItem'],
  ['interface/odyssey/IAdjacentWalkableFaces', '@engine/interface/odyssey/IAdjacentWalkableFaces'],
  ['interface/', '@core/interface/'],
  ['interface', '@core/interface'],

  ['nwscript/compiler', '@core/nwscript/compiler'],
  ['nwscript/decompiler', '@core/nwscript/decompiler'],
  ['nwscript/inspect', '@core/nwscript/inspect'],
  ['nwscript/NWScriptOPCodes', '@core/nwscript/NWScriptOPCodes'],
  ['nwscript/NWScriptInstructionInfo', '@core/nwscript/NWScriptInstructionInfo'],
  ['nwscript/NWScriptInstruction', '@core/nwscript/NWScriptInstruction'],
  ['nwscript/parseNcsInstruction', '@core/nwscript/parseNcsInstruction'],
  ['nwscript/NWScriptConstants', '@core/nwscript/NWScriptConstants'],
  ['nwscript/format-nwscript-float', '@core/nwscript/format-nwscript-float'],
  ['nwscript/NWScriptDef', '@core/nwscript/NWScriptDef'],
  ['nwscript/', '@engine/nwscript/'],
  ['nwscript', '@engine/nwscript'],

  ['enums/', '@core/enums/'],
  ['enums', '@core/enums'],
  ['types/', '@core/types/'],
  ['types', '@core/types'],
  ['resource/', '@core/resource/'],
  ['resource', '@core/resource'],

  ['three/', '@engine/render/three/'],
  ['three', '@engine/render/three'],
  ['shaders/', '@engine/render/shaders/'],
  ['shaders', '@engine/render/shaders'],

  ['actions/', '@engine/actions/'],
  ['actions', '@engine/actions'],
  ['effects/', '@engine/effects/'],
  ['effects', '@engine/effects'],
  ['events/', '@engine/events/'],
  ['events', '@engine/events'],
  ['combat/', '@engine/combat/'],
  ['combat', '@engine/combat'],
  ['talents/', '@engine/talents/'],
  ['talents', '@engine/talents'],
  ['controls/', '@engine/controls/'],
  ['controls', '@engine/controls'],
  ['gui/', '@engine/gui/'],
  ['gui', '@engine/gui'],
  ['audio/', '@engine/audio/'],
  ['audio', '@engine/audio'],
  ['video/', '@engine/video/'],
  ['video', '@engine/video'],
  ['module/', '@engine/module/'],
  ['module', '@engine/module'],
  ['odyssey/', '@engine/odyssey/'],
  ['odyssey', '@engine/odyssey'],
  ['loaders/', '@engine/loaders/'],
  ['loaders', '@engine/loaders'],
  ['managers/', '@engine/managers/'],
  ['managers', '@engine/managers'],
  ['game/', '@engine/games/'],
  ['game', '@engine/games'],

  ['server/', '@engine/debug/server/'],
  ['server', '@engine/debug/server'],
  ['inspect/', '@engine/debug/inspect/'],
  ['inspect', '@engine/debug/inspect'],
  ['worker/', '@engine/workers/'],
  ['worker', '@engine/workers'],
  ['electron/', '@apps/electron/'],
  ['electron', '@apps/electron'],

  ['apps/forge/ForgePreviewHost', '@engine/preview/ForgePreviewHost'],
  ['apps/', '@apps/'],
  ['apps', '@apps'],

  ['engine/Debugger', '@engine/debug/Debugger'],
  ['engine/GameDebuggerBridge', '@engine/debug/GameDebuggerBridge'],
  ['engine/', '@engine/'],
  ['engine', '@engine'],

  ['GameState', '@engine/GameState'],
  ['LoadingScreen', '@engine/LoadingScreen'],
  ['KotOR', '@engine/../KotOR'], // special — handled separately; keep as @/KotOR → relative
  ['assets/', '@assets/'],
  ['assets', '@assets'],
];

/** Sort PATH_MOVES so longer `from` keys win when matching. */
export function sortedPathMoves() {
  return [...PATH_MOVES].sort((a, b) => b[0].length - a[0].length);
}

export function mapPath(relPosix) {
  for (const [from, to] of sortedPathMoves()) {
    if (relPosix === from) return to;
    if (relPosix.startsWith(from + '/')) {
      return to + relPosix.slice(from.length);
    }
  }
  return null;
}

export function rewriteImportPath(specWithoutAt) {
  // specWithoutAt is the path after @/ or a bare old-style path
  const sorted = [...IMPORT_REWRITES].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (specWithoutAt === from) return to;
    if (specWithoutAt.startsWith(from)) {
      // from may end without slash; ensure we don't partially match
      if (from.endsWith('/') || specWithoutAt.length === from.length || specWithoutAt[from.length] === '/' || /[A-Z]/.test(from[from.length - 1] || '')) {
        return to + specWithoutAt.slice(from.length);
      }
      // For exact file stems like GameState — already handled by ===
      if (!from.includes('/') && (specWithoutAt === from || specWithoutAt.startsWith(from + '/') || specWithoutAt.startsWith(from + '.'))) {
        return to + specWithoutAt.slice(from.length);
      }
    }
  }
  return null;
}
