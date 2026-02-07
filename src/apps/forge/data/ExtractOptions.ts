/**
 * Extract options for resource extraction (e.g. from ERF/RIM).
 * Ported from PyKotor Holocron Toolset extract_options dialog.
 * Used when extracting resources to configure TPC/MDL decompile and related options.
 */
export interface ExtractOptions {
  /** Decompile TPC to editable format when extracting */
  tpcDecompile?: boolean;
  /** Extract TXI metadata with TPC when extracting */
  tpcExtractTxi?: boolean;
  /** Decompile MDL to ASCII when extracting */
  mdlDecompile?: boolean;
  /** Extract textures referenced by MDL when extracting */
  mdlExtractTextures?: boolean;
}

export const DEFAULT_EXTRACT_OPTIONS: ExtractOptions = {
  tpcDecompile: false,
  tpcExtractTxi: false,
  mdlDecompile: false,
  mdlExtractTextures: false,
};
