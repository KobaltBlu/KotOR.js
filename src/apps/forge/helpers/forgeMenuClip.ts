export const FORGE_MENU_EDGE_PAD_PX = 4;
export const FORGE_MENU_MIN_HEIGHT_PX = 96;

const CLIP_CLASSES = ["tab-pane", "tab-pane-content", "forge-tab-audio"];

export type ForgeClipRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export type ForgeDropdownPlacement = {
  openUp: boolean;
  maxHeight: number;
  shiftX: number;
};

function overflowClips(value: string): boolean {
  return value === "hidden" || value === "auto" || value === "scroll" || value === "clip";
}

/** Nearest height-clipped ancestor (tab pane) intersected with the viewport. */
export function resolveClipRect(from: HTMLElement): ForgeClipRect {
  const clip: ForgeClipRect = {
    top: 0,
    left: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
  let el: HTMLElement | null = from.parentElement;
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const clips =
      overflowClips(style.overflowY) ||
      overflowClips(style.overflowX) ||
      CLIP_CLASSES.some((c) => el!.classList.contains(c));
    if (clips) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        clip.top = Math.max(clip.top, rect.top);
        clip.left = Math.max(clip.left, rect.left);
        clip.right = Math.min(clip.right, rect.right);
        clip.bottom = Math.min(clip.bottom, rect.bottom);
      }
    }
    el = el.parentElement;
  }
  return clip;
}

export function computeDropdownPlacement(
  trigger: { top: number; left: number; right: number; bottom: number },
  clip: ForgeClipRect,
  menuWidth: number,
  options?: { pad?: number; minHeight?: number; alignEnd?: boolean },
): ForgeDropdownPlacement {
  const pad = options?.pad ?? FORGE_MENU_EDGE_PAD_PX;
  const minHeight = options?.minHeight ?? FORGE_MENU_MIN_HEIGHT_PX;
  const spaceBelow = clip.bottom - trigger.bottom - pad;
  const spaceAbove = trigger.top - clip.top - pad;
  const openUp = spaceBelow < minHeight && spaceAbove > spaceBelow;
  const available = Math.floor(openUp ? spaceAbove : spaceBelow);
  const maxHeight = Math.max(48, available);

  const naturalLeft = options?.alignEnd
    ? trigger.right - menuWidth
    : trigger.left;
  let shiftX = 0;
  if (naturalLeft + menuWidth > clip.right - pad) {
    shiftX -= naturalLeft + menuWidth - (clip.right - pad);
  }
  if (naturalLeft + shiftX < clip.left + pad) {
    shiftX += clip.left + pad - (naturalLeft + shiftX);
  }

  return { openUp, maxHeight, shiftX };
}

export function applyDropdownPlacement(
  root: HTMLElement,
  menu: HTMLElement,
  alignEnd: boolean,
): void {
  const trigger = root.getBoundingClientRect();
  const clip = resolveClipRect(root);
  const menuWidth = Math.max(menu.offsetWidth, menu.getBoundingClientRect().width);
  const placement = computeDropdownPlacement(trigger, clip, menuWidth, { alignEnd });

  const maxWidth = Math.max(120, Math.floor(clip.right - clip.left - FORGE_MENU_EDGE_PAD_PX * 2));
  menu.style.maxHeight = `${placement.maxHeight}px`;
  menu.style.maxWidth = `${maxWidth}px`;
  menu.style.overflowY = "auto";
  if (placement.openUp) {
    menu.style.top = "auto";
    menu.style.bottom = "100%";
  } else {
    menu.style.top = "100%";
    menu.style.bottom = "auto";
  }
  menu.style.transform = placement.shiftX
    ? `translateX(${Math.round(placement.shiftX)}px)`
    : "";
}

export function clearDropdownPlacement(menu: HTMLElement): void {
  menu.style.removeProperty("max-height");
  menu.style.removeProperty("max-width");
  menu.style.removeProperty("overflow-y");
  menu.style.removeProperty("top");
  menu.style.removeProperty("bottom");
  menu.style.removeProperty("transform");
}
