import * as http from 'http';
import * as path from 'path';

import { ForgeSession, SessionManagerCore } from './SessionManagerCore';

const PORT = Number(process.env.FORGE_SESSION_MANAGER_PORT || 8090);
const DATA_ROOT = process.env.FORGE_SESSION_MANAGER_DATA_ROOT || path.resolve(process.cwd(), 'services/forge-vscode-session-manager/data');
const MAX_SESSIONS = Number(process.env.FORGE_SESSION_MANAGER_MAX_SESSIONS || 8);
const SESSION_TTL_MS = Number(process.env.FORGE_SESSION_MANAGER_TTL_MS || 45 * 60 * 1000);
const WARNING_LEAD_MS = Number(process.env.FORGE_SESSION_MANAGER_WARNING_MS || 5 * 60 * 1000);
const ADMIN_TOKEN = String(process.env.FORGE_SESSION_MANAGER_ADMIN_TOKEN || '').trim();
const OPENVSCODE_BASE_URL = process.env.FORGE_OPENVSCODE_BASE_URL || 'http://127.0.0.1:18080';
const PUBLIC_BASE_URL = process.env.FORGE_SESSION_MANAGER_PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`;

const manager = new SessionManagerCore({
  dataRoot: DATA_ROOT,
  maxSessions: MAX_SESSIONS,
  sessionTtlMs: SESSION_TTL_MS,
  warningLeadMs: WARNING_LEAD_MS,
});

function writeJson(res: http.ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>;
}

function parseSessionId(urlPath: string): string | null {
  const parts = urlPath.split('/').filter(Boolean);
  const sessionsIndex = parts.indexOf('sessions');
  if (sessionsIndex < 0 || sessionsIndex + 1 >= parts.length) return null;
  return parts[sessionsIndex + 1];
}

function readSessionToken(req: http.IncomingMessage, url: URL): string | undefined {
  const fromHeader = req.headers['x-session-token'];
  if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) {
    return fromHeader.trim();
  }
  const fromQuery = url.searchParams.get('token');
  if (fromQuery && fromQuery.trim().length > 0) {
    return fromQuery.trim();
  }
  return undefined;
}

function readAdminToken(req: http.IncomingMessage, url: URL): string | undefined {
  const fromHeader = req.headers['x-admin-token'];
  if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) {
    return fromHeader.trim();
  }
  const fromQuery = url.searchParams.get('adminToken');
  if (fromQuery && fromQuery.trim().length > 0) {
    return fromQuery.trim();
  }
  return undefined;
}

function isAdminRequest(req: http.IncomingMessage, url: URL): boolean {
  if (!ADMIN_TOKEN) return false;
  const provided = readAdminToken(req, url);
  return Boolean(provided && provided === ADMIN_TOKEN);
}

function buildSessionAccessUrl(session: ForgeSession, includeToken: boolean): string {
  const base = new URL(session.sessionPath, PUBLIC_BASE_URL);
  base.searchParams.set('game', session.game);
  if (includeToken) {
    base.searchParams.set('token', session.token);
  }
  return base.toString();
}

function sessionResponse(session: ForgeSession, includeToken = false): Record<string, unknown> {
  const base = {
    id: session.id,
    userId: session.userId,
    game: session.game,
    createdAt: session.createdAt,
    lastHeartbeatAt: session.lastHeartbeatAt,
    warningAt: session.warningAt,
    expiresAt: session.expiresAt,
    workspacePath: session.workspacePath,
    sessionPath: session.sessionPath,
    status: session.status,
    containerStatus: session.containerStatus,
    containerId: session.containerId,
    containerUpstreamUrl: session.containerUpstreamUrl,
    containerError: session.containerError,
    containerReadyAt: session.containerReadyAt,
    containerStopRequestedAt: session.containerStopRequestedAt,
    containerStoppedAt: session.containerStoppedAt,
    warningSentAt: session.warningSentAt,
    saveRequestedAt: session.saveRequestedAt,
    saveCompletedAt: session.saveCompletedAt,
  };
  return {
    ...base,
    ...(includeToken ? { token: session.token } : {}),
    accessUrl: buildSessionAccessUrl(session, includeToken),
    warningInMs: Math.max(0, session.warningAt - Date.now()),
    expiresInMs: Math.max(0, session.expiresAt - Date.now()),
  };
}

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'x-session-token',
  'x-admin-token',
]);

function createProxyHeaders(req: http.IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (typeof value === 'undefined') continue;
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

async function readRequestBody(req: http.IncomingMessage): Promise<Buffer | undefined> {
  if ((req.method || 'GET') === 'GET' || (req.method || 'GET') === 'HEAD') {
    return undefined;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function proxySessionRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  requestUrl: URL,
  session: ForgeSession,
  token: string
): Promise<void> {
    if (session.status === 'expired' || session.status === 'closed') {
    writeJson(res, 410, { error: `Session ${session.id} is no longer active` });
    return;
  }

    if (session.containerStatus !== 'ready') {
    writeJson(res, 503, {
      error: `Session container not ready (${session.containerStatus})`,
      sessionId: session.id,
        reason: session.containerError || null,
    });
    return;
  }

  const basePath = session.sessionPath.endsWith('/') ? session.sessionPath.slice(0, -1) : session.sessionPath;
  const suffixPath = requestUrl.pathname.startsWith(basePath)
    ? requestUrl.pathname.slice(basePath.length) || '/'
    : '/';
  const upstreamUrl = session.containerUpstreamUrl || OPENVSCODE_BASE_URL;
  const target = new URL(suffixPath, upstreamUrl);

  const query = new URLSearchParams(requestUrl.searchParams);
  query.delete('token');
  query.delete('adminToken');
  target.search = query.toString();

  const headers = createProxyHeaders(req);
  const body = await readRequestBody(req);
  const proxiedResponse = await fetch(target.toString(), {
    method: req.method || 'GET',
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });

  const heartbeatNow = Date.now();
  manager.heartbeat(session.id, token, heartbeatNow);

  res.statusCode = proxiedResponse.status;
  for (const [key, value] of proxiedResponse.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    res.setHeader(key, value);
  }

  const responseBuffer = Buffer.from(await proxiedResponse.arrayBuffer());
  res.end(responseBuffer);
}

function resolveAuthorizedSession(
  req: http.IncomingMessage,
  url: URL,
  sessionId: string
): { session: ForgeSession; token: string } {
  const token = readSessionToken(req, url);
  if (token) {
    return {
      session: manager.getAuthorizedSession(sessionId, token),
      token,
    };
  }

  if (isAdminRequest(req, url)) {
    const session = manager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return {
      session,
      token: session.token,
    };
  }

  throw new Error('Missing session token');
}

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname;

  try {
    if (method === 'GET' && pathname === '/healthz') {
      writeJson(res, 200, { ok: true });
      return;
    }

    if (pathname.startsWith('/sessions/')) {
      const sessionId = parseSessionId(pathname);
      if (!sessionId) {
        writeJson(res, 400, { error: 'Invalid session id' });
        return;
      }

      const auth = resolveAuthorizedSession(req, url, sessionId);
      await proxySessionRequest(req, res, url, auth.session, auth.token);
      return;
    }

    if (method === 'GET' && pathname === '/api/config') {
      writeJson(res, 200, {
        maxSessions: MAX_SESSIONS,
        sessionTtlMs: SESSION_TTL_MS,
        warningLeadMs: WARNING_LEAD_MS,
        openVSCodeBaseUrl: OPENVSCODE_BASE_URL,
        publicBaseUrl: PUBLIC_BASE_URL,
        adminTokenEnabled: Boolean(ADMIN_TOKEN),
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/sessions') {
      const body = await readJsonBody(req);
      const userId = String(body.userId || 'anonymous');
      const game = body.game === 'tsl' ? 'tsl' : 'kotor';
      const resumeExisting = Boolean(body.resumeExisting);
      const session = resumeExisting
        ? manager.createOrResumeSession(userId, game)
        : manager.createSession(userId, game);
      writeJson(res, 201, sessionResponse(session, true));
      return;
    }

    if (method === 'POST' && pathname === '/api/sessions/resume') {
      const body = await readJsonBody(req);
      const userId = String(body.userId || 'anonymous');
      const game = body.game === 'tsl' ? 'tsl' : 'kotor';
      const session = manager.createOrResumeSession(userId, game);
      writeJson(res, 200, sessionResponse(session, true));
      return;
    }

    if (method === 'GET' && pathname === '/api/sessions') {
      const includeTokens = isAdminRequest(req, url) && url.searchParams.get('includeTokens') === '1';
      writeJson(res, 200, manager.listSessions().map((session) => sessionResponse(session, includeTokens)));
      return;
    }

    if (pathname.startsWith('/api/sessions/')) {
      const sessionId = parseSessionId(pathname);
      if (!sessionId) {
        writeJson(res, 400, { error: 'Invalid session id' });
        return;
      }

      if (method === 'GET') {
        const auth = resolveAuthorizedSession(req, url, sessionId);
        const session = auth.session;
        if (!session) {
          writeJson(res, 404, { error: 'Session not found' });
          return;
        }
        writeJson(res, 200, sessionResponse(session, isAdminRequest(req, url) || auth.token === session.token));
        return;
      }

      if (method === 'DELETE') {
        const auth = resolveAuthorizedSession(req, url, sessionId);
        const session = manager.closeSession(sessionId, auth.token);
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'POST' && pathname.endsWith('/heartbeat')) {
        const auth = resolveAuthorizedSession(req, url, sessionId);
        const session = manager.heartbeat(sessionId, auth.token);
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'POST' && pathname.endsWith('/save-complete')) {
        const auth = resolveAuthorizedSession(req, url, sessionId);
        const session = manager.markSaveCompleted(sessionId, auth.token);
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'POST' && pathname.endsWith('/container-ready')) {
        const auth = resolveAuthorizedSession(req, url, sessionId);
        const body = await readJsonBody(req);
        const requestedContainerId = typeof body.containerId === 'string'
          ? body.containerId
          : (auth.session.containerId || `container-${sessionId}`);
        const requestedUpstreamUrl = typeof body.upstreamUrl === 'string' ? body.upstreamUrl : undefined;
        const session = manager.markContainerReady(sessionId, auth.token, requestedContainerId, {
          upstreamUrl: requestedUpstreamUrl,
        });
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'POST' && pathname.endsWith('/container-stopped')) {
        const auth = resolveAuthorizedSession(req, url, sessionId);
        const session = manager.markContainerStopped(sessionId, auth.token);
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'POST' && pathname.endsWith('/container-failed')) {
        const auth = resolveAuthorizedSession(req, url, sessionId);
        const body = await readJsonBody(req);
        const reason = typeof body.reason === 'string' && body.reason.trim().length
          ? body.reason.trim()
          : 'container startup failed';
        const session = manager.markContainerFailed(sessionId, auth.token, reason);
        writeJson(res, 200, sessionResponse(session));
        return;
      }
    }

    if (method === 'POST' && pathname === '/api/timeouts/evaluate') {
      const events = manager.evaluateTimeouts();
      writeJson(res, 200, { events });
      return;
    }

    if (method === 'GET' && pathname === '/api/events') {
      writeJson(res, 200, { events: manager.drainEvents() });
      return;
    }

    writeJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const message = String(error);
    if (message.includes('Unauthorized session token') || message.includes('Missing session token')) {
      writeJson(res, 401, { error: message });
      return;
    }
    if (message.includes('Session not found:')) {
      writeJson(res, 404, { error: message });
      return;
    }
    writeJson(res, 500, { error: message });
  }
});

setInterval(() => {
  manager.evaluateTimeouts();
}, 5000);

server.listen(PORT, () => {
  console.log(`Forge VSCode session manager listening on :${PORT}`);
  console.log(`Data root: ${DATA_ROOT}`);
});
