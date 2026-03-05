export interface OpenVSCodeBetaLaunchOptions {
  baseUrl?: string;
  sessionManagerUrl?: string;
  openVSCodeBaseUrl?: string;
  sessionUrlTemplate?: string;
  userId?: string;
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

interface SessionCreateResponse {
  id: string;
  game: string;
  [key: string]: unknown;
}

function fillTemplate(template: string, values: Record<string, string>): string {
  let output = template;
  Object.entries(values).forEach(([key, value]) => {
    output = output.replaceAll(`{${key}}`, value);
  });
  return output;
}

async function requestHostedSession(options: OpenVSCodeBetaLaunchOptions): Promise<SessionCreateResponse | null> {
  if (!options.sessionManagerUrl) return null;

  const createUrl = new URL("/api/sessions", options.sessionManagerUrl).toString();
  const response = await fetch(createUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      userId: options.userId || "forge-user",
      game: normalizeGameKey(options.gameKey),
    }),
  });

  if (!response.ok) {
    throw new Error(`Session creation failed (${response.status})`);
  }

  return await response.json() as SessionCreateResponse;
}

function buildHostedSessionUrl(session: SessionCreateResponse | null, options: OpenVSCodeBetaLaunchOptions): string {
  const game = normalizeGameKey(options.gameKey);
  const openVSCodeBaseUrl = options.openVSCodeBaseUrl || options.baseUrl || "";
  if (!openVSCodeBaseUrl) return "";

  if (session && options.sessionUrlTemplate) {
    const templated = fillTemplate(options.sessionUrlTemplate, {
      sessionId: String(session.id),
      game,
      openVSCodeBaseUrl,
    });
    return buildOpenVSCodeBetaUrl(templated, game);
  }

  if (session) {
    const parsed = new URL(openVSCodeBaseUrl, window.location.origin);
    parsed.searchParams.set("sessionId", String(session.id));
    parsed.searchParams.set("game", game);
    return parsed.toString();
  }

  return buildOpenVSCodeBetaUrl(openVSCodeBaseUrl, game);
}

export async function launchOpenVSCodeBeta(options: OpenVSCodeBetaLaunchOptions): Promise<boolean> {
  const fallbackUrl = buildOpenVSCodeBetaUrl(options.baseUrl || options.openVSCodeBaseUrl || "", options.gameKey);
  if (!fallbackUrl && !options.sessionManagerUrl) return false;

  const promptMessage = options.promptMessage
    || "OpenVSCode (beta) is experimental. Start a hosted editor session now?\n\nYou will be warned before timeout and work will be autosaved.";
  const accepted = window.confirm(promptMessage);
  if (!accepted) return false;

  let targetUrl = fallbackUrl;
  try {
    const session = await requestHostedSession(options);
    targetUrl = buildHostedSessionUrl(session, options) || targetUrl;
  } catch (e) {
    console.warn("OpenVSCode beta session creation failed, falling back to direct URL", e);
  }

  if (!targetUrl) return false;

  if (typeof options.openExternal === "function") {
    options.openExternal(targetUrl);
  } else {
    window.open(targetUrl, "_blank");
  }

  return true;
}
