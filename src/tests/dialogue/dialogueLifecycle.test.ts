/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import ts from 'typescript';
import * as THREE from 'three';
import { DLGNodeType } from '@/enums/dialog/DLGNodeType';
import { ConversationState } from '@/enums/dialog/ConversationState';
import { CutsceneMode } from '@/enums/dialog/CutsceneMode';
import { EngineMode } from '@/enums/engine/EngineMode';
import { DLGConversationType } from '@/enums/dialog/DLGConversationType';

// These tests isolate lifecycle behavior without booting the engine's global
// browser/audio state. Project typechecking is a separate integration check.
function loadSubject(relativePath: string, mocks: Record<string, any>): any {
  const filename = path.resolve(__dirname, '../..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  expect(compiled.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error)).toEqual([]);
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, {
    module, exports: module.exports, console,
    require: (name: string) => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : require(name),
  }, { filename });
  return module.exports;
}

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture() {
  const player = { getName: () => 'Player' };
  const menu = () => ({ open: jest.fn(), close: jest.fn(), hide: jest.fn(), setDialogMode: jest.fn(), setReplies: jest.fn(), updateTextPosition: jest.fn() });
  const game: any = {
    Mode: EngineMode.DIALOG, camera: {}, PartyManager: { party: [player], ActualPlayerTemplate: undefined },
    SetEngineMode: jest.fn(), RestoreEnginePlayMode: jest.fn(),
    getCurrentPlayer: () => player,
    JournalManager: { AddJournalQuestEntry: jest.fn(), AwardPlotXPByIndex: jest.fn() },
    DialogMessageManager: { AddEntry: jest.fn() },
    MusicManager: { stopDialogMusic: jest.fn() },
    VideoEffectManager: { SetVideoEffect: jest.fn() },
    FadeOverlayManager: { FadeInFromCutscene: jest.fn() },
    MenuManager: { InGameDialog: menu(), InGameComputer: menu(), InGameComputerCam: menu(), InGameBark: { bark: jest.fn() } },
  };
  const lip = { Load: jest.fn() };
  const mocks: Record<string, any> = {
    '@/GameState': { GameState: game },
    '@/nwscript/NWScriptInstance': { NWScriptInstance: class {} },
    '@/resource/LIPObject': { LIPObject: lip },
    '@/utility/BitWise': { BitWise: { InstanceOfObject: (object: any) => !!object?.setLIP } },
    '@/engine/DialogMessageEntry': { DialogMessageEntry: class { constructor(public speaker: string, public text: string) {} } },
    '@/three/odyssey/OdysseyModel3D': { OdysseyModel3D: class {} },
    three: THREE,
  };
  const { DLGNode } = loadSubject('resource/DLGNode.ts', mocks);
  class Dialog {
    resref = 'synthetic';
    startingList: unknown[] = [];
    scripts: any = {};
    releaseStuntActors = jest.fn();
    loadStuntCamera = jest.fn().mockResolvedValue(undefined);
    loadStuntActors = jest.fn().mockResolvedValue(undefined);
    loadBackgroundMusic = jest.fn().mockResolvedValue(undefined);
    getConversationType = () => DLGConversationType.CONVERSATION;
  }
  const { CutsceneManager: manager } = loadSubject('managers/CutsceneManager.ts', {
    ...mocks, '@/resource/DLGObject': { DLGObject: Dialog }, '@/resource/DLGNode': { DLGNode },
  });
  manager.audioEmitter = { stop: jest.fn() };
  return { game, lip, DLGNode, Dialog, manager, mocks };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('late lip data cannot attach after cancellation', async () => {
  const { lip, DLGNode } = fixture();
  const pending = deferred<any>();
  lip.Load.mockReturnValue(pending.promise);
  const node = new DLGNode();
  node.sound = 'synthetic';
  node.speaker = { setLIP: jest.fn() };
  const work = node.loadLIP();
  node.resetLIP();
  pending.resolve({ duration: 1 });
  expect(await work).toBe(false);
  expect(node.speaker.setLIP).toHaveBeenCalledTimes(1);
  expect(node.speaker.setLIP).toHaveBeenCalledWith(undefined);
});

test('cancellation during lip loading prevents deferred speech playback', async () => {
  const { lip, DLGNode } = fixture();
  const pending = deferred<any>();
  lip.Load.mockReturnValue(pending.promise);
  const node = new DLGNode();
  node.sound = 'synthetic';
  const emitter = { playStreamWave: jest.fn(), stop: jest.fn() };
  const work = node.playVoiceOver(emitter);
  node.cancelVoiceOver(emitter);
  pending.resolve(undefined);
  expect(await work).toBe(false);
  expect(emitter.playStreamWave).not.toHaveBeenCalled();
  expect(emitter.stop).toHaveBeenCalledTimes(1);
});

test('obsolete audio-ended callback cannot complete a reused dialogue node', async () => {
  const { lip, DLGNode } = fixture();
  lip.Load.mockResolvedValue(undefined);
  const node = new DLGNode();
  node.sound = 'synthetic';
  const audio: any = {};
  await node.playVoiceOver({ playStreamWave: jest.fn().mockResolvedValue(audio) });
  const oldEnded = audio.onended;
  node.resetLIP();
  node.checkList = { voiceOverComplete: false };
  oldEnded();
  expect(node.checkList.voiceOverComplete).toBe(false);
});

test('plot rewards survive empty-text filtering and player replies remain journalled', () => {
  const { game, DLGNode } = fixture();
  const node = new DLGNode();
  node.plotIndex = 5;
  node.plotXPPercentage = 0.5;
  node.quest = 'synthetic';
  node.questEntry = 10;
  node.updateJournal();
  expect(game.JournalManager.AwardPlotXPByIndex).toHaveBeenCalledWith(5, 0.5);
  expect(game.JournalManager.AddJournalQuestEntry).toHaveBeenCalledWith('synthetic', 10, false);
  expect(game.DialogMessageManager.AddEntry).not.toHaveBeenCalled();
  node.plotIndex = -1;
  node.nodeType = DLGNodeType.REPLY;
  node.text = 'A synthetic player reply';
  node.updateJournal();
  expect(game.DialogMessageManager.AddEntry).toHaveBeenCalledWith(expect.objectContaining({ speaker: 'Player', text: node.text }));
});

test('resource completion after ending a conversation cannot reopen its UI', async () => {
  const { manager, game, Dialog } = fixture();
  const pending = deferred<void>();
  const dialog = new Dialog();
  dialog.loadStuntCamera.mockReturnValue(pending.promise);
  manager.getNextEntry = jest.fn().mockReturnValue({ isBarkDialog: () => false });
  manager.showEntry = jest.fn();
  manager.startConversation(dialog, { isPlayer: false }, { isPlayer: false });
  manager.endConversation();
  pending.resolve();
  await flush();
  expect(game.MenuManager.InGameDialog.open).not.toHaveBeenCalled();
  expect(manager.showEntry).not.toHaveBeenCalled();
});

test('upstream parallel resource loading is preserved for active conversations', async () => {
  const { manager, game, Dialog } = fixture();
  const pending = deferred<void>();
  const dialog = new Dialog();
  dialog.loadStuntCamera.mockReturnValue(pending.promise);
  const entry = { isBarkDialog: () => false };
  manager.getNextEntry = jest.fn().mockReturnValue(entry);
  manager.showEntry = jest.fn();
  manager.startConversation(dialog, { isPlayer: false }, { isPlayer: false });
  expect(dialog.loadStuntActors).toHaveBeenCalledTimes(1);
  expect(dialog.loadBackgroundMusic).toHaveBeenCalledTimes(1);
  pending.resolve();
  await flush();
  expect(game.MenuManager.InGameDialog.open).toHaveBeenCalledTimes(1);
  expect(manager.showEntry).toHaveBeenCalledWith(entry);
});

test('end script starting another conversation is not followed by old-session cleanup', () => {
  const { manager, game, Dialog } = fixture();
  const old = new Dialog();
  const next = new Dialog();
  manager.dialog = old;
  manager.active = true;
  old.scripts.onEndConversation = { run: () => {
    manager.dialog = next;
    manager.active = true;
    manager.conversationSessionId++;
  } };
  manager.endConversation();
  expect(manager.dialog).toBe(next);
  expect(manager.active).toBe(true);
  expect(old.releaseStuntActors).not.toHaveBeenCalled();
  expect(game.MusicManager.stopDialogMusic).not.toHaveBeenCalled();
});

test('bark shutdown preserves its independent sound and upstream mode restoration', () => {
  const { manager, game, Dialog } = fixture();
  manager.dialog = new Dialog();
  manager.cutsceneMode = CutsceneMode.BARK;
  manager.active = true;
  manager.endConversation(false, false);
  expect(manager.audioEmitter.stop).not.toHaveBeenCalled();
  expect(game.MenuManager.InGameDialog.close).not.toHaveBeenCalled();
  expect(game.RestoreEnginePlayMode).toHaveBeenCalledTimes(1);
});

test('duplicate reply activation is ignored after entering listening state', () => {
  const { manager, Dialog } = fixture();
  manager.dialog = new Dialog();
  manager.state = ConversationState.LISTENING_TO_SPEAKER;
  const reply = { runScripts: jest.fn(), initProperties: jest.fn(), updateJournal: jest.fn() };
  manager.onReplySelect(reply);
  expect(reply.runScripts).not.toHaveBeenCalled();
});

test('a stale stunt camera is disposed instead of attached', async () => {
  const { mocks, DLGNode } = fixture();
  const pending = deferred<any>();
  const model = { dispose: jest.fn() };
  const { DLGObject } = loadSubject('resource/DLGObject.ts', {
    ...mocks,
    '@/three/odyssey': { OdysseyModel3D: { FromMDL: jest.fn().mockReturnValue(pending.promise) } },
    '@/resource/DLGNode': { DLGNode },
    '@/resource/GFFObject': { GFFObject: class {} },
    '@/loaders': { MDLLoader: { loader: { load: jest.fn().mockResolvedValue({}) } } },
  });
  const dialog = new DLGObject();
  dialog.animatedCameraResRef = 'synthetic';
  let active = true;
  const work = dialog.loadStuntCamera(() => active);
  await flush();
  active = false;
  pending.resolve(model);
  await work;
  expect(model.dispose).toHaveBeenCalledTimes(1);
  expect(dialog.animatedCamera).toBeUndefined();
});

test('a stale stunt actor cannot enter cutscene mode or change equipment', async () => {
  const { mocks, DLGNode, game } = fixture();
  const pending = deferred<any>();
  const model = { dispose: jest.fn() };
  const creature = { model: {}, setFacing: jest.fn(), setCutsceneMode: jest.fn(), UnequipItems: jest.fn() };
  game.ModuleObjectManager = { GetObjectByTag: () => creature };
  const { DLGObject } = loadSubject('resource/DLGObject.ts', {
    ...mocks,
    '@/three/odyssey': { OdysseyModel3D: { FromMDL: jest.fn().mockReturnValue(pending.promise) } },
    '@/resource/DLGNode': { DLGNode },
    '@/resource/GFFObject': { GFFObject: class {} },
    '@/loaders': { MDLLoader: { loader: { load: jest.fn().mockResolvedValue({}) } } },
  });
  const dialog = new DLGObject();
  dialog.isAnimatedCutscene = true;
  dialog.unequipItems = true;
  let active = true;
  const actor: any = { participant: 'synthetic', resref: 'stunt' };
  const work = dialog.loadStuntActor(actor, () => active);
  await flush();
  active = false;
  pending.resolve(model);
  await work;
  expect(model.dispose).toHaveBeenCalledTimes(1);
  expect(actor.moduleObject).toBeUndefined();
  expect(creature.setFacing).not.toHaveBeenCalled();
  expect(creature.setCutsceneMode).not.toHaveBeenCalled();
  expect(creature.UnequipItems).not.toHaveBeenCalled();
});
