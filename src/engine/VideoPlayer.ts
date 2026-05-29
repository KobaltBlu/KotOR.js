import { VideoManager } from '@/managers/VideoManager';

export class VideoPlayer {
  static async Load(movieName: string): Promise<void> {
    await VideoManager.playMovie(movieName);
  }

  static IsMoviePlaying(): boolean {
    return VideoManager.isMoviePlaying();
  }

  static QueueMovie(movieName: string, skippable: boolean = false): void {
    VideoManager.queueMovie(movieName, skippable);
  }

  static async PlayMovieQueue(onComplete?: Function): Promise<void> {
    await VideoManager.playMovieQueue(onComplete);
  }
}
