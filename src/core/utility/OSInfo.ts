// Add data types to window.navigator ambiently for implicit use in the entire project. See https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html#-reference-types- for more info.
/// <reference types="user-agent-data-types" />
/**
 * Utility class for detecting operating system information.
 * 
 * @class OSInfo
 * @category Utilities
 * @static
 * @public
 */
export class OSInfo {
  /**
   * Operating system platform types
   */
  static readonly Platform = {
    WINDOWS: 'Windows',
    MACOS: 'macOS',
    LINUX: 'Linux',
    ANDROID: 'Android',
    IOS: 'iOS',
    UNKNOWN: 'Unknown'
  } as const;

  /**
   * Operating system architecture types
   */
  static readonly Architecture = {
    X86: 'x86',
    X64: 'x64',
    ARM: 'ARM',
    ARM64: 'ARM64',
    UNKNOWN: 'Unknown'
  } as const;

  /**
   * Gets the current operating system platform.
   * 
   * @returns {string} The detected platform name
   * @public
   * @static
   */
  static getPlatform(): string {
    // Try using modern userAgentData API first
    if (navigator.userAgentData) {
      const platform = navigator.userAgentData.platform.toLowerCase();
      
      if (platform.includes('win')) return this.Platform.WINDOWS;
      if (platform.includes('mac')) return this.Platform.MACOS;
      if (platform.includes('linux')) return this.Platform.LINUX;
      if (platform.includes('android')) return this.Platform.ANDROID;
      if (platform.includes('ios')) return this.Platform.IOS;
    }

    // Fallback to userAgent string
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('win')) return this.Platform.WINDOWS;
    if (userAgent.includes('mac')) return this.Platform.MACOS;
    if (userAgent.includes('linux')) return this.Platform.LINUX;
    if (userAgent.includes('android')) return this.Platform.ANDROID;
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return this.Platform.IOS;

    return this.Platform.UNKNOWN;
  }

  /**
   * Gets the system architecture.
   * 
   * @returns {string} The detected architecture
   * @public
   * @static
   */
  static getArchitecture(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('arm64')) return this.Architecture.ARM64;
    if (userAgent.includes('arm')) return this.Architecture.ARM;
    if (userAgent.includes('x64') || userAgent.includes('x86_64')) return this.Architecture.X64;
    if (userAgent.includes('x86') || userAgent.includes('i386')) return this.Architecture.X86;

    return this.Architecture.UNKNOWN;
  }

  /**
   * Checks if the current platform is Windows.
   * 
   * @returns {boolean} True if Windows
   * @public
   * @static
   */
  static isWindows(): boolean {
    return this.getPlatform() === this.Platform.WINDOWS;
  }

  /**
   * Checks if the current platform is macOS.
   * 
   * @returns {boolean} True if macOS
   * @public
   * @static
   */
  static isMacOS(): boolean {
    return this.getPlatform() === this.Platform.MACOS;
  }

  /**
   * Checks if the current platform is Linux.
   * 
   * @returns {boolean} True if Linux
   * @public
   * @static
   */
  static isLinux(): boolean {
    return this.getPlatform() === this.Platform.LINUX;
  }

  /**
   * Checks if the current platform is Android.
   * 
   * @returns {boolean} True if Android
   * @public
   * @static
   */
  static isAndroid(): boolean {
    return this.getPlatform() === this.Platform.ANDROID;
  }

  /**
   * Checks if the current platform is iOS.
   * 
   * @returns {boolean} True if iOS
   * @public
   * @static
   */
  static isIOS(): boolean {
    return this.getPlatform() === this.Platform.IOS;
  }

  /**
   * Checks if the current platform is mobile (Android or iOS).
   * 
   * @returns {boolean} True if mobile platform
   * @public
   * @static
   */
  static isMobile(): boolean {
    return this.isAndroid() || this.isIOS();
  }

  /**
   * Checks if the current platform is desktop (Windows, macOS, or Linux).
   * 
   * @returns {boolean} True if desktop platform
   * @public
   * @static
   */
  static isDesktop(): boolean {
    return this.isWindows() || this.isMacOS() || this.isLinux();
  }

  /**
   * Gets the operating system version information if available.
   * 
   * @returns {string | null} Version information or null if not available
   * @public
   * @static
   */
  static getVersion(): string | null {
    const userAgent = navigator.userAgent;
    const platform = this.getPlatform();

    switch (platform) {
      case this.Platform.WINDOWS: {
        const match = userAgent.match(/Windows NT (\d+\.\d+)/);
        return match ? match[1] : null;
      }
      case this.Platform.MACOS: {
        const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
        return match ? match[1].replace(/_/g, '.') : null;
      }
      case this.Platform.IOS: {
        const match = userAgent.match(/OS (\d+[._]\d+[._]?\d*)/);
        return match ? match[1].replace(/_/g, '.') : null;
      }
      case this.Platform.ANDROID: {
        const match = userAgent.match(/Android (\d+\.\d+)/);
        return match ? match[1] : null;
      }
      default:
        return null;
    }
  }

  /**
   * Gets a complete object containing all OS information.
   * 
   * @returns {Object} Object containing platform, architecture, and version info
   * @public
   * @static
   */
  static getOSInfo(): {
    platform: string;
    architecture: string;
    version: string | null;
    isMobile: boolean;
    isDesktop: boolean;
  } {
    return {
      platform: this.getPlatform(),
      architecture: this.getArchitecture(),
      version: this.getVersion(),
      isMobile: this.isMobile(),
      isDesktop: this.isDesktop()
    };
  }
}