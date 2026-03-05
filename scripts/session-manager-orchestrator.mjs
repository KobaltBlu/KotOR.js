import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import net from 'node:net';

const execFileAsync = promisify(execFile);

const sessionManagerBaseUrl = process.env.FORGE_SESSION_MANAGER_BASE_URL || 'http://127.0.0.1:8090';
const adminToken = process.env.FORGE_SESSION_MANAGER_ADMIN_TOKEN || '';
const pollIntervalMs = Number(process.env.FORGE_SESSION_ORCHESTRATOR_POLL_MS || 2000);
const orchestratorMode = (process.env.FORGE_SESSION_ORCHESTRATOR_MODE || 'mock').toLowerCase();
const mockUpstreamUrl = process.env.FORGE_OPENVSCODE_BASE_URL || 'http://127.0.0.1:18080';
const dockerImage = process.env.FORGE_SESSION_ORCHESTRATOR_DOCKER_IMAGE || 'gitpod/openvscode-server:latest';
const dockerHost = process.env.FORGE_SESSION_ORCHESTRATOR_DOCKER_HOST || '127.0.0.1';
const dockerDataDir = process.env.FORGE_SESSION_ORCHESTRATOR_DOCKER_DATA_DIR || '/home/workspace/.openvscode-data';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeError(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function requestJson(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) {
    headers['content-type'] = 'application/json';
  }
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }

  const response = await fetch(`${sessionManagerBaseUrl}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function getSessionWithToken(sessionId) {
  const session = await requestJson(`/api/sessions/${sessionId}`);
  if (typeof session.token !== 'string' || session.token.length === 0) {
    throw new Error(`Session token unavailable for ${sessionId}; ensure admin token is configured`);
  }
  return session;
}

function sanitizeSessionId(sessionId) {
  return sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase();
}

async function reserveFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to reserve dynamic port'));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function removeContainerByName(containerName) {
  try {
    await execFileAsync('docker', ['rm', '-f', containerName]);
  } catch {
    // ignore when absent
  }
}

async function startDockerContainer(session) {
  const safeId = sanitizeSessionId(session.id);
  const containerName = `forge-openvscode-${safeId}`;
  const hostPort = await reserveFreePort();
  await removeContainerByName(containerName);

  const args = [
    'run',
    '-d',
    '--name',
    containerName,
    '-p',
    `${hostPort}:3000`,
    '-v',
    `${session.workspacePath}:/home/workspace`,
    dockerImage,
    '--host',
    '0.0.0.0',
    '--port',
    '3000',
    '--without-connection-token',
    '--server-data-dir',
    dockerDataDir,
  ];
  const result = await execFileAsync('docker', args);
  const containerId = (result.stdout || '').trim().split('\n').pop() || containerName;
  const upstreamUrl = `http://${dockerHost}:${hostPort}`;
  return { containerId, upstreamUrl };
}

async function stopDockerContainer(session) {
  if (session.containerId && session.containerId.length > 0) {
    await execFileAsync('docker', ['rm', '-f', session.containerId]);
    return;
  }
  const safeId = sanitizeSessionId(session.id);
  await removeContainerByName(`forge-openvscode-${safeId}`);
}

async function markSessionFailed(sessionId, reason) {
  await requestJson(`/api/sessions/${sessionId}/container-failed`, {
    method: 'POST',
    body: { reason: String(reason || 'orchestration failure') },
  });
}

async function handleEvent(event) {
  if (!event || typeof event !== 'object') return;
  const sessionId = String(event.sessionId || '');
  if (!sessionId) return;

  if (event.type === 'session_container_start_requested') {
    try {
      const session = await getSessionWithToken(sessionId);
      if (orchestratorMode === 'docker') {
        const started = await startDockerContainer(session);
        await requestJson(`/api/sessions/${sessionId}/container-ready`, {
          method: 'POST',
          body: {
            containerId: started.containerId,
            upstreamUrl: started.upstreamUrl,
          },
        });
        console.log(`[orchestrator] session ${sessionId} docker container ready ${started.upstreamUrl}`);
      } else {
        await requestJson(`/api/sessions/${sessionId}/container-ready`, {
          method: 'POST',
          body: {
            containerId: session.containerId || `openvscode-${sessionId}`,
            upstreamUrl: mockUpstreamUrl,
          },
        });
        console.log(`[orchestrator] session ${sessionId} mock container marked ready`);
      }
    } catch (error) {
      const reason = normalizeError(error);
      await markSessionFailed(sessionId, reason);
      console.error(`[orchestrator] failed to start container for ${sessionId}`, error);
    }
    return;
  }

  if (event.type === 'session_container_stop_requested') {
    try {
      const session = await getSessionWithToken(sessionId);
      if (orchestratorMode === 'docker') {
        await stopDockerContainer(session);
      }
      await requestJson(`/api/sessions/${sessionId}/container-stopped`, { method: 'POST' });
      console.log(`[orchestrator] session ${sessionId} container marked stopped`);
    } catch (error) {
      const reason = normalizeError(error);
      await markSessionFailed(sessionId, reason);
      console.error(`[orchestrator] failed to stop container for ${sessionId}`, error);
    }
  }
}

async function loop() {
  console.log(`[orchestrator] mode=${orchestratorMode} polling ${sessionManagerBaseUrl} every ${pollIntervalMs}ms`);
  while (true) {
    try {
      const payload = await requestJson('/api/events');
      const events = Array.isArray(payload.events) ? payload.events : [];
      for (const event of events) {
        await handleEvent(event);
      }
    } catch (error) {
      console.error('[orchestrator] poll error', error);
    }
    await sleep(pollIntervalMs);
  }
}

loop().catch((error) => {
  console.error('[orchestrator] fatal', error);
  process.exit(1);
});
