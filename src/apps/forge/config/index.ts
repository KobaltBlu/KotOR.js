/**
 * Forge config – version, update info, and update check.
 */

export { versionToReleaseTag, releaseTagToVersion } from '@/apps/forge/config/ConfigVersion';
export { CURRENT_VERSION, LOCAL_PROGRAM_INFO, type LocalProgramInfo } from '@/apps/forge/config/ConfigInfo';
export {
  fetchUpdateInfo,
  getRemoteUpdateInfo,
  isRemoteVersionNewer,
  type RemoteUpdateInfo,
} from '@/apps/forge/config/ConfigUpdate';
