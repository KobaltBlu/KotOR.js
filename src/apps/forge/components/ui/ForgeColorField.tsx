/**
 * 0–1 RGB color field with native picker, numeric channels, and HSV wheel.
 *
 * @file ForgeColorField.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ForgeInput } from "./ForgeInput";
import {
  clamp01,
  hexToRgb01,
  hsvToRgb01,
  rgb01ToHex,
  rgb01ToHsv,
  type ForgeRgb01,
} from "@/apps/forge/helpers/forgeColor";
import "@/apps/forge/components/ui/ForgeColorField.scss";

const SIZE = 148;
const RING = 16;
const PAD = 8;

export interface ForgeColorFieldProps {
  value: ForgeRgb01;
  onChange: (value: ForgeRgb01) => void;
}

function emitRgb(hsv: { h: number; s: number; v: number }, onChange: (value: ForgeRgb01) => void) {
  const rgb = hsvToRgb01(hsv);
  onChange({ r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) });
}

export function ForgeColorField(props: ForgeColorFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const hsv = useMemo(() => rgb01ToHsv(props.value), [props.value.r, props.value.g, props.value.b]);
  const hex = rgb01ToHex(props.value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wheelOpen) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const outer = SIZE / 2 - 1;
    const inner = outer - RING;
    const image = ctx.createImageData(SIZE, SIZE);
    const data = image.data;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > outer || dist < inner) {
          continue;
        }
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const rgb = hsvToRgb01({ h: (angle + 360) % 360, s: 1, v: 1 });
        const i = (y * SIZE + x) * 4;
        data[i] = Math.round(rgb.r * 255);
        data[i + 1] = Math.round(rgb.g * 255);
        data[i + 2] = Math.round(rgb.b * 255);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    const sq = inner * 2 - PAD * 2;
    const sx = cx - sq / 2;
    const sy = cy - sq / 2;
    const square = ctx.createImageData(Math.ceil(sq), Math.ceil(sq));
    const sqData = square.data;
    const sqW = square.width;
    const sqH = square.height;
    for (let y = 0; y < sqH; y++) {
      for (let x = 0; x < sqW; x++) {
        const s = x / Math.max(1, sqW - 1);
        const v = 1 - y / Math.max(1, sqH - 1);
        const rgb = hsvToRgb01({ h: hsv.h, s, v });
        const i = (y * sqW + x) * 4;
        sqData[i] = Math.round(rgb.r * 255);
        sqData[i + 1] = Math.round(rgb.g * 255);
        sqData[i + 2] = Math.round(rgb.b * 255);
        sqData[i + 3] = 255;
      }
    }
    ctx.putImageData(square, sx, sy);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    const hx = cx + Math.cos((hsv.h * Math.PI) / 180) * ((inner + outer) / 2);
    const hy = cy + Math.sin((hsv.h * Math.PI) / 180) * ((inner + outer) / 2);
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.stroke();
    const px = sx + hsv.s * sq;
    const py = sy + (1 - hsv.v) * sq;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.stroke();
  }, [hsv.h, hsv.s, hsv.v, wheelOpen]);

  const pick = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE;
    const y = ((clientY - rect.top) / rect.height) * SIZE;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const outer = SIZE / 2 - 1;
    const inner = outer - RING;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= outer && dist >= inner) {
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      emitRgb({ h: (angle + 360) % 360, s: hsv.s, v: hsv.v }, props.onChange);
      return;
    }
    const sq = inner * 2 - PAD * 2;
    const sx = cx - sq / 2;
    const sy = cy - sq / 2;
    if (x >= sx && y >= sy && x <= sx + sq && y <= sy + sq) {
      const s = clamp01((x - sx) / Math.max(1, sq - 1));
      const v = clamp01(1 - (y - sy) / Math.max(1, sq - 1));
      emitRgb({ h: hsv.h, s, v }, props.onChange);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pick(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
      return;
    }
    pick(e.clientX, e.clientY);
  };

  const setChannel = (key: keyof ForgeRgb01, raw: number) => {
    props.onChange({
      r: key === "r" ? clamp01(raw) : clamp01(props.value.r),
      g: key === "g" ? clamp01(raw) : clamp01(props.value.g),
      b: key === "b" ? clamp01(raw) : clamp01(props.value.b),
    });
  };

  return (
    <div className="forge-color-field">
      <div className="forge-color-field__row">
        <button
          type="button"
          className="forge-color-field__swatch"
          style={{ background: hex }}
          title="Toggle color wheel"
          aria-label="Toggle color wheel"
          onClick={() => setWheelOpen((open) => !open)}
        />
        <input
          className="forge-color-field__native"
          type="color"
          value={hex}
          onChange={(e) => {
            const next = hexToRgb01(e.target.value);
            if (next) {
              props.onChange(next);
            }
          }}
          aria-label="Fade color"
        />
        <div className="forge-color-field__channels">
          <ForgeInput type="number" step={0.01} min={0} max={1} value={clamp01(props.value.r)} aria-label="R" onChange={(e) => setChannel("r", Number(e.target.value))} />
          <ForgeInput type="number" step={0.01} min={0} max={1} value={clamp01(props.value.g)} aria-label="G" onChange={(e) => setChannel("g", Number(e.target.value))} />
          <ForgeInput type="number" step={0.01} min={0} max={1} value={clamp01(props.value.b)} aria-label="B" onChange={(e) => setChannel("b", Number(e.target.value))} />
        </div>
      </div>
      {wheelOpen ? (
        <canvas
          ref={canvasRef}
          className="forge-color-field__wheel"
          width={SIZE}
          height={SIZE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        />
      ) : null}
    </div>
  );
}
