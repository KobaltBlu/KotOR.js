# Gameplay acceptance checklist

These checks remain **not yet performed on real game assets**. Automated synthetic regressions and browser startup checks are recorded in [README.md](README.md); they do not establish full playability.

## Safety and setup

- Back up existing saves and configuration. Use copied saves and an isolated browser profile or separate Electron user-data directory supported by the launcher/runtime.
- Do not assume sibling source folders isolate saves, IndexedDB or application settings.
- Keep the original playable `kotor.js` checkout unchanged and available for A/B behavior comparisons.
- Start with cheats, enhanced lightsabers and time dilation disabled. Enable optional features only in their separate checks.
- Record exact target commit/patch revision, game variant, module, reproduction steps and any console/runtime-fault reports. Share snapshots intentionally; they may contain player state and personal paths.

## K1: Endar Spire → Taris

- Create both quick and custom characters; confirm abilities, derived stats, HP, portraits and starting equipment.
- Complete Endar Spire dialogue, tutorial triggers, combat, companion-following and module transitions through arrival on Taris.
- Confirm dialogue cameras, replies/wrapping, cutscene fade/movies, bark interruption and lip-sync replacement.
- Exercise melee, ranged, unarmed and power attacks with cheats disabled. Check natural 1/20, AC ties, critical threats, impact timing and destructible doors/placeables.
- Check typed damage, immunity/resistance/reduction and scripted damage without duplicate physical damage.
- Walk through crowded corridors; interact with moving/distant targets; interrupt/replan movement and change party leaders.
- Add/remove/select companions, including required companions. Rapidly switch/close preview screens while models load.
- Equip, unequip and re-equip every relevant slot; verify no inventory item is destroyed or duplicated and weapon switching retains correct models.
- Buy and sell at a Taris merchant: price modifiers, credits, stock, infinite-stock copies, same-tag differently modified items, quest items and category filtering.
- Progress journal entries through active/completed states; verify monotonic quest progression, sorting, plot XP and persistence.
- Save into a new slot, overwrite and reload; verify player/protagonist identity, party composition, portraits, global booleans/locations, quest state, credits, item stacks and current area state.
- Transition with and without movie queues, then return/load another save. Confirm no stuck loading lock, stale cutscene camera/model or old music request.

## Audio, VFX and rendering

- Check area/day/night, battle, victory/stinger, dialogue and menu music transitions, looping and volume settings.
- Stop/replace sounds during resource decoding; change modules during playback and verify canceled audio does not start later.
- Trigger/remove instant and duration VFX while models load; check expiry, attachment and cleanup.
- Check animated particle frames, fractional lifetimes, non-square quads, detonation, linked/P2P effects, wind and chunk particles.
- Compare animated/multi-mesh chunk assets specifically: the upstream instanced backend is intentionally retained rather than the original full-model-per-chunk renderer.
- Enable enhanced lightsabers: blade colors, hidden ancestors, occlusion, equip/dispose, ignition/extinction and last-blade removal without stale glow.
- Enable time dilation separately: world/player behavior, keyboard/gamepad movement intensity and history reset through camera/module transitions. Disable it and verify normal timing returns.

## TSL and tools

- Smoke-test the prologue/early Peragus paths covered by the original branch; do not infer full TSL compatibility.
- Check TSL equipment/weapon swaps, party previews, journal, stores, save names and menu-music restoration.
- Open Forge with and without game data; test module previews, store blueprint editing and affected save/open dialogs.
- Test expanded cheat-console input focus/autocomplete and opt-in snapshots/resource dumps in browser and Electron. Verify canceled exports and interrupted VFX previews clean up.
- Verify launcher desktop/mobile behavior and offline/failed remote artwork fallback.

## Submission gate

- Record passed/failed scenarios and unresolved differences; do not label the port gameplay-verified until the target playthrough is completed.
- Re-run the documented build/tests and distinguish remaining upstream baseline failures from new regressions.
- Inspect `git diff`, staged paths and generated content before committing. Exclude game data, saves, user-state snapshots, logs and temporary port tools.
