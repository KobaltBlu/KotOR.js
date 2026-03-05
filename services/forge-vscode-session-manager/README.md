# Forge VS Code Session Manager

Session-orchestration service for **OpenVSCode (beta)** hosted sessions.

This is a TypeScript-first replacement path for the legacy `kotorscript-session-manager` flow, focused on:

- per-user session isolation,
- explicit capacity limits,
- timeout warning events,
- hard persistence semantics (request save, expire only after save confirmation).

## Runtime behavior

When timeout evaluation runs:

1. Session enters warning window (`session_warning` event).
2. At expiry, service emits `session_save_requested`.
3. Session transitions to `expired` **only after** `/save-complete` is acknowledged.

This enforces a "save before terminate" policy to prevent silent data loss.

## Endpoints

- `GET /healthz`
- `GET /api/config`
- `POST /api/sessions`
- `POST /api/sessions/resume`
- `GET /api/sessions`
- `GET /api/sessions/:id` *(requires `x-session-token`)*
- `POST /api/sessions/:id/heartbeat` *(requires `x-session-token`)*
- `POST /api/sessions/:id/save-complete` *(requires `x-session-token`)*
- `POST /api/sessions/:id/container-ready` *(requires `x-session-token`)*
- `POST /api/sessions/:id/container-stopped` *(requires `x-session-token`)*
- `DELETE /api/sessions/:id` *(requires `x-session-token`)*
- `POST /api/timeouts/evaluate`
- `GET /api/events`
- `* /sessions/:id/*` *(token-gated reverse proxy to OpenVSCode upstream)*

## Notes

- Workspace directories are persisted under `data/workspaces/<sessionId>` (not tmpfs).
- Session metadata is persisted under `data/sessions/<sessionId>.json`.
- Session creation returns a per-session token used to authorize sensitive operations.
- Resume endpoint returns the latest active session for a `(userId, game)` pair, or creates one.
- Session events now include container lifecycle hooks (`start_requested`, `ready`, `stop_requested`, `stopped`) for reverse proxy/orchestration workers.
- Optional admin operations can be enabled by setting `FORGE_SESSION_MANAGER_ADMIN_TOKEN` and supplying `x-admin-token`.
- `GET /api/sessions?includeTokens=1` returns tokenized access URLs when called with a valid admin token.
- Session responses now include `accessUrl` and `sessionPath` for tokenized proxied access routing.
- Configure `FORGE_SESSION_MANAGER_PUBLIC_BASE_URL` when external clients should use a public hostname instead of localhost.
- `scripts/session-manager-orchestrator.mjs` provides a polling orchestration worker that converts container lifecycle events into `/container-ready` and `/container-stopped` acknowledgements.

## Local compose stack

You can spin up OpenVSCode + the session manager with:

```bash
docker compose -f services/forge-vscode-session-manager/docker-compose.openvscode.yml up
```

Endpoints:

- Session manager: `http://127.0.0.1:8090`
- OpenVSCode: `http://127.0.0.1:18080`
- Orchestrator sidecar: auto-runs in compose and acknowledges container lifecycle events using admin token.
