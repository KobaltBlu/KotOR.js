import React, { useEffect, useState } from "react";
import * as KotOR from "@apps/game/KotOR";

const GLYPH_CHOICES: { value: number; label: string }[] = [
  { value: 0, label: 'Auto' },
  { value: 1, label: 'Xbox' },
  { value: 2, label: 'PlayStation' },
];

const SIM_CHOICES: { value: KotOR.PadFamily | undefined; label: string }[] = [
  { value: undefined, label: 'Off' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'playstation', label: 'PlayStation' },
];

const STICK_SIZE = 56;

const Stick: React.FC<{ label: string; rawX: number; rawY: number; x: number; y: number }> = ({ label, rawX, rawY, x, y }) => {
  const at = (v: number) => `${((v + 1) / 2) * 100}%`;
  const dz = KotOR.STICK_DEADZONE * STICK_SIZE;
  return (
    <div>
      <div className="console-pad-stick" title={`${label} raw (${rawX.toFixed(2)}, ${rawY.toFixed(2)}) → (${x.toFixed(2)}, ${y.toFixed(2)})`}>
        <span className="deadzone" style={{ width: dz, height: dz, left: (STICK_SIZE - dz) / 2 - 1, top: (STICK_SIZE - dz) / 2 - 1 }} />
        <span className="raw" style={{ left: at(rawX), top: at(rawY) }} />
        <span className="dot" style={{ left: at(x), top: at(y) }} />
      </div>
      <div className="console-pad-caption">{label} {x.toFixed(2)}, {y.toFixed(2)}</div>
    </div>
  );
};

const Trigger: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <div className="console-pad-trigger" title={`${label} ${value.toFixed(2)}`}>
      <span className="fill" style={{ height: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
    <div className="console-pad-caption">{label}</div>
  </div>
);

/**
 * Live controller readout for the debug console: connected pads, which one
 * the game reads, held buttons, sticks before and after the dead zone, and
 * the glyph / prompt settings.
 */
export const GamepadDebugSection: React.FC = () => {
  const [snapshot, setSnapshot] = useState<KotOR.GamepadDebugSnapshot>(() => KotOR.getGamepadDebugSnapshot());
  const [rumbleNote, setRumbleNote] = useState('');

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setSnapshot(KotOR.getGamepadDebugSnapshot());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const simulateRow = (
    <>
      <div className="console-submenu-row">
        <span className="console-submenu-label" title="Pretend a pad is plugged in so its prompts and button symbols show (padsim)">
          Simulate Pad
        </span>
      </div>
      <div className="debug-tools-btn-row">
        {SIM_CHOICES.map((c) => (
          <button
            key={c.label}
            type="button"
            className={`console-btn console-btn-small console-choice ${snapshot.simulatedFamily === c.value ? 'on' : 'off'}`}
            onClick={() => KotOR.setSimulatedPad(c.value)}
            aria-pressed={snapshot.simulatedFamily === c.value}
          >
            {c.label}
          </button>
        ))}
      </div>
    </>
  );

  if(!snapshot.supported){
    return (
      <>
        <div className="console-warp-empty">This browser does not support gamepads.</div>
        {simulateRow}
      </>
    );
  }

  const active = snapshot.active;
  const lf = active?.shownFamily === 'playstation' ? 'L2' : 'LT';
  const rf = active?.shownFamily === 'playstation' ? 'R2' : 'RT';

  const onRumble = () => {
    setRumbleNote('');
    void KotOR.rumbleActivePad(400, 1, 1).then((ok) => {
      if(!ok) setRumbleNote('This pad cannot rumble.');
    });
  };

  return (
    <>
      {simulateRow}
      {snapshot.pads.length === 0 ? (
        <div className="console-warp-empty">No pad seen yet. Press a button on the pad.</div>
      ) : (
        <div className="console-pad-list">
          {snapshot.pads.map((p) => (
            <button
              key={p.index}
              type="button"
              className={`console-btn console-btn-small console-choice console-pad-item ${p.active ? 'on' : 'off'}`}
              onClick={() => KotOR.selectActivePad(p.index)}
              title={`${p.id}\n${p.mapping} mapping, ${p.buttonCount} buttons, ${p.axisCount} axes${p.canRumble ? ', rumble' : ''}`}
              aria-pressed={p.active}
            >
              [{p.index}] {p.id}
            </button>
          ))}
        </div>
      )}

      {active && (
        <>
          <div className="console-pad-meta">
            {active.family} pad · {active.mapping} mapping · showing {active.shownFamily} symbols · pad input {snapshot.padIsActiveInput ? 'active' : 'idle'}
          </div>
          <div className="console-pad-sticks">
            <Stick label="L" rawX={active.axes[0] ?? 0} rawY={active.axes[1] ?? 0} x={active.leftStick.x} y={active.leftStick.y} />
            <Stick label="R" rawX={active.axes[2] ?? 0} rawY={active.axes[3] ?? 0} x={active.rightStick.x} y={active.rightStick.y} />
            <Trigger label={lf} value={active.leftTrigger} />
            <Trigger label={rf} value={active.rightTrigger} />
          </div>
          <div className="console-pad-buttons">
            {active.buttons.map((b) => (
              <span
                key={b.index}
                className={`console-pad-button${b.pressed ? ' held' : ''}`}
                title={`Button ${b.index}: ${b.value.toFixed(2)}`}
              >
                {b.name}
              </span>
            ))}
          </div>
          <div className="console-pad-axes">
            axes {active.axes.map((v) => v.toFixed(2)).join(' ')}
          </div>
        </>
      )}

      <div className="console-submenu-row">
        <span className="console-submenu-label">Button Symbols</span>
      </div>
      <div className="debug-tools-btn-row">
        {GLYPH_CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`console-btn console-btn-small console-choice ${snapshot.glyphOverride === c.value ? 'on' : 'off'}`}
            onClick={() => KotOR.setGlyphOverride(c.value)}
            aria-pressed={snapshot.glyphOverride === c.value}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="console-toggle-list">
        <button
          type="button"
          role="switch"
          className={`console-toggle ${snapshot.promptsEnabled ? 'on' : 'off'}`}
          onClick={() => KotOR.setPromptsEnabled(!snapshot.promptsEnabled)}
          aria-checked={snapshot.promptsEnabled}
          title="On-screen controller button prompts"
        >
          <span className="console-toggle-label">Controller Prompts</span>
          <span className="console-toggle-switch" aria-hidden="true">
            <span className="console-toggle-knob" />
          </span>
        </button>
      </div>
      <div className="debug-tools-btn-row">
        <button
          type="button"
          className="console-btn console-btn-small flex-1"
          onClick={onRumble}
          disabled={!active}
          title="Rumble the active pad (padrumble)"
        >
          Test Rumble
        </button>
        <button
          type="button"
          className="console-btn console-btn-small flex-1"
          onClick={() => KotOR.CheatConsoleManager.padInfo()}
          title="Print pad details to the console (padinfo)"
        >
          Log Pad Info
        </button>
      </div>
      {rumbleNote && <div className="console-warp-empty">{rumbleNote}</div>}
    </>
  );
};
