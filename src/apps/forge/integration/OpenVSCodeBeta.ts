export interface OpenVSCodeBetaLaunchOptions {
  baseUrl: string;
  gameKey?: string;
  promptMessage?: string;
  openExternal?: (url: string) => void;
}

function normalizeGameKey(gameKey?: string): string {
  const key = (gameKey || "").toLowerCase();
  if (key === "kotor" || key === "tsl") return key;
  if (key === "kotor2") return "tsl";
  return "kotor";
}

export function buildOpenVSCodeBetaUrl(baseUrl: string, gameKey?: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed, window.location.origin);
    parsed.searchParams.set("game", normalizeGameKey(gameKey));
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function launchOpenVSCodeBeta(options: OpenVSCodeBetaLaunchOptions): boolean {
  const url = buildOpenVSCodeBetaUrl(options.baseUrl, options.gameKey);
  if (!url) return false;

  const promptMessage = options.promptMessage
    || "OpenVSCode (beta) is experimental. Start a hosted editor session now?";
  const accepted = window.confirm(promptMessage);
  if (!accepted) return false;

  if (typeof options.openExternal === "function") {
    options.openExternal(url);
  } else {
    window.open(url, "_blank");
  }

  return true;
}
