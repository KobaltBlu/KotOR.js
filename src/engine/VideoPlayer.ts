import * as path from "path";

import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { ResourceLoader } from "../loaders/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { GameFileSystem } from "../utility/GameFileSystem";

/** BIK (Bink Video) resource type id for cache lookups */
const BIK_RES_TYPE = ResourceTypes["bik"] as number;

/** Queue entry: resref + skippable (ExecuteCommandQueueMovie / AddMovieToMovieQueue parity). */
export interface VideoPlayerQueueEntry {
  resref: string;
  skippable: boolean;
}

/**
 * VideoPlayer class.
 *
 * Plays Bink (.bik) movies by resref. Matches CClientExoApp::PlayMovie, AddMovieToMovieQueue,
 * PlayMovieQueue, IsMoviePlaying, and CancelMovie: single PlayMovie(resref), queue with
 * QueueMovie(resref, skippable) then PlayMovieQueue(allowSeparateSkips), and cancel/skip behavior.
 *
 * KotOR stores movies under a "Movies" folder or in module RIMs; resref is case-insensitive.
 * A full BIK decoder is not implemented yet, so Load() resolves after resolving the resource.
 *
 * @file VideoPlayer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VideoPlayer {
  private static _isPlaying = false;
  private static _playCompleteResolve: (() => void) | null = null;
  /** Current skippable flag (for CancelMovie: only cancel if skippable unless force). */
  private static _currentSkippable = false;
  /** Request to cancel current playback (set by CancelMovie). */
  private static _cancelled = false;

  /** Queue: (resref, skippable) per AddMovieToMovieQueue. */
  private static _queue: VideoPlayerQueueEntry[] = [];
  private static _queuePlaying = false;
  /** PlayMovieQueue(bAllowSeparateSkips): true = skip only current; false = cancel whole queue. */
  private static _allowSeparateSkips = false;

  /**
   * Load and play a single movie by resref. Resolves when playback ends or is skipped.
   * Empty resref returns immediately. Mirrors CClientExoApp::PlayMovie(client, resref, ?, 0, 0).
   *
   * @param resref - Movie resref (e.g. "legal", "intro"), case-insensitive
   * @returns Promise that resolves when the movie has finished or been skipped
   */
  static async Load(resref: string = ""): Promise<void> {
    const normalized = (resref || "").trim().toLowerCase().replace(/\.bik$/i, "");
    if (!normalized) {
      return;
    }

    VideoPlayer._cancelled = false;
    let buffer: Uint8Array | null = null;
    try {
      buffer = await VideoPlayer.getMovieBuffer(normalized);
    } catch {
      return;
    }
    if (!buffer) {
      return;
    }

    VideoPlayer._isPlaying = true;
    VideoPlayer._currentSkippable = true;
    VideoPlayer._playCompleteResolve = null;

    return new Promise<void>((resolve) => {
      VideoPlayer._playCompleteResolve = resolve;
      // No BIK decoder yet: resolve immediately. When BIK is implemented, call OnPlaybackComplete from onComplete/skip.
      VideoPlayer._isPlaying = false;
      VideoPlayer._currentSkippable = false;
      if (VideoPlayer._playCompleteResolve) {
        VideoPlayer._playCompleteResolve();
        VideoPlayer._playCompleteResolve = null;
      }
    });
  }

  /**
   * Queue a movie to be played by PlayMovieQueue. Mirrors AddMovieToMovieQueue(client, resref, skippable).
   *
   * @param resref - Movie resref
   * @param skippable - If true, player can cancel this movie (escape); if false, must wait for it to finish
   */
  static QueueMovie(resref: string, skippable: boolean): void {
    const normalized = (resref || "").trim().toLowerCase().replace(/\.bik$/i, "");
    if (!normalized) return;
    VideoPlayer._queue.push({ resref: normalized, skippable });
  }

  /**
   * Play the movies added via QueueMovie. Mirrors PlayMovieQueue(client, bAllowSeparateSkips).
   * If bAllowSeparateSkips is true, escape cancels only the current movie (if skippable); otherwise cancels the entire queue.
   *
   * @param allowSeparateSkips - True = skip only current movie; false = cancel whole queue on skip
   */
  static PlayMovieQueue(allowSeparateSkips: boolean): void {
    VideoPlayer._allowSeparateSkips = !!allowSeparateSkips;
    if (VideoPlayer._queuePlaying) return;
    VideoPlayer._playQueueLoop();
  }

  private static async _playQueueLoop(): Promise<void> {
    VideoPlayer._queuePlaying = true;
    while (VideoPlayer._queue.length > 0) {
      VideoPlayer._cancelled = false;
      const entry = VideoPlayer._queue.shift()!;
      VideoPlayer._currentSkippable = entry.skippable;
      VideoPlayer._isPlaying = true;
      VideoPlayer._playCompleteResolve = null;

      const resolvePromise = new Promise<void>((resolve) => {
        VideoPlayer._playCompleteResolve = resolve;
      });

      try {
        const buffer = await VideoPlayer.getMovieBuffer(entry.resref);
        if (!buffer) {
          VideoPlayer._isPlaying = false;
          continue;
        }
        // No BIK decoder: resolve immediately so queue advances. When BIK exists, resolve from onComplete/skip.
        VideoPlayer._isPlaying = false;
        if (VideoPlayer._playCompleteResolve) {
          VideoPlayer._playCompleteResolve();
          VideoPlayer._playCompleteResolve = null;
        }
      } catch {
        VideoPlayer._isPlaying = false;
        if (VideoPlayer._playCompleteResolve) {
          VideoPlayer._playCompleteResolve();
          VideoPlayer._playCompleteResolve = null;
        }
      }

      await resolvePromise;
      if (VideoPlayer._cancelled) {
        if (!VideoPlayer._allowSeparateSkips) {
          VideoPlayer._queue.length = 0;
          break;
        }
      }
    }
    VideoPlayer._queuePlaying = false;
    VideoPlayer._isPlaying = false;
  }

  /**
   * Cancel current movie. If force is true, cancel regardless of skippable. Mirrors CExoMoviePlayerInternal::CancelMovie.
   *
   * @param force - If true, cancel even when current movie is not skippable (param_2 in binary)
   */
  static CancelMovie(force = false): void {
    if (!force && VideoPlayer._isPlaying && !VideoPlayer._currentSkippable) return;
    VideoPlayer._cancelled = true;
    VideoPlayer.OnPlaybackComplete();
  }

  /**
   * Resolve BIK buffer by resref: cache first, then Movies/{resref}.bik from game directory.
   */
  private static async getMovieBuffer(resref: string): Promise<Uint8Array | null> {
    const cached = ResourceLoader.getCache(BIK_RES_TYPE, resref);
    if (cached) return cached;

    try {
      if (ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON && ApplicationProfile.directory) {
        const moviePath = path.join("Movies", `${resref}.bik`);
        const buffer = await GameFileSystem.readFile(moviePath);
        return buffer ?? null;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  /**
   * Whether a movie is currently playing. Mirrors CClientExoApp::IsMoviePlaying (returns 0/1 in script).
   */
  static IsMoviePlaying(): boolean {
    return VideoPlayer._isPlaying;
  }

  /**
   * Called when playback finishes or is skipped (for use by a future BIK playback layer or CancelMovie).
   */
  static OnPlaybackComplete(): void {
    VideoPlayer._isPlaying = false;
    VideoPlayer._currentSkippable = false;
    if (VideoPlayer._playCompleteResolve) {
      VideoPlayer._playCompleteResolve();
      VideoPlayer._playCompleteResolve = null;
    }
  }

  /** Clear the movie queue without playing. */
  static ClearQueue(): void {
    VideoPlayer._queue.length = 0;
  }
}
