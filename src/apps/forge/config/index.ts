/**
 * Forge config – version, update info, and update check (ported from Holocron Toolset).
 */

export { versionToToolsetTag, toolsetTagToVersion } from "@/apps/forge/config/ConfigVersion";
export {
  CURRENT_VERSION,
  LOCAL_PROGRAM_INFO,
  type LocalProgramInfo,
} from "@/apps/forge/config/ConfigInfo";
export {
  fetchUpdateInfo,
  getRemoteToolsetUpdateInfo,
  isRemoteVersionNewer,
  type RemoteUpdateInfo,
} from "@/apps/forge/config/ConfigUpdate";
