# Local browser gameplay testing

This opt-in harness lets Assistant's **VS Code computer-use desktop** run KotOR.js against an installation already on the VS Code host. It does not upload the installation to an execution environment or package proprietary assets. The desktop still receives the asset bytes it needs to render/play, on demand over the VS Code loopback relay.

## Architecture and safety

- Build and serve on the VS Code host; browser/input run inside the disposable VS Code desktop container.
- The server binds **127.0.0.1 only**. Do not publish this port or reverse-proxy it publicly. Other trusted local host processes can reach loopback; this is not a multi-user hosting service.
- An allowlist exposes engine asset directories plus `chitin.key`, `dialog.tlk`, `patch.erf`, and `swkotor.ini`. Path traversal and symlinks are rejected. No source repository or arbitrary filesystem API is served.
- Original installation files are read-only to this server. Existing `saves/` are copied to a unique temporary directory. `gameinprogress/` starts empty. All writes/removals are restricted to those disposable state directories.
- Temporary saves are **deleted at clean shutdown** and projected state is discarded when the computer session ends. This is not durable save storage. Do not rely on a test session for your only copy of a save.
- No new game files, saves, package dependencies, bridge changes, host audio devices, security flags or public URLs are required.
- `adapter.js` is injected only by this server. Normal production HTML/engine builds do not include it. Its lazy, 1 MiB range reads retain at most 64 cache blocks to avoid one HTTP request per archive field.
- This tests the browser engine through a test filesystem adapter, **not the browser's native File System Access implementation**, native directory-picker persistence, or Electron.

## Start on the host

After applying this harness and the separate browser audio-startup fix, build the current source:

`npm run webpack:prod`

Start from `kotor.js-port`:

`node scripts/browser-test/server.mjs --game ../kotor.js/swkotor/swkotor --port 18765`

Then open `http://127.0.0.1:18765/game/?key=kotor`. Use `--fresh` to start with no copied save slots. The top-left badge identifies disposable test mode. Grant Access binds the adapter root without a native host directory picker. Accept the ordinary game EULA and click Begin.

Port 8080 was already occupied on the tested host; 18765 was used instead. Choose another free port if needed.

## Assistant / VS Code computer-use launch

Use `instructComputerAgent` with `runtime: vscode`, `rootName: kotor.js-port`, the **exact proposed patch revisions** in `patchSetIds`, and `serve`:

- command: `npm run webpack:prod > /tmp/kotor-browser-build.txt 2>&1 && node scripts/browser-test/server.mjs --game ../kotor.js/swkotor/swkotor --port 18765`
- port: `18765`
- readyTimeoutSeconds: `180`
- startUrl: `http://127.0.0.1:18765/game/?key=kotor`

Once patches are applied, use an empty discard projection over current disk instead. The managed session owns server/container cleanup. Do not manually connect to other containers or alter bridge protections.

## Desktop audio prerequisite

The tested desktop image has installed PipeWire libraries but no running audio service. Firefox can leave `AudioContext.resume()` pending indefinitely despite a genuine click when no backend exists. This is separate from autoplay permission.

**Inside the disposable desktop only:**

1. Download `http://127.0.0.1:18765/__desktop-audio.py` through Firefox. It saves as `kotor-desktop-audio.py`. The Firefox relay can access this URL; a plain container Python request to localhost cannot.
2. Run the downloaded, inspected script as the ordinary desktop user: `python3 ~/Downloads/kotor-desktop-audio.py --confirm-isolated-desktop` with `DISPLAY=:1`.
3. It starts three installed user processes: PipeWire core, session manager and Pulse compatibility, with a real software/null sink. It writes only unique `/tmp/kotor-audio-*` files and the disposable container user's Pulse client configuration (backing up any previous client config).
4. Quit Firefox **normally and wait for it to exit**, then relaunch using its original profile and ordinary options. In the tested image: `/usr/bin/firefox-esr --new-instance --no-remote --profile /tmp/assistant-firefox-profile --new-window 'http://127.0.0.1:18765/game/?key=kotor'`.
5. Click Begin with actual desktop input. The engine context should become `running`. Do not stub audio APIs, remove modals, disable browser sandboxing or skip initialization.

The script deliberately fails if required installed tools are unavailable; it performs no privileged installation. All its processes disappear with container disposal. It is **not intended to reconfigure audio on your host or daily desktop**. A null sink allows genuine audio processing but does not establish audible mixing quality.

## Diagnostics and checks

`node --test scripts/browser-test/server.test.mjs`

This covers authorization, cross-origin rejection, traversal, symlinks, read-only assets, copied-save writes, ranges, nested slices, tiny-read cache reuse, file write/seek round trips and cleanup, using synthetic fixtures rather than real game assets.

In browser DevTools, `await window.__kotorBrowserTest.status()` returns request/read/write counts and captured uncaught errors. Console resource-loader messages may be caught internally and will not all appear in `events`; inspect the browser console as well.

The separate `src/tests/port/browserAudioStartup.test.ts` suite checks actual AppState code with mocked dependencies: existing running/suspended contexts, suspended-to-running transition, initial probe closure and Electron exclusion. All five assertions passed. The targeted Jest invocation nevertheless exited 1 because the repository contains the unrelated obsolete snapshot `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap`; it was not deleted or suppressed.

## Observed validation — 4 October 2026

Validated production code: **harness r7 + browser-audio-startup r3**, built together inside a discard-only Workspace Projection. This README is a documentation-only addition after that check.

- User-level `desktop-audio.py` completed with exit 0; real engine AudioContext became `running`.
- EULA, Grant Access and Begin succeeded; **Begin did not reappear**. No runtime DOM removal or engine monkeypatch was used in this final run.
- Fresh New Game → Soldier → Quick Character → default portrait/name → Play.
- Endar Spire rendered, opening Trask dialogue ran, and a 0.65-second W hold visibly moved the character.
- About 100 seconds from Play to rendered Endar Spire, including opening movie time/skip. No controlled performance benchmark was performed.
- An earlier exploratory run also reached the scene/movement but required removing the stale overlay; it is not evidence for the final startup fix.

Observed nonfatal console diagnostics: missing `lplanet_02` through `lplanet_06` models, three `DOMException: Not found` messages, missing `repute.fac`, optional `modules/end_m01aa.mod` failure followed by successful RIM fallback, and repeated `GetNextEffect` / `GetCreatureTalentBest returned undefined` warnings. These are recorded, not dismissed as fixed.

Not tested in the final run: saving/reloading a real game, combat, stores, module transitions, full Endar Spire → Taris acceptance, native browser file permissions, Electron, audible audio quality or subtle graphics fidelity. The harness's synthetic save-write tests are not a substitute for an actual game save/reload test.
