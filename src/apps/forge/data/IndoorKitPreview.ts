import type { KitComponent } from "@/apps/forge/data/IndoorKit";
import type { OdysseyWalkMesh } from "@/apps/forge/KotOR";


const PREVIEW_PIXELS_PER_UNIT = 10;
const PREVIEW_MIN_SIZE = 256;
const PREVIEW_PADDING = 5;

const getFaceColor = (walkmesh: OdysseyWalkMesh, faceIndex: number): string => {
  const face = walkmesh.faces[faceIndex];
  if (face?.color) {
    const r = Math.floor(face.color.r * 255);
    const g = Math.floor(face.color.g * 255);
    const b = Math.floor(face.color.b * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return "rgb(128, 128, 128)";
};

export const ensureComponentPreview = (component: KitComponent): HTMLCanvasElement => {
  if (component.image instanceof HTMLCanvasElement) {
    return component.image;
  }

  const walkmesh = component.bwm;
  const vertices = walkmesh.vertices;
  if (!vertices.length) {
    const blank = document.createElement("canvas");
    blank.width = PREVIEW_MIN_SIZE;
    blank.height = PREVIEW_MIN_SIZE;
    const ctx = blank.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, blank.width, blank.height);
    }
    component.image = blank;
    return blank;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  vertices.forEach((v) => {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  });

  minX -= PREVIEW_PADDING;
  minY -= PREVIEW_PADDING;
  maxX += PREVIEW_PADDING;
  maxY += PREVIEW_PADDING;

  const width = Math.max(Math.round((maxX - minX) * PREVIEW_PIXELS_PER_UNIT), PREVIEW_MIN_SIZE);
  const height = Math.max(Math.round((maxY - minY) * PREVIEW_PIXELS_PER_UNIT), PREVIEW_MIN_SIZE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    component.image = canvas;
    return canvas;
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(0, height);
  ctx.scale(1, -1);

  walkmesh.faces.forEach((face, index) => {
    ctx.beginPath();
    const v1 = walkmesh.vertices[face.a];
    const v2 = walkmesh.vertices[face.b];
    const v3 = walkmesh.vertices[face.c];
    ctx.moveTo((v1.x - minX) * PREVIEW_PIXELS_PER_UNIT, (v1.y - minY) * PREVIEW_PIXELS_PER_UNIT);
    ctx.lineTo((v2.x - minX) * PREVIEW_PIXELS_PER_UNIT, (v2.y - minY) * PREVIEW_PIXELS_PER_UNIT);
    ctx.lineTo((v3.x - minX) * PREVIEW_PIXELS_PER_UNIT, (v3.y - minY) * PREVIEW_PIXELS_PER_UNIT);
    ctx.closePath();
    ctx.fillStyle = getFaceColor(walkmesh, index);
    ctx.fill();
  });

  ctx.restore();
  component.image = canvas;
  return canvas;
};
