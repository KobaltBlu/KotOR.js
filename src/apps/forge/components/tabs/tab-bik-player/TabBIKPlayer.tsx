import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabBIKPlayerState } from "../../../states/tabs/TabBIKPlayerState";
import { ensureYUVWebGL, drawYUVFrame, type YUVWebGLState } from "./yuvWebGL";

/** Format seconds as M:SS or H:MM:SS. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const TabBIKPlayer = function (props: BaseTabProps) {
  const tab = props.tab as TabBIKPlayerState;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const sizeSetRef = useRef<boolean>(false);
  const totalTimeSetRef = useRef<boolean>(false);
  const lastPlaybackSecondRef = useRef<number>(-1);
  const webglRef = useRef<YUVWebGLState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);

  useEffect(() => {
    const bik = tab.bikObject;
    if (!bik || !canvasRef.current) return;

    const canvas = canvasRef.current;
    sizeSetRef.current = false;
    totalTimeSetRef.current = false;
    lastPlaybackSecondRef.current = -1;
    webglRef.current = null;

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
            webglRef.current = ensureYUVWebGL(canvas, frame, null);
          }
          if (!totalTimeSetRef.current && bik.header && bik.fps > 0) {
            const frameCount = bik.header.frameCount ?? 0;
            if (frameCount > 0) {
              totalTimeSetRef.current = true;
              setTotalTime(frameCount / bik.fps);
            }
          }
          const webgl = webglRef.current;
          if (webgl && canvas.width === frame.width && canvas.height === frame.height) {
            const state = ensureYUVWebGL(canvas, frame, webgl);
            if (state) {
              webglRef.current = state;
              drawYUVFrame(state, frame);
            }
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
