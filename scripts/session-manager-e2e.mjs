const sessionBaseUrl = process.env.FORGE_SESSION_MANAGER_BASE_URL || 'http://127.0.0.1:8090';
const openVsCodeUrl = process.env.OPENVSCODE_BASE_URL || 'http://127.0.0.1:18080';
const adminToken = process.env.FORGE_SESSION_MANAGER_ADMIN_TOKEN || '';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) {
    headers['content-type'] = 'application/json';
  }
  if (token) {
    headers['x-session-token'] = token;
  }
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }
  const response = await fetch(`${sessionBaseUrl}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function requestText(path, { method = 'GET', token } = {}) {
  const headers = {};
  if (token) {
    headers['x-session-token'] = token;
  }
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }

  const response = await fetch(`${sessionBaseUrl}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
  });
  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${payload}`);
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForOpenVsCode() {
  const response = await fetch(openVsCodeUrl);
  assert(response.ok, `OpenVSCode should respond at ${openVsCodeUrl}`);
}

async function main() {
  console.log(`[e2e] checking OpenVSCode at ${openVsCodeUrl}`);
  await waitForOpenVsCode();

  console.log(`[e2e] checking session manager health at ${sessionBaseUrl}`);
  const health = await requestJson('/healthz');
  assert(health.ok === true, 'healthz response should be ok=true');

  console.log('[e2e] creating session');
  const session = await requestJson('/api/sessions', {
    method: 'POST',
    body: { userId: 'ci-user', game: 'kotor' },
  });
  const sessionId = session.id;
  const sessionToken = session.token;
  assert(typeof sessionId === 'string' && sessionId.length > 0, 'session id should be returned');
  assert(typeof sessionToken === 'string' && sessionToken.length > 0, 'session token should be returned');
  assert(typeof session.accessUrl === 'string' && session.accessUrl.length > 0, 'session access URL should be returned');
  assert(session.containerStatus === 'start_requested', 'new session should request container start');

  const startEvents = await requestJson('/api/events');
  assert(
    Array.isArray(startEvents.events) && startEvents.events.some((event) => event.type === 'session_container_start_requested' && event.sessionId === sessionId),
    'container start-request event should be emitted on creation'
  );
  const statsAfterCreate = await requestJson('/api/stats');
  assert(statsAfterCreate.activeSessions >= 1, 'stats should report at least one active session after creation');
  const metricsAfterCreate = await requestText('/api/metrics');
  assert(metricsAfterCreate.includes('forge_session_manager_sessions_total'), 'metrics output should include session totals');

  await requestJson(`/api/sessions/${sessionId}/container-ready`, {
    method: 'POST',
    token: sessionToken,
    body: { containerId: 'ci-container-1', upstreamUrl: openVsCodeUrl },
  });
  const readySession = await requestJson(`/api/sessions/${sessionId}`, { token: sessionToken });
  assert(readySession.containerStatus === 'ready', 'session should become ready after container-ready acknowledgement');
  assert(readySession.containerUpstreamUrl === openVsCodeUrl, 'session should persist container upstream url');
  const proxyResponse = await fetch(session.accessUrl);
  assert(proxyResponse.ok, 'proxy access URL should route to OpenVSCode upstream when container ready');

  const resumed = await requestJson('/api/sessions/resume', {
    method: 'POST',
    body: { userId: 'ci-user', game: 'kotor' },
  });
  assert(resumed.id === sessionId, 'resume endpoint should return existing active session');
  assert(typeof resumed.accessUrl === 'string' && resumed.accessUrl.includes(`/sessions/${sessionId}`), 'resume should include stable proxied session access URL');

  await requestJson(`/api/sessions/${sessionId}/heartbeat`, { method: 'POST', token: sessionToken });

  // warning window
  await sleep(1300);
  const warningEval = await requestJson('/api/timeouts/evaluate', { method: 'POST' });
  assert(
    Array.isArray(warningEval.events) && warningEval.events.some((event) => event.type === 'session_warning' && event.sessionId === sessionId),
    'warning event should be emitted before expiry'
  );

  // save request at/after expiry
  await sleep(1100);
  const saveEval = await requestJson('/api/timeouts/evaluate', { method: 'POST' });
  assert(
    Array.isArray(saveEval.events) && saveEval.events.some((event) => event.type === 'session_save_requested' && event.sessionId === sessionId),
    'save request event should be emitted at expiry'
  );

  const sessionAfterSaveRequest = await requestJson(`/api/sessions/${sessionId}`, { token: sessionToken });
  assert(sessionAfterSaveRequest.status === 'saving', 'session should remain in saving state before save-complete');

  await requestJson(`/api/sessions/${sessionId}/save-complete`, { method: 'POST', token: sessionToken });
  const expiredEval = await requestJson('/api/timeouts/evaluate', { method: 'POST' });
  assert(
    Array.isArray(expiredEval.events) && expiredEval.events.some((event) => event.type === 'session_expired' && event.sessionId === sessionId),
    'session should expire only after save-complete'
  );
  assert(
    Array.isArray(expiredEval.events) && expiredEval.events.some((event) => event.type === 'session_container_stop_requested' && event.sessionId === sessionId),
    'container stop-request should be emitted when session expires'
  );

  await requestJson(`/api/sessions/${sessionId}/container-stopped`, { method: 'POST', token: sessionToken });
  const stopEvents = await requestJson('/api/events');
  assert(
    Array.isArray(stopEvents.events) && stopEvents.events.some((event) => event.type === 'session_container_stopped' && event.sessionId === sessionId),
    'container stopped event should be emitted after container stop acknowledgement'
  );

  const finalSession = await requestJson(`/api/sessions/${sessionId}`, { token: sessionToken });
  assert(finalSession.status === 'expired', 'session status should be expired at end of lifecycle');
  assert(finalSession.containerStatus === 'stopped', 'container status should be stopped after acknowledgement');
  const statsAtEnd = await requestJson('/api/stats');
  assert(statsAtEnd.expiredSessions >= 1, 'stats should report expired sessions at lifecycle end');

  console.log('[e2e] session manager lifecycle checks passed');
}

main().catch((error) => {
  console.error('[e2e] failed', error);
  process.exit(1);
});
