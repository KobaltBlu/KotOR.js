/// <reference types="jest" />
import { AudioEmitter } from '@/audio/AudioEmitter';
import { AmbientAudioEmitter } from '@/audio/AmbientAudioEmitter';
import { AudioEngine } from '@/audio/AudioEngine';
import { AudioLoader } from '@/audio/AudioLoader';
import { MusicManager } from '@/managers/MusicManager';
import { VideoManager } from '@/managers/VideoManager';
import { BackgroundMusicMode } from '@/enums/audio/BackgroundMusicMode';

jest.mock('@/GameState', () => ({ GameState: { SWRuleSet: { getPriorityGroupById: () => ({ volume: 96 }) } } }));
jest.mock('@/audio/AudioLoader', () => ({ AudioLoader: { LoadSound: jest.fn(), LoadStreamWave: jest.fn(), LoadMusic: jest.fn(), LoadStreamSound: jest.fn() } }));
jest.mock('@/resource/BIKObject', () => ({ BIKObject: class {} }));
jest.mock('@/audio/ReverbEngine', () => ({ ReverbEngine: class { connectSource = jest.fn(); updateListener = jest.fn(); loadPreset = jest.fn(); } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

class MockAudioContext {
  currentTime = 0;
  destination = {};
  sources: any[] = [];
  decodeAudioData = jest.fn(async (_data: ArrayBuffer): Promise<AudioBuffer> => ({} as AudioBuffer));
  close = jest.fn();
  createGain() {
    return { gain: { value: 1, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() }, connect: jest.fn(), disconnect: jest.fn() };
  }
  createPanner() { return { connect: jest.fn(), disconnect: jest.fn() }; }
  createBufferSource() {
    const node = { buffer: undefined as any, loop: false, playbackRate: { value: 1 }, onended: undefined as any, connect: jest.fn(), disconnect: jest.fn(), start: jest.fn(), stop: jest.fn() };
    this.sources.push(node);
    return node;
  }
}

let engine: AudioEngine;
let context: MockAudioContext;

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).AudioContext = MockAudioContext;
  AudioEngine.engines = [];
  AudioEngine.focused = true;
  engine = new AudioEngine();
  context = engine.audioCtx as unknown as MockAudioContext;
  MusicManager.initialized = false;
  MusicManager.Initialize();
  (AudioLoader.LoadSound as jest.Mock).mockResolvedValue(new Uint8Array([1]));
  (AudioLoader.LoadStreamWave as jest.Mock).mockResolvedValue(new Uint8Array([1]));
  (AudioLoader.LoadMusic as jest.Mock).mockResolvedValue(new Uint8Array([1]));
});

function emitter() {
  const value = new AudioEmitter(engine);
  value.mainNode = value.gainNode;
  return value;
}

test('stop invalidates an in-flight sound load', async () => {
  const load = deferred<Uint8Array>();
  (AudioLoader.LoadSound as jest.Mock).mockReturnValue(load.promise);
  const value = emitter();
  const pending = value.playSound('late');
  value.stop();
  load.resolve(new Uint8Array([1]));
  await pending;
  expect(context.sources).toHaveLength(0);
});

test('newer playback wins when a previous load resolves last', async () => {
  const load = deferred<Uint8Array>();
  (AudioLoader.LoadSound as jest.Mock).mockReturnValueOnce(load.promise);
  const value = emitter();
  const pending = value.playSound('old');
  await value.playSound('new');
  load.resolve(new Uint8Array([1]));
  await pending;
  expect(value.getCurrentSoundName()).toBe('new');
  expect(context.sources).toHaveLength(1);
});

test('destroy during stream decoding prevents playback and cache resurrection', async () => {
  const decode = deferred<AudioBuffer>();
  context.decodeAudioData.mockReturnValue(decode.promise);
  const value = emitter();
  const pending = value.playStreamWave('voice');
  await Promise.resolve();
  value.destroy();
  decode.resolve({} as AudioBuffer);
  await pending;
  expect(context.sources).toHaveLength(0);
  expect(value.buffers.size).toBe(0);
});

test('destroy cancels a pending fire-and-forget sound', async () => {
  const load = deferred<Uint8Array>();
  (AudioLoader.LoadSound as jest.Mock).mockReturnValue(load.promise);
  const value = emitter();
  const pending = value.playSoundFireAndForget('effect');
  value.destroy();
  load.resolve(new Uint8Array([1]));
  await pending;
  expect(context.sources[0].start).not.toHaveBeenCalled();
  expect(value.ffsounds).toHaveLength(0);
});

test('ambient stop cancels pending decode without a synthetic ended event', async () => {
  const decode = deferred<AudioBuffer>();
  context.decodeAudioData.mockReturnValue(decode.promise);
  const value = new AmbientAudioEmitter(engine).setData(new ArrayBuffer(1)).setDestination(engine.audioCtx.destination);
  const ended = jest.fn();
  value.addEventListener('ended', ended);
  const pending = value.play();
  value.stop();
  decode.resolve({} as AudioBuffer);
  await pending;
  expect(context.sources[0].start).not.toHaveBeenCalled();
  expect(value.playing).toBe(false);
  expect(ended).not.toHaveBeenCalled();
});

test('superseded ambient decode cannot start or overwrite the newest source', async () => {
  const decode = deferred<AudioBuffer>();
  context.decodeAudioData.mockReturnValueOnce(decode.promise);
  const value = new AmbientAudioEmitter(engine).setData(new ArrayBuffer(1)).setDestination(engine.audioCtx.destination);
  const first = value.play();
  await value.play(true);
  const current = value.node;
  decode.resolve({} as AudioBuffer);
  await first;
  expect(context.sources[0].start).not.toHaveBeenCalled();
  expect(value.node).toBe(current);
  expect(value.playing).toBe(true);
});

test('engine reset destroys every registered emitter despite list mutation', () => {
  const a = emitter();
  const b = emitter();
  engine.addEmitter(a);
  engine.addEmitter(b);
  engine.reset();
  expect(a.isDestroyed).toBe(true);
  expect(b.isDestroyed).toBe(true);
  expect(engine.emitters).toHaveLength(0);
});

test('muted channel retains new clamped gain and cannot reconnect while unfocused', () => {
  const channel = AudioEngine.musicChannel;
  channel.setGain(0.4);
  channel.mute();
  channel.setGain(2);
  AudioEngine.OnWindowFocusChange(false);
  const connect = channel.getGainNode().connect as jest.Mock;
  connect.mockClear();
  channel.unmute();
  expect(channel.getGainNode().gain.value).toBe(1);
  expect(connect).not.toHaveBeenCalled();
  AudioEngine.OnWindowFocusChange(true);
  expect(connect).toHaveBeenCalledTimes(1);
});

test('emitter volume is normalized while priority metadata remains available', () => {
  const value = emitter().setVolume(63.5);
  value.setPriorityGroupId(5);
  expect(value.gainNode.gain.value).toBe(0.5);
  expect(value.priority).toBe(5);
  expect(value.priorityGroupVolume).toBe(96);
});

test('stopMusic prevents a slow load from restarting music', async () => {
  const load = deferred<Uint8Array>();
  (AudioLoader.LoadMusic as jest.Mock).mockReturnValue(load.promise);
  const pending = MusicManager.playAreaMusicTrack('area');
  MusicManager.stopMusic();
  load.resolve(new Uint8Array([1]));
  expect(await pending).toBe(false);
  expect(MusicManager.currentMode).toBe(BackgroundMusicMode.NONE);
  expect(context.sources).toHaveLength(0);
});

test('new menu transition wins over an older area-track load', async () => {
  const load = deferred<Uint8Array>();
  (AudioLoader.LoadMusic as jest.Mock).mockReturnValueOnce(load.promise);
  const pending = MusicManager.playAreaMusicTrack('area');
  await MusicManager.playMenuMusicTrack('menu');
  load.resolve(new Uint8Array([1]));
  expect(await pending).toBe(false);
  expect(MusicManager.currentMode).toBe(BackgroundMusicMode.MENU);
  expect(engine.menuMusicAudioEmitter.playing).toBe(true);
  expect(engine.areaMusicDayAudioEmitter.playing).toBe(false);
});

test('same track request does not unnecessarily restart playing music', async () => {
  await MusicManager.playMenuMusicTrack('menu');
  const source = engine.menuMusicAudioEmitter.node;
  await MusicManager.playMenuMusicTrack('menu');
  expect(engine.menuMusicAudioEmitter.node).toBe(source);
  expect(context.sources).toHaveLength(1);
});

test('video update does not read a disposed movie when update switches playback', () => {
  const replacement: any = {};
  const movie: any = { update: () => { VideoManager.bikObject = replacement; }, getCurrentFrame: jest.fn() };
  VideoManager.bikObject = movie;
  VideoManager.isPlaying = true;
  VideoManager.update(0.1);
  expect(movie.getCurrentFrame).not.toHaveBeenCalled();
  VideoManager.bikObject = null;
  VideoManager.isPlaying = false;
});
