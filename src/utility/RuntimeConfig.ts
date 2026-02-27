export type RuntimeConfigShape = {
  /**
   * Public path prefix the app is served under.
   * Examples: "", "/", "/kotor"
   */
  basePath?: string;
};

function normalizeBasePath(input: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim().replace(/\/{2,}/g, "/");
  if (trimmed === "" || trimmed === "/") return "";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}

function joinUrlPath(basePath: string, path: string): string {
  const base = normalizeBasePath(basePath);
  const rawPath = typeof path === "string" ? path : "";
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${base}${normalizedPath}`.replace(/\/{2,}/g, "/");
}

export class RuntimeConfig {
  static getRaw(): RuntimeConfigShape {
    const w = globalThis as any;
    const cfg = w?.RUNTIME_CONFIG ?? w?.__RUNTIME_CONFIG__ ?? w?.APP_CONFIG ?? {};
    return (cfg && typeof cfg === "object") ? (cfg as RuntimeConfigShape) : {};
  }

  static getBasePath(): string {
    return normalizeBasePath(RuntimeConfig.getRaw().basePath);
  }

  /**
   * Converts a path like "/game/index.html" into a public URL honoring `basePath`.
   */
  static toPublicUrl(path: string): string {
    return joinUrlPath(RuntimeConfig.getBasePath(), path);
  }
}

export const __private__ = {
  normalizeBasePath,
  joinUrlPath,
};


