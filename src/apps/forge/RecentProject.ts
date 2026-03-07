import * as KotOR from "../../KotOR";

export interface RecentProjectOptions {
  path?: string;
  handle?: FileSystemDirectoryHandle;
  name?: string;
}

/**
 * RecentProject class - similar to EditorFile, stores project path and handle
 * for both Electron (path) and Browser (handle) environments
 */
export class RecentProject {
  path?: string;
  handle?: FileSystemDirectoryHandle;
  name?: string;

  constructor(options: RecentProjectOptions = {}) {
    this.path = options.path;
    this.handle = options.handle;
    this.name = options.name || this.path || (this.handle ? this.handle.name : undefined);
  }

  /**
   * Get the project identifier (path for Electron, name for Browser)
   */
  getIdentifier(): string | undefined {
    if (KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON) {
      return this.path;
    } else {
      return this.name || (this.handle ? this.handle.name : undefined);
    }
  }

  /**
   * Get display name for the project
   */
  getDisplayName(): string {
    if (this.name) {
      return this.name;
    }
    if (this.path) {
      // Extract folder name from path
      const parts = this.path.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1] || this.path;
    }
    if (this.handle) {
      return this.handle.name;
    }
    return 'Unknown Project';
  }

  /**
   * Check if this project has a valid handle (for browser)
   */
  hasHandle(): boolean {
    return !!this.handle;
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
      handle: data.handle, // Handle will be restored from IndexedDB if stored
      name: data.name
    });
  }
}
