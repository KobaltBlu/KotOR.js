/**
 * Forge config – version, update info, and update check (ported from Holocron Toolset).
 */

export { versionToToolsetTag, toolsetTagToVersion } from "./ConfigVersion";
export {
  CURRENT_VERSION,
  LOCAL_PROGRAM_INFO,
  type LocalProgramInfo,
} from "./ConfigInfo";
export {
  fetchUpdateInfo,
  getRemoteToolsetUpdateInfo,
  isRemoteVersionNewer,
  type RemoteUpdateInfo,
} from "./ConfigUpdate";
