import { FileLocationType } from "@/apps/forge/enum/FileLocationType";

export interface EditorFileOptions {
  path?: string;
  path2?: string;
  handle?: FileSystemFileHandle;
  handle2?: FileSystemFileHandle;
  buffer?: Uint8Array;
  buffer2?: Uint8Array;
  /** True for `*.mdl.ascii` on disk: text MDL only, no MDX companion. */
  mdlAsciiOnly?: boolean;
  resref?: string;
  reskey?: number;
  filename?: string;
  ext?: string;
  archive_path?: string;
  location?: FileLocationType;
  useGameFileSystem?: boolean;
  useProjectFileSystem?: boolean;
  useSystemFileSystem?: boolean;
  /** When false, skip Forge recent-files tracking (throwaway extract/export reads). Default true. */
  trackRecent?: boolean;
}