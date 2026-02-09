import * as THREE from "three";
import { IndoorMap, IndoorMapRoom } from "../data/IndoorMap";
import { KitComponent } from "../data/IndoorKit";
import {
  IndoorDragMode,
  INDOOR_BACKGROUND_COLOR,
  INDOOR_GRID_COLOR,
  INDOOR_GRID_PEN_WIDTH,
  INDOOR_DEFAULT_CAMERA_POSITION_X,
  INDOOR_DEFAULT_CAMERA_POSITION_Y,
  INDOOR_DEFAULT_CAMERA_ROTATION,
  INDOOR_DEFAULT_CAMERA_ZOOM,
  INDOOR_MIN_CAMERA_ZOOM,
  INDOOR_MAX_CAMERA_ZOOM,
  INDOOR_ZOOM_STEP_FACTOR,
  INDOOR_ZOOM_WHEEL_SENSITIVITY,
  INDOOR_HOOK_DISPLAY_RADIUS,
  INDOOR_HOOK_COLOR_CONNECTED,
  INDOOR_HOOK_COLOR_UNCONNECTED,
  INDOOR_HOOK_COLOR_SELECTED,
  INDOOR_ROOM_SELECTED_ALPHA,
  INDOOR_ROOM_SELECTED_COLOR,
  INDOOR_ROOM_HOVER_ALPHA,
  INDOOR_ROOM_HOVER_COLOR,
  INDOOR_WARP_POINT_COLOR,
  INDOOR_WARP_POINT_RADIUS,
} from "../data/IndoorBuilderConstants";
import { clamp, toRadians } from "../data/IndoorTypes";

type RendererOptions = {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  highlightRoomsHover: boolean;
};

type RendererCallbacks = {
  onSelectionChanged?: (rooms: IndoorMapRoom[]) => void;
  onRoomsMoved?: (rooms: IndoorMapRoom[], oldPositions: THREE.Vector3[], newPositions: THREE.Vector3[]) => void;
  onHoverRoomChanged?: (room: IndoorMapRoom | null) => void;
};

type Face2D = [THREE.Vector2, THREE.Vector2, THREE.Vector2];

const DEFAULT_OPTIONS: RendererOptions = {
  showGrid: false,
  snapToGrid: false,
  gridSize: 1,
  highlightRoomsHover: true,
};

const colorToRgba = (color: [number, number, number, number], alphaOverride?: number): string => {
  const [r, g, b, a] = color;
  const alpha = typeof alphaOverride === "number" ? alphaOverride / 255 : a / 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const pointInTriangle = (p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2): boolean => {
  const v0 = new THREE.Vector2(c.x - a.x, c.y - a.y);
  const v1 = new THREE.Vector2(b.x - a.x, b.y - a.y);
  const v2 = new THREE.Vector2(p.x - a.x, p.y - a.y);

  const dot00 = v0.dot(v0);
  const dot01 = v0.dot(v1);
  const dot02 = v0.dot(v2);
  const dot11 = v1.dot(v1);
  const dot12 = v1.dot(v2);

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  return u >= 0 && v >= 0 && u + v <= 1;
};

export class IndoorMapCanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private map: IndoorMap | null = null;
  private options: RendererOptions = { ...DEFAULT_OPTIONS };
  private callbacks: RendererCallbacks = {};
  private selectedRooms: IndoorMapRoom[] = [];
  private hoverRoom: IndoorMapRoom | null = null;
  private dragMode: IndoorDragMode = IndoorDragMode.NONE;
  private dragStartWorld: THREE.Vector2 = new THREE.Vector2();
  private dragStartPositions: THREE.Vector3[] = [];
  private isPanning = false;
  private lastMouseScreen: THREE.Vector2 = new THREE.Vector2();
  private frameHandle: number | null = null;
  private dirty = true;

  private cameraPosition: THREE.Vector2 = new THREE.Vector2(INDOOR_DEFAULT_CAMERA_POSITION_X, INDOOR_DEFAULT_CAMERA_POSITION_Y);
  private cameraRotation = INDOOR_DEFAULT_CAMERA_ROTATION;
  private cameraScale = INDOOR_DEFAULT_CAMERA_ZOOM;

  private componentFaces: Map<KitComponent, Face2D[]> = new Map();

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.startRenderLoop();
  }

  detach(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.canvas = null;
    this.ctx = null;
  }

  setMap(map: IndoorMap): void {
    this.map = map;
    this.componentFaces.clear();
    this.invalidate();
  }

  setOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options };
    this.invalidate();
  }

  setCallbacks(callbacks: RendererCallbacks): void {
    this.callbacks = callbacks;
  }

  setSelectedRooms(rooms: IndoorMapRoom[]): void {
    this.selectedRooms = rooms;
    this.invalidate();
  }

  onMouseDown(event: MouseEvent): void {
    if (!this.canvas || !this.map) return;
    if (event.button === 2) {
      this.isPanning = true;
      this.lastMouseScreen.set(event.clientX, event.clientY);
      return;
    }

    const world = this.screenToWorld(new THREE.Vector2(event.offsetX, event.offsetY));
    this.dragStartWorld.copy(world);

    const room = this.pickRoom(world);
    if (room) {
      if (!this.selectedRooms.includes(room)) {
        this.selectedRooms = [room];
        this.callbacks.onSelectionChanged?.(this.selectedRooms);
      }
      this.dragMode = IndoorDragMode.ROOMS;
      this.dragStartPositions = this.selectedRooms.map((entry) => entry.position.clone());
    } else {
      this.selectedRooms = [];
      this.callbacks.onSelectionChanged?.(this.selectedRooms);
      this.dragMode = IndoorDragMode.NONE;
    }
    this.invalidate();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.canvas || !this.map) return;
    const world = this.screenToWorld(new THREE.Vector2(event.offsetX, event.offsetY));

    if (this.isPanning) {
      const dx = event.clientX - this.lastMouseScreen.x;
      const dy = event.clientY - this.lastMouseScreen.y;
      this.lastMouseScreen.set(event.clientX, event.clientY);
      const pan = this.screenDeltaToWorld(dx, dy);
      this.cameraPosition.x -= pan.x;
      this.cameraPosition.y -= pan.y;
      this.invalidate();
      return;
    }

    if (this.dragMode === IndoorDragMode.ROOMS && this.selectedRooms.length) {
      const delta = world.clone().sub(this.dragStartWorld);
      this.selectedRooms.forEach((room, index) => {
        room.position.copy(this.dragStartPositions[index]).add(new THREE.Vector3(delta.x, delta.y, 0));
      });
      this.invalidate();
      return;
    }

    const hover = this.pickRoom(world);
    if (hover !== this.hoverRoom) {
      this.hoverRoom = hover;
      this.callbacks.onHoverRoomChanged?.(hover);
      this.invalidate();
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.map) return;
    if (event.button === 2) {
      this.isPanning = false;
      return;
    }
    if (this.dragMode === IndoorDragMode.ROOMS) {
      const newPositions = this.selectedRooms.map((room) => room.position.clone());
      this.callbacks.onRoomsMoved?.(this.selectedRooms, this.dragStartPositions, newPositions);
    }
    this.dragMode = IndoorDragMode.NONE;
  }

  onWheel(event: WheelEvent): void {
    if (!this.canvas) return;
    const delta = event.deltaY;
    const scaleFactor = delta < 0 ? 1 / INDOOR_ZOOM_STEP_FACTOR : INDOOR_ZOOM_STEP_FACTOR;
    const wheelFactor = 1 + Math.abs(delta) * INDOOR_ZOOM_WHEEL_SENSITIVITY;
    const nextScale = delta < 0 ? this.cameraScale / wheelFactor : this.cameraScale * wheelFactor;
    this.cameraScale = clamp(nextScale, INDOOR_MIN_CAMERA_ZOOM, INDOOR_MAX_CAMERA_ZOOM);
    if (event.ctrlKey) {
      this.cameraRotation += delta < 0 ? 2 : -2;
    }
    this.invalidate();
  }

  getWorldPointFromScreen(point: THREE.Vector2): THREE.Vector2 {
    return this.screenToWorld(point);
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.invalidate();
  }

  private getComponentFaces(component: KitComponent): Face2D[] {
    if (this.componentFaces.has(component)) {
      return this.componentFaces.get(component)!;
    }
    const faces: Face2D[] = component.bwm.faces.map((face) => {
      const v1 = component.bwm.vertices[face.a];
      const v2 = component.bwm.vertices[face.b];
      const v3 = component.bwm.vertices[face.c];
      return [new THREE.Vector2(v1.x, v1.y), new THREE.Vector2(v2.x, v2.y), new THREE.Vector2(v3.x, v3.y)];
    });
    this.componentFaces.set(component, faces);
    return faces;
  }

  private pickRoom(worldPoint: THREE.Vector2): IndoorMapRoom | null {
    if (!this.map) return null;
    for (let i = this.map.rooms.length - 1; i >= 0; i -= 1) {
      const room = this.map.rooms[i];
      const local = this.worldToLocal(room, worldPoint);
      const faces = this.getComponentFaces(room.component);
      for (const face of faces) {
        if (pointInTriangle(local, face[0], face[1], face[2])) {
          return room;
        }
      }
    }
    return null;
  }

  private worldToLocal(room: IndoorMapRoom, point: THREE.Vector2): THREE.Vector2 {
    const local = point.clone().sub(new THREE.Vector2(room.position.x, room.position.y));
    const rotation = -toRadians(room.rotation);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const x = local.x * cos - local.y * sin;
    const y = local.x * sin + local.y * cos;
    const flippedX = room.flipX ? -x : x;
    const flippedY = room.flipY ? -y : y;
    return new THREE.Vector2(flippedX, flippedY);
  }

  private screenToWorld(point: THREE.Vector2): THREE.Vector2 {
    if (!this.canvas) return new THREE.Vector2();
    const center = new THREE.Vector2(this.canvas.width / 2, this.canvas.height / 2);
    const scaled = point.clone().sub(center).divideScalar(this.cameraScale);
    const rotation = toRadians(this.cameraRotation);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotated = new THREE.Vector2(
      scaled.x * cos + scaled.y * sin,
      -scaled.x * sin + scaled.y * cos
    );
    return rotated.add(this.cameraPosition);
  }

  private screenDeltaToWorld(dx: number, dy: number): THREE.Vector2 {
    const delta = new THREE.Vector2(dx, dy).divideScalar(this.cameraScale);
    const rotation = toRadians(this.cameraRotation);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return new THREE.Vector2(delta.x * cos + delta.y * sin, -delta.x * sin + delta.y * cos);
  }

  private invalidate(): void {
    this.dirty = true;
  }

  requestRender(): void {
    this.invalidate();
  }

  private startRenderLoop(): void {
    const renderLoop = () => {
      this.frameHandle = requestAnimationFrame(renderLoop);
      if (!this.dirty) return;
      this.render();
      this.dirty = false;
    };
    renderLoop();
  }

  private render(): void {
    if (!this.canvas || !this.ctx || !this.map) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = colorToRgba(INDOOR_BACKGROUND_COLOR);
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    ctx.scale(this.cameraScale, this.cameraScale);
    ctx.rotate(-toRadians(this.cameraRotation));
    ctx.translate(-this.cameraPosition.x, -this.cameraPosition.y);

    if (this.options.showGrid) {
      this.drawGrid(ctx);
    }

    this.map.rooms.forEach((room) => {
      this.drawRoom(ctx, room);
    });

    this.drawWarpPoint(ctx);

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const gridSize = this.options.gridSize || 1;
    const width = this.canvas?.width || 0;
    const height = this.canvas?.height || 0;
    const viewWidth = width / this.cameraScale;
    const viewHeight = height / this.cameraScale;
    const startX = Math.floor((this.cameraPosition.x - viewWidth / 2) / gridSize) * gridSize;
    const endX = Math.ceil((this.cameraPosition.x + viewWidth / 2) / gridSize) * gridSize;
    const startY = Math.floor((this.cameraPosition.y - viewHeight / 2) / gridSize) * gridSize;
    const endY = Math.ceil((this.cameraPosition.y + viewHeight / 2) / gridSize) * gridSize;

    ctx.strokeStyle = colorToRgba(INDOOR_GRID_COLOR);
    ctx.lineWidth = INDOOR_GRID_PEN_WIDTH;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  private drawRoom(ctx: CanvasRenderingContext2D, room: IndoorMapRoom): void {
    const faces = this.getComponentFaces(room.component);
    ctx.save();
    ctx.translate(room.position.x, room.position.y);
    ctx.rotate(toRadians(room.rotation));
    ctx.scale(room.flipX ? -1 : 1, room.flipY ? -1 : 1);
    faces.forEach((face, index) => {
      ctx.beginPath();
      ctx.moveTo(face[0].x, face[0].y);
      ctx.lineTo(face[1].x, face[1].y);
      ctx.lineTo(face[2].x, face[2].y);
      ctx.closePath();
      const color = room.component.bwm.faces[index]?.color;
      if (color) {
        ctx.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.6)`;
        ctx.fill();
      }
    });

    this.drawHooks(ctx, room);

    ctx.restore();

    if (this.selectedRooms.includes(room)) {
      ctx.save();
      ctx.translate(room.position.x, room.position.y);
      ctx.rotate(toRadians(room.rotation));
      ctx.scale(room.flipX ? -1 : 1, room.flipY ? -1 : 1);
      ctx.fillStyle = colorToRgba(INDOOR_ROOM_SELECTED_COLOR, INDOOR_ROOM_SELECTED_ALPHA);
      faces.forEach((face) => {
        ctx.beginPath();
        ctx.moveTo(face[0].x, face[0].y);
        ctx.lineTo(face[1].x, face[1].y);
        ctx.lineTo(face[2].x, face[2].y);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    if (this.hoverRoom === room && this.options.highlightRoomsHover) {
      ctx.save();
      ctx.translate(room.position.x, room.position.y);
      ctx.rotate(toRadians(room.rotation));
      ctx.scale(room.flipX ? -1 : 1, room.flipY ? -1 : 1);
      ctx.fillStyle = colorToRgba(INDOOR_ROOM_HOVER_COLOR, INDOOR_ROOM_HOVER_ALPHA);
      faces.forEach((face) => {
        ctx.beginPath();
        ctx.moveTo(face[0].x, face[0].y);
        ctx.lineTo(face[1].x, face[1].y);
        ctx.lineTo(face[2].x, face[2].y);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }
  }

  private drawHooks(ctx: CanvasRenderingContext2D, room: IndoorMapRoom): void {
    room.component.hooks.forEach((hook, index) => {
      const world = hook.position;
      const connected = room.hooks[index] !== null;
      const color = connected ? INDOOR_HOOK_COLOR_CONNECTED : INDOOR_HOOK_COLOR_UNCONNECTED;
      const isSelected = false;
      ctx.beginPath();
      ctx.fillStyle = colorToRgba(isSelected ? INDOOR_HOOK_COLOR_SELECTED : color);
      ctx.arc(world.x, world.y, INDOOR_HOOK_DISPLAY_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawWarpPoint(ctx: CanvasRenderingContext2D): void {
    if (!this.map) return;
    const warp = this.map.warpPoint;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = colorToRgba(INDOOR_WARP_POINT_COLOR);
    ctx.lineWidth = 0.3;
    ctx.arc(warp.x, warp.y, INDOOR_WARP_POINT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
