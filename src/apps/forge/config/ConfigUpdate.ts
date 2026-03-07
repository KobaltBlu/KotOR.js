/**
 * ConfigUpdate – fetch remote version info and compare (ported from Holocron Toolset config_update).
 * Uses fetch for GitHub API; no Qt/widgets.
 */

import { LOCAL_PROGRAM_INFO } from "./ConfigInfo";

export interface RemoteUpdateInfo {
  currentVersion?: string;
  toolsetLatestVersion?: string;
  toolsetLatestBetaVersion?: string;
  toolsetLatestNotes?: string;
  toolsetLatestBetaNotes?: string;
  toolsetDownloadLink?: string;
  [key: string]: unknown;
}

/**
 * Fetch JSON from an update info URL. For GitHub contents API, response has { content: base64 }.
 * Supports: 1) Holocron-style JSON block with <---JSON_START---> markers, 2) plain JSON (e.g. package.json with "version").
 */
export async function fetchUpdateInfo(
  updateLink: string,
  timeoutMs: number = 15000
): Promise<RemoteUpdateInfo> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(updateLink, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data && typeof data.content === "string") {
      const decoded = atob(data.content.replace(/\s/g, ""));
      const str = new TextDecoder("utf-8").decode(Uint8Array.from(decoded, (c) => c.charCodeAt(0)));
      const jsonMatch = str.match(/<---JSON_START--->\s*#\s*(\{[\s\S]*?\})\s*#\s*<---JSON_END--->/);
      if (jsonMatch) {
        const cleaned = jsonMatch[1].replace(/,(\s*[}\]])/g, "$1");
        return JSON.parse(cleaned) as RemoteUpdateInfo;
      }
      const parsed = JSON.parse(str) as Record<string, unknown>;
      if (typeof parsed.version === "string") {
        return { toolsetLatestVersion: parsed.version, currentVersion: parsed.version };
      }
      return parsed as RemoteUpdateInfo;
    }
    if (data && typeof data.version === "string") {
      return { toolsetLatestVersion: data.version, currentVersion: data.version };
    }
    return data as RemoteUpdateInfo;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Get remote toolset/Forge update info. Uses LOCAL_PROGRAM_INFO links.
 * On failure returns the local info so the app can still run.
 */
export async function getRemoteToolsetUpdateInfo(
  options: { useBetaChannel?: boolean; silent?: boolean } = {}
): Promise<RemoteUpdateInfo | Error> {
  const { useBetaChannel = false, silent = false } = options;
  const updateLink = useBetaChannel
    ? LOCAL_PROGRAM_INFO.updateBetaInfoLink
    : LOCAL_PROGRAM_INFO.updateInfoLink;
  const timeout = silent ? 2000 : 10000;
  try {
    const info = await fetchUpdateInfo(updateLink, timeout);
    return (info && typeof info === "object" ? info : LOCAL_PROGRAM_INFO) as RemoteUpdateInfo;
  } catch (e) {
    if (!silent) console.warn("Update check failed:", e);
    return e instanceof Error ? e : new Error(String(e));
  }
}

/**
 * Compare version strings (e.g. "2.0.1" > "2.0.0").
 * Returns true if remote is newer than local, false if same/older, undefined if unparseable.
 */
export function isRemoteVersionNewer(localVersion: string, remoteVersion: string): boolean | undefined {
  try {
    const l = parseVersion(localVersion);
    const r = parseVersion(remoteVersion);
    if (l == null || r == null) return undefined;
    for (let i = 0; i < Math.max(l.length, r.length); i++) {
      const a = l[i] ?? 0;
      const b = r[i] ?? 0;
      if (b > a) return true;
      if (b < a) return false;
    }
    return false;
  } catch {
    return undefined;
  }
}

function parseVersion(v: string): number[] | null {
  const parts = v.replace(/^v/i, "").split(".");
  const out: number[] = [];
  for (const p of parts) {
    const num = parseInt(p, 10);
    if (Number.isNaN(num)) return null;
    out.push(num);
  }
  return out.length ? out : null;
}
