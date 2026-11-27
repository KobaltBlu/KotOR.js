/**
 * Menu pad navigation: focus pick, spatial moves, list rows, B / A / Y fallbacks.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const gameState: any = {
  controls: { controllerHidesCursor: true },
  guiAudioEmitter: { playSoundFireAndForget: () => {} },
};

jest.mock('@engine/controls', () => ({ KeyMapper: { ACTIONS_ALL: [] as any[] } }));
jest.mock('@engine/runtime/GameState', () => ({ GameState: gameState }));
jest.mock('@engine/managers/ResolutionManager', () => ({
  ResolutionManager: {
    getViewportWidth: () => 1280,
    getViewportHeight: () => 720,
    getWindowWidth: () => 1280,
    getWindowHeight: () => 720,
  },
}));
jest.mock('@engine/managers/ShaderManager', () => ({ ShaderManager: {} }));
jest.mock('@engine/loaders', () => ({ ResourceLoader: {}, TextureLoader: {} }));
jest.mock('@engine/gui/GUIControl', () => ({ GUIControl: class {} }));
jest.mock('@engine/gui/GUIControlFactory', () => ({ GUIControlFactory: {} }));
jest.mock('@engine/gui/listrow/listRowHover', () => ({ shouldSuppressGameMenuHoverForListRow: () => false }));
jest.mock('@engine/gui/GUICoord', () => ({ GUIPanelCoordFlags: {} }));
jest.mock('@engine/render/shaders/datatextures/godray.datatexture', () => ({ getGodRayTexture: (): null => null }));
jest.mock('@engine/render/shaders/datatextures/fog.datatexture', () => ({
  createGUIFogVolumeTexture: (): null => null,
  GUI_FOG_VOLUME: { periodSeconds: 64 },
}));
jest.mock('@core/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@engine/render/three/odyssey/OdysseyTexture', () => ({ OdysseyTexture: class {} }));
jest.mock('@core/resource/ResourceTypes', () => ({ ResourceTypes: {} }));
jest.mock('@engine/gui/guiMatrix', () => ({
  freezeGuiTree: () => {},
  commitGuiTransform: () => {},
  flushGuiMatrices: () => {},
  freezeGuiObject: () => {},
}));
jest.mock('@engine/runtime/EngineModeController', () => ({
  EngineModeController: { setMode: () => {}, getMode: () => 0 },
}));
jest.mock('@engine/audio', () => ({}));
jest.mock('@engine/pathfinding/static-walk-blockers', () => ({}));
jest.mock('@engine/pathfinding/static-walk-blockers-mesh', () => ({}));
jest.mock('three', () => {
  class Vector3 {
    x = 0; y = 0; z = 0;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
    copy() { return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
  }
  class Matrix4 {
    elements = new Array(16).fill(0);
    identity() { return this; }
    copy() { return this; }
    clone() { return new Matrix4(); }
  }
  class Box3 {
    min = new Vector3();
    max = new Vector3();
    setFromObject() { return this; }
    makeEmpty() { return this; }
    isEmpty() { return true; }
  }
  class Group {
    children: any[] = [];
    add() {}
    remove() {}
  }
  return {
    Vector3,
    Matrix4,
    Box3,
    Group,
    MathUtils: { clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)) },
  };
});

import { GameMenu } from '@engine/gui/GameMenu';
import { GUIControlTypeMask } from '@core/enums/gui/GUIControlTypeMask';
import {
  pickBackButtonName,
  pickFirstInReadingOrder,
  pickSpatialNeighbor,
  type PadRect,
} from '@engine/gui/padNavigation';

const BUTTON = GUIControlTypeMask.GUIControl | GUIControlTypeMask.GUIButton;
const LIST = GUIControlTypeMask.GUIControl | GUIControlTypeMask.GUIListBox;
const SLIDER = GUIControlTypeMask.GUIControl | GUIControlTypeMask.GUISlider;

/** Minimal stand-in for a GUI control: position, size, click and hover. */
function fakeControl(name: string, x: number, y: number, opts: Partial<any> = {}): any {
  const c: any = {
    name,
    objectType: BUTTON,
    widget: { visible: true },
    parent: undefined,
    children: [],
    extent: { width: 100, height: 30 },
    disableSelection: false,
    clicks: 0,
    hover: false,
    moveTo: {} as Record<string, any>,
    updateWorldPosition: () => ({ x, y }),
    isClickable() { return this.widget.visible && !this.disableSelection; },
    click() { this.clicks++; },
    onHoverIn() { this.hover = true; },
    onHoverOut() { this.hover = false; },
    getMoveToControl(dir: string) { return this.moveTo[dir]; },
    ...opts,
  };
  return c;
}

function fakeList(name: string, x: number, y: number, rows: number): any {
  const list = fakeControl(name, x, y, {
    objectType: LIST,
    bitFlags: { noSelectMode: false },
    selectionIndex: -1,
    topVisibleIndex: 0,
    selectedItem: undefined,
    isClickable: () => false,
  });
  list.children = Array.from({ length: rows }, (_, i) => fakeControl(`${name}_row${i}`, x, y - i * 20));
  list.children.forEach((row: any) => { row.parent = list; });
  list.setSelectedControl = (i: number) => {
    list.selectionIndex = i;
    list.selectedItem = list.children[i];
  };
  list.directionalNavigate = (dir: string) => {
    const next = list.selectionIndex + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
    if(next >= 0 && next < list.children.length) list.setSelectedControl(next);
  };
  list.scrolled = 0;
  list.scrollUp = () => { list.scrolled--; };
  list.scrollDown = () => { list.scrolled++; };
  return list;
}

function makeMenu(controls: any[]): GameMenu {
  const menu = new GameMenu();
  const panel = fakeControl('PANEL', 0, 0, { isClickable: () => false });
  panel.children = controls;
  for(const c of controls){
    c.parent = panel;
    c.menu = menu;
    (menu as any)[c.name] = c;
  }
  menu.tGuiPanel = panel;
  menu.manager = { activeGUIElement: undefined, MenuTop: undefined } as any;
  menu.bVisible = true;
  return menu;
}

describe('pickSpatialNeighbor', () => {
  const from: PadRect = { x: 0, y: 0, w: 100, h: 30 };

  it('moves to the nearest control in the pressed direction', () => {
    const above: PadRect = { x: 0, y: 50, w: 100, h: 30 };
    const farAbove: PadRect = { x: 0, y: 120, w: 100, h: 30 };
    const below: PadRect = { x: 0, y: -50, w: 100, h: 30 };
    expect(pickSpatialNeighbor(from, [farAbove, below, above], 'up')).toBe(2);
    expect(pickSpatialNeighbor(from, [farAbove, below, above], 'down')).toBe(1);
  });

  it('prefers a control in line over a nearer one off to the side', () => {
    const inLine: PadRect = { x: 0, y: -80, w: 100, h: 30 };
    const offside: PadRect = { x: 300, y: -40, w: 100, h: 30 };
    expect(pickSpatialNeighbor(from, [offside, inLine], 'down')).toBe(1);
  });

  it('returns -1 when nothing lies that way', () => {
    const left: PadRect = { x: -200, y: 0, w: 100, h: 30 };
    expect(pickSpatialNeighbor(from, [left], 'right')).toBe(-1);
    expect(pickSpatialNeighbor(from, [left], 'left')).toBe(0);
  });
});

describe('pickFirstInReadingOrder', () => {
  it('takes the top row, then the leftmost', () => {
    const rects: PadRect[] = [
      { x: 0, y: -100, w: 50, h: 20 },
      { x: 100, y: 100, w: 50, h: 20 },
      { x: -100, y: 101, w: 50, h: 20 },
    ];
    expect(pickFirstInReadingOrder(rects)).toBe(2);
    expect(pickFirstInReadingOrder([])).toBe(-1);
  });
});

describe('pickBackButtonName', () => {
  it('prefers back over cancel over OK', () => {
    expect(pickBackButtonName(['BTN_OK', 'BTN_CANCEL'])).toBe(1);
    expect(pickBackButtonName(['BTN_OK', 'BTN_Back', 'BTN_CANCEL'])).toBe(1);
    expect(pickBackButtonName(['BTN_OK'])).toBe(0);
    expect(pickBackButtonName(['BTN_ACCEPT'])).toBe(-1);
  });
});

describe('GameMenu pad fallback', () => {
  beforeEach(() => {
    gameState.controls.controllerHidesCursor = true;
  });

  it('first d-pad press focuses a control, later presses move between them', () => {
    const top = fakeControl('BTN_ONE', 0, 100);
    const bottom = fakeControl('BTN_TWO', 0, 0);
    const menu = makeMenu([bottom, top]);
    menu.triggerControllerDDownPress();
    expect(menu.selectedControl).toBe(top);
    expect(top.hover).toBe(true);
    menu.triggerControllerDDownPress();
    expect(menu.selectedControl).toBe(bottom);
    expect(top.hover).toBe(false);
    menu.triggerControllerAPress();
    expect(bottom.clicks).toBe(1);
  });

  it('left stick moves focus like the d-pad', () => {
    const a = fakeControl('BTN_ONE', 0, 0);
    const b = fakeControl('BTN_TWO', 200, 0);
    const menu = makeMenu([a, b]);
    menu.triggerControllerLStickXPress(true);
    menu.triggerControllerLStickXPress(true);
    expect(menu.selectedControl).toBe(b);
  });

  it('follows neighbour links and skips hidden or disabled controls', () => {
    const a = fakeControl('BTN_A', 0, 100);
    const hidden = fakeControl('BTN_HIDDEN', 0, 50);
    const c = fakeControl('BTN_C', 0, 0);
    hidden.widget.visible = false;
    a.moveTo.down = hidden;
    hidden.moveTo.down = c;
    const menu = makeMenu([a, hidden, c]);
    menu.setPadFocus(a);
    menu.triggerControllerDDownPress();
    expect(menu.selectedControl).toBe(c);
  });

  it('a focused list moves its rows before leaving the list', () => {
    const list = fakeList('LB_ITEMS', 0, 100, 2);
    const ok = fakeControl('BTN_DONE', 0, -200);
    const menu = makeMenu([list, ok]);
    menu.triggerControllerDDownPress();
    expect(menu.selectedControl).toBe(list);
    expect(list.selectionIndex).toBe(0);
    menu.triggerControllerDDownPress();
    expect(list.selectionIndex).toBe(1);
    menu.triggerControllerAPress();
    expect(list.children[1].clicks).toBe(1);
    menu.triggerControllerDDownPress();
    expect(menu.selectedControl).toBe(ok);
  });

  it('A on a list runs the menu A button when it has one', () => {
    const list = fakeList('LB_ITEMS', 0, 100, 2);
    const accept = fakeControl('BTN_ACCEPT', 0, -200);
    const menu = makeMenu([list, accept]);
    menu._button_a = accept;
    menu.triggerControllerDDownPress();
    menu.triggerControllerAPress();
    expect(accept.clicks).toBe(1);
  });

  it('description lists never take focus but scroll on the right stick', () => {
    const desc = fakeList('LB_DESC', 0, 100, 1);
    desc.bitFlags.noSelectMode = true;
    const btn = fakeControl('BTN_X', 0, -100);
    const menu = makeMenu([desc, btn]);
    menu.triggerControllerDDownPress();
    expect(menu.selectedControl).toBe(btn);
    menu.triggerControllerRStickYPress(true);
    menu.triggerControllerRStickYPress(true);
    expect(desc.scrolled).toBe(2);
  });

  it('B presses a back button when the menu names none', () => {
    const ok = fakeControl('BTN_OK', 0, 0);
    const back = fakeControl('BTN_BACK', 100, 0);
    const menu = makeMenu([ok, back]);
    menu.triggerControllerBPress();
    expect(back.clicks).toBe(1);
    menu.triggerControllerBackPress();
    expect(back.clicks).toBe(2);
    expect(ok.clicks).toBe(0);
  });

  it('Y moves to the next party member on tab menus', () => {
    const change = fakeControl('BTN_CHANGE1', 0, 0);
    const menu = makeMenu([change]);
    menu.triggerControllerYPress();
    expect(change.clicks).toBe(1);
  });

  it('sliders change value with left / right', () => {
    const slider = fakeControl('SLI_VOLUME', 0, 0, {
      objectType: SLIDER,
      value: 0.5,
      direction: 0,
      iniProperty: 'Sound Options.Volume',
      isClickable: () => false,
      setValue(v: number) { this.value = v; },
    });
    const menu = makeMenu([slider]);
    menu.triggerControllerDRightPress();
    expect(menu.selectedControl).toBe(slider);
    menu.triggerControllerDRightPress();
    expect(slider.value).toBeCloseTo(0.55);
    menu.triggerControllerDLeftPress();
    menu.triggerControllerDLeftPress();
    expect(slider.value).toBeCloseTo(0.45);
  });

  it('keeps pad focus lit while the pad drives the menu', () => {
    const a = fakeControl('BTN_ONE', 0, 0, { hitCheckMouse: () => false });
    const menu = makeMenu([a]);
    menu.tGuiPanel.getPanelLocalMouse = () => ({ x: 9999, y: 9999 });
    menu.tGuiPanel.update = () => {};
    menu.triggerControllerDDownPress();
    menu.update(0);
    expect(a.hover).toBe(true);
    gameState.controls.controllerHidesCursor = false;
    menu.update(0);
    expect(a.hover).toBe(false);
  });

  it('sends input to a hosted sub-panel', () => {
    const inner = makeMenu([fakeControl('BTN_BACK', 0, 0)]);
    const outer = makeMenu([]);
    outer.childMenu = inner;
    outer.triggerControllerBPress();
    expect((inner as any).BTN_BACK.clicks).toBe(1);
  });
});
