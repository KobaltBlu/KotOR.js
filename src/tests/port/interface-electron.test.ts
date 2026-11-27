import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { describe, expect, jest, test } from '@jest/globals';

function createDialogIPC() {
  const source = fs.readFileSync(path.resolve(__dirname, '../../electron/WindowManager.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const open = jest.fn<(options: unknown) => Promise<unknown>>();
  const save = jest.fn<(options: unknown) => Promise<unknown>>();
  const handlers = new Map<string, (event: unknown, data: unknown) => Promise<unknown>>();
  const module = { exports: {} as any };
  const requireMock = (name: string): unknown => {
    if (name === 'electron') return { BrowserWindow: {}, dialog: { showOpenDialog: open, showSaveDialog: save } };
    if (name === './ApplicationWindow') return { ApplicationWindow: class {} };
    if (name === './LauncherWindow') return { LauncherWindow: class {} };
    if (name === 'path') return path;
    if (name === 'child_process') return {};
    throw new Error(`Unexpected WindowManager dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', output)(requireMock, module, module.exports);
  module.exports.WindowManager.initIPC({
    on: (): void => undefined,
    handle: (name: string, handler: (event: unknown, data: unknown) => Promise<unknown>) => handlers.set(name, handler),
  });
  return { open, save, handlers };
}

describe('Electron file-dialog IPC compatibility', () => {
  for (const kind of ['open', 'save'] as const) {
    for (const wrapped of [false, true]) {
      test(`${kind} accepts ${wrapped ? 'legacy wrapped' : 'direct'} options`, async () => {
        const ipc = createDialogIPC();
        const options = { title: 'Synthetic dialog', defaultPath: 'fixture' };
        const result = { canceled: false, filePath: 'fixture', filePaths: ['fixture'] };
        ipc[kind].mockResolvedValue(result);
        await expect(ipc.handlers.get(`${kind}-file-dialog`)!(null, wrapped ? [options] : options)).resolves.toBe(result);
        expect(ipc[kind]).toHaveBeenCalledTimes(1);
        expect(ipc[kind]).toHaveBeenCalledWith(options);
      });
    }
    test(`${kind} forwards dialog rejection`, async () => {
      const ipc = createDialogIPC();
      const failure = new Error('Synthetic dialog failure');
      ipc[kind].mockRejectedValue(failure);
      await expect(ipc.handlers.get(`${kind}-file-dialog`)!(null, {})).rejects.toBe(failure);
    });
  }
});
