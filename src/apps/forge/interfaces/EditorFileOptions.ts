import { FileLocationType } from "../enum/FileLocationType";

export interface EditorFileOptions {
  path?: string;
  path2?: string;
  handle?: FileSystemFileHandle;
  handle2?: FileSystemFileHandle;
  buffer?: Uint8Array;
  buffer2?: Uint8Array;
  resref?: string;
  reskey?: number;
  filename?: string;
  ext?: string;
  archive_path?: string;
  location?: FileLocationType;
  useGameFileSystem?: boolean;
  useProjectFileSystem?: boolean;
}