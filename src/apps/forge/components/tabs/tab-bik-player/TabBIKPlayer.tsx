import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabBIKPlayerState } from "../../../states/tabs/TabBIKPlayerState";
import type { YUVFrame } from "../../../../../video/binkvideo";

/** Format seconds as M:SS or H:MM:SS. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Convert YUV (4:2:0) frame to RGBA and draw into ImageData. */
function yuvToImageData(yuv: YUVFrame, imageData: ImageData): void {
  const { width, height, y, u, v, linesizeY, linesizeU, linesizeV } = yuv;
  const data = imageData.data;
  for (let j = 0; j < height; j++) {
    const uvj = j >>> 1;
    const yRow = j * linesizeY;
    const uRow = uvj * linesizeU;
    const vRow = uvj * linesizeV;
    for (let i = 0; i < width; i++) {
      const yy = y[yRow + i];
      const uu = u[uRow + (i >>> 1)];
      const vv = v[vRow + (i >>> 1)];
      const d = uu - 128;
      const e = vv - 128;
      const r = Math.max(0, Math.min(255, (298 * yy + 409 * e + 128) >>> 8));
      const g = Math.max(0, Math.min(255, (298 * yy - 100 * d - 208 * e + 128) >>> 8));
      const b = Math.max(0, Math.min(255, (298 * yy + 516 * d + 128) >>> 8));
      const off = (j * width + i) << 2;
      data[off] = r;
      data[off + 1] = g;
      data[off + 2] = b;
      data[off + 3] = 255;
    }
  }
}

export const TabBIKPlayer = function (props: BaseTabProps) {
  const tab = props.tab as TabBIKPlayerState;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const sizeSetRef = useRef<boolean>(false);
  const totalTimeSetRef = useRef<boolean>(false);
  const lastPlaybackSecondRef = useRef<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);

  useEffect(() => {
    const bik = tab.bikObject;
    if (!bik || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    sizeSetRef.current = false;
    totalTimeSetRef.current = false;
    lastPlaybackSecondRef.current = -1;

    const tick = (time: number) => {
      const delta = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;

      if (bik.isPlaying && !bik.disposed) {
        bik.update(delta);
        const frame = bik.getCurrentFrame();
        if (frame) {
          if (!sizeSetRef.current) {
            sizeSetRef.current = true;
            canvas.width = frame.width;
            canvas.height = frame.height;
            setVideoSize({ w: frame.width, h: frame.height });
            setIsPlaying(true);
          }
          if (!totalTimeSetRef.current && bik.header && bik.fps > 0) {
            const frameCount = bik.header.frameCount ?? 0;
            if (frameCount > 0) {
              totalTimeSetRef.current = true;
              setTotalTime(frameCount / bik.fps);
            }
          }
          if (canvas.width === frame.width && canvas.height === frame.height) {
            const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
            yuvToImageData(frame, imageData);
            ctx.putImageData(imageData, 0, 0);
          }
        }
        const t = bik.playbackPosition;
        const sec = Math.floor(t);
        if (sec !== lastPlaybackSecondRef.current) {
          lastPlaybackSecondRef.current = sec;
          setPlaybackTime(t);
        }
      } else {
        setPlaybackTime(bik.playbackPosition ?? 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [tab]);

  const onStop = () => {
    tab.stop();
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const onReplay = () => {
    tab.openFile();
    setIsPlaying(true);
  };

  return (
    <div className="tab-bik-player" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <div style={{ flex: "1", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <canvas
          ref={canvasRef}
          width={videoSize?.w ?? 640}
          height={videoSize?.h ?? 480}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      </div>
      <div className="tab-bik-player-controls" style={{ padding: "8px 12px", background: "#1a1a1a", borderTop: "1px solid #333", display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          className="btn-play"
          title="Replay"
          style={{ cursor: "pointer", fontSize: "18px" }}
          onClick={onReplay}
        >
          <i className="fa-solid fa-play"></i>
        </span>
        <span
          className="btn-stop"
          title="Stop"
          style={{ cursor: "pointer", fontSize: "18px" }}
          onClick={onStop}
        >
          <i className="fa-solid fa-stop"></i>
        </span>
        <span style={{ color: "#aaa", fontSize: "13px" }}>
          {formatTime(playbackTime)} / {formatTime(totalTime)}
        </span>
        <span style={{ color: "#666", fontSize: "12px" }}>
          {isPlaying ? "Playing" : "Stopped"}
          {videoSize ? ` · ${videoSize.w}×${videoSize.h}` : ""}
        </span>
      </div>
    </div>
  );
};
