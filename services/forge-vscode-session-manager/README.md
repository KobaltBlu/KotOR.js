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
- `GET /api/sessions`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/heartbeat`
- `POST /api/sessions/:id/save-complete`
- `DELETE /api/sessions/:id`
- `POST /api/timeouts/evaluate`
- `GET /api/events`

## Notes

- Workspace directories are persisted under `data/workspaces/<sessionId>` (not tmpfs).
- Session metadata is persisted under `data/sessions/<sessionId>.json`.
- This service is intentionally orchestration-focused; container launch/proxy wiring can be layered on top in the next phase.
