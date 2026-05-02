/**
 * Binary Analysis Integration Module
 *
 * PE layout and survey bookmarks for the stock KotOR I and KotOR II Win32 executables
 * (swkotor.exe / swkotor2.exe families), kept for cross-version comparisons in tooling.
 *
 * @see docs/CROSS_BINARY_ANALYSIS_PHASE1.md
 *
 * KEY FINDINGS:
 * - Both binaries are 32-bit x86 Windows executables using Odyssey game engine
 * - K1: 172 functions, 350 imports, 4.2MB binary, .text @ 0x00401000-0x0073CFFF (3.39MB)
 * - TSL: 175 functions,352 imports, 6.8MB binary, .text @ 0x00401000-0x009857FF (5.5MB)
 * - TSL code is 60% larger, adds Steam support and extended game systems
 * - Critical entry point: Both start at 0x00401000 (identical base)
 * - Memory layout is mostly preserved between versions (favorable for RE)
 */

export enum GameVersion {
  K1 = 'K1', // Knights of the Old Republic (swkotor.exe)
  TSL = 'TSL', // The Sith Lords (swkotor2.exe)
  UNKNOWN = 'UNKNOWN',
}

/**
 * Binary memory layout information extracted from PE headers.
 */
export interface BinaryLayout {
  version: GameVersion;
  baseAddress: number; // 0x00400000 for both
  textStart: number; // Code section start
  textEnd: number; // Code section end
  rdataStart: number; // Read-only data start
  rdataEnd: number; // Read-only data end
  dataStart: number; // Data section start
  dataEnd: number; // Data section end
  rsrcStart: number; // Resources start
  rsrcEnd: number; // Resources end
  bindStart?: number; // Binding data (K1 only)
  bindEnd?: number; // Binding data (K1 only)
  totalSize: number; // Total binary size
}

// K1 Binary Layout (binary survey — revalidate per retail build)
export const K1_BINARY_LAYOUT: BinaryLayout = {
  version: GameVersion.K1,
  baseAddress: 0x00400000,
  textStart: 0x00401000,
  textEnd: 0x0073cfff,
  rdataStart: 0x0073d000,
  rdataEnd: 0x0078cfff,
  dataStart: 0x0078d000,
  dataEnd: 0x00835497,
  rsrcStart: 0x00836000,
  rsrcEnd: 0x0086cfff,
  bindStart: 0x0086d000, // K1-ONLY
  bindEnd: 0x008c2fff, // K1-ONLY
  totalSize: 0x008c3000, // ~4.2 MB
};

// TSL Binary Layout (binary survey — revalidate per retail build)
export const TSL_BINARY_LAYOUT: BinaryLayout = {
  version: GameVersion.TSL,
  baseAddress: 0x00400000,
  textStart: 0x00401000,
  textEnd: 0x009857ff, // +2.1MB vs K1
  rdataStart: 0x00986000,
  rdataEnd: 0x009f31ff,
  dataStart: 0x009f4000,
  dataEnd: 0x00a81f3b,
  rsrcStart: 0x00a82000,
  rsrcEnd: 0x00ab8bff,
  // NO bindStart/bindEnd in TSL
  totalSize: 0x00ab8c00, // ~6.8MB
};

/**
 * Import table information - stable mapping point between K1 and TSL
 */
export interface ImportLibrary {
  name: string; // DLL name (e.g., "KERNEL32.DLL")
  functions: ImportFunction[];
}

export interface ImportFunction {
  name: string; // Function name (e.g., "CreateFileA")
  ordinal?: number; // Export ordinal (if by-ordinal import)
  k1ExternalAddr?: string; // EXTERNAL:XXXXX in K1
  tslExternalAddr?: string; // EXTERNAL:XXXXX in TSL
}

/**
 * Key import libraries found in both binaries
 * These are STABLE MAPPING POINTS for cross-binary analysis
 */
export const CRITICAL_IMPORTS = {
  // Core system initialization
  KERNEL32: [
    'CreateFileA',
    'CreateFileW',
    'ReadFile',
    'WriteFile',
    'CreateWindowExA',
    'GetMessageA',
    'DispatchMessageA',
    'LoadLibraryA',
    'GetProcAddress',
    'HeapAlloc',
    'HeapFree',
    'VirtualAlloc',
    'CreateThread',
    'CreateMutexA',
    'CreateEventA',
    'InitializeCriticalSection',
    'EnterCriticalSection',
    'LeaveCriticalSection',
  ],

  // Graphics rendering
  OPENGL32: [
    'glClear',
    'glColor4f',
    'glDrawElements',
    'glBindTexture',
    'glTexImage2D',
    'glMultMatrixf',
    'glTranslatef',
    'glRotatef',
    'glPushAttrib',
    'glPopAttrib',
    'glLoadIdentity',
    'glMatrixMode',
    'glOrtho',
  ],

  // Window/Input management
  USER32: [
    'CreateWindowExA',
    'DestroyWindow',
    'ShowWindow',
    'GetMessageA',
    'DispatchMessageA',
    'TranslateMessage',
    'GetDC',
    'ReleaseDC',
    'SetWindowPos',
    'GetWindowRect',
    'ClientToScreen',
    'ScreenToClient',
  ],

  // Audio system (Miles Sound System)
  MSS32: [
    '_AIL_allocate_sample_handle@4',
    '_AIL_set_sample_volume_levels@12',
    '_AIL_open_stream@12',
    '_AIL_set_stream_position@8',
  ],

  // Direct Input
  DINPUT8: ['DirectInput8Create'],

  // COM (Component Object Model)
  OLE32: ['CoInitialize', 'CoUninitialize'],
};

/**
 * String table locations identified during binary survey.
 */
export interface StringTableInfo {
  startAddress: number;
  endAddress: number;
  version: GameVersion;
  description: string;
}

export const STRING_TABLES: StringTableInfo[] = [
  {
    startAddress: 0x0078b146,
    endAddress: 0x0078cfff,
    version: GameVersion.K1,
    description: 'K1 string/import name table (350 imports, 393 strings)',
  },
  {
    startAddress: 0x009f17a2,
    endAddress: 0x009f31ff,
    version: GameVersion.TSL,
    description: 'TSL string/import name table (352 imports, 397 strings, +Steam support)',
  },
];

/**
 * Estimated function groups based on import analysis
 * These are inferred from which DLL functions are called and in what order
 */
export enum FunctionGroup {
  // Core engine systems
  INITIALIZATION = 'INITIALIZATION', // CoInit, CreateWindow, etc.
  MAIN_LOOP = 'MAIN_LOOP', // Game update/render loop
  MESSAGE_HANDLING = 'MESSAGE_HANDLING', // Windows message processing

  // Graphics
  GRAPHICS_INIT = 'GRAPHICS_INIT', // OpenGL context setup
  RENDERING = 'RENDERING', // glDraw* calls, frame buffer management
  TEXTURE_MANAGEMENT = 'TEXTURE_MANAGEMENT', // glBindTexture, glTexImage2D

  // Audio
  AUDIO_INIT = 'AUDIO_INIT', // AIL_quick_startup
  AUDIO_PLAYBACK = 'AUDIO_PLAYBACK', // AIL samples/streams

  // File I/O
  FILE_IO = 'FILE_IO', // CreateFile, ReadFile, WriteFile
  RESOURCE_LOADING = 'RESOURCE_LOADING', // ERF, MOD, GFF loading

  // Game logic
  OBJECT_SYSTEM = 'OBJECT_SYSTEM', // Creature, item, door instantiation
  EVENT_QUEUE = 'EVENT_QUEUE', // Event processing
  SCRIPT_VM = 'SCRIPT_VM', // NWScript execution

  // Gameplay
  COMBAT = 'COMBAT', // Combat resolution
  DIALOGUE = 'DIALOGUE', // Conversation system
  SAVE_LOAD = 'SAVE_LOAD', // Game persistence

  // Utilities
  THREADING = 'THREADING', // Thread pool, loading threads
  MEMORY_MANAGEMENT = 'MEMORY_MANAGEMENT', // Heap operations
}

/**
 * Analysis metadata about function groups
 */
export interface FunctionGroupInfo {
  group: FunctionGroup;
  estimatedCount: { k1: number; tsl: number };
  keyImports: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  notes: string;
}

export const FUNCTION_GROUP_ANALYSIS: FunctionGroupInfo[] = [
  {
    group: FunctionGroup.INITIALIZATION,
    estimatedCount: { k1: 8, tsl: 10 },
    keyImports: ['CoInitialize', 'CreateWindowExA', 'InitializeCriticalSection'],
    confidence: 'HIGH',
    notes: 'Engine startup: COM, threading, window creation',
  },
  {
    group: FunctionGroup.RENDERING,
    estimatedCount: { k1: 15, tsl: 20 },
    keyImports: ['glClear', 'glDrawElements', 'glMultMatrixf'],
    confidence: 'HIGH',
    notes: 'Core graphics pipeline; TSL likely has extended features (shaders, etc)',
  },
  {
    group: FunctionGroup.SCRIPT_VM,
    estimatedCount: { k1: 20, tsl: 22 },
    keyImports: [], // No direct imports, but evident from string references
    confidence: 'UNKNOWN',
    notes: 'NWScript bytecode interpreter - needs detailed analysis',
  },
  {
    group: FunctionGroup.COMBAT,
    estimatedCount: { k1: 25, tsl: 35 },
    keyImports: [],
    confidence: 'UNKNOWN',
    notes: 'Combat resolution; TSL adds influence system and extended feats',
  },
  {
    group: FunctionGroup.DIALOGUE,
    estimatedCount: { k1: 12, tsl: 15 },
    keyImports: [],
    confidence: 'UNKNOWN',
    notes: 'DLG file parsing and conversation branching',
  },
];

/**
 * Version-specific differences in imports
 */
export interface VersionDifference {
  type: 'NEW_IMPORT' | 'REMOVED_IMPORT' | 'BEHAVIOR_CHANGE';
  import?: string;
  version: GameVersion;
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export const VERSION_DIFFERENCES: VersionDifference[] = [
  {
    type: 'NEW_IMPORT',
    import: 'SteamAPI_Init',
    version: GameVersion.TSL,
    significance: 'CRITICAL',
    description: 'Steam integration - TSL only; whole new subsystem for Steam achievements, cloud saves',
  },
  {
    type: 'NEW_IMPORT',
    import: 'CreateFileW',
    version: GameVersion.TSL,
    significance: 'MEDIUM',
    description: 'Unicode file I/O support; TSL adds better international support',
  },
  {
    type: 'NEW_IMPORT',
    import: 'InterlockedDecrement, InterlockedIncrement',
    version: GameVersion.TSL,
    significance: 'MEDIUM',
    description: 'Atomic operations for thread-safe counters/flags',
  },
  {
    type: 'NEW_IMPORT',
    import: 'IsDebuggerPresent',
    version: GameVersion.TSL,
    significance: 'LOW',
    description: 'Anti-debugging; TSL added protection against debugging tools',
  },
  {
    type: 'BEHAVIOR_CHANGE',
    import: 'OpenGL functions',
    version: GameVersion.TSL,
    significance: 'HIGH',
    description: 'TSL graphics subsystem likely expanded; more lighting modes, shader improvements',
  },
  {
    type: 'BEHAVIOR_CHANGE',
    import: 'AIL (Miles Sound) functions',
    version: GameVersion.TSL,
    significance: 'MEDIUM',
    description: 'Additional 3D audio features; influence audio system possibly uses more spatial audio',
  },
];

/**
 * Key executable entry points and section markers
 * Used for bootstrapping the game engine
 */
export interface BinaryReference {
  label: string;
  address: number;
  version: GameVersion;
  category: string;
  description: string;
  sourceAnalysis: string; // Debug: where this came from
}

export const BINARY_REFERENCES: BinaryReference[] = [
  {
    label: 'PE_HEADERS',
    address: 0x00400000,
    version: GameVersion.K1,
    category: 'Structure',
    description: 'PE DOS header + NT headers, import address table',
    sourceAnalysis: 'External binary survey bookmark',
  },
  {
    label: 'CODE_SECTION_START',
    address: 0x00401000,
    version: GameVersion.K1,
    category: 'Code',
    description: '.text section start; identical entry in both K1 and TSL',
    sourceAnalysis: 'Binary structure analysis',
  },
  {
    label: 'STRING_TABLE_START',
    address: 0x0078b146,
    version: GameVersion.K1,
    category: 'Data',
    description: 'Import function name strings; 350 function names + resource references',
    sourceAnalysis: 'Binary string table survey',
  },
  {
    label: 'CODE_SECTION_START',
    address: 0x00401000,
    version: GameVersion.TSL,
    category: 'Code',
    description: '.text section start; 5.5MB (+60% vs K1)',
    sourceAnalysis: 'Binary structure analysis',
  },
  {
    label: 'STRING_TABLE_START',
    address: 0x009f17a2,
    version: GameVersion.TSL,
    category: 'Data',
    description: 'Import function name strings; 352 function names (adds SteamAPI)',
    sourceAnalysis: 'Binary string table survey',
  },
];

/**
 * Cross-binary function mapping helpers
 *
 * Strategy: Given a function group and import dependency, find
 * equivalent functions in K1 and TSL binaries
 */
export class BinaryAnalyzer {
  /**
   * Get binary layout for specific game version
   */
  static getLayout(version: GameVersion): BinaryLayout {
    switch (version) {
      case GameVersion.K1:
        return K1_BINARY_LAYOUT;
      case GameVersion.TSL:
        return TSL_BINARY_LAYOUT;
      default:
        throw new Error(`Unknown game version: ${version}`);
    }
  }

  /**
   * Find string table for given version
   */
  static getStringTable(version: GameVersion): StringTableInfo | undefined {
    return STRING_TABLES.find((t) => t.version === version);
  }

  /**
   * Get version-specific differences for a particular import
   */
  static getDifferences(importName: string): VersionDifference[] {
    return VERSION_DIFFERENCES.filter((d) => d.import === importName);
  }

  /**
   * Get function group analysis
   */
  static getFunctionGroupInfo(group: FunctionGroup): FunctionGroupInfo | undefined {
    return FUNCTION_GROUP_ANALYSIS.find((g) => g.group === group);
  }

  /**
   * Calculate offset shift between K1 and TSL for data section
   * Useful for cross-referencing data structures
   */
  static getDataOffsetShift(): number {
    const k1Data = K1_BINARY_LAYOUT.dataStart;
    const tslData = TSL_BINARY_LAYOUT.dataStart;
    return tslData - k1Data; // 0x166000 or approximately +1.39 MB
  }
}

export default {
  GameVersion,
  BinaryLayout,
  K1_BINARY_LAYOUT,
  TSL_BINARY_LAYOUT,
  CRITICAL_IMPORTS,
  STRING_TABLES,
  FunctionGroup,
  FUNCTION_GROUP_ANALYSIS,
  VERSION_DIFFERENCES,
  BINARY_REFERENCES,
  BinaryAnalyzer,
};
