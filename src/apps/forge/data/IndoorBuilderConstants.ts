export const INDOOR_RENDER_FPS = 60;
export const INDOOR_RENDER_INTERVAL_MS = 16;

export const INDOOR_DEFAULT_CAMERA_POSITION_X = 0;
export const INDOOR_DEFAULT_CAMERA_POSITION_Y = 0;
export const INDOOR_DEFAULT_CAMERA_ROTATION = 0;
export const INDOOR_DEFAULT_CAMERA_ZOOM = 1;
export const INDOOR_MIN_CAMERA_ZOOM = 0.1;
export const INDOOR_MAX_CAMERA_ZOOM = 50;

export const INDOOR_ZOOM_STEP_FACTOR = 1.15;
export const INDOOR_ZOOM_WHEEL_SENSITIVITY = 0.03;

export const INDOOR_DEFAULT_GRID_SIZE = 1;
export const INDOOR_MIN_GRID_SIZE = 0.5;
export const INDOOR_MAX_GRID_SIZE = 10;
export const INDOOR_GRID_SIZE_STEP = 0.5;

export const INDOOR_HOOK_SNAP_BASE_THRESHOLD = 1;
export const INDOOR_HOOK_SNAP_SCALE_FACTOR = 2;
export const INDOOR_HOOK_CONNECTION_THRESHOLD = 1.5;
export const INDOOR_HOOK_SNAP_DISCONNECT_BASE_THRESHOLD = 1;
export const INDOOR_HOOK_SNAP_DISCONNECT_SCALE_FACTOR = 0.8;

export const INDOOR_DEFAULT_ROTATION_SNAP = 15;
export const INDOOR_MIN_ROTATION_SNAP = 1;
export const INDOOR_MAX_ROTATION_SNAP = 90;

export const INDOOR_POSITION_CHANGE_EPSILON = 0.001;
export const INDOOR_ROTATION_CHANGE_EPSILON = 0.001;

export const INDOOR_HOOK_HOVER_RADIUS = 0.6;
export const INDOOR_HOOK_DISPLAY_RADIUS = 0.4;
export const INDOOR_HOOK_SELECTED_RADIUS = 0.8;

export const INDOOR_WARP_POINT_RADIUS = 1.0;
export const INDOOR_WARP_POINT_ACTIVE_SCALE = 1.3;
export const INDOOR_WARP_POINT_CROSSHAIR_SCALE = 1.2;

export const INDOOR_MARQUEE_MOVE_THRESHOLD_PIXELS = 5;

export const INDOOR_HOOK_COLOR_UNCONNECTED: [number, number, number, number] = [255, 80, 80, 255];
export const INDOOR_HOOK_COLOR_CONNECTED: [number, number, number, number] = [80, 200, 80, 255];
export const INDOOR_HOOK_COLOR_SELECTED: [number, number, number, number] = [80, 160, 255, 255];
export const INDOOR_HOOK_PEN_COLOR_UNCONNECTED: [number, number, number, number] = [255, 200, 200, 255];
export const INDOOR_HOOK_PEN_COLOR_CONNECTED: [number, number, number, number] = [180, 255, 180, 255];
export const INDOOR_HOOK_PEN_COLOR_SELECTED: [number, number, number, number] = [180, 220, 255, 255];

export const INDOOR_SNAP_INDICATOR_COLOR: [number, number, number, number] = [0, 255, 255, 255];
export const INDOOR_SNAP_INDICATOR_ALPHA = 100;
export const INDOOR_SNAP_INDICATOR_RADIUS = 0.8;
export const INDOOR_SNAP_INDICATOR_PEN_WIDTH = 0.3;

export const INDOOR_GRID_COLOR: [number, number, number, number] = [50, 50, 50, 255];
export const INDOOR_GRID_PEN_WIDTH = 0.05;

export const INDOOR_WARP_POINT_COLOR: [number, number, number, number] = [0, 255, 0, 255];
export const INDOOR_WARP_POINT_ALPHA_NORMAL = 127;
export const INDOOR_WARP_POINT_ALPHA_ACTIVE = 180;
export const INDOOR_WARP_POINT_PEN_WIDTH_NORMAL = 0.4;
export const INDOOR_WARP_POINT_PEN_WIDTH_ACTIVE = 0.6;

export const INDOOR_ROOM_HOVER_ALPHA = 40;
export const INDOOR_ROOM_SELECTED_ALPHA = 80;
export const INDOOR_ROOM_HOVER_COLOR: [number, number, number, number] = [100, 150, 255, 255];
export const INDOOR_ROOM_SELECTED_COLOR: [number, number, number, number] = [255, 200, 100, 255];

export const INDOOR_CURSOR_PREVIEW_ALPHA = 150;
export const INDOOR_CURSOR_HOOK_ALPHA = 180;

export const INDOOR_BACKGROUND_COLOR: [number, number, number, number] = [20, 20, 25, 255];

export const INDOOR_CONNECTION_LINE_COLOR: [number, number, number, number] = [80, 255, 80, 255];
export const INDOOR_CONNECTION_LINE_WIDTH_SCALE = 2;

export const INDOOR_MARQUEE_FILL_COLOR: [number, number, number, number] = [100, 150, 255, 50];
export const INDOOR_MARQUEE_BORDER_COLOR: [number, number, number, number] = [100, 150, 255, 255];

export const INDOOR_DUPLICATE_OFFSET_X = 2;
export const INDOOR_DUPLICATE_OFFSET_Y = 2;
export const INDOOR_DUPLICATE_OFFSET_Z = 0;

export const INDOOR_COMPONENT_PREVIEW_SCALE = 0.1;

export enum IndoorDragMode {
  NONE = 'none',
  ROOMS = 'rooms',
  WARP = 'warp',
  MARQUEE = 'marquee',
  HOOK = 'hook',
}
