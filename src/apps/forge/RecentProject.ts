import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { isProjectDirectoryHandle } from "@/apps/forge/virtual/VirtualProjectFolder";

export interface RecentProjectOptions {
  path?: string;
  handle?: FileSystemDirectoryHandle;
  name?: string;
  virtual?: boolean;
}

/**
 * RecentProject class - similar to EditorFile, stores project path and handle
 * for both Electron (path) and Browser (handle) environments
 */
export class RecentProject {
  path?: string;
  handle?: FileSystemDirectoryHandle;
  name?: string;
  virtual?: boolean;

  constructor(options: RecentProjectOptions = {}) {
    this.path = options.path;
    this.handle = options.handle;
    this.virtual = !!options.virtual;
    this.name = options.name || this.path || (this.handle ? this.handle.name : undefined);
  }

  /**
   * Get the project identifier (path for Electron, name for Browser / virtual)
   */
  getIdentifier(): string | undefined {
    if (this.virtual) {
      return this.name || (this.handle ? this.handle.name : undefined);
    }
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return this.path;
    } else {
      return this.name || (this.handle ? this.handle.name : undefined);
    }
  }

  /**
   * Get display name for the project
   */
  getDisplayName(): string {
    let base = 'Unknown Project';
    if (this.name) {
      base = this.name;
    } else if (this.path) {
      const parts = this.path.replace(/\\/g, '/').split('/');
      base = parts[parts.length - 1] || this.path;
    } else if (this.handle) {
      base = this.handle.name;
    }
    return this.virtual ? `${base} (virtual)` : base;
  }

  /**
   * Check if this project has a valid handle (for browser)
   */
  hasHandle(): boolean {
    return isProjectDirectoryHandle(this.handle);
  }

  /**
   * Check if this project has a valid path (for Electron)
   */
  hasPath(): boolean {
    return !!this.path;
  }

  /**
   * Create a RecentProject from a serialized object
   */
  static From(data: any): RecentProject {
    return new RecentProject({
      path: data.path,
      handle: data.handle,
      name: data.name,
      virtual: !!data.virtual,
    });
  }
}
