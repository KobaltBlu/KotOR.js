/**
 * Launcher profile and category types (no `any`).
 */

export interface LauncherProfileSettingsEntry {
  name: string;
  type: string;
  defaultValue: boolean | string | number;
}

export interface LauncherProfileLaunch {
  type: string;
  path: string;
  backgroundColor?: string;
  frameless?: boolean;
  fullscreen?: boolean;
  args?: Record<string, number | string>;
}

export interface LauncherProfileElement {
  type: string;
  id?: string;
  url?: string;
  thumbnail?: string;
  images?: Array<{ path_full: string; path_thumbnail: string }>;
}

export interface LauncherProfile {
  name: string;
  full_name: string;
  icon: string;
  logo: string;
  background: string;
  background_fallback?: string;
  category: string;
  directory: string | null;
  locate_required?: boolean;
  isForgeCompatible?: boolean;
  steam_id?: number;
  width?: number;
  height?: number;
  executable?: { win?: string; mac?: string };
  launch: LauncherProfileLaunch;
  openVSCodeBeta?: {
    url?: string;
    sessionManagerUrl?: string;
    openVSCodeBaseUrl?: string;
    sessionUrlTemplate?: string;
    promptMessage?: string;
  };
  verify_install_dir?: boolean;
  elements?: LauncherProfileElement[];
  settings?: Record<string, LauncherProfileSettingsEntry>;
  key?: string;
  sort?: number;
  id?: number;
}

export interface ProfileCategory {
  name: string;
  key?: string;
  profiles: LauncherProfile[];
}

export type AppCategoriesMap = Record<string, ProfileCategory>;

export type AppProfilesMap = Record<string, LauncherProfile>;
