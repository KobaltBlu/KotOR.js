import fs from 'node:fs';
import path from 'node:path';

const moved = new Set([
  'AutoPauseState', 'ClientCameraMode', 'EngineDebugType', 'EngineMode', 'EngineState',
  'FadeOverlayState', 'LightPriority', 'MiniGameType', 'PerceptionMask', 'PerceptionType',
  'RenderLayer', 'ReputationConstant', 'TutorialMessage', 'TalentObjectType',
  'FeedbackMessageColor', 'FeedbackOption', 'UIIconTimerType', 'ExperienceType',
  'TalkVolume', 'TextSprite3DType', 'DebuggerState', 'IPCDataType', 'IPCMessageType',
  'IPCMessageTypeArea', 'IPCMessageTypeDebug', 'IPCMessageTypeModule', 'IPCMessageTypeObject',
  'IPCMessageTypeScript', 'MessageMinors', 'PlayerServerMessageId',
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

let n = 0;
for (const f of walk('src')) {
  let s = fs.readFileSync(f, 'utf8');
  let next = s.replace(
    /import\s+(type\s+)?\{([^}]+)\}\s+from\s+(['"])@core\/enums\3/g,
    (full, typ, body, q) => {
      const names = body.split(',').map((x) => x.trim()).filter(Boolean);
      const core = [];
      const eng = [];
      const server = [];
      for (const raw of names) {
        const name = raw.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (
          name.startsWith('IPC') ||
          name === 'DebuggerState' ||
          name === 'MessageMinors' ||
          name === 'PlayerServerMessageId'
        ) {
          server.push(raw.trim());
        } else if (moved.has(name)) {
          eng.push(raw.trim());
        } else {
          core.push(raw.trim());
        }
      }
      const parts = [];
      const t = typ || '';
      if (core.length) parts.push(`import ${t}{ ${core.join(', ')} } from ${q}@core/enums${q}`);
      if (eng.length) parts.push(`import ${t}{ ${eng.join(', ')} } from ${q}@engine/enums/engine${q}`);
      if (server.length) parts.push(`import ${t}{ ${server.join(', ')} } from ${q}@engine/enums/server${q}`);
      return parts.join(';\n');
    }
  );
  if (next !== s) {
    fs.writeFileSync(f, next);
    n++;
    console.log(f);
  }
}
console.log('fixed', n);
