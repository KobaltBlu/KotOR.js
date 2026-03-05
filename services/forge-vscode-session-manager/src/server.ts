import * as http from 'http';
import * as path from 'path';

import { ForgeSession, SessionManagerCore } from './SessionManagerCore';

const PORT = Number(process.env.FORGE_SESSION_MANAGER_PORT || 8090);
const DATA_ROOT = process.env.FORGE_SESSION_MANAGER_DATA_ROOT || path.resolve(process.cwd(), 'services/forge-vscode-session-manager/data');
const MAX_SESSIONS = Number(process.env.FORGE_SESSION_MANAGER_MAX_SESSIONS || 8);
const SESSION_TTL_MS = Number(process.env.FORGE_SESSION_MANAGER_TTL_MS || 45 * 60 * 1000);
const WARNING_LEAD_MS = Number(process.env.FORGE_SESSION_MANAGER_WARNING_MS || 5 * 60 * 1000);

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

function sessionResponse(session: ForgeSession): Record<string, unknown> {
  return {
    ...session,
    warningInMs: Math.max(0, session.warningAt - Date.now()),
    expiresInMs: Math.max(0, session.expiresAt - Date.now()),
  };
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

    if (method === 'GET' && pathname === '/api/config') {
      writeJson(res, 200, {
        maxSessions: MAX_SESSIONS,
        sessionTtlMs: SESSION_TTL_MS,
        warningLeadMs: WARNING_LEAD_MS,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/sessions') {
      const body = await readJsonBody(req);
      const userId = String(body.userId || 'anonymous');
      const game = body.game === 'tsl' ? 'tsl' : 'kotor';
      const session = manager.createSession(userId, game);
      writeJson(res, 201, sessionResponse(session));
      return;
    }

    if (method === 'GET' && pathname === '/api/sessions') {
      writeJson(res, 200, manager.listSessions().map(sessionResponse));
      return;
    }

    if (pathname.startsWith('/api/sessions/')) {
      const sessionId = parseSessionId(pathname);
      if (!sessionId) {
        writeJson(res, 400, { error: 'Invalid session id' });
        return;
      }

      if (method === 'GET') {
        const session = manager.getSession(sessionId);
        if (!session) {
          writeJson(res, 404, { error: 'Session not found' });
          return;
        }
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'DELETE') {
        const session = manager.closeSession(sessionId);
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'POST' && pathname.endsWith('/heartbeat')) {
        const session = manager.heartbeat(sessionId);
        writeJson(res, 200, sessionResponse(session));
        return;
      }

      if (method === 'POST' && pathname.endsWith('/save-complete')) {
        const session = manager.markSaveCompleted(sessionId);
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
    writeJson(res, 500, { error: String(error) });
  }
});

setInterval(() => {
  manager.evaluateTimeouts();
}, 5000);

server.listen(PORT, () => {
  console.log(`Forge VSCode session manager listening on :${PORT}`);
  console.log(`Data root: ${DATA_ROOT}`);
});
