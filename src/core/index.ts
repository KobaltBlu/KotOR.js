/**
 * @core — game-agnostic Odyssey toolkit.
 *
 * Binary IO, resource formats, archive managers, install filesystem access,
 * and the NWScript compile/decompile toolchain. No GameState, no WebGL/THREE,
 * no app config schema.
 *
 * Runtime enums (combat/gui/minigames/…) remain importable via
 * `@core/enums/<domain>/…` for monorepo consumers but are not re-exported here.
 */

// Binary IO
export * from "@core/binary/BinaryReader";
export * from "@core/binary/BinaryWriter";

// Format-oriented enums
export * from "@core/enums/ApplicationEnvironment";
export * from "@core/enums/ApplicationMode";
export * from "@core/enums/engine";
export * from "@core/enums/resource";
export * from "@core/enums/graphics";
export * from "@core/enums/odyssey";
export * from "@core/enums/nwscript";
export * from "@core/enums/dialog";
export * from "@core/enums/module";
export * from "@core/enums/audio";
export * from "@core/enums/actions";
export * from "@core/enums/animation";
export * from "@core/enums/effects";
export * from "@core/enums/events";
export * from "@core/enums/loaders";

// Filesystem (install access + thin settings KV)
export * from "@core/filesystem/ConfigClient";
export * from "@core/filesystem/GameFileSystem";
export * from "@core/filesystem/gameDirectoryAccess";

// Format / data interfaces
export * from "@core/interface/area";
export * from "@core/interface/filesystem";
export * from "@core/interface/graphics";
export * from "@core/interface/input";
export * from "@core/interface/module";
export * from "@core/interface/nwscript";
export * from "@core/interface/odyssey";
export * from "@core/interface/resource";
export * from "@core/interface/talents";
export * from "@core/interface/twoDA";
export * from "@core/interface/utility";

// Resource loading + archive managers
export * from "@core/loaders";
export * from "@core/managers";

// NWScript toolchain (VM stays in @engine)
export * from "@core/nwscript/NCSProgram";
export * from "@core/nwscript/NWScriptConstants";
export * from "@core/nwscript/NWScriptDef";
export * from "@core/nwscript/NWScriptInstruction";
export * from "@core/nwscript/NWScriptInstructionInfo";
export * from "@core/nwscript/NWScriptOPCodes";
export * from "@core/nwscript/format-nwscript-float";
export * from "@core/nwscript/parseNcsInstruction";
export * from "@core/nwscript/compiler/NWScriptCompiler";
export * from "@core/nwscript/decompiler/NWScriptDecompiler";
export * from "@core/nwscript/inspect/ncsInspection";
export * from "@core/nwscript/inspect/ncsCompare";
export * from "@core/nwscript/inspect/nssCodeLineMap";

// Resource format objects
export * from "@core/resource/CExoLocString";
export * from "@core/resource/CExoLocSubString";
export * from "@core/resource/BIFObject";
export * from "@core/resource/ERFObject";
export * from "@core/resource/GFFObject";
export * from "@core/resource/GFFStruct";
export * from "@core/resource/GFFField";
export * from "@core/resource/KEYObject";
export * from "@core/resource/LIPObject";
export * from "@core/resource/LTRObject";
export * from "@core/resource/LYTObject";
export * from "@core/resource/RIMObject";
export * from "@core/resource/SSFObject";
export * from "@core/resource/TGAObject";
export * from "@core/resource/TLKObject";
export * from "@core/resource/TPCObject";
export * from "@core/resource/TwoDAObject";
export * from "@core/resource/TXI";
export * from "@core/resource/VISObject";
export * from "@core/resource/ResourceTypes";
export * from "@core/resource/ResourceTypeInfo";

// Pure utility + slim app profile for install roots
export * from "@core/types/vec";
export * from "@core/utility/ApplicationProfile";
export * from "@core/utility/AsyncLoop";
export * from "@core/utility/BitWise";
export * from "@core/utility/DeepObject";
export * from "@core/utility/Dice";
export * from "@core/utility/EventListener";
export * from "@core/utility/OSInfo";
export * from "@core/utility/PerformanceMonitor";
export * from "@core/utility/PixelManager";
export * from "@core/utility/Utility";
export * from "@core/utility/listen-pattern";
export * from "@core/utility/mergeConfigDefaults";
export * from "@core/utility/polyfills";
