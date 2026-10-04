/**
 * @jest-environment node
 *
 * Heartbeat gate + trap-script bind contract after polymorphic script dispatch.
 * Avoids importing heavy Module* classes (window-dependent import graph).
 */
import { describe, expect, it, jest } from "@jest/globals";
import { ModuleObjectScript } from "@core/enums/module/ModuleObjectScript";

/** Mirrors ModuleObject.canProcessHeartbeat. */
function canProcessHeartbeat(self: {
  spawned: boolean;
  moduleReady: boolean;
}): boolean {
  return self.spawned === true && !!self.moduleReady;
}

/** Mirrors subtype heartbeat after canProcessHeartbeat. */
function runHeartbeat(
  self: {
    spawned: boolean;
    moduleReady: boolean;
    scripts: Record<string, { run: (o: unknown) => void } | undefined>;
  },
  scriptKey: string,
){
  if(!canProcessHeartbeat(self)){ return; }
  const onHeartbeat = self.scripts[scriptKey];
  if(!onHeartbeat){ return; }
  onHeartbeat.run(self);
}

/** Mirrors ModuleObject.addTrap bind path via bindTrapTriggeredScript. */
function bindTrapFromAddTrap(
  bindTrapTriggeredScript: (nwscript: { bindOwner: jest.Mock }) => ModuleObjectScript | undefined,
  nwscript: { bindOwner: jest.Mock },
  scripts: Record<string, unknown>,
){
  const trapKey = bindTrapTriggeredScript(nwscript);
  if(trapKey){
    scripts[trapKey] = nwscript;
    nwscript.bindOwner(scripts, trapKey);
  }
  return trapKey;
}

describe("script dispatch polymorphism contract", () => {
  it("heartbeat skips when not spawned or module not ready", () => {
    const run = jest.fn();
    const self = {
      spawned: false,
      moduleReady: true,
      scripts: { [ModuleObjectScript.TriggerOnHeartbeat]: { run } },
    };
    runHeartbeat(self, ModuleObjectScript.TriggerOnHeartbeat);
    expect(run).not.toHaveBeenCalled();

    self.spawned = true;
    self.moduleReady = false;
    runHeartbeat(self, ModuleObjectScript.TriggerOnHeartbeat);
    expect(run).not.toHaveBeenCalled();
  });

  it("heartbeat runs TriggerOnHeartbeat when gate passes", () => {
    const run = jest.fn();
    const self = {
      spawned: true,
      moduleReady: true,
      scripts: { [ModuleObjectScript.TriggerOnHeartbeat]: { run } },
    };
    runHeartbeat(self, ModuleObjectScript.TriggerOnHeartbeat);
    expect(run).toHaveBeenCalledWith(self);
  });

  it("addTrap bind uses host OnTrapTriggered key from bindTrapTriggeredScript", () => {
    const bindOwner = jest.fn();
    const nwscript = { bindOwner };
    const scripts: Record<string, unknown> = {};
    const trapKey = bindTrapFromAddTrap(
      () => {
        scripts[ModuleObjectScript.TriggerOnTrapTriggered] = nwscript;
        return ModuleObjectScript.TriggerOnTrapTriggered;
      },
      nwscript,
      scripts,
    );
    expect(trapKey).toBe(ModuleObjectScript.TriggerOnTrapTriggered);
    expect(scripts[ModuleObjectScript.TriggerOnTrapTriggered]).toBe(nwscript);
    expect(bindOwner).toHaveBeenCalledWith(scripts, ModuleObjectScript.TriggerOnTrapTriggered);
  });

  it("addTrap bind no-ops when bindTrapTriggeredScript returns undefined", () => {
    const bindOwner = jest.fn();
    const nwscript = { bindOwner };
    const scripts: Record<string, unknown> = {};
    const trapKey = bindTrapFromAddTrap(() => undefined, nwscript, scripts);
    expect(trapKey).toBeUndefined();
    expect(Object.keys(scripts)).toHaveLength(0);
    expect(bindOwner).not.toHaveBeenCalled();
  });
});
