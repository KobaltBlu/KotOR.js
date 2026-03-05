const sessionManagerBaseUrl = process.env.FORGE_SESSION_MANAGER_BASE_URL || 'http://127.0.0.1:8090';
const adminToken = process.env.FORGE_SESSION_MANAGER_ADMIN_TOKEN || '';
const pollIntervalMs = Number(process.env.FORGE_SESSION_ORCHESTRATOR_POLL_MS || 2000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function handleEvent(event) {
  if (!event || typeof event !== 'object') return;
  const sessionId = String(event.sessionId || '');
  if (!sessionId) return;

  if (event.type === 'session_container_start_requested') {
    const session = await getSessionWithToken(sessionId);
    await requestJson(`/api/sessions/${sessionId}/container-ready`, {
      method: 'POST',
      body: {
        containerId: session.containerId || `openvscode-${sessionId}`,
      },
    });
    console.log(`[orchestrator] session ${sessionId} container marked ready`);
    return;
  }

  if (event.type === 'session_container_stop_requested') {
    const session = await getSessionWithToken(sessionId);
    await requestJson(`/api/sessions/${sessionId}/container-stopped`, { method: 'POST' });
    console.log(`[orchestrator] session ${sessionId} container marked stopped`);
  }
}

async function loop() {
  console.log(`[orchestrator] polling ${sessionManagerBaseUrl} every ${pollIntervalMs}ms`);
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
